import { afterEach, expect, test } from "bun:test";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { projectCustomizationAgent } from "../core/tools/aidlc-customization-agents.ts";
import {
  type CustomizationItem,
  type Harness,
  fileBytes,
} from "../core/tools/aidlc-customization-model.ts";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});
const id = "aidlc-developer-agent";
const item: CustomizationItem = {
  id: "agent-under-test",
  runtimeId: id,
  title: "Developer",
  kind: "agent",
  owner: "core",
  content: "",
};
for (const [name, dir] of [
  ["claude", ".claude"],
  ["cursor", ".cursor"],
  ["codex", ".codex"],
  ["copilot", ".aidlc"],
  ["opencode", ".aidlc"],
  ["kiro", ".kiro"],
  ["kiro-ide", ".kiro"],
]) {
  test(`${name} projects agent edits while preserving native metadata and restoring the tier`, () => {
    const root = mkdtempSync(join(tmpdir(), "aidlc-agent-projection-"));
    roots.push(root);
    const h = { name, dir } as Harness;
    const put = (path: string, value: string) => {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), value);
    };
    const base = join(import.meta.dir, "../dist", name);
    for (const path of [
      `${dir}/agents`,
      `${dir}/tools/data`,
      ".github/agents",
      ".opencode/agents",
    ]) {
      try {
        cpSync(join(base, path), join(root, path), { recursive: true });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    }
    const original = readFileSync(join(root, dir, "agents", `${id}.md`), "utf8");
    const raw =
      original.replace(/^(---\r?\n)/, "$1tier: templated\n") + "\nCustom developer guidance.\n";
    const native =
      name === "codex"
        ? `${dir}/agents/${id}.toml`
        : name === "kiro"
          ? `${dir}/agents/${id}.json`
          : name === "copilot"
            ? `.github/agents/${id}.md`
            : name === "opencode"
              ? `.opencode/agents/${id}.md`
              : `${dir}/agents/${id}.md`;
    if (name === "codex")
      put(native, fileBytes(root, native)!.toString() + "\ncustom_metadata = { enabled = true }\n");
    if (name === "kiro")
      put(
        native,
        JSON.stringify({
          ...JSON.parse(fileBytes(root, native)!.toString()),
          customMetadata: { enabled: true },
        }),
      );
    put(`${dir}/agents/${id}.md`, raw);
    projectCustomizationAgent(root, { ...item, content: raw }, h, raw, original, put);
    expect(
      JSON.parse(fileBytes(root, `${dir}/tools/data/agent-tiers.json`)!.toString()).developer,
    ).toBe("templated");
    const result = fileBytes(root, native)!.toString();
    if (name === "codex") {
      const data = Bun.TOML.parse(result) as Record<string, unknown>;
      expect(data.custom_metadata).toEqual({ enabled: true });
      expect(data.developer_instructions).toContain("Custom developer guidance.");
    } else if (name === "kiro") {
      const data = JSON.parse(result);
      expect(data.customMetadata).toEqual({ enabled: true });
      expect(data.prompt).toBe(`file://${id}.md`);
      expect(data.tools).toContain("fs_read");
    } else {
      expect(result).toContain("Custom developer guidance.");
      if (name === "copilot") expect(result).toContain('"read"');
      if (name === "opencode") expect(result).toContain('mode: "subagent"');
    }
    put(`${dir}/agents/${id}.md`, original);
    projectCustomizationAgent(root, item, h, original, raw, put);
    const expected = JSON.parse(
      fileBytes(root, `${dir}/tools/data/customization-baseline/agent-tiers.json`)!.toString(),
    );
    expect(
      JSON.parse(fileBytes(root, `${dir}/tools/data/agent-tiers.json`)!.toString()).developer,
    ).toBe(expected.developer);
  });
}
