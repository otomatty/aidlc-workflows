// Pure admission checks over submitted source text. No command, sensor or hook runs.
import { basename } from "node:path";
import type { CustomizationItem, Diagnostic } from "./aidlc-customization-model.ts";
import { templateEligibleArtifacts } from "./aidlc-graph.ts";
import { parseStageFrontmatter } from "./aidlc-lib.ts";
import {
  assertSupportedPluginContributionPaths,
  validatePluginName,
} from "./aidlc-plugin-validate.ts";
import { parseSensorManifest } from "./aidlc-sensor-schema.ts";
import { AIDLC_VERSION } from "./aidlc-version.ts";

type Report = (item: CustomizationItem, code: string, message: string, field?: string) => void;
type Plugin = { item: CustomizationItem; name: string; version: string; dependencies: string[] };
const BUNDLED_SENSORS = new Set([
  "claim-sources",
  "linter",
  "required-sections",
  "traceability",
  "type-check",
  "upstream-coverage",
]);
const VERSION =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const RANGE_PART = "(?:0|[1-9]\\d*|[xX*])";
const RANGE_VERSION = `${RANGE_PART}(?:\\.${RANGE_PART}){0,2}(?:-[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?`;
const RANGE_TOKEN = new RegExp(`^(?:\\^|~|<=|>=|<|>|=)?${RANGE_VERSION}$`);
const HYPHEN_RANGE = new RegExp(`^${RANGE_VERSION}\\s+-\\s+${RANGE_VERSION}$`);

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function validVersion(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = VERSION.exec(value);
  return Boolean(
    match?.slice(1, 4).every((part) => Number.isSafeInteger(Number(part))) &&
    (!match[4] || match[4].split(".").every((part) => !/^0\d+$/.test(part))),
  );
}
function validRange(value: string): boolean {
  // Bun's range matcher treats some malformed input as a wildcard. Validate
  // the grammar before using it, so a typo never becomes an accepted contract.
  if (!value.trim() || value.length > 512) return false;
  return value.split("||").every((part) => {
    const range = part.trim();
    if (!range) return false;
    if (HYPHEN_RANGE.test(range)) return true;
    const normalized = range.replace(/(<=|>=|<|>|=|\^|~)\s+/g, "$1");
    return normalized.split(/\s+/).every((token) => RANGE_TOKEN.test(token));
  });
}

function parsePlugin(item: CustomizationItem, add: Report): Plugin | null {
  let manifest: unknown;
  try {
    manifest = JSON.parse(item.content);
  } catch {
    add(item, "plugin-json", "Plugin manifest must be valid JSON.");
    return null;
  }
  if (!record(manifest)) {
    add(item, "plugin-shape", "Plugin manifest must be an object.");
    return null;
  }
  const name = typeof manifest.name === "string" ? manifest.name : "";
  for (const finding of validatePluginName(name, item.pluginId ?? name))
    add(item, "plugin-name", finding.message, "name");
  if (!validVersion(manifest.version))
    add(
      item,
      "plugin-version",
      "Plugin version must be a valid MAJOR.MINOR.PATCH semantic version.",
      "version",
    );
  if (manifest.description !== undefined && typeof manifest.description !== "string")
    add(item, "plugin-description", "Plugin description must be a string.", "description");
  if (
    manifest.author !== undefined &&
    !(
      (typeof manifest.author === "string" && manifest.author.trim()) ||
      (record(manifest.author) &&
        typeof manifest.author.name === "string" &&
        manifest.author.name.trim())
    )
  )
    add(
      item,
      "plugin-author",
      "Plugin author must be a non-empty string or an object with a name.",
      "author",
    );
  try {
    assertSupportedPluginContributionPaths(manifest);
  } catch (error) {
    add(
      item,
      "plugin-contributions",
      error instanceof Error ? error.message : String(error),
      "aidlc.contributes",
    );
  }
  const dependencies = manifest.dependencies ?? [];
  if (
    !Array.isArray(dependencies) ||
    dependencies.some((entry) => typeof entry !== "string" || !entry.trim())
  ) {
    add(
      item,
      "plugin-dependencies",
      'Dependencies must be an array such as ["core", "other-plugin@^1.2.0"].',
      "dependencies",
    );
    return {
      item,
      name,
      version: typeof manifest.version === "string" ? manifest.version : "",
      dependencies: [],
    };
  }
  return {
    item,
    name,
    version: typeof manifest.version === "string" ? manifest.version : "",
    dependencies,
  };
}

function checkDependencies(plugins: Plugin[], add: Report): void {
  const byName = new Map<string, Plugin>();
  for (const plugin of plugins) {
    if (byName.has(plugin.name))
      add(
        plugin.item,
        "plugin-duplicate",
        `More than one manifest declares plugin ${plugin.name}.`,
        "name",
      );
    byName.set(plugin.name, plugin);
  }
  const edges = new Map<string, string[]>();
  for (const plugin of plugins) {
    const targets: string[] = [];
    for (const dependency of plugin.dependencies) {
      const match = /^([a-z][a-z0-9-]*)(?:@(.+))?$/.exec(dependency.trim());
      if (!match || (match[2] !== undefined && !validRange(match[2]))) {
        add(
          plugin.item,
          "plugin-dependency-range",
          `Invalid dependency contract: ${dependency}.`,
          "dependencies",
        );
        continue;
      }
      const name = match[1],
        constraint = match[2];
      const targetVersion = name === "core" ? AIDLC_VERSION : byName.get(name)?.version;
      if (!targetVersion) {
        add(
          plugin.item,
          "plugin-dependency-missing",
          `Dependency ${name} is absent from this configuration.`,
          "dependencies",
        );
        continue;
      }
      if (
        constraint &&
        (!validVersion(targetVersion) || !Bun.semver.satisfies(targetVersion, constraint))
      )
        add(
          plugin.item,
          "plugin-dependency-version",
          `${name}@${targetVersion} does not satisfy ${constraint}.`,
          "dependencies",
        );
      if (name !== "core") targets.push(name);
    }
    edges.set(plugin.name, targets);
  }
  const visiting = new Set<string>(),
    visited = new Set<string>();
  const visit = (name: string): void => {
    if (visiting.has(name)) {
      const plugin = byName.get(name);
      if (plugin)
        add(
          plugin.item,
          "plugin-dependency-cycle",
          `Plugin dependency cycle includes ${name}.`,
          "dependencies",
        );
      return;
    }
    if (visited.has(name)) return;
    visiting.add(name);
    for (const target of edges.get(name) ?? []) visit(target);
    visiting.delete(name);
    visited.add(name);
  };
  for (const name of edges.keys()) visit(name);
}

function sensorScript(command: string): string | null {
  // Same resolution as aidlc-sensor.ts: native delegate takes precedence,
  // otherwise the first .ts token resolves by basename beside the dispatcher.
  const tokens = command.trim().split(/\s+/);
  const engine = tokens.indexOf("engine");
  const delegate = engine >= 0 ? tokens[engine + 1] : undefined;
  if (delegate?.startsWith("sensor-")) return `aidlc-${delegate}.ts`;
  const source = tokens.find((token) => token.endsWith(".ts"));
  return source ? (source.split("/").at(-1) ?? null) : null;
}
function checkSensors(items: CustomizationItem[], add: Report): void {
  const tools = new Set(
    items
      .filter((item) => item.kind === "tool")
      .map(
        (item) =>
          item.target?.filename ??
          (item.source ? basename(item.source.relativePath) : `${item.runtimeId}.ts`),
      ),
  );
  for (const item of items.filter((item) => item.kind === "sensor")) {
    let manifest: ReturnType<typeof parseSensorManifest>;
    try {
      manifest = parseSensorManifest(item.content);
    } catch {
      continue;
    } // The primary schema reports malformed definitions.
    if (typeof manifest.command !== "string") continue;
    const script = sensorScript(manifest.command);
    const expected = `aidlc-sensor-${manifest.id}.ts`;
    if (script !== expected) {
      add(
        item,
        "sensor-tool-identity",
        `The sensor command must resolve to ${expected}, as required by the sensor dispatcher.`,
        "command",
      );
      continue;
    }
    if (!BUNDLED_SENSORS.has(manifest.id) && !tools.has(script))
      add(
        item,
        "sensor-tool-missing",
        `Referenced sensor tool ${script} is absent from this configuration.`,
        "command",
      );
  }
}

function checkTemplates(items: CustomizationItem[], add: Report): void {
  const stages = items
    .filter((item) => item.kind === "stage")
    .flatMap((item) => {
      try {
        const data = parseStageFrontmatter(item.content);
        const outputs = [data.produces, data.optional_produces].flatMap((value) =>
          Array.isArray(value)
            ? value.filter((entry): entry is string => typeof entry === "string")
            : [],
        );
        return [
          {
            item,
            outputs,
            eligible: templateEligibleArtifacts(outputs),
            sensors: Array.isArray(data.sensors) ? data.sensors : [],
          },
        ];
      } catch {
        return [];
      }
    });
  const names = new Set<string>();
  for (const item of items.filter((item) => item.kind === "artifact-template")) {
    const artifact = item.runtimeId ?? item.title;
    if (names.has(artifact))
      add(item, "template-duplicate", `More than one template targets ${artifact}.`, "runtimeId");
    names.add(artifact);
    const producers = stages.filter((stage) => stage.outputs.includes(artifact));
    if (!producers.length || producers.some((stage) => !stage.eligible.includes(artifact))) {
      add(
        item,
        "template-ineligible",
        `${artifact} must be a declared prose artifact; question files and timestamp markers are not template-eligible.`,
        "runtimeId",
      );
      continue;
    }
    if (!item.content.split(/\r?\n/).some((line) => /^##\s+\S/.test(line.trim())))
      add(
        item,
        "template-headings",
        "An artifact template must declare at least one non-empty H2 heading.",
        "content",
      );
    for (const producer of producers)
      if (!producer.sensors.includes("required-sections"))
        add(
          item,
          "template-sensor-binding",
          `Stage ${producer.item.runtimeId ?? producer.item.title} must declare the required-sections sensor to enforce this template.`,
          "runtimeId",
        );
  }
}

export function validateAdditionalCustomizationItems(items: CustomizationItem[]): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const add: Report = (item, code, message, field) =>
    diagnostics.push({
      severity: "error",
      code,
      message,
      itemId: item.id,
      ...(field ? { field } : {}),
    });
  const plugins = items
    .filter((item) => item.kind === "plugin")
    .flatMap((item) => {
      const plugin = parsePlugin(item, add);
      return plugin ? [plugin] : [];
    });
  checkDependencies(plugins, add);
  checkSensors(items, add);
  checkTemplates(items, add);
  return diagnostics;
}
