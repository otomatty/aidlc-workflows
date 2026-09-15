// covers: function:validateAdditionalCustomizationItems
// Pure source-text admission checks: never executes any submitted command.
import { describe, expect, test } from "bun:test";
import type { CustomizationItem } from "../../core/tools/aidlc-customization-model.ts";
import { validateAdditionalCustomizationItems as validate } from "../../core/tools/aidlc-customization-static-validation.ts";
import { AIDLC_VERSION } from "../../core/tools/aidlc-version.ts";

function plugin(
  name = "example",
  dependencies: unknown = ["core"],
  version = "1.2.3",
  extra: Record<string, unknown> = {},
): CustomizationItem {
  return {
    id: name,
    kind: "plugin",
    owner: "plugin",
    pluginId: name,
    title: name,
    content: JSON.stringify({ name, version, dependencies, aidlc: { contributes: {} }, ...extra }),
  };
}
function sensor(
  id: string,
  command = `bun {{HARNESS_DIR}}/tools/aidlc-sensor-${id}.ts`,
): CustomizationItem {
  return {
    id: `sensor:${id}`,
    kind: "sensor",
    owner: "plugin",
    title: id,
    runtimeId: id,
    content: `---\nid: ${id}\nkind: deterministic\ncommand: ${command}\ndescription: Checks output\ndefault_severity: advisory\nfire_on: gate\n---\n`,
  };
}
function tool(filename: string): CustomizationItem {
  return {
    id: filename,
    kind: "tool",
    owner: "plugin",
    title: filename,
    runtimeId: filename.replace(/\.ts$/, ""),
    content: 'throw new Error("MUST NOT EXECUTE");',
    target: { filename },
  };
}
function stage(
  produces = ["design"],
  sensors = ["required-sections"],
  optional: string[] = [],
): CustomizationItem {
  return {
    id: "stage",
    kind: "stage",
    owner: "core",
    title: "Design",
    runtimeId: "design-stage",
    content: `---\nslug: design-stage\nproduces: ${JSON.stringify(produces)}\noptional_produces: ${JSON.stringify(optional)}\nsensors: ${JSON.stringify(sensors)}\n---\n`,
  };
}
function template(artifact = "design", content = "## Summary\n\n## Details\n"): CustomizationItem {
  return {
    id: `template:${artifact}`,
    kind: "artifact-template",
    owner: "project",
    title: artifact,
    runtimeId: artifact,
    content,
  };
}
const codes = (items: CustomizationItem[]) => validate(items).map((finding) => finding.code);

describe("customization plugin static admission", () => {
  test("uses canonical manifest paths and preserves unknown forward-compatible fields", () => {
    expect(
      validate([
        plugin("example", ["core"], "1.2.3", {
          custom: { keep: true },
          aidlc: { contributes: { stages: "stages/", tools: "tools/" } },
        }),
      ]),
    ).toEqual([]);
    expect(
      codes([plugin("example", [], "1.2.3", { aidlc: { contributes: { stages: "elsewhere/" } } })]),
    ).toContain("plugin-contributions");
    expect(
      codes([plugin("example", [], "1.2.3", { aidlc: { contributes: { memory: "memory/" } } })]),
    ).toContain("plugin-contributions");
  });
  test("refuses manifest identity, shape, author and semantic-version errors", () => {
    expect(codes([plugin("core", [], "01.2.3", { author: "" })])).toEqual(
      expect.arrayContaining(["plugin-name", "plugin-author", "plugin-version"]),
    );
    expect(codes([plugin("example", [], "1.2.3-01")])).toContain("plugin-version");
    expect(codes([{ ...plugin(), content: "[]" }])).toContain("plugin-shape");
    expect(codes([{ ...plugin(), content: "{" }])).toContain("plugin-json");
    expect(codes([plugin("example", { other: "^1.0.0" })])).toContain("plugin-dependencies");
  });
  test("checks installed and core semver constraints without resolving remotely", () => {
    expect(
      validate([plugin("first", ["second@^1.2.0", `core@${AIDLC_VERSION}`]), plugin("second")]),
    ).toEqual([]);
    expect(codes([plugin("first", ["second@^2.0.0"]), plugin("second")])).toContain(
      "plugin-dependency-version",
    );
    expect(codes([plugin("first", ["missing@~1.0.0"])])).toContain("plugin-dependency-missing");
    expect(codes([plugin("first", ["core@garbage"])])).toContain("plugin-dependency-range");
    expect(codes([plugin("first", ["core@>=2.0.0 ||"])])).toContain("plugin-dependency-range");
  });
  test("supports comparator sets, OR and hyphen ranges", () => {
    for (const range of [">=1.0.0 <2.0.0", "1.0.0 - 2.0.0", "^2.0.0 || ~1.2.0", "1.x", "*"])
      expect(validate([plugin("first", [`second@${range}`]), plugin("second")])).toEqual([]);
  });
  test("rejects cycles and duplicate plugin identities", () => {
    expect(codes([plugin("first", ["second"]), plugin("second", ["first"])])).toContain(
      "plugin-dependency-cycle",
    );
    expect(codes([plugin(), { ...plugin(), id: "duplicate" }])).toContain("plugin-duplicate");
    expect(codes([plugin("first", ["first"])])).toContain("plugin-dependency-cycle");
  });
});

describe("customization sensor tool references", () => {
  test("accepts bundled native and copy commands and existing plugin scripts", () => {
    expect(
      validate([sensor("required-sections", "{{INVOKE}} engine sensor-required-sections")]),
    ).toEqual([]);
    expect(validate([sensor("linter")])).toEqual([]);
    expect(validate([sensor("example-check"), tool("aidlc-sensor-example-check.ts")])).toEqual([]);
  });
  test("refuses missing or mismatched scripts without executing source", () => {
    expect(codes([sensor("example-check")])).toContain("sensor-tool-missing");
    expect(codes([sensor("example-check", "npm test")])).toContain("sensor-tool-identity");
    expect(codes([sensor("example-check", "bun tools/another.ts"), tool("another.ts")])).toContain(
      "sensor-tool-identity",
    );
    expect(validate([sensor("example-check"), tool("aidlc-sensor-example-check.ts")])).toEqual([]);
  });
});

describe("customization template binding", () => {
  test("recognizes mandatory and optional prose artifacts", () => {
    expect(validate([stage(), template()])).toEqual([]);
    expect(
      validate([
        stage([], ["required-sections"], ["optional-design"]),
        template("optional-design"),
      ]),
    ).toEqual([]);
  });
  test("refuses Q&A/timestamp templates and unknown artifacts using engine eligibility", () => {
    for (const artifact of ["design-questions", "design-timestamp"])
      expect(codes([stage([artifact]), template(artifact)])).toContain("template-ineligible");
    expect(codes([stage(), template("unknown")])).toContain("template-ineligible");
  });
  test("requires meaningful headings and the actual required-sections binding", () => {
    expect(codes([stage(), template("design", "No required headings")])).toContain(
      "template-headings",
    );
    const findings = validate([stage(["design"], []), template()]);
    expect(findings).toEqual([
      expect.objectContaining({
        code: "template-sensor-binding",
        itemId: "template:design",
        field: "runtimeId",
      }),
    ]);
    expect(codes([stage(), template(), { ...template(), id: "second-template" }])).toContain(
      "template-duplicate",
    );
  });
});
