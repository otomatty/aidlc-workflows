// Candidate generation is data-only. No project command, hook, or sensor runs.
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import {
  _resetAgentsForTests,
  _resetScopeMappingForTests,
  _resetStageGraphForTests,
  _resetHarnessDataForTests,
  frontmatterBlock,
  scalarField,
} from "./aidlc-lib.ts";
import { __resetGraphCache, compileStageGraph } from "./aidlc-graph.ts";
import { regenerateRunnerSurfaces } from "./aidlc-runner-gen.ts";
import { onboard, readIndex, rebindDocument, syncDocuments } from "./aidlc-knowledge.ts";
import { AIDLC_VERSION } from "./aidlc-version.ts";
import {
  CustomizationError,
  hashBytes,
  safeCustomizationPath,
  customizationJson,
} from "./aidlc-customization-guard.ts";
import {
  type CustomizationItem,
  type CustomizationRequest,
  type Catalog,
  type Diagnostic,
  type Harness,
  SOURCE_DIR,
  fileBytes,
  fileMode,
  installedCustomizationHarnesses,
  overlayCustomization,
  ruleSections,
  slug,
  validateCustomizationItems,
  walkSource,
  configurationFiles,
  knowledgeSourcePaths,
} from "./aidlc-customization-model.ts";
import { overrideSourcePath } from "./aidlc-customization-model.ts";
import {
  documentReferenceSource,
  documentReferencePointers,
  generateDocumentReference,
} from "./aidlc-customization-knowledge.ts";
import { mergePortableContributions } from "./aidlc-customization-portable-contributions.ts";
import { projectCustomizationAgent } from "./aidlc-customization-agents.ts";

export type PlannedFile = {
  relativePath: string;
  beforeHash: string | null;
  afterHash: string | null;
  beforeBase64: string | null;
  afterBase64: string | null;
  beforeMode?: number;
  afterMode?: number;
  itemIds: string[];
  generated: boolean;
};
export type EnginePlan = {
  id: string;
  kind?: "customization" | "bootstrap-install";
  configurationRevision: string;
  files: PlannedFile[];
  diagnostics: Diagnostic[];
  canApply: boolean;
  createdAt: string;
  items: CustomizationItem[];
  requestHash: string;
};
function candidateWrite(root: string, rel: string, content: string | Buffer): void {
  const file = safeCustomizationPath(root, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}
function normalize(text: string, dir: string): string {
  return text.replaceAll(dir, "{{HARNESS_DIR}}");
}
function render(text: string, h: Harness): string {
  return text
    .replaceAll("{{HARNESS_DIR}}", h.dir)
    .replaceAll("{{INVOKE}}", `bun ${h.dir}/tools/aidlc.ts`);
}
function memoryFile(space: string, target: NonNullable<CustomizationItem["target"]>): string {
  if (!target.layer || !["org", "team", "project", "phase"].includes(target.layer))
    throw new CustomizationError("invalid-target", "A rule target needs its layer");
  if (target.layer === "phase") {
    if (!["ideation", "inception", "construction", "operation"].includes(target.phase ?? ""))
      throw new CustomizationError("invalid-target", "Invalid phase");
    return `aidlc/spaces/${space}/memory/phases/${target.phase}.md`;
  }
  return `aidlc/spaces/${space}/memory/${target.layer}.md`;
}
function filename(value: string): string {
  if (
    !value ||
    value.length > 180 ||
    /[<>:"/\\|?*]/.test(value) ||
    [...value].some((c) => c.charCodeAt(0) < 32) ||
    /[. ]$/.test(value) ||
    /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(value) ||
    value === "." ||
    value === ".."
  )
    throw new CustomizationError("invalid-filename", `Invalid filename ${value}`);
  return value;
}
function splitFrontmatter(raw: string): {
  head: string;
  body: string;
  fields: Map<string, string>;
  newline: string;
} {
  const match = raw.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n)?/);
  if (!match)
    return {
      head: "",
      body: raw,
      fields: new Map(),
      newline: raw.includes("\r\n") ? "\r\n" : "\n",
    };
  const entries = [...match[1].matchAll(/^([a-zA-Z_][\w-]*):[^\r\n]*(?:\r?\n|$)/gm)];
  return {
    head: match[0],
    body: raw.slice(match[0].length),
    fields: new Map(
      entries.map((m, index) => [
        m[1],
        match[1].slice(m.index, entries[index + 1]?.index ?? match[1].length).replace(/\r?\n$/, ""),
      ]),
    ),
    newline: raw.includes("\r\n") ? "\r\n" : "\n",
  };
}
/** Keep target-specific metadata while changing exactly the authored fields. */
export function mergeCustomizationText(base: string, edited: string, target: string): string {
  if (target === base) return edited;
  if (edited === base) return target;
  const a = splitFrontmatter(base),
    b = splitFrontmatter(edited),
    t = splitFrontmatter(target);
  let body = t.body;
  if (a.body !== b.body) {
    if (t.body !== a.body)
      throw new CustomizationError(
        "projection-conflict",
        "Harness-specific body differs from the edited baseline. Reconcile the source before applying.",
      );
    body = b.body;
  }
  let header = t.head;
  for (const key of new Set([...a.fields.keys(), ...b.fields.keys()])) {
    const before = a.fields.get(key),
      after = b.fields.get(key),
      current = t.fields.get(key);
    if (before === after) continue;
    if (current !== before && current !== after)
      throw new CustomizationError("projection-conflict", `Harness-specific field differs: ${key}`);
    if (current !== undefined) header = header.replace(current, after ?? "");
    else if (after !== undefined)
      header = header.replace(
        /\r?\n---(?:\r?\n)?$/,
        `${t.newline}${after}${t.newline}---${t.newline}`,
      );
  }
  return header + body;
}
function sourcePathFor(i: CustomizationItem, space: string): string {
  if (i.kind === "rule-section") return memoryFile(space, i.target ?? {});
  if (i.kind === "knowledge" && i.target?.knowledgeType === "document-reference")
    return documentReferenceSource(i);
  if (i.kind === "stage" && i.target?.contributionTo)
    return `plugins/${slug(i.pluginId)}/contributions/${slug(i.target.phase)}/${slug(i.target.contributionTo)}.md`;
  if (i.source && i.kind !== "knowledge") return i.source.relativePath;
  if (i.kind === "rule-file-metadata") return memoryFile(space, i.target ?? {});
  if (i.kind === "artifact-template")
    return `aidlc/spaces/${space}/memory/templates/${filename(i.runtimeId ?? i.title)}.md`;
  if (i.kind === "knowledge") {
    const leaf = filename(
      i.target?.filename ?? `${slug(i.runtimeId ?? i.id.replaceAll(":", "-"))}.md`,
    );
    if (i.target?.knowledgeType === "document-source")
      return i.source && basename(i.source.relativePath) === leaf
        ? i.source.relativePath
        : `aidlc/spaces/${space}/knowledge/documents/${leaf}`;
    const who =
      i.target?.audience === "all" || !i.target?.audience?.length
        ? "aidlc-shared"
        : slug(i.target.audience[0]);
    if (
      i.source &&
      basename(i.source.relativePath) === leaf &&
      i.source.relativePath.includes(`/knowledge/${who}/`)
    )
      return i.source.relativePath;
    return i.owner === "plugin"
      ? `plugins/${slug(i.pluginId)}/knowledge/${who}/${leaf}`
      : `aidlc/spaces/${space}/knowledge/${who}/${leaf}`;
  }
  const plugin = slug(i.pluginId);
  if (i.kind === "plugin") return `plugins/${plugin}/.aidlc-plugin/plugin.json`;
  const id = slug(i.runtimeId);
  if (!id.startsWith(`${plugin}-`))
    throw new CustomizationError("plugin-namespace", `New ${i.kind} must start with ${plugin}-`);
  const folder = {
    stage: "stages",
    scope: "scopes",
    agent: "agents",
    sensor: "sensors",
    tool: "tools",
    knowledge: "knowledge",
  }[i.kind];
  if (!folder) throw new CustomizationError("invalid-item", i.kind);
  return `plugins/${plugin}/${folder}/${i.kind === "tool" ? filename(i.target?.filename ?? `${id}.ts`) : `${id}.md`}`;
}
function projectedPath(i: CustomizationItem, h: Harness, old?: CustomizationItem): string {
  if (old?.owner === "core" && old.source)
    return `${h.dir}/${old.source.relativePath.split("/").slice(1).join("/")}`;
  const id = slug(i.runtimeId);
  if (i.kind === "stage") {
    const phase = scalarField(frontmatterBlock(i.content) ?? "", "phase");
    slug(phase);
    return `${h.dir}/aidlc-common/stages/${phase}/${id}.md`;
  }
  if (i.kind === "tool") return `${h.dir}/tools/${filename(i.target?.filename ?? `${id}.ts`)}`;
  if (i.kind === "knowledge")
    return `${h.dir}/knowledge/${sourcePathFor(i, i.spaceId ?? "default").split("/knowledge/")[1]}`;
  const sub = { scope: "scopes", agent: "agents", sensor: "sensors" }[
    i.kind as "scope" | "agent" | "sensor"
  ];
  if (!sub) throw new CustomizationError("invalid-projection", i.kind);
  return `${h.dir}/${sub}/${id}.md`;
}
function compileCandidate(candidate: string, h: Harness, space: string): void {
  const changes: Record<string, string> = {
    AIDLC_PROJECT_DIR: candidate,
    AIDLC_RUNTIME_PROJECT_DIR: candidate,
    AIDLC_RUNTIME_HARNESS_ROOT: join(candidate, h.dir),
    AIDLC_SRC: join(candidate, h.dir),
    AIDLC_HARNESS_DIR: h.dir,
    AIDLC_HARNESS_NAME: h.name,
    AIDLC_STAGES_DIR: join(candidate, h.dir, "aidlc-common/stages"),
    AIDLC_RULES_DIR: join(candidate, `aidlc/spaces/${space}/memory`),
    AIDLC_SCOPES_DIR: join(candidate, h.dir, "scopes"),
    AIDLC_SENSORS_DIR: join(candidate, h.dir, "sensors"),
    AIDLC_STAGE_GRAPH: join(candidate, h.dir, "tools/data/stage-graph.json"),
    AIDLC_SCOPE_GRID: join(candidate, h.dir, "tools/data/scope-grid.json"),
  };
  const prior = Object.fromEntries(Object.keys(changes).map((k) => [k, process.env[k]]));
  const reset = () => {
    _resetAgentsForTests();
    _resetScopeMappingForTests();
    _resetStageGraphForTests();
    _resetHarnessDataForTests();
    __resetGraphCache();
  };
  try {
    Object.assign(process.env, changes);
    reset();
    const compiled = compileStageGraph();
    candidateWrite(candidate, `${h.dir}/tools/data/stage-graph.json`, compiled.json);
    candidateWrite(candidate, `${h.dir}/tools/data/scope-grid.json`, compiled.gridJson);
    reset();
    regenerateRunnerSurfaces();
  } finally {
    for (const [key, value] of Object.entries(prior)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    reset();
  }
}
export function generateCustomizationPlan(
  root: string,
  catalog: Catalog,
  request: CustomizationRequest,
  forceProjection = false,
): EnginePlan {
  if (
    request.expectedConfigurationRevision &&
    request.expectedConfigurationRevision !== catalog.configurationRevision
  )
    throw new CustomizationError(
      "configuration-changed",
      "Configuration changed after the draft was created.",
    );
  const items = overlayCustomization(catalog, request);
  const diagnostics = validateCustomizationItems(items);
  const plan: EnginePlan = {
    id: randomUUID(),
    configurationRevision: catalog.configurationRevision,
    files: [],
    diagnostics,
    canApply: false,
    createdAt: new Date().toISOString(),
    items,
    requestHash: hashBytes(JSON.stringify(request)),
  };
  const configurationId = hashBytes(`${catalog.configurationRevision}\0${plan.requestHash}`);
  if (diagnostics.some((d) => d.severity === "error")) return plan;
  const candidate = mkdtempSync(join(tmpdir(), "aidlc-customization-candidate-"));
  try {
    const harnesses = installedCustomizationHarnesses(root);
    const allBefore = new Map<string, Buffer>();
    for (const rel of configurationFiles(root)) {
      const bytes = fileBytes(root, rel)!;
      allBefore.set(rel, bytes);
      candidateWrite(candidate, rel, bytes);
    }
    const documentWork =
      (request.items ?? []).some((i) =>
        ["document-source", "document-reference"].includes(i.target?.knowledgeType ?? ""),
      ) ||
      (request.removedItemIds ?? []).some(
        (id) => catalog.items.find((i) => i.id === id)?.target?.knowledgeType === "document-source",
      );
    if (documentWork)
      for (const rel of [
        ...walkSource(root, `aidlc/spaces/${catalog.spaceId}/intents/audit`),
        "aidlc/.aidlc-clone-id",
      ]) {
        const bytes = fileBytes(root, rel);
        if (bytes) candidateWrite(candidate, rel, bytes);
      }
    for (const h of harnesses) {
      // Runtime resolvers use the installed tool marker, but generators execute
      // this module's trusted code rather than any script copied from a project.
      for (const rel of [
        `${h.dir}/tools/aidlc-lib.ts`,
        `${h.dir}/tools/data/projection.json`,
        `${h.dir}/tools/data/agent-tiers.json`,
      ]) {
        const bytes = fileBytes(root, rel);
        if (bytes) candidateWrite(candidate, rel, bytes);
      }
    }
    const touched = new Map<string, Set<string>>();
    const mark = (rel: string, id: string) => {
      const set = touched.get(rel) ?? new Set<string>();
      set.add(id);
      touched.set(rel, set);
    };
    const oldById = new Map(catalog.items.map((i) => [i.id, i]));
    const savedItems: CustomizationItem[] = [
      ...(customizationJson<{ items?: CustomizationItem[] }>(root, `${SOURCE_DIR}/manifest.json`)
        ?.items ?? []),
    ];
    const modified = request.items ?? [];
    for (const requested of modified) {
      const i = items.find((i) => i.id === requested.id)!;
      const old = oldById.get(i.id);
      if (
        old &&
        !(forceProjection && i.owner === "plugin") &&
        i.content === old.content &&
        JSON.stringify(i.target) === JSON.stringify(old.target) &&
        JSON.stringify(i.binary) === JSON.stringify(old.binary)
      )
        continue;
      if (
        !old &&
        ["stage", "scope", "agent", "sensor", "tool", "plugin"].includes(i.kind) &&
        i.owner !== "plugin"
      )
        throw new CustomizationError("owner-required", "New definitions need an owning plugin.");
      const source = sourcePathFor(i, catalog.spaceId);
      if (
        !old &&
        i.kind !== "rule-section" &&
        i.kind !== "rule-file-metadata" &&
        fileBytes(candidate, source)
      )
        throw new CustomizationError(
          "source-collision",
          `An existing source already owns ${source}`,
        );
      if (i.kind === "knowledge" && old?.source) {
        const oldPaths =
          old.target?.knowledgeType === "document-reference"
            ? documentReferencePointers(old, catalog.spaceId)
            : knowledgeSourcePaths(old, old.source.relativePath, catalog.spaceId);
        const nextPaths =
          i.target?.knowledgeType === "document-reference"
            ? documentReferencePointers(i, catalog.spaceId)
            : knowledgeSourcePaths(i, source, catalog.spaceId);
        for (const path of oldPaths)
          if (!nextPaths.includes(path)) {
            const abs = safeCustomizationPath(candidate, path);
            if (existsSync(abs)) rmSync(abs);
            mark(path, i.id);
            if (old.owner === "plugin")
              for (const h of harnesses) {
                const projected = `${h.dir}/knowledge/${path.split("/knowledge/")[1]}`;
                if (existsSync(safeCustomizationPath(candidate, projected)))
                  rmSync(safeCustomizationPath(candidate, projected));
                mark(projected, i.id);
              }
          }
      }
      if (old?.owner === "core") {
        const baselineRel = `${old.source!.relativePath.split("/")[0]}/tools/data/customization-baseline/${old.source!.relativePath.split("/").slice(1).join("/")}`;
        const baseline = fileBytes(root, baselineRel);
        if (!baseline)
          throw new CustomizationError(
            "source-baseline-missing",
            `No immutable source baseline for ${old.title}`,
          );
        const overrideRel = overrideSourcePath(i);
        if (i.content === baseline.toString("utf8")) {
          const path = safeCustomizationPath(candidate, overrideRel);
          if (existsSync(path)) rmSync(path);
        } else
          candidateWrite(
            candidate,
            overrideRel,
            `${JSON.stringify({ schemaVersion: 1, engineVersion: AIDLC_VERSION, baseContent: baseline.toString("utf8"), baseHash: hashBytes(baseline), item: i }, null, 2)}\n`,
          );
        mark(overrideRel, i.id);
      }
      if (i.kind === "rule-section") {
        if (old?.source && old.source.relativePath !== source) {
          const oldRaw = fileBytes(candidate, old.source.relativePath)!.toString("utf8");
          const parts = ruleSections(oldRaw).filter((s) => s.heading === old.target?.heading);
          if (parts.length !== 1) throw new CustomizationError("configuration-changed", old.title);
          candidateWrite(
            candidate,
            old.source.relativePath,
            oldRaw.slice(0, parts[0].start) + oldRaw.slice(parts[0].end),
          );
          mark(old.source.relativePath, i.id);
        }
        const raw = fileBytes(candidate, source)?.toString("utf8") ?? "";
        const sameFile = old?.source?.relativePath === source;
        const section = sameFile
          ? ruleSections(raw).filter((s) => s.heading === old.target?.heading)
          : [];
        if (sameFile && section.length !== 1)
          throw new CustomizationError(
            "configuration-changed",
            `Cannot identify rule section ${old!.title}`,
          );
        if (
          sameFile &&
          ruleSections(raw).some(
            (s) => s.heading === i.target?.heading && s.heading !== old?.target?.heading,
          )
        )
          throw new CustomizationError(
            "duplicate-rule-heading",
            `Target already has ${i.target?.heading}`,
          );
        if (!sameFile && ruleSections(raw).some((s) => s.heading === i.target?.heading))
          throw new CustomizationError(
            "duplicate-rule-heading",
            `Target already has ${i.target?.heading}`,
          );
        const next = section.length
          ? raw.slice(0, section[0].start) + i.content + raw.slice(section[0].end)
          : `${raw}${raw.endsWith("\n") || !raw ? "" : "\n"}${i.content}`;
        candidateWrite(candidate, source, next);
        mark(source, i.id);
      } else if (i.kind === "rule-file-metadata") {
        const raw = fileBytes(candidate, source)?.toString("utf8") ?? "";
        const oldPrefix = raw.match(/^\uFEFF?---\r?\n[\s\S]*?\r?\n---(?:\r?\n)?/)?.[0] ?? "";
        if (i.content && !/^\uFEFF?---\r?\n[\s\S]*?\r?\n---(?:\r?\n)?$/.test(i.content))
          throw new CustomizationError(
            "invalid-metadata",
            "Metadata must contain only a frontmatter block",
          );
        candidateWrite(candidate, source, i.content + raw.slice(oldPrefix.length));
        mark(source, i.id);
      } else if (i.kind === "knowledge" && i.target?.knowledgeType === "document-reference") {
        candidateWrite(candidate, source, i.content);
        mark(source, i.id);
      } else {
        const bytes = i.binary ? Buffer.from(i.binary.base64, "base64") : i.content;
        if (i.owner !== "core") {
          candidateWrite(candidate, source, bytes);
          mark(source, i.id);
        }
        if (i.kind === "artifact-template" || i.kind === "knowledge") {
          candidateWrite(candidate, source, bytes);
          mark(source, i.id);
          if (i.kind === "knowledge")
            for (const extra of knowledgeSourcePaths(i, source, catalog.spaceId).slice(1)) {
              candidateWrite(candidate, extra, bytes);
              mark(extra, i.id);
            }
        }
        if (
          !i.target?.contributionTo &&
          (["stage", "scope", "agent", "sensor", "tool"].includes(i.kind) ||
            (i.kind === "knowledge" && i.owner === "plugin"))
        ) {
          for (const h of harnesses) {
            const destination = projectedPath(i, h, old);
            const oldDestination = fileBytes(candidate, destination)?.toString("utf8");
            let next = i.content;
            if (old?.owner === "core" && oldDestination !== undefined)
              next = mergeCustomizationText(
                normalize(old.content, old.source!.relativePath.split("/")[0]),
                normalize(i.content, old.source!.relativePath.split("/")[0]),
                normalize(oldDestination, h.dir),
              );
            next = render(next, h);
            candidateWrite(candidate, destination, next);
            mark(destination, i.id);
            if (i.kind === "knowledge")
              for (const extra of knowledgeSourcePaths(i, source, catalog.spaceId).slice(1)) {
                const projected = `${h.dir}/knowledge/${extra.split("/knowledge/")[1]}`;
                candidateWrite(candidate, projected, next);
                mark(projected, i.id);
              }
            if (i.kind === "agent")
              projectCustomizationAgent(candidate, i, h, next, oldDestination, (path, content) => {
                candidateWrite(candidate, path, content);
                mark(path, i.id);
              });
          }
        }
      }
      const saved = {
        ...i,
        source: {
          relativePath: source,
          hash: hashBytes(fileBytes(candidate, source) ?? i.content),
        },
      };
      const existing = savedItems.findIndex((i) => i.id === saved.id);
      if (existing >= 0) savedItems[existing] = saved;
      else savedItems.push(saved);
    }
    for (const id of request.removedItemIds ?? []) {
      const old = oldById.get(id);
      if (!old) throw new CustomizationError("unknown-item", id);
      if (old.owner === "core")
        throw new CustomizationError(
          "core-delete-forbidden",
          "Core definitions cannot be deleted. Edit scope membership or restore the override instead.",
        );
      if (old.kind === "knowledge" && old.target?.knowledgeType === "document-reference") {
        for (const p of [
          documentReferenceSource(old),
          ...documentReferencePointers(old, catalog.spaceId),
        ]) {
          const path = safeCustomizationPath(candidate, p);
          if (existsSync(path)) rmSync(path);
          mark(p, id);
        }
      } else if (old.kind === "rule-section") {
        const source = old.source!.relativePath,
          raw = fileBytes(candidate, source)!.toString("utf8"),
          parts = ruleSections(raw).filter((s) => s.heading === old.target?.heading);
        if (parts.length !== 1) throw new CustomizationError("configuration-changed", old.title);
        candidateWrite(candidate, source, raw.slice(0, parts[0].start) + raw.slice(parts[0].end));
        mark(source, id);
      } else if (old.kind === "rule-file-metadata") {
        const source = old.source!.relativePath;
        const raw = fileBytes(candidate, source)!.toString("utf8");
        candidateWrite(candidate, source, splitFrontmatter(raw).body);
        mark(source, id);
      } else if (old.source) {
        rmSync(safeCustomizationPath(candidate, old.source.relativePath));
        mark(old.source.relativePath, id);
        if (old.kind === "knowledge")
          for (const path of knowledgeSourcePaths(
            old,
            old.source.relativePath,
            catalog.spaceId,
          ).slice(1)) {
            if (existsSync(safeCustomizationPath(candidate, path)))
              rmSync(safeCustomizationPath(candidate, path));
            mark(path, id);
          }
      }
      if (old.owner === "plugin" && !old.target?.contributionTo && old.kind !== "plugin")
        for (const h of harnesses) {
          const paths =
            old.kind === "knowledge" && old.source
              ? knowledgeSourcePaths(old, old.source.relativePath, catalog.spaceId).map(
                  (path) => `${h.dir}/knowledge/${path.split("/knowledge/")[1]}`,
                )
              : [projectedPath(old, h)];
          for (const p of paths) {
            if (existsSync(safeCustomizationPath(candidate, p)))
              rmSync(safeCustomizationPath(candidate, p));
            mark(p, id);
          }
          if (old.kind === "agent") {
            const native =
              h.name === "codex"
                ? `${h.dir}/agents/${slug(old.runtimeId)}.toml`
                : h.name === "kiro"
                  ? `${h.dir}/agents/${slug(old.runtimeId)}.json`
                  : h.name === "copilot"
                    ? `.github/agents/${slug(old.runtimeId)}.md`
                    : h.name === "opencode"
                      ? `.opencode/agents/${slug(old.runtimeId)}.md`
                      : undefined;
            if (native) {
              if (existsSync(safeCustomizationPath(candidate, native)))
                rmSync(safeCustomizationPath(candidate, native));
              mark(native, id);
            }
          }
        }
      const index = savedItems.findIndex((i) => i.id === id);
      if (index >= 0) savedItems.splice(index, 1);
    }
    const projectedFiles = new Set(
      customizationJson<{ projectedFiles?: string[] }>(root, `${SOURCE_DIR}/manifest.json`)
        ?.projectedFiles ?? [],
    );
    for (const path of touched.keys())
      if (harnesses.some((h) => path.startsWith(`${h.dir}/`))) projectedFiles.add(path);
    candidateWrite(
      candidate,
      `${SOURCE_DIR}/manifest.json`,
      `${JSON.stringify({ schemaVersion: 1, engineVersion: AIDLC_VERSION, configurationId, items: savedItems, projectedFiles: [...projectedFiles].sort() }, null, 2)}\n`,
    );
    const affectedContributions = new Set(
      [...items, ...catalog.items]
        .map((i) => i.target?.contributionTo)
        .filter((id): id is string => !!id),
    );
    for (const target of affectedContributions) {
      const core = catalog.items.find(
        (i) => i.kind === "stage" && i.owner === "core" && i.runtimeId === target,
      );
      if (!core?.source) throw new CustomizationError("contribution-target-missing", target);
      const selected = items.filter((i) => i.target?.contributionTo === target);
      for (const h of harnesses) {
        const rel = projectedPath(core, h, core),
          baseline = fileBytes(
            root,
            `${h.dir}/tools/data/customization-baseline/${rel.slice(h.dir.length + 1)}`,
          );
        if (!baseline) throw new CustomizationError("source-baseline-missing", target);
        const override = customizationJson<{ baseContent: string; item: CustomizationItem }>(
          candidate,
          overrideSourcePath(core),
        );
        let base = baseline.toString("utf8");
        if (override) {
          const from = override.item.source?.relativePath.split("/")[0] ?? h.dir;
          base = render(
            mergeCustomizationText(
              normalize(override.baseContent, from),
              normalize(override.item.content, from),
              normalize(base, h.dir),
            ),
            h,
          );
        }
        const merged = mergePortableContributions(base, selected);
        candidateWrite(candidate, rel, render(merged, h));
        for (const contribution of selected) mark(rel, contribution.id);
      }
    }
    for (const h of harnesses) compileCandidate(candidate, h, catalog.spaceId);
    for (const requested of modified)
      if (requested.kind === "knowledge" && requested.target?.knowledgeType === "document-source") {
        const stored = savedItems.find((i) => i.id === requested.id)!;
        const prior = oldById.get(requested.id);
        if (prior?.source && prior.source.relativePath !== stored.source!.relativePath) {
          const row = readIndex(candidate, catalog.spaceId).documents.find(
            (row) =>
              row.source.path ===
              prior.source!.relativePath.replace(`aidlc/spaces/${catalog.spaceId}/knowledge/`, ""),
          );
          if (row)
            rebindDocument(
              candidate,
              catalog.spaceId,
              row.id,
              stored.source!.relativePath,
              plan.createdAt,
            );
        }
        const result = onboard(
          candidate,
          catalog.spaceId,
          stored.source!.relativePath,
          plan.createdAt,
        );
        if (result.refused)
          throw new CustomizationError("document-registration-failed", result.refused.reason);
      }
    if (
      (request.removedItemIds ?? []).some(
        (id) => oldById.get(id)?.target?.knowledgeType === "document-source",
      )
    )
      syncDocuments(candidate, catalog.spaceId, plan.createdAt);
    for (const requested of modified)
      if (
        requested.kind === "knowledge" &&
        requested.target?.knowledgeType === "document-reference"
      ) {
        const stored = savedItems.find((i) => i.id === requested.id)!;
        const generated = generateDocumentReference(candidate, catalog.spaceId, stored, savedItems);
        stored.content = generated.content;
        stored.runtimeId = generated.documentId;
        candidateWrite(candidate, stored.source!.relativePath, generated.content);
        stored.source!.hash = hashBytes(generated.content);
        for (const path of documentReferencePointers(stored, catalog.spaceId)) {
          candidateWrite(candidate, path, generated.pointer);
          mark(path, stored.id);
        }
      }
    candidateWrite(
      candidate,
      `${SOURCE_DIR}/manifest.json`,
      `${JSON.stringify({ schemaVersion: 1, engineVersion: AIDLC_VERSION, configurationId, items: savedItems, projectedFiles: [...projectedFiles].sort() }, null, 2)}\n`,
    );
    const afterFiles = new Set(configurationFiles(candidate));
    if (documentWork)
      for (const rel of [
        ...walkSource(candidate, `aidlc/spaces/${catalog.spaceId}/intents/audit`),
        "aidlc/.aidlc-clone-id",
      ])
        if (fileBytes(candidate, rel)) mark(rel, "documentkb");
    for (const h of harnesses)
      for (const p of walkSource(candidate, `${h.dir}/tools`).filter(
        (p) => !p.includes("/tools/data/") && !p.endsWith("/aidlc-lib.ts"),
      ))
        if (touched.has(p)) afterFiles.add(p);
    for (const rel of new Set([...allBefore.keys(), ...afterFiles, ...touched.keys()])) {
      const before = allBefore.get(rel) ?? fileBytes(root, rel),
        after = afterFiles.has(rel) || touched.has(rel) ? fileBytes(candidate, rel) : null;
      if (
        (before === null && after === null) ||
        (before !== null && after !== null && before.equals(after))
      )
        continue;
      plan.files.push({
        relativePath: rel,
        beforeHash: before ? hashBytes(before) : null,
        afterHash: after ? hashBytes(after) : null,
        beforeBase64: before?.toString("base64") ?? null,
        afterBase64: after?.toString("base64") ?? null,
        beforeMode: fileMode(root, rel),
        afterMode: fileMode(root, rel),
        itemIds: [...(touched.get(rel) ?? new Set<string>())],
        generated: harnesses.some((h) => rel.startsWith(`${h.dir}/`)),
      });
    }
    plan.files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
    plan.canApply = catalog.capabilities.canApply;
  } catch (error) {
    diagnostics.push({
      severity: "error",
      code: error instanceof CustomizationError ? error.code : "generation-failed",
      message: String(error),
    });
  } finally {
    rmSync(candidate, { recursive: true, force: true });
  }
  return plan;
}
