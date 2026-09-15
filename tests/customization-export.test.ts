import { afterEach, describe, expect, test, setDefaultTimeout } from "bun:test";
import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  coreStageContribution,
  mergePortableContributions,
  validatePortableContribution,
} from "../core/tools/aidlc-customization-portable-contributions.ts";
import { exportCustomization } from "../core/tools/aidlc-customization-export.ts";
import {
  readCustomizationCatalog,
  type CustomizationItem,
} from "../core/tools/aidlc-customization-model.ts";

setDefaultTimeout(60_000);
const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});
const base =
  "---\nslug: test-stage\nphase: construction\nlead_agent: aidlc-developer-agent\nproduces: []\nconsumes: []\nsensors: []\nscopes: []\ncustom_unknown: preserved\n---\n\n# Test stage\n\n## Steps\n\n### Step 1: Build\n\nKeep original text.\n\n## Completion\n\nDone.\n";
const item: CustomizationItem = {
  id: "stage-test",
  kind: "stage",
  owner: "core",
  title: "Test",
  runtimeId: "test-stage",
  content: base,
  originalContent: base,
};
function contribution(content: string): CustomizationItem {
  return {
    id: "contribution-test",
    kind: "stage",
    owner: "plugin",
    pluginId: "example",
    runtimeId: "example-contribution-test-stage",
    title: "Addition",
    content,
    target: { contributionTo: "test-stage", phase: "construction" },
  };
}
function entries(base64: string): Map<string, string> {
  const bytes = Buffer.from(base64, "base64"),
    files = new Map<string, string>();
  let offset = 0;
  while (bytes.readUInt32LE(offset) === 0x04034b50) {
    const size = bytes.readUInt32LE(offset + 18),
      nameBytes = bytes.readUInt16LE(offset + 26),
      extraBytes = bytes.readUInt16LE(offset + 28);
    const name = bytes.subarray(offset + 30, offset + 30 + nameBytes).toString();
    const start = offset + 30 + nameBytes + extraBytes;
    files.set(name, bytes.subarray(start, start + size).toString());
    offset = start + size;
  }
  return files;
}
describe("portable additive contributions", () => {
  test("exports only additive fields and reports replaced fields", () => {
    const result = coreStageContribution(
      {
        ...item,
        content: base
          .replace("produces: []", "produces: [example-report]")
          .replace("aidlc-developer-agent", "aidlc-quality-agent"),
      },
      "example",
      [item],
    );
    expect(result.omittedFields).toEqual(["lead_agent"]);
    expect(result.content).toContain("example-report");
    expect(result.content).not.toContain("aidlc-quality-agent");
    expect(validatePortableContribution(contribution(result.content!), [item])).toEqual([]);
  });
  test("encodes prose inserted at a supported anchor and composes from a fresh base", () => {
    const edited = base.replace(
      "## Completion",
      "### Step 2: Extra\n\nWrite the report.\n\n## Completion",
    );
    const result = coreStageContribution({ ...item, content: edited }, "example", [item]);
    expect(result.omittedFields).toEqual([]);
    expect(result.content).toContain("fragment:");
    const source = contribution(result.content!);
    expect(mergePortableContributions(base, [source])).toBe(edited);
    expect(mergePortableContributions(base, [source])).toBe(
      mergePortableContributions(base, [source]),
    );
  });
  test("merges structural fields while preserving unrelated fields, BOM and CRLF", () => {
    const core = `\uFEFF${base.replaceAll("\n", "\r\n")}`;
    const added = contribution(
      "---\ntarget: test-stage\nplugin: example\nadds:\n  produces:\n    - example-report\n  consumes:\n    - artifact: example-source\n      required: false\n---\n",
    );
    const result = mergePortableContributions(core, [added]);
    expect(result.startsWith("\uFEFF---\r\n")).toBe(true);
    expect(result).toContain("custom_unknown: preserved\r\n");
    expect(result).toContain("example-report");
    expect(result).toContain("required: false");
    expect(result.replaceAll("\r\n", "")).not.toContain("\n");
    expect(mergePortableContributions(core, [added, added])).toBe(result);
  });
  test("does not reinterpret replacement prose, deferred dependencies or foreign scopes as additions", () => {
    const edited = base
      .replace("Keep original text.", "Replace core text.")
      .replace("scopes: []", "scopes: [foreign-scope]")
      .replace("consumes: []", "consumes: []\nrequires_stage: [other-stage]");
    const result = coreStageContribution({ ...item, content: edited }, "example", [item]);
    expect(result.content).toBeUndefined();
    expect(result.omittedFields).toEqual(
      expect.arrayContaining(["body", "scopes", "requires_stage"]),
    );
  });
  test("rejects dangling fragment metadata and absent anchors", () => {
    expect(
      validatePortableContribution(
        contribution(
          "---\ntarget: test-stage\nplugin: example\nfragments:\n  - anchor: after-step:999\n    order: 100\n---\n\n## fragment: after-step:999\n\nText.\n",
        ),
        [item],
      ),
    ).toEqual(expect.arrayContaining([expect.objectContaining({ code: "contribution-invalid" })]));
    expect(() =>
      mergePortableContributions(base, [
        contribution(
          "---\ntarget: test-stage\nplugin: example\nfragments: []\n---\n## fragment: after-step:1\nText",
        ),
      ]),
    ).toThrow();
  });
  test("writes standard source and every selected host projection without executing hooks", () => {
    const root = mkdtempSync(join(tmpdir(), "aidlc-customization-export-test-"));
    roots.push(root);
    cpSync(join(import.meta.dir, "../dist/claude/.claude"), join(root, ".claude"), {
      recursive: true,
    });
    cpSync(join(import.meta.dir, "../dist/claude/aidlc"), join(root, "aidlc"), { recursive: true });
    const catalog = readCustomizationCatalog(root),
      stage = catalog.items.find((i) => i.kind === "stage" && i.runtimeId === "build-and-test")!;
    const changed = {
      ...stage,
      content: stage.content.replace(
        "## Completion",
        "### Step 99: Extra\n\nReview the test evidence.\n\n## Completion",
      ),
    };
    // The shipped stage has a Completion Criteria compartment; use its last compartment boundary.
    if (changed.content === stage.content)
      changed.content = `${stage.content}\nAdditional evidence review.\n`;
    const output = exportCustomization(catalog, {
      schemaVersion: 1,
      format: "plugin",
      name: "example",
      items: [changed],
      selectedItemIds: [stage.id],
      harnesses: ["claude", "cursor", "codex", "copilot", "kiro", "kiro-ide", "opencode"],
    });
    const files = entries(output.base64);
    expect(files.has("example/.aidlc-plugin/plugin.json")).toBe(true);
    expect([...files.keys()].some((file) => file.startsWith("example/contributions/"))).toBe(true);
    for (const harness of ["claude", "cursor", "codex", "copilot", "kiro", "kiro-ide", "opencode"])
      expect([...files.keys()].some((file) => file.startsWith(`projections/${harness}/`))).toBe(
        true,
      );
    expect(readFileSync(join(root, stage.source!.relativePath), "utf8")).toBe(stage.content);
  });
});
