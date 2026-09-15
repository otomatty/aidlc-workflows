// Source-only archives. Export never executes a plugin tool, hook, or sensor.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, cpSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import {
  type Catalog,
  type CustomizationRequest,
  type Diagnostic,
  overlayCustomization,
  slug,
  walkSource,
  validateCustomizationSelection,
  knowledgeSourcePaths,
} from "./aidlc-customization-model.ts";
import {
  CustomizationError,
  hashBytes,
  safeCustomizationPath,
} from "./aidlc-customization-guard.ts";
import { buildPluginProjection, readPluginTargets } from "./aidlc-plugin-emit.ts";
import { validatePluginRoot } from "./aidlc-plugin-validate.ts";
import { bundledPluginHookTemplatesDir, bundledPluginTargetsPath } from "./aidlc-plugin-build.ts";
import {
  coreStageContribution,
  validatePortableContribution,
} from "./aidlc-customization-portable-contributions.ts";

function crc32(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
/** Deterministic ZIP STORE entries with UTF-8 names and no executable modes. */
export function customizationZip(entries: Array<{ path: string; bytes: Buffer }>): Buffer {
  const local: Buffer[] = [],
    central: Buffer[] = [];
  let offset = 0;
  for (const entry of [...entries].sort((a, b) => a.path.localeCompare(b.path))) {
    if (
      !entry.path ||
      entry.path.startsWith("/") ||
      entry.path.includes("\\") ||
      entry.path.split("/").some((p) => p === ".." || p === "." || !p)
    )
      throw new CustomizationError("unsafe-export-path", entry.path);
    const name = Buffer.from(entry.path),
      crc = crc32(entry.bytes),
      header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0x800, 6);
    header.writeUInt16LE(0x21, 12);
    header.writeUInt32LE(crc, 14);
    header.writeUInt32LE(entry.bytes.length, 18);
    header.writeUInt32LE(entry.bytes.length, 22);
    header.writeUInt16LE(name.length, 26);
    local.push(header, name, entry.bytes);
    const record = Buffer.alloc(46);
    record.writeUInt32LE(0x02014b50);
    record.writeUInt16LE(20, 4);
    record.writeUInt16LE(20, 6);
    record.writeUInt16LE(0x800, 8);
    record.writeUInt16LE(0x21, 14);
    record.writeUInt32LE(crc, 16);
    record.writeUInt32LE(entry.bytes.length, 20);
    record.writeUInt32LE(entry.bytes.length, 24);
    record.writeUInt16LE(name.length, 28);
    record.writeUInt32LE(offset, 42);
    central.push(record, name);
    offset += header.length + name.length + entry.bytes.length;
  }
  const center = Buffer.concat(central),
    end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(center.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, center, end]);
}
export function exportCustomization(catalog: Catalog, request: CustomizationRequest) {
  const all = overlayCustomization(catalog, request),
    selected = new Set(request.selectedItemIds ?? all.map((i) => i.id));
  const items = all.filter((i) => selected.has(i.id));
  if (items.length !== selected.size)
    throw new CustomizationError("unknown-item", "Export selection contains an unknown item");
  const name = slug(request.name ?? "customization"),
    diagnostics: Diagnostic[] = validateCustomizationSelection(catalog, request);
  if (diagnostics.some((d) => d.severity === "error"))
    throw new CustomizationError(
      "export-validation",
      "The selected configuration has unresolved references or invalid definitions.",
      diagnostics,
    );
  if (request.format !== "plugin") {
    const portable = items.map(
      ({
        source: _source,
        originalContent: _original,
        editable: _editable,
        spaceId: _space,
        ...i
      }) => i,
    );
    const bytes = Buffer.from(
      `${JSON.stringify({ schemaVersion: 1, format: "aidlc-guide", packageId: randomUUID(), name, version: request.version ?? "1.0.0", engineVersion: catalog.engineVersion, items: portable, contentHash: hashBytes(JSON.stringify(portable)).slice(7) }, null, 2)}\n`,
    );
    return {
      filename: `${name}.aidlc-guide.json`,
      mimeType: "application/json",
      base64: bytes.toString("base64"),
      bytes: bytes.length,
      sha256: hashBytes(bytes),
      omittedItemIds: [],
      diagnostics,
    };
  }
  const pluginIds = new Set(items.filter((i) => i.owner === "plugin").map((i) => i.pluginId));
  if (pluginIds.size > 1 || pluginIds.has(undefined))
    throw new CustomizationError(
      "plugin-selection",
      "A standard archive must select contributions owned by one plugin.",
      diagnostics,
    );
  const pluginId = slug([...pluginIds][0] ?? request.name ?? "customization");
  const omitted: typeof items = [],
    portable: typeof items = [];
  for (const item of items) {
    if (item.owner === "core" && item.kind === "stage") {
      const converted = coreStageContribution(item, pluginId, all);
      if (converted.content) {
        const phase = String(
          (
            Bun.YAML.parse(
              item.content.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "",
            ) as Record<string, unknown>
          ).phase,
        );
        portable.push({
          ...item,
          owner: "plugin",
          pluginId,
          content: converted.content,
          runtimeId: `${pluginId}-contribution-${item.runtimeId}`,
          source: undefined,
          target: { contributionTo: item.runtimeId, phase },
        });
      }
      if (converted.omittedFields.length) {
        omitted.push(item);
        diagnostics.push({
          severity: "warning",
          code: converted.content ? "plugin-export-partial" : "plugin-export-omitted",
          message: `${item.title}: standard plugins cannot include ${converted.omittedFields.join(", ")}.`,
          itemId: item.id,
        });
      }
    } else if (
      item.owner === "plugin" &&
      !["rule-section", "rule-file-metadata", "artifact-template"].includes(item.kind) &&
      (item.kind !== "knowledge" || item.target?.knowledgeType === "plugin-markdown")
    )
      portable.push(item);
    else {
      omitted.push(item);
      diagnostics.push({
        severity: "warning",
        code: "plugin-export-omitted",
        message: `${item.title} is project configuration and cannot be a standard plugin contribution.`,
        itemId: item.id,
      });
    }
  }
  if (!portable.length)
    throw new CustomizationError(
      "plugin-selection",
      "The selection contains no portable plugin definitions or additive changes.",
      diagnostics,
    );
  for (const contribution of portable.filter((i) => i.target?.contributionTo))
    diagnostics.push(
      ...validatePortableContribution(contribution, [
        ...all.filter((i) => i.owner === "core"),
        ...portable,
      ]),
    );
  if (diagnostics.some((d) => d.severity === "error"))
    throw new CustomizationError(
      "export-validation",
      "The selected contributions cannot be composed.",
      diagnostics,
    );
  const work = mkdtempSync(join(tmpdir(), "aidlc-customization-export-"));
  try {
    const source = join(work, pluginId);
    mkdirSync(source);
    const put = (rel: string, bytes: string) => {
      const p = safeCustomizationPath(source, rel);
      mkdirSync(dirname(p), { recursive: true });
      writeFileSync(p, bytes);
    };
    const manifest = portable.find((i) => i.kind === "plugin");
    const metadata = manifest
      ? JSON.parse(manifest.content)
      : {
          name: pluginId,
          version: request.version ?? "0.1.0",
          description: "Exported AI-DLC customization",
          dependencies: ["core"],
          aidlc: { contributes: {} },
        };
    if (portable.some((i) => i.target?.contributionTo)) {
      metadata.aidlc ??= { contributes: {} };
      metadata.aidlc.contributes ??= {};
      metadata.aidlc.contributes.overlays = "contributions/";
    }
    put(".aidlc-plugin/plugin.json", `${JSON.stringify(metadata, null, 2)}\n`);
    for (const i of portable) {
      if (i.kind === "plugin") continue;
      const folder = (
        {
          stage: "stages",
          scope: "scopes",
          agent: "agents",
          sensor: "sensors",
          tool: "tools",
          knowledge: "knowledge",
        } as Record<string, string>
      )[i.kind];
      const leaf = i.target?.contributionTo
        ? `contributions/${slug(i.target.phase)}/${slug(i.target.contributionTo)}.md`
        : (i.source?.relativePath.split("/").slice(2).join("/") ??
          `${folder}/${i.target?.filename ?? `${slug(i.runtimeId)}.${i.kind === "tool" ? "ts" : "md"}`}`);
      if (i.kind === "knowledge") {
        const audience =
          Array.isArray(i.target?.audience) && i.target.audience.length
            ? slug(i.target.audience[0])
            : "aidlc-shared";
        const source =
          i.source?.relativePath ??
          `plugins/${pluginId}/knowledge/${audience}/${i.target?.filename ?? `${slug(i.runtimeId)}.md`}`;
        for (const path of knowledgeSourcePaths(i, source, catalog.spaceId))
          put(path.split("/").slice(2).join("/"), i.content);
      } else put(leaf, i.content);
    }
    const hooks = bundledPluginHookTemplatesDir();
    cpSync(hooks, join(source, "hooks"), { recursive: true });
    const validation = validatePluginRoot(source, {
      stageContext: { agents: all.filter((i) => i.kind === "agent").map((i) => i.runtimeId!) },
      coreStageSlugs: all
        .filter((i) => i.kind === "stage" && i.owner === "core")
        .map((i) => i.runtimeId!),
    });
    if (!validation.valid)
      throw new CustomizationError(
        "plugin-validation",
        `The selected contributions are not a valid standard plugin: ${validation.errors.map((e) => e.message).join("; ")}`,
        validation.errors,
      );
    const entries = walkSource(source, ".aidlc-plugin")
      .concat(
        ...[
          "stages",
          "contributions",
          "scopes",
          "agents",
          "sensors",
          "tools",
          "knowledge",
          "hooks",
        ].map((dir) => walkSource(source, dir)),
      )
      .map((path) => ({
        path: `${pluginId}/${path}`,
        bytes: readFileSync(safeCustomizationPath(source, path)),
      }));
    const targets = readPluginTargets(bundledPluginTargetsPath());
    for (const harness of request.harnesses?.length ? request.harnesses : Object.keys(targets)) {
      const target = targets[harness];
      if (!target) throw new CustomizationError("unsupported-harness", harness);
      const outDir = join(work, "projections", slug(harness));
      buildPluginProjection({
        pluginRoot: source,
        target,
        outDir,
        outputBoundary: work,
        templateHooksDir: hooks,
      });
      for (const path of walkSource(work, `projections/${harness}`))
        entries.push({ path, bytes: readFileSync(safeCustomizationPath(work, path)) });
    }
    const bytes = customizationZip(entries);
    return {
      filename: `${pluginId}.zip`,
      mimeType: "application/zip",
      base64: bytes.toString("base64"),
      bytes: bytes.length,
      sha256: hashBytes(bytes),
      omittedItemIds: omitted.map((i) => i.id),
      diagnostics,
    };
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}
