// Data-only native agent projections. Runtime policy is shared with setup.
import type { CustomizationItem, Harness } from "./aidlc-customization-model.ts";
import { fileBytes, slug } from "./aidlc-customization-model.ts";
import { CustomizationError } from "./aidlc-customization-guard.ts";
import {
  modelAgentName,
  modelAgentStem,
  resolveModelPolicy,
  type ModelHarness,
  type AgentTiers,
  serializeAgentTiers,
  writeKiroCliSurface,
} from "./aidlc-model-policy.ts";
import { modelPolicyForHarness, resolveAidlcSettings } from "./aidlc-settings.ts";
import { resolveTierCap, type Tier, type KiroEffort } from "./aidlc-tiers.ts";
import { join } from "node:path";

function split(raw: string): { metadata: Record<string, unknown>; body: string } {
  const match = raw.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n)?/);
  if (!match) throw new CustomizationError("agent-frontmatter", "Agent frontmatter is required.");
  const metadata = Bun.YAML.parse(match[1]);
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata))
    throw new CustomizationError("agent-frontmatter", "Agent metadata must be an object.");
  return { metadata: metadata as Record<string, unknown>, body: raw.slice(match[0].length) };
}
function markdown(metadata: Record<string, unknown>, body: string): string {
  return `---\n${Object.entries(metadata)
    .map(
      ([key, value]) =>
        `${/^[a-zA-Z_][\w-]*$/.test(key) ? key : JSON.stringify(key)}: ${JSON.stringify(value)}`,
    )
    .join("\n")}\n---\n${body}`;
}
function toml(value: unknown): string {
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return `[${value.map(toml).join(", ")}]`;
  if (value && typeof value === "object")
    return `{ ${Object.entries(value)
      .map(([key, field]) => `${JSON.stringify(key)} = ${toml(field)}`)
      .join(", ")} }`;
  throw new CustomizationError("agent-toml", "This TOML value cannot be projected safely.");
}
export function projectCustomizationAgent(
  candidate: string,
  item: CustomizationItem,
  h: Harness,
  raw: string,
  oldRaw: string | undefined,
  put: (relativePath: string, content: string) => void,
): void {
  const id = slug(item.runtimeId),
    { metadata, body } = split(raw);
  const tiersPath = `${h.dir}/tools/data/agent-tiers.json`;
  const tiers: AgentTiers = JSON.parse(fileBytes(candidate, tiersPath)?.toString("utf8") ?? "{}");
  const previous = oldRaw ? split(oldRaw).metadata : {};
  const baselineTiers: AgentTiers = JSON.parse(
    fileBytes(candidate, `${h.dir}/tools/data/customization-baseline/agent-tiers.json`)?.toString(
      "utf8",
    ) ?? "{}",
  );
  const tier = (metadata.tier ??
    (previous.tier ? baselineTiers[modelAgentName(id)] : undefined)) as Tier | undefined;
  const policy = tier
    ? resolveModelPolicy(
        modelPolicyForHarness(resolveAidlcSettings(candidate).models, h.name as ModelHarness),
        modelAgentName(id),
        tier,
        h.name as ModelHarness,
        resolveTierCap(join(candidate, "aidlc/spaces", item.spaceId ?? "default", "memory")),
      )
    : undefined;
  if (tier && modelAgentStem(modelAgentName(id)) === id) {
    tiers[modelAgentName(id)] = tier;
    put(tiersPath, serializeAgentTiers(tiers));
  }
  if (h.name === "codex") {
    const path = `${h.dir}/agents/${id}.toml`,
      existing = fileBytes(candidate, path)?.toString("utf8");
    const data: Record<string, unknown> = existing
      ? (Bun.TOML.parse(existing) as Record<string, unknown>)
      : {};
    Object.assign(data, {
      name: id,
      description: typeof metadata.description === "string" ? metadata.description.trim() : "",
      developer_instructions: body,
    });
    if (policy) {
      delete data.model;
      delete data.model_reasoning_effort;
      if (policy.model) data.model = policy.model;
      if (policy.effort) data.model_reasoning_effort = policy.effort;
    }
    put(
      path,
      `${Object.entries(data)
        .map(([key, value]) => `${JSON.stringify(key)} = ${toml(value)}`)
        .join("\n")}\n`,
    );
  } else if (h.name === "kiro") {
    const path = `${h.dir}/agents/${id}.json`,
      existing = fileBytes(candidate, path);
    const data = existing
      ? JSON.parse(existing.toString("utf8"))
      : { name: id, tools: ["fs_read", "fs_write", "execute_bash"] };
    Object.assign(data, {
      description: metadata.description ?? "",
      prompt:
        typeof data.prompt === "string" && !data.prompt.startsWith("file://")
          ? body
          : `file://${id}.md`,
    });
    if (policy) {
      delete data.model;
      if (policy.model) data.model = policy.model;
    }
    put(path, `${JSON.stringify(data, null, 2)}\n`);
    if (policy?.model && policy.effort) {
      const path = `${h.dir}/settings/cli.json`;
      put(
        path,
        writeKiroCliSurface(
          fileBytes(candidate, path)?.toString("utf8") ?? "{}",
          [{ model: policy.model, effort: policy.effort as KiroEffort }],
          null,
        ),
      );
    }
  } else if (h.name === "copilot" || h.name === "opencode") {
    const path = `${h.name === "copilot" ? ".github" : ".opencode"}/agents/${id}.md`;
    const existing = fileBytes(candidate, path)?.toString("utf8");
    const native = { ...(existing ? split(existing).metadata : {}), ...metadata };
    for (const key of Object.keys(oldRaw ? split(oldRaw).metadata : {}))
      if (!(key in metadata)) delete native[key];
    const denied = metadata.disallowedTools;
    if (denied !== undefined && String(denied).toLowerCase() !== "task")
      throw new CustomizationError(
        "agent-tools-projection",
        `${h.name} cannot project disallowedTools: ${String(denied)}`,
      );
    delete native.tier;
    delete native.disallowedTools;
    if (h.name === "copilot") {
      delete native.model;
      delete native.effort;
      if (denied && !metadata.tools)
        native.tools = ["read", "edit", "search", "execute", "web", "todo"];
    } else {
      native.mode = "subagent";
      if (metadata.maxTurns !== undefined) {
        native.steps = metadata.maxTurns;
        delete native.maxTurns;
      }
      if (denied)
        native.permission = {
          ...(typeof native.permission === "object" && native.permission !== null
            ? native.permission
            : {}),
          task: "deny",
        };
      if (policy) {
        delete native.model;
        delete native.variant;
        if (policy.model) native.model = policy.model;
        if (policy.effort) native.variant = policy.effort;
      }
    }
    put(path, markdown(native, body));
  } else if (policy && h.name === "claude") {
    const native = { ...metadata };
    delete native.model;
    delete native.effort;
    if (policy.model) native.model = policy.model;
    if (policy.effort) native.effort = policy.effort;
    put(`${h.dir}/agents/${id}.md`, markdown(native, body));
  }
}
