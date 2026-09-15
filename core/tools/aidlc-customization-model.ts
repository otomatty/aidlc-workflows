// Versioned, source-text customization model shared by native and copy installs.
import { basename } from "node:path";
import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { AIDLC_VERSION } from "./aidlc-version.ts";
import { readIndex } from "./aidlc-knowledge.ts";
import { parseCustomizationDocumentReference } from "./aidlc-customization-knowledge.ts";
import { REQUIRED_CUSTOMIZATION_GUARDS } from "./aidlc-customization-guard.ts";
import { validatePortableContribution } from "./aidlc-customization-portable-contributions.ts";
import { validateAdditionalCustomizationItems } from "./aidlc-customization-static-validation.ts";
import { parseStageFrontmatter, frontmatterBlock, scalarField } from "./aidlc-lib.ts";
import { validateStageFrontmatter } from "./aidlc-stage-schema.ts";
import { parseSensorManifest, validateSensorManifest } from "./aidlc-sensor-schema.ts";
import {
  CustomizationError,
  hashBytes,
  safeCustomizationPath,
  customizationJson,
  assertCustomizationReadable,
  unfinishedCustomizationWorkflows,
  activeCustomizationLeases,
} from "./aidlc-customization-guard.ts";

export type CustomizationKind =
  | "rule-section"
  | "rule-file-metadata"
  | "artifact-template"
  | "knowledge"
  | "stage"
  | "scope"
  | "agent"
  | "sensor"
  | "tool"
  | "plugin";
export type CustomizationItem = {
  id: string;
  kind: CustomizationKind;
  title: string;
  owner: "core" | "plugin" | "project";
  pluginId?: string;
  runtimeId?: string;
  spaceId?: string;
  content: string;
  originalContent?: string;
  target?: {
    layer?: "org" | "team" | "project" | "phase";
    phase?: string;
    heading?: string;
    contributionTo?: string;
    knowledgeType?: "team-markdown" | "plugin-markdown" | "document-source" | "document-reference";
    audience?: "all" | string[];
    filename?: string;
  };
  binary?: { base64: string; bytes: number; sha256: string; mimeType: string };
  source?: { relativePath: string; hash: string };
  editable?: boolean;
};
export type Diagnostic = {
  severity: "error" | "warning";
  code: string;
  message: string;
  itemId?: string;
  field?: string;
};
export type CustomizationRequest = {
  schemaVersion: 1;
  requestId?: string;
  spaceId?: string;
  items?: CustomizationItem[];
  removedItemIds?: string[];
  expectedConfigurationRevision?: string;
  planId?: string;
  transactionId?: string;
  format?: string;
  selectedItemIds?: string[];
  harnesses?: string[];
  name?: string;
  version?: string;
};
export type Harness = { name: string; dir: string };
export type Catalog = {
  workspaceName: string;
  spaceId: string;
  spaces: string[];
  engineVersion: string;
  configurationRevision: string;
  capabilities: ReturnType<typeof customizationCapabilities>;
  items: CustomizationItem[];
  diagnostics: Diagnostic[];
};
export const KINDS: CustomizationKind[] = [
  "rule-section",
  "rule-file-metadata",
  "artifact-template",
  "knowledge",
  "stage",
  "scope",
  "agent",
  "sensor",
  "tool",
  "plugin",
];
export const SOURCE_DIR = "aidlc/guide-customization";
export function overrideSourcePath(item: Pick<CustomizationItem, "kind" | "id">): string {
  return `${SOURCE_DIR}/overrides/${item.kind}/${hashBytes(item.id).slice(7)}.json`;
}
export function validId(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,239}$/.test(value);
}
export function slug(value: unknown): string {
  if (typeof value !== "string" || !/^[a-z][a-z0-9-]{0,100}$/.test(value))
    throw new CustomizationError("invalid-id", `Invalid name: ${String(value)}`);
  return value;
}
export function fileBytes(root: string, rel: string): Buffer | null {
  try {
    const p = safeCustomizationPath(root, rel);
    if (!lstatSync(p).isFile())
      throw new CustomizationError("unsafe-path", `${rel} is not a regular file`);
    return readFileSync(p);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}
export function fileMode(root: string, rel: string): number | undefined {
  try {
    return lstatSync(safeCustomizationPath(root, rel)).mode & 0o777;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}
/** All source copies represented by one audience selection. */
export function knowledgeSourcePaths(
  i: CustomizationItem,
  source: string,
  space: string,
): string[] {
  const prefix =
    i.owner === "plugin"
      ? `plugins/${slug(i.pluginId)}/knowledge`
      : `aidlc/spaces/${space}/knowledge`;
  return [
    source,
    ...(Array.isArray(i.target?.audience)
      ? i.target.audience.slice(1).map((agent) => `${prefix}/${slug(agent)}/${basename(source)}`)
      : []),
  ];
}
export function walkSource(root: string, rel: string): string[] {
  const path = safeCustomizationPath(root, rel);
  if (!existsSync(path)) return [];
  const stat = lstatSync(path);
  if (stat.isSymbolicLink())
    throw new CustomizationError("external-settings-root", `Linked configuration: ${rel}`);
  if (stat.isFile()) return [rel];
  if (!stat.isDirectory()) throw new CustomizationError("unsafe-path", `Unsupported file: ${rel}`);
  return readdirSync(path)
    .sort()
    .filter((n) => ![".local", ".git", "node_modules", "dist"].includes(n))
    .flatMap((n) => walkSource(root, `${rel}/${n}`));
}
export function installedCustomizationHarnesses(root: string): Harness[] {
  const entries: Harness[] = [];
  for (const dir of [".claude", ".cursor", ".codex", ".kiro", ".aidlc", ".opencode", ".github"]) {
    const descriptor = customizationJson<{ name?: string }>(root, `${dir}/tools/data/harness.json`);
    if (descriptor?.name) entries.push({ name: descriptor.name, dir });
  }
  return entries;
}
export function customizationCapabilities(root: string) {
  const harnesses = installedCustomizationHarnesses(root);
  let reason: string | undefined;
  if (!harnesses.length) reason = "No installed AI-DLC harness was found.";
  for (const dir of [".claude", ".cursor", ".codex", ".kiro", ".aidlc", ".opencode"])
    if (
      !harnesses.some((h) => h.dir === dir) &&
      ["tools/aidlc-lib.ts", "skills/aidlc/SKILL.md", "steering/aidlc.md"].some((rel) =>
        existsSync(safeCustomizationPath(root, `${dir}/${rel}`)),
      )
    )
      reason = `A legacy AI-DLC entrypoint in ${dir} has no verifiable harness descriptor.`;
  for (const key of [
    "AIDLC_RULES_DIR",
    "AIDLC_SCOPES_DIR",
    "AIDLC_STAGE_GRAPH",
    "AIDLC_SCOPE_GRID",
    "AIDLC_SENSORS_DIR",
  ])
    if (process.env[key]) reason = `External settings override ${key} is not supported for apply.`;
  for (const h of harnesses) {
    const capability = customizationJson<{
      protocolVersion?: number;
      guards?: Record<string, string>;
    }>(root, `${h.dir}/tools/data/customization-capabilities.json`);
    if (capability?.protocolVersion !== 1 || !capability.guards) {
      reason = `${h.name} lacks customization admission protocol 1.`;
      continue;
    }
    if (
      REQUIRED_CUSTOMIZATION_GUARDS.some(
        (rel) =>
          typeof capability.guards![rel] !== "string" ||
          !/^sha256:[a-f0-9]{64}$/.test(capability.guards![rel]),
      )
    ) {
      reason = `${h.name} does not attest every required configuration reader.`;
      continue;
    }
    for (const [rel, hash] of Object.entries(capability.guards)) {
      const bytes = fileBytes(root, `${h.dir}/${rel}`);
      if (!bytes || hashBytes(bytes) !== hash)
        reason = `${h.name} has an unverified configuration reader: ${rel}`;
    }
  }
  return {
    available: true,
    engineVersion: AIDLC_VERSION,
    protocolVersion: 1,
    canApply: reason === undefined,
    canExportPlugin: true,
    canRecover: true,
    ...(reason ? { reason } : {}),
  };
}
export function configurationFiles(root: string): string[] {
  const files = new Set<string>();
  for (const rel of [
    "aidlc.settings.json",
    "aidlc.settings.local.json",
    ".aidlc-version",
    `${SOURCE_DIR}/manifest.json`,
    `${SOURCE_DIR}/identities.json`,
  ])
    if (fileBytes(root, rel)) files.add(rel);
  for (const rel of [`${SOURCE_DIR}/overrides`, `${SOURCE_DIR}/document-references`, "plugins"])
    for (const p of walkSource(root, rel)) files.add(p);
  const spaces = safeCustomizationPath(root, "aidlc/spaces");
  if (existsSync(spaces))
    for (const space of readdirSync(spaces))
      for (const sub of ["memory", "knowledge"])
        for (const p of walkSource(root, `aidlc/spaces/${space}/${sub}`)) files.add(p);
  for (const h of installedCustomizationHarnesses(root)) {
    for (const sub of ["aidlc-common/stages", "agents", "scopes", "sensors", "knowledge", "skills"])
      for (const p of walkSource(root, `${h.dir}/${sub}`)) files.add(p);
    for (const p of [
      "harness.json",
      "stage-graph.json",
      "scope-grid.json",
      "customization-capabilities.json",
      "projection.json",
      "agent-tiers.json",
    ])
      if (fileBytes(root, `${h.dir}/tools/data/${p}`)) files.add(`${h.dir}/tools/data/${p}`);
    for (const rel of walkSource(root, `${h.dir}/tools/data/customization-baseline`))
      files.add(rel);
    const capability = customizationJson<{ guards?: Record<string, string> }>(
      root,
      `${h.dir}/tools/data/customization-capabilities.json`,
    );
    for (const rel of Object.keys(capability?.guards ?? {}))
      if (fileBytes(root, `${h.dir}/${rel}`)) files.add(`${h.dir}/${rel}`);
  }
  for (const tree of [
    ".agents/skills",
    ".github/skills",
    ".github/agents",
    ".opencode/agents",
    ".kiro/settings",
  ])
    for (const rel of walkSource(root, tree)) files.add(rel);
  const manifest = customizationJson<{ projectedFiles?: string[] }>(
    root,
    `${SOURCE_DIR}/manifest.json`,
  );
  for (const rel of manifest?.projectedFiles ?? []) if (fileBytes(root, rel)) files.add(rel);
  return [...files].sort();
}
export function customizationBootstrapEligible(root: string): boolean {
  assertCustomizationReadable(root);
  if (
    existsSync(safeCustomizationPath(root, `${SOURCE_DIR}/manifest.json`)) ||
    activeCustomizationLeases(root).length ||
    unfinishedCustomizationWorkflows(root).length
  )
    return false;
  const capability = customizationCapabilities(root);
  return (
    !capability.canApply &&
    !!capability.reason &&
    (capability.reason.includes("lacks customization admission protocol") ||
      capability.reason.includes("legacy AI-DLC entrypoint") ||
      capability.reason === "No installed AI-DLC harness was found.")
  );
}
export function sourceRevision(root: string): string {
  return hashBytes(
    JSON.stringify(configurationFiles(root).map((p) => [p, hashBytes(fileBytes(root, p)!)])),
  );
}
function stableId(kind: string, path: string, part = ""): string {
  return `${kind}:${hashBytes(`${path}\0${part}`).slice(7, 31)}`;
}
function item(
  root: string,
  kind: CustomizationKind,
  rel: string,
  extra: Partial<CustomizationItem> = {},
): CustomizationItem {
  const bytes = fileBytes(root, rel)!;
  const raw = bytes.toString("utf8");
  const fm = frontmatterBlock(raw) ?? "";
  const runtimeId =
    kind === "knowledge"
      ? `knowledge-${hashBytes(rel).slice(7, 31)}`
      : scalarField(fm, "slug") ||
        scalarField(fm, "id") ||
        scalarField(fm, "name") ||
        basename(rel).replace(/\.[^.]+$/, "");
  return {
    id: stableId(kind, rel),
    kind,
    title:
      scalarField(fm, "display_name") ||
      scalarField(fm, "name") ||
      (kind === "knowledge" ? basename(rel) : runtimeId),
    owner: "core",
    runtimeId,
    content: raw,
    source: { relativePath: rel, hash: hashBytes(bytes) },
    editable: true,
    ...extra,
  };
}
export function ruleSections(
  raw: string,
): Array<{ heading: string; content: string; start: number; end: number }> {
  const matches = [...raw.matchAll(/^##[ \t]+([^\r\n]+)\r?$/gm)];
  return matches.map((m, i) => ({
    heading: m[1],
    content: raw.slice(m.index, matches[i + 1]?.index ?? raw.length),
    start: m.index!,
    end: matches[i + 1]?.index ?? raw.length,
  }));
}
export function readCustomizationCatalog(root: string, spaceId = "default"): Catalog {
  assertCustomizationReadable(root);
  slug(spaceId);
  const spacesDir = safeCustomizationPath(root, "aidlc/spaces");
  const spaces = existsSync(spacesDir)
    ? readdirSync(spacesDir)
        .filter((n) => lstatSync(safeCustomizationPath(root, `aidlc/spaces/${n}`)).isDirectory())
        .sort()
    : ["default"];
  if (!spaces.includes(spaceId))
    throw new CustomizationError("invalid-space", `Unknown space: ${spaceId}`);
  const items: CustomizationItem[] = [];
  const diagnostics: Diagnostic[] = [];
  for (const rel of walkSource(root, `aidlc/spaces/${spaceId}/memory`)) {
    if (!rel.endsWith(".md")) continue;
    if (rel.includes("/templates/")) {
      items.push(item(root, "artifact-template", rel, { owner: "project", spaceId }));
      continue;
    }
    const raw = fileBytes(root, rel)!.toString("utf8");
    const phase = rel.match(/\/phases\/([a-z-]+)\.md$/)?.[1];
    const layer = phase ? "phase" : (basename(rel, ".md") as "org" | "team" | "project");
    if (!["org", "team", "project", "phase"].includes(layer)) continue;
    const sections = ruleSections(raw);
    const duplicate = new Set(
      sections
        .filter((s) => sections.filter((p) => p.heading === s.heading).length > 1)
        .map((s) => s.heading),
    );
    for (const section of sections)
      items.push(
        item(root, "rule-section", rel, {
          id: stableId("rule-section", rel, section.heading),
          title: section.heading,
          content: section.content,
          owner: "project",
          spaceId,
          target: { layer, phase, heading: section.heading },
          editable: !duplicate.has(section.heading),
        }),
      );
    items.push(
      item(root, "rule-file-metadata", rel, {
        owner: "project",
        spaceId,
        title: `${phase ?? layer} metadata`,
        content: raw.match(/^\uFEFF?---\r?\n[\s\S]*?\r?\n---(?:\r?\n)?/)?.[0] ?? "",
        target: { layer, phase },
      }),
    );
  }
  for (const rel of walkSource(root, `aidlc/spaces/${spaceId}/knowledge`)) {
    if (rel.includes("/documentkb/")) continue;
    if (/\/guide-document-[a-f0-9]{24}\.md$/.test(rel)) continue;
    const doc = rel.includes("/documents/");
    const bytes = fileBytes(root, rel)!;
    if (bytes.length > 10 * 1024 * 1024) {
      diagnostics.push({
        severity: "warning",
        code: "file-too-large",
        message: `${rel} exceeds the editable document limit.`,
      });
      continue;
    }
    const audience = rel.split("/knowledge/")[1]?.split("/")[0] ?? "aidlc-shared";
    items.push(
      item(root, "knowledge", rel, {
        owner: "project",
        spaceId,
        content: doc ? "" : bytes.toString("utf8"),
        target: {
          knowledgeType: doc ? "document-source" : "team-markdown",
          filename: basename(rel),
          audience: audience === "aidlc-shared" ? "all" : [audience],
        },
        ...(doc
          ? {
              binary: {
                base64: bytes.toString("base64"),
                bytes: bytes.length,
                sha256: hashBytes(bytes).slice(7),
                mimeType: "application/octet-stream",
              },
            }
          : {}),
      }),
    );
  }
  for (const row of readIndex(root, spaceId).documents.filter((row) => !row.removed_at)) {
    const sourceItem = items.find(
      (i) =>
        i.target?.knowledgeType === "document-source" &&
        i.source?.relativePath === `aidlc/spaces/${spaceId}/knowledge/${row.source.path}`,
    );
    const ref = {
      documentId: row.id,
      sourceRevision: row.sha256,
      ...(sourceItem ? { sourceItemId: sourceItem.id } : {}),
    };
    const rel = `aidlc/spaces/${spaceId}/knowledge/documentkb/${row.id}/metadata.json`;
    items.push({
      id: stableId("document-reference", row.id),
      kind: "knowledge",
      owner: "project",
      runtimeId: row.id,
      spaceId,
      title: basename(row.source.path),
      content: `${JSON.stringify(ref, null, 2)}\n`,
      target: { knowledgeType: "document-reference", audience: "all" },
      source: { relativePath: rel, hash: hashBytes(fileBytes(root, rel) ?? JSON.stringify(row)) },
      editable: true,
    });
  }
  const primary = installedCustomizationHarnesses(root)[0];
  if (primary)
    for (const [kind, sub] of [
      ["stage", "aidlc-common/stages"],
      ["agent", "agents"],
      ["scope", "scopes"],
      ["sensor", "sensors"],
    ] as const) {
      for (const rel of walkSource(root, `${primary.dir}/${sub}`).filter((p) =>
        p.endsWith(".md"),
      )) {
        const baseline = fileBytes(
          root,
          `${primary.dir}/tools/data/customization-baseline/${rel.slice(primary.dir.length + 1)}`,
        );
        items.push(
          item(
            root,
            kind,
            rel,
            baseline ? { originalContent: baseline.toString("utf8") } : { editable: false },
          ),
        );
      }
    }
  for (const rel of walkSource(root, "plugins")) {
    const m = rel.match(/^plugins\/([^/]+)\/(.+)$/);
    if (!m) continue;
    const pluginId = m[1],
      tail = m[2];
    const kind =
      tail === ".aidlc-plugin/plugin.json"
        ? "plugin"
        : (
            {
              stages: "stage",
              contributions: "stage",
              scopes: "scope",
              agents: "agent",
              sensors: "sensor",
              tools: "tool",
              knowledge: "knowledge",
            } as Record<string, CustomizationKind>
          )[tail.split("/")[0]];
    if (!kind || (kind !== "tool" && kind !== "plugin" && !tail.endsWith(".md"))) continue;
    const contribution = tail.match(/^contributions\/([^/]+)\/([^/]+)\.md$/);
    const owned = item(root, kind, rel, {
      owner: "plugin",
      pluginId,
      ...(contribution
        ? {
            runtimeId: `${pluginId}-contribution-${contribution[2]}`,
            target: { contributionTo: contribution[2], phase: contribution[1] },
          }
        : {}),
      ...(kind === "knowledge"
        ? {
            runtimeId: `${pluginId}-knowledge-${hashBytes(tail).slice(7, 31)}`,
            target: {
              knowledgeType: "plugin-markdown",
              filename: basename(rel),
              audience:
                tail.split("/").length > 2 && tail.split("/")[1] !== "aidlc-shared"
                  ? [tail.split("/")[1]]
                  : "all",
            },
          }
        : {}),
    });
    const projected = items.findIndex(
      (i) => i.kind === owned.kind && i.runtimeId === owned.runtimeId,
    );
    if (projected >= 0) items.splice(projected, 1);
    items.push(owned);
  }
  const stored = customizationJson<{ items?: CustomizationItem[] }>(
    root,
    `${SOURCE_DIR}/manifest.json`,
  );
  for (const saved of stored?.items ?? []) {
    if (saved.target?.knowledgeType === "document-reference" && saved.source) {
      const bytes = fileBytes(root, saved.source.relativePath);
      if (bytes) {
        const ref = {
          ...saved,
          content: bytes.toString("utf8"),
          source: { ...saved.source, hash: hashBytes(bytes) },
        };
        const existing = items.findIndex(
          (i) =>
            i.target?.knowledgeType === "document-reference" && i.runtimeId === saved.runtimeId,
        );
        if (existing >= 0) items[existing] = ref;
        else items.push(ref);
      }
      continue;
    }
    const found = items.findIndex(
      (i) =>
        i.kind === saved.kind &&
        ((saved.source &&
          i.source?.relativePath === saved.source.relativePath &&
          (saved.kind !== "rule-section" || i.target?.heading === saved.target?.heading)) ||
          (saved.runtimeId && i.runtimeId === saved.runtimeId && i.spaceId === saved.spaceId)),
    );
    if (found >= 0) {
      items[found] = { ...items[found], id: saved.id };
      if (
        saved.kind === "knowledge" &&
        ["team-markdown", "plugin-markdown"].includes(saved.target?.knowledgeType ?? "") &&
        Array.isArray(saved.target?.audience) &&
        saved.source
      ) {
        const primary = items[found];
        const audience: string[] = [];
        for (const agent of saved.target.audience) {
          const prefix =
            saved.owner === "plugin"
              ? `plugins/${slug(saved.pluginId)}/knowledge`
              : `aidlc/spaces/${spaceId}/knowledge`;
          const path = `${prefix}/${slug(agent)}/${basename(saved.source.relativePath)}`;
          const copy = items.find((i) => i.kind === "knowledge" && i.source?.relativePath === path);
          if (copy?.content === primary.content) {
            audience.push(agent);
            if (copy !== primary) items.splice(items.indexOf(copy), 1);
          } else if (copy)
            diagnostics.push({
              severity: "warning",
              code: "knowledge-copy-diverged",
              message: `${path} was edited separately and is retained as an independent item.`,
              itemId: primary.id,
            });
        }
        primary.target = { ...primary.target, audience };
      }
    }
  }
  try {
    for (const message of unfinishedCustomizationWorkflows(root))
      diagnostics.push({ severity: "warning", code: "workflow-active", message });
    for (const l of activeCustomizationLeases(root))
      diagnostics.push({ severity: "warning", code: "operation-active", message: l.sessionId });
  } catch (error) {
    diagnostics.push({ severity: "error", code: "workflow-state-unknown", message: String(error) });
  }
  return {
    workspaceName: basename(root),
    spaceId,
    spaces,
    engineVersion: AIDLC_VERSION,
    configurationRevision: sourceRevision(root),
    capabilities: customizationCapabilities(root),
    items,
    diagnostics,
  };
}
export function validateCustomizationItems(items: CustomizationItem[]): Diagnostic[] {
  const errors: Diagnostic[] = [];
  const add = (
    i: CustomizationItem,
    code: string,
    message: string,
    severity: "error" | "warning" = "error",
  ) => errors.push({ severity, code, message, itemId: i.id });
  const ids = new Set<string>();
  const runtime = new Set<string>();
  const stages = new Map<string, Record<string, unknown>>();
  const agents = items.filter((i) => i.kind === "agent").map((i) => i.runtimeId ?? "");
  for (const i of items) {
    if (
      !i ||
      !validId(i.id) ||
      !KINDS.includes(i.kind) ||
      typeof i.content !== "string" ||
      !["core", "plugin", "project"].includes(i.owner)
    )
      throw new CustomizationError("bad-request", "Invalid customization item.");
    if (ids.has(i.id)) add(i, "duplicate-id", "Duplicate item ID");
    ids.add(i.id);
    if (Buffer.byteLength(i.content) > 10 * 1024 * 1024)
      add(i, "file-too-large", "Item exceeds 10 MiB");
    if (i.runtimeId && ["stage", "scope", "sensor", "agent"].includes(i.kind)) {
      const key = `${i.kind}:${i.runtimeId}`;
      if (runtime.has(key)) add(i, "duplicate-name", `Duplicate runtime name ${i.runtimeId}`);
      runtime.add(key);
    }
    try {
      if (i.kind === "stage") {
        if (i.target?.contributionTo) {
          errors.push(...validatePortableContribution(i, items));
          continue;
        }
        const data = parseStageFrontmatter(i.content),
          result = validateStageFrontmatter(data, { agents });
        if (!result.valid) for (const e of result.errors) add(i, "stage-schema", e);
        else {
          if (result.data.slug !== i.runtimeId)
            add(i, "stage-identity", "Stage slug must match runtimeId");
          stages.set(result.data.slug, data);
          if (result.data.mode === "agent-team" || result.data.when)
            add(i, "unsupported-runtime", "agent-team and when are not executable in this version");
        }
      } else if (i.kind === "sensor") {
        validateSensorManifest(parseSensorManifest(i.content), i.title, i.runtimeId ?? "");
      } else if (i.kind === "scope") {
        const fm = frontmatterBlock(i.content) ?? "";
        slug(scalarField(fm, "name"));
        if (!["Minimal", "Standard", "Comprehensive"].includes(scalarField(fm, "depth")))
          add(i, "scope-depth", "depth must be Minimal, Standard, or Comprehensive");
      } else if (i.kind === "agent") {
        const fm = frontmatterBlock(i.content) ?? "";
        slug(scalarField(fm, "name"));
        const tier = scalarField(fm, "tier");
        if (tier && !["judgment", "balanced", "templated"].includes(tier))
          add(i, "agent-tier", "Unknown agent tier");
      } else if (i.kind === "plugin") {
        const manifest = JSON.parse(i.content);
        slug(manifest.name);
        if (
          typeof manifest.version !== "string" ||
          !/^\d+\.\d+\.\d+(?:[-+].+)?$/.test(manifest.version)
        )
          add(i, "plugin-version", "Plugin requires a semantic version");
      } else if (i.kind === "rule-section") {
        if (
          !i.target?.layer ||
          !i.target.heading ||
          ruleSections(i.content).length !== 1 ||
          ruleSections(i.content)[0].heading !== i.target.heading
        )
          add(
            i,
            "rule-section",
            "A rule item needs a target layer, matching heading, and exactly one H2 section",
          );
      } else if (i.kind === "knowledge" && i.target?.knowledgeType === "document-reference") {
        parseCustomizationDocumentReference(i);
      } else if (i.kind === "knowledge" && i.target?.knowledgeType === "document-source") {
        if (!i.binary) add(i, "document-source", "Document bytes are missing");
        else {
          const bytes = Buffer.from(i.binary.base64, "base64");
          if (
            bytes.length !== i.binary.bytes ||
            hashBytes(bytes).slice(7) !== i.binary.sha256.replace(/^sha256:/, "") ||
            bytes.length > 10 * 1024 * 1024
          )
            add(i, "document-hash", "Document bytes, size, or hash do not match");
        }
      }
    } catch (error) {
      add(i, "invalid-definition", String(error));
    }
  }
  for (const [id, stage] of stages) {
    const i = items.find((i) => i.kind === "stage" && i.runtimeId === id);
    if (!i) continue;
    for (const dep of (stage.requires_stage ?? []) as string[])
      if (!stages.has(dep)) add(i, "missing-stage", `Unknown prerequisite ${dep}`);
    for (const sensor of (stage.sensors ?? []) as string[])
      if (!items.some((i) => i.kind === "sensor" && i.runtimeId === sensor))
        add(i, "missing-sensor", `Unknown sensor ${sensor}`);
    for (const scope of (stage.scopes ?? []) as string[])
      if (!items.some((i) => i.kind === "scope" && i.runtimeId === scope))
        add(i, "missing-scope", `Unknown scope ${scope}`);
  }
  const active = new Set<string>(),
    visited = new Set<string>();
  const visit = (id: string) => {
    if (active.has(id)) {
      errors.push({
        severity: "error",
        code: "stage-cycle",
        message: `Stage dependency cycle at ${id}`,
      });
      return;
    }
    if (visited.has(id)) return;
    active.add(id);
    for (const d of (stages.get(id)?.requires_stage ?? []) as string[]) visit(d);
    active.delete(id);
    visited.add(id);
  };
  for (const id of stages.keys()) visit(id);
  return [...errors, ...validateAdditionalCustomizationItems(items)];
}
export function overlayCustomization(
  catalog: Catalog,
  request: CustomizationRequest,
): CustomizationItem[] {
  if (
    request.schemaVersion !== 1 ||
    !Array.isArray(request.items ?? []) ||
    !Array.isArray(request.removedItemIds ?? [])
  )
    throw new CustomizationError("bad-request", "Expected customization schemaVersion 1");
  const removed = new Set(request.removedItemIds ?? []);
  const map = new Map(catalog.items.filter((i) => !removed.has(i.id)).map((i) => [i.id, i]));
  for (const incoming of request.items ?? []) {
    if (!validId(incoming?.id)) throw new CustomizationError("bad-request", "Invalid item ID");
    const old = catalog.items.find((i) => i.id === incoming.id);
    if (old?.editable === false) throw new CustomizationError("item-not-editable", old.title);
    if (
      old?.runtimeId &&
      old.runtimeId !== incoming.runtimeId &&
      ["stage", "scope", "agent", "sensor", "tool", "plugin", "artifact-template"].includes(
        old.kind,
      )
    )
      throw new CustomizationError(
        "identity-change-unsupported",
        "Existing definition identifiers are fixed. Create a new definition and update its references before removing the old one.",
      );
    if (
      old?.source &&
      (old.kind === "tool" || (old.kind === "knowledge" && old.owner === "plugin")) &&
      old.target?.filename !== incoming.target?.filename
    )
      throw new CustomizationError(
        "identity-change-unsupported",
        "An existing plugin file cannot be renamed; add a new item and remove the old one.",
      );
    if (old?.kind === "knowledge" && old.target?.knowledgeType !== incoming.target?.knowledgeType)
      throw new CustomizationError(
        "identity-change-unsupported",
        "An existing document cannot change its kind; add a new item instead.",
      );
    if (old?.pluginId && incoming.pluginId !== old.pluginId)
      throw new CustomizationError(
        "identity-change-unsupported",
        "Existing definitions retain their owning plugin.",
      );
    map.set(incoming.id, {
      ...incoming,
      ...(old
        ? { owner: old.owner, source: old.source, pluginId: old.pluginId }
        : { source: undefined }),
    });
  }
  return [...map.values()];
}

export function validateCustomizationSelection(
  catalog: Catalog,
  request: CustomizationRequest,
): Diagnostic[] {
  const all = overlayCustomization(catalog, request);
  if (!request.selectedItemIds) return validateCustomizationItems(all);
  const selected = new Set(request.selectedItemIds);
  const unknown = [...selected].filter((id) => !all.some((i) => i.id === id));
  if (unknown.length)
    throw new CustomizationError("unknown-item", "Unknown export selection", unknown);
  // A package can rely on the selected engine's core definitions. References
  // to another project/plugin contribution must accompany the export.
  return validateCustomizationItems(all.filter((i) => i.owner === "core" || selected.has(i.id)));
}
