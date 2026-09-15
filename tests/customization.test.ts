import { afterEach, describe, expect, test, setDefaultTimeout } from "bun:test";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { customizationCommand } from "../core/tools/aidlc-customization.ts";
import {
  type CustomizationRequest,
  readCustomizationCatalog,
  customizationCapabilities,
  sourceRevision,
  fileBytes,
  walkSource,
} from "../core/tools/aidlc-customization-model.ts";
import {
  type EnginePlan,
  generateCustomizationPlan,
  mergeCustomizationText,
} from "../core/tools/aidlc-customization-generate.ts";
import {
  applyCustomization,
  recoverCustomization,
  storeCustomizationPlan,
} from "../core/tools/aidlc-customization-transaction.ts";
import {
  CUSTOMIZATION_MARKER,
  CONTROL_DIR,
  admitCustomizationOperation,
  finishCustomizationOperation,
  activeCustomizationLeases,
  unfinishedCustomizationWorkflows,
  hashBytes,
  transferCustomizationOperation,
} from "../core/tools/aidlc-customization-guard.ts";
import { generateInstallationPlan } from "../core/tools/aidlc-customization-install.ts";
import { resolveWorkflowSelection } from "../core/tools/aidlc-lib.ts";

const roots: string[] = [];
setDefaultTimeout(60_000);
function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), "aidlc-customization-test-"));
  roots.push(root);
  cpSync(join(import.meta.dir, "../dist/claude/.claude"), join(root, ".claude"), {
    recursive: true,
  });
  cpSync(join(import.meta.dir, "../dist/claude/aidlc"), join(root, "aidlc"), { recursive: true });
  return root;
}
function write(root: string, rel: string, value: string): void {
  const path = join(root, rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, value);
}
function rulePlan(root: string): EnginePlan {
  const catalog = readCustomizationCatalog(root),
    item = {
      id: "test-rule",
      kind: "rule-section" as const,
      title: "Custom team practice",
      owner: "project" as const,
      content: "## Custom team practice\n\nUse a deterministic test fixture.\n",
      target: { layer: "team" as const, heading: "Custom team practice" },
    };
  const plan = generateCustomizationPlan(root, catalog, { schemaVersion: 1, items: [item] });
  expect(plan.diagnostics).toEqual([]);
  expect(plan.canApply).toBe(true);
  storeCustomizationPlan(root, plan);
  return plan;
}
function request(plan: EnginePlan, requestId = "apply-one"): CustomizationRequest {
  return {
    schemaVersion: 1,
    requestId,
    planId: plan.id,
    expectedConfigurationRevision: plan.configurationRevision,
  };
}
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("customization engine", () => {
  test("removing plugin definitions removes native agents and projected knowledge", () => {
    const root = fixture();
    cpSync(join(import.meta.dir, "../dist/codex/.codex"), join(root, ".codex"), {
      recursive: true,
    });
    const catalog = readCustomizationCatalog(root);
    const common = { owner: "plugin" as const, pluginId: "example", title: "Example" };
    const items = [
      {
        ...common,
        id: "plugin-example",
        kind: "plugin" as const,
        runtimeId: "example",
        content: JSON.stringify({
          name: "example",
          version: "1.0.0",
          description: "Test plugin",
          aidlc: { contributes: { agents: "agents/", knowledge: "knowledge/" } },
        }),
      },
      {
        ...common,
        id: "agent-example",
        kind: "agent" as const,
        runtimeId: "example-worker",
        content:
          "---\nname: example-worker\ndisplay_name: Example Worker\ndescription: Custom worker\ntier: balanced\n---\n# Worker\nTest guidance.\n",
      },
      {
        ...common,
        id: "knowledge-example",
        kind: "knowledge" as const,
        runtimeId: "example-reference",
        content: "# Reference\nTest guidance.\n",
        target: {
          knowledgeType: "plugin-markdown" as const,
          filename: "example-reference.md",
          audience: ["example-worker", "aidlc-developer-agent"],
        },
      },
    ];
    const add = generateCustomizationPlan(root, catalog, { schemaVersion: 1, items });
    expect(add.diagnostics).toEqual([]);
    storeCustomizationPlan(root, add);
    applyCustomization(root, request(add));
    expect(fileBytes(root, ".codex/agents/example-worker.toml")).not.toBeNull();
    expect(
      fileBytes(root, ".codex/knowledge/example-worker/example-reference.md")?.toString(),
    ).toBe("# Reference\nTest guidance.\n");
    expect(
      fileBytes(root, ".claude/knowledge/aidlc-developer-agent/example-reference.md")?.toString(),
    ).toBe("# Reference\nTest guidance.\n");
    const remove = generateCustomizationPlan(root, readCustomizationCatalog(root), {
      schemaVersion: 1,
      removedItemIds: items.map((i) => i.id),
    });
    expect(remove.diagnostics).toEqual([]);
    storeCustomizationPlan(root, remove);
    applyCustomization(root, request(remove, "remove-plugin"));
    for (const path of [
      ".codex/agents/example-worker.toml",
      ".codex/agents/example-worker.md",
      ".claude/agents/example-worker.md",
      ".claude/knowledge/example-worker/example-reference.md",
      ".codex/knowledge/example-worker/example-reference.md",
      ".claude/knowledge/aidlc-developer-agent/example-reference.md",
      "plugins/example/knowledge/aidlc-developer-agent/example-reference.md",
    ])
      expect(fileBytes(root, path)).toBeNull();
  });
  test("removing rule metadata preserves every rule body byte", () => {
    const root = fixture(),
      path = "aidlc/spaces/default/memory/team.md";
    const body = "# チーム規約\r\n\r\n## レビュー\r\n本文を保持します。\r\n";
    write(root, path, `---\r\npairing: standard\r\n---\r\n${body}`);
    const catalog = readCustomizationCatalog(root),
      metadata = catalog.items.find(
        (i) => i.kind === "rule-file-metadata" && i.source?.relativePath === path,
      )!;
    const plan = generateCustomizationPlan(root, catalog, {
      schemaVersion: 1,
      removedItemIds: [metadata.id],
    });
    expect(plan.diagnostics).toEqual([]);
    storeCustomizationPlan(root, plan);
    applyCustomization(root, request(plan));
    expect(fileBytes(root, path)?.toString()).toBe(body);
  });
  test("removing shared knowledge removes every authored audience copy", () => {
    const root = fixture(),
      catalog = readCustomizationCatalog(root);
    const knowledge = {
      id: "knowledge-example",
      kind: "knowledge" as const,
      owner: "project" as const,
      title: "チーム資料",
      content: "# 共通規約\n",
      target: {
        knowledgeType: "team-markdown" as const,
        filename: "共通規約.md",
        audience: ["aidlc-developer-agent", "aidlc-quality-agent"],
      },
    };
    const add = generateCustomizationPlan(root, catalog, { schemaVersion: 1, items: [knowledge] });
    expect(add.diagnostics).toEqual([]);
    storeCustomizationPlan(root, add);
    applyCustomization(root, request(add));
    const next = readCustomizationCatalog(root);
    const remove = generateCustomizationPlan(root, next, {
      schemaVersion: 1,
      removedItemIds: [knowledge.id],
    });
    expect(remove.diagnostics).toEqual([]);
    storeCustomizationPlan(root, remove);
    applyCustomization(root, request(remove, "remove-knowledge"));
    for (const agent of knowledge.target.audience)
      expect(fileBytes(root, `aidlc/spaces/default/knowledge/${agent}/共通規約.md`)).toBeNull();
  });
  test("catalog includes immutable baselines and validates the released definitions", () => {
    const root = fixture(),
      catalog = readCustomizationCatalog(root);
    expect(catalog.items.find((i) => i.kind === "stage")?.originalContent).toBeTruthy();
    expect(customizationCommand(root, "validate", { schemaVersion: 1 })).toEqual({
      valid: true,
      diagnostics: [],
    });
    write(root, ".claude/tools/aidlc-steering.ts", "// changed reader\n");
    expect(customizationCapabilities(root).canApply).toBe(false);
  });
  test("manual apply changes files once and records a repeatable result", () => {
    const root = fixture(),
      plan = rulePlan(root),
      initial = sourceRevision(root);
    const result = applyCustomization(root, request(plan));
    expect(result.status).toBe("committed");
    expect(result.configurationRevision).not.toBe(initial);
    expect(applyCustomization(root, request(plan))).toEqual(result);
    expect(readFileSync(join(root, "aidlc/spaces/default/memory/team.md"), "utf8")).toContain(
      "Custom team practice",
    );
    expect(existsSync(join(root, CUSTOMIZATION_MARKER))).toBe(false);
    expect(() => applyCustomization(root, { ...request(plan), planId: "different" })).toThrow(
      "different input",
    );
  });
  test("all spaces and archived, missing, or inconsistent records block apply", () => {
    const root = fixture(),
      plan = rulePlan(root);
    write(
      root,
      "aidlc/spaces/other/intents/intents.json",
      JSON.stringify([{ dirName: "record", slug: "record", uuid: "id", status: "archived" }]),
    );
    write(root, "aidlc/spaces/other/intents/record/aidlc-state.md", "- **Status**: Archived\n");
    expect(() => applyCustomization(root, request(plan))).toThrow("Finish all workflows");
    write(root, "aidlc/spaces/other/intents/record/aidlc-state.md", "- **Status**: Completed\n");
    expect(unfinishedCustomizationWorkflows(root)).toHaveLength(1);
    write(
      root,
      "aidlc/spaces/other/intents/intents.json",
      JSON.stringify([{ dirName: "record", slug: "record", uuid: "id", status: "complete" }]),
    );
    expect(unfinishedCustomizationWorkflows(root)).toEqual([]);
  });
  test("a record-external operation survives CLI exit until explicitly completed", () => {
    const root = fixture(),
      plan = rulePlan(root);
    admitCustomizationOperation(root, "session-a", "single:domain-design");
    expect(activeCustomizationLeases(root)).toHaveLength(1);
    expect(() => applyCustomization(root, request(plan))).toThrow("operation still uses");
    finishCustomizationOperation(root, "session-a", "single:domain-design");
    expect(applyCustomization(root, request(plan)).status).toBe("committed");
  });
  test("a crash fences readers and rolls back a partial transaction", () => {
    const root = fixture(),
      plan = rulePlan(root),
      before = sourceRevision(root);
    expect(() => applyCustomization(root, request(plan), { crashAfter: 1 })).toThrow(
      "Test stopped",
    );
    expect(existsSync(join(root, CUSTOMIZATION_MARKER))).toBe(true);
    expect(() => resolveWorkflowSelection(root)).toThrow("pending");
    expect(() => admitCustomizationOperation(root, "new-session")).toThrow();
    expect(recoverCustomization(root).status).toBe("rolled-back");
    expect(sourceRevision(root)).toBe(before);
    expect(applyCustomization(root, request(plan)).status).toBe("rolled-back");
  });
  test("recovery preserves third-party edits instead of overwriting them", () => {
    const root = fixture(),
      plan = rulePlan(root);
    expect(() => applyCustomization(root, request(plan), { crashAfter: 1 })).toThrow();
    const target = plan.files[0].relativePath;
    write(root, target, "external change\n");
    expect(() => recoverCustomization(root)).toThrow("External change");
    expect(readFileSync(join(root, target), "utf8")).toBe("external change\n");
    expect(existsSync(join(root, CUSTOMIZATION_MARKER))).toBe(true);
  });
  test("CAS rejects a stale reviewed plan", () => {
    const root = fixture(),
      plan = rulePlan(root);
    write(root, "aidlc/spaces/default/memory/project.md", "changed\n");
    expect(() => applyCustomization(root, request(plan))).toThrow("Configuration changed");
    expect(existsSync(join(root, CUSTOMIZATION_MARKER))).toBe(false);
  });
  test("core changes preserve a baseline and restoring defaults removes the override", () => {
    const root = fixture(),
      catalog = readCustomizationCatalog(root),
      original = catalog.items.find((i) => i.kind === "scope" && i.runtimeId === "feature")!;
    const edited = {
      ...original,
      content: original.content.replace("depth: Standard", "depth: Minimal"),
    };
    const plan = generateCustomizationPlan(root, catalog, { schemaVersion: 1, items: [edited] });
    expect(plan.diagnostics).toEqual([]);
    storeCustomizationPlan(root, plan);
    applyCustomization(root, request(plan));
    expect(
      readCustomizationCatalog(root).items.find((i) => i.id === original.id)?.content,
    ).toContain("depth: Minimal");
    const updated = readCustomizationCatalog(root),
      restore = generateCustomizationPlan(root, updated, {
        schemaVersion: 1,
        items: [
          {
            ...updated.items.find((i) => i.id === original.id)!,
            content: original.originalContent!,
          },
        ],
      });
    expect(restore.diagnostics).toEqual([]);
    storeCustomizationPlan(root, restore);
    applyCustomization(root, request(restore, "restore"));
    expect(
      existsSync(
        join(
          root,
          `aidlc/guide-customization/overrides/scope/${hashBytes(original.id).slice(7)}.json`,
        ),
      ),
    ).toBe(false);
  });
  test("a native install plan uses the same CAS and replays saved changes", () => {
    const root = fixture(),
      customization = rulePlan(root);
    applyCustomization(root, request(customization));
    const path = ".claude/tools/data/harness.json",
      prior = fileBytes(root, path)!;
    const content = `${JSON.stringify({ ...JSON.parse(prior.toString()), customizationTest: true }, null, 2)}\n`;
    const plan = generateInstallationPlan(root, {
      schemaVersion: 1,
      installationFiles: [
        {
          relativePath: path,
          beforeHash: hashBytes(prior).slice(7),
          afterBase64: Buffer.from(content).toString("base64"),
        },
      ],
    });
    expect(plan.diagnostics).toEqual([]);
    expect(plan.canApply).toBe(true);
    storeCustomizationPlan(root, plan);
    expect(applyCustomization(root, request(plan, "native-update")).status).toBe("committed");
    expect(readFileSync(join(root, "aidlc/spaces/default/memory/team.md"), "utf8")).toContain(
      "Custom team practice",
    );
  });
  test("three-way projection preserves target-only metadata and refuses conflicting edits", () => {
    const base = "---\nname: test\ndepth: Standard\n---\nbody\n";
    expect(
      mergeCustomizationText(
        base,
        base.replace("Standard", "Minimal"),
        base.replace("name: test", "name: test\nmodel: inherited"),
      ),
    ).toContain("model: inherited");
    expect(() =>
      mergeCustomizationText(
        base,
        base.replace("Standard", "Minimal"),
        base.replace("Standard", "Comprehensive"),
      ),
    ).toThrow("field differs");
  });
  test("unsafe destinations fail before an installation plan is generated", () => {
    const root = fixture();
    expect(() =>
      generateInstallationPlan(root, {
        schemaVersion: 1,
        installationFiles: [{ relativePath: ".git/config", beforeHash: null, afterBase64: "" }],
      }),
    ).toThrow();
    expect(existsSync(join(root, CONTROL_DIR, "pending.json"))).toBe(false);
  });
  test.each(["after-commit", "after-current", "after-receipt"] as const)(
    "a retry finalizes a committed transaction interrupted %s",
    (checkpoint) => {
      const root = fixture(),
        plan = rulePlan(root),
        input = request(plan);
      expect(() => applyCustomization(root, input, { crashFinalize: checkpoint })).toThrow(
        "Test stopped",
      );
      expect(existsSync(join(root, CUSTOMIZATION_MARKER))).toBe(true);
      expect(applyCustomization(root, input).status).toBe("committed");
      expect(existsSync(join(root, CUSTOMIZATION_MARKER))).toBe(false);
      expect(applyCustomization(root, input).status).toBe("committed");
    },
  );
  test("a recovery request never resolves a different pending transaction", () => {
    const root = fixture(),
      plan = rulePlan(root);
    expect(() => applyCustomization(root, request(plan), { crashAfter: 1 })).toThrow();
    expect(() => recoverCustomization(root, { requestId: "another-request" })).toThrow(
      "another request",
    );
    expect(existsSync(join(root, CUSTOMIZATION_MARKER))).toBe(true);
    expect(recoverCustomization(root, { requestId: "apply-one" }).status).toBe("rolled-back");
  });
  test("workflow creation transfers pre-record leases and another session can complete the record", () => {
    const root = fixture();
    admitCustomizationOperation(root, "old-session", "workflow");
    admitCustomizationOperation(root, "old-session", "compose");
    admitCustomizationOperation(root, "worker", "single:domain-design");
    write(
      root,
      "aidlc/spaces/default/intents/intents.json",
      JSON.stringify([{ dirName: "record", status: "active" }]),
    );
    write(root, "aidlc/spaces/default/intents/record/aidlc-state.md", "- **Status**: Running\n");
    transferCustomizationOperation(root, "old-session", "default", "record");
    expect(
      activeCustomizationLeases(root)
        .map((l) => l.operationId)
        .sort(),
    ).toEqual(["single:domain-design", "workflow:default/record"]);
    write(
      root,
      "aidlc/spaces/default/intents/intents.json",
      JSON.stringify([{ dirName: "record", status: "complete" }]),
    );
    write(root, "aidlc/spaces/default/intents/record/aidlc-state.md", "- **Status**: Completed\n");
    expect(activeCustomizationLeases(root).map((l) => l.operationId)).toEqual([
      "single:domain-design",
    ]);
  });
  test("Japanese document sources and references enter one transaction with DocumentKB", () => {
    const root = fixture(),
      bytes = Buffer.from("# 開発規約\n\nレビューを記録します。\n");
    const source = {
      id: "document-source-one",
      kind: "knowledge" as const,
      title: "開発規約",
      owner: "project" as const,
      content: "",
      target: {
        knowledgeType: "document-source" as const,
        filename: "開発規約.md",
        audience: "all" as const,
      },
      binary: {
        base64: bytes.toString("base64"),
        bytes: bytes.length,
        sha256: hashBytes(bytes).slice(7),
        mimeType: "text/markdown",
      },
    };
    const reference = {
      id: "document-reference-one",
      kind: "knowledge" as const,
      title: "規約を参照",
      owner: "project" as const,
      content: JSON.stringify({ documentId: "incoming-id", sourceItemId: source.id }),
      target: { knowledgeType: "document-reference" as const, audience: "all" as const },
    };
    const plan = generateCustomizationPlan(root, readCustomizationCatalog(root), {
      schemaVersion: 1,
      items: [source, reference],
    });
    expect(plan.diagnostics).toEqual([]);
    expect(
      plan.files.some((file) => file.relativePath.endsWith("knowledge/documentkb/index.json")),
    ).toBe(true);
    expect(existsSync(join(root, "aidlc/spaces/default/knowledge/documents/開発規約.md"))).toBe(
      false,
    );
    storeCustomizationPlan(root, plan);
    expect(applyCustomization(root, request(plan)).status).toBe("committed");
    const items = readCustomizationCatalog(root).items;
    const ref = items.find((item) => item.id === reference.id)!;
    expect(JSON.parse(ref.content).documentId).not.toBe("incoming-id");
    expect(
      readFileSync(join(root, "aidlc/spaces/default/knowledge/documents/開発規約.md")).equals(
        bytes,
      ),
    ).toBe(true);
  });
  test("literal help text keeps its lease; real help finishes its probe lease", () => {
    const root = fixture(),
      tool = join(root, ".claude/tools/aidlc-orchestrate.ts");
    const invoke = (args: string[]) =>
      spawnSync(process.execPath, [tool, "next", "--project-dir", root, ...args], {
        cwd: root,
        encoding: "utf8",
      });
    expect(invoke(["--help"]).status).toBe(0);
    expect(activeCustomizationLeases(root)).toEqual([]);
    expect(invoke(["--", "--help"]).status).toBe(0);
    expect(activeCustomizationLeases(root)).toHaveLength(1);
  });
  test("the installed CLI generates both harnesses entirely off-project before manual apply", () => {
    const root = fixture();
    cpSync(join(import.meta.dir, "../dist/cursor/.cursor"), join(root, ".cursor"), {
      recursive: true,
    });
    const catalog = readCustomizationCatalog(root),
      scope = catalog.items.find((item) => item.kind === "scope" && item.runtimeId === "feature")!;
    const before = sourceRevision(root);
    const result = spawnSync(
      process.execPath,
      [join(root, ".claude/tools/aidlc-customization.ts"), "plan", "--project-dir", root],
      {
        cwd: root,
        encoding: "utf8",
        input: JSON.stringify({
          schemaVersion: 1,
          items: [
            { ...scope, content: scope.content.replace("depth: Standard", "depth: Minimal") },
          ],
          expectedConfigurationRevision: before,
        }),
      },
    );
    expect(result.status, result.stdout + result.stderr).toBe(0);
    const plan = JSON.parse(result.stdout).data;
    expect(plan.diagnostics).toEqual([]);
    expect(sourceRevision(root)).toBe(before);
    expect(
      plan.files.some((file: { relativePath: string }) => file.relativePath.startsWith(".claude/")),
    ).toBe(true);
    expect(
      plan.files.some((file: { relativePath: string }) => file.relativePath.startsWith(".cursor/")),
    ).toBe(true);
    expect(
      applyCustomization(root, {
        schemaVersion: 1,
        requestId: "real-cli-plan",
        planId: plan.id,
        expectedConfigurationRevision: before,
      }).status,
    ).toBe("committed");
  });
  test("a mixed legacy install upgrades through the journal before allowing customization", () => {
    const root = fixture(),
      cursorSource = join(import.meta.dir, "../dist/cursor");
    write(root, ".cursor/tools/data/harness.json", JSON.stringify({ name: "cursor" }));
    write(root, ".cursor/tools/aidlc-lib.ts", "// legacy engine\n");
    expect(customizationCapabilities(root).canApply).toBe(false);
    const installationFiles = walkSource(cursorSource, ".cursor").map((relativePath) => ({
      relativePath,
      beforeHash: fileBytes(root, relativePath) ? hashBytes(fileBytes(root, relativePath)!) : null,
      afterBase64: fileBytes(cursorSource, relativePath)!.toString("base64"),
    }));
    const plan = generateInstallationPlan(root, { schemaVersion: 1, installationFiles });
    expect(plan.kind).toBe("bootstrap-install");
    expect(plan.canApply).toBe(true);
    storeCustomizationPlan(root, plan);
    expect(applyCustomization(root, request(plan, "bootstrap")).status).toBe("committed");
    expect(customizationCapabilities(root).canApply).toBe(true);
    expect(existsSync(join(root, "aidlc/guide-customization/manifest.json"))).toBe(false);
    expect(rulePlan(root).canApply).toBe(true);
  });
  test("new-intent can begin after configuration changes while old record resume is refused", () => {
    const root = fixture();
    write(
      root,
      "aidlc/spaces/default/intents/intents.json",
      JSON.stringify([{ dirName: "record", slug: "record", uuid: "id", status: "complete" }]),
    );
    write(root, "aidlc/spaces/default/intents/active-intent", "record\n");
    write(
      root,
      "aidlc/spaces/default/intents/record/aidlc-state.md",
      "# State\n\n## Workflow Status\n- **State Version**: 8\n- **Status**: Completed\n",
    );
    write(
      root,
      "aidlc/spaces/default/intents/record/configuration-revision.json",
      JSON.stringify({ schemaVersion: 1, revision: "unmanaged" }),
    );
    const plan = rulePlan(root);
    applyCustomization(root, request(plan));
    const tool = join(root, ".claude/tools/aidlc-orchestrate.ts");
    const invoke = (args: string[]) =>
      spawnSync(process.execPath, [tool, "next", "--project-dir", root, ...args], {
        cwd: root,
        encoding: "utf8",
      });
    expect(invoke(["--resume"]).stderr).toContain("earlier configuration");
    const fresh = invoke(["--new-intent", "--scope", "feature", "--", "New project work"]);
    expect(fresh.status).toBe(0);
    expect(fresh.stdout).toContain("intent create");
  });
});
