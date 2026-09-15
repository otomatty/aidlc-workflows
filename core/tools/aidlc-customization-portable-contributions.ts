// Declarative contribution conversion and composition. No plugin code is executed.
import type { CustomizationItem, Diagnostic } from "./aidlc-customization-model.ts";
import { CustomizationError } from "./aidlc-customization-guard.ts";

const ADDS = new Set(["produces", "consumes", "sensors", "scopes", "required_sections"]);
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const equal = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const name = (value: unknown): value is string =>
  typeof value === "string" && /^[a-z][a-z0-9-]*$/.test(value);
type Parsed = { data: Record<string, unknown>; body: string; head: string; newline: string };
type Fragment = { anchor: string; order: number; prose: string; plugin: string };
function parse(raw: string): Parsed {
  const match = raw.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n)?/);
  if (!match)
    throw new CustomizationError(
      "contribution-frontmatter",
      "A closed YAML frontmatter block is required.",
    );
  const data: unknown = Bun.YAML.parse(match[1]);
  if (!record(data))
    throw new CustomizationError("contribution-frontmatter", "Frontmatter must be an object.");
  return {
    data,
    head: match[0],
    body: raw.slice(match[0].length),
    newline: raw.includes("\r\n") ? "\r\n" : "\n",
  };
}
function anchors(body: string): Map<number, string> {
  const points = new Map<number, string>();
  for (const m of body.matchAll(/^## ([\w -]+)[^\r\n]*$/gm)) {
    const from = m.index! + m[0].length,
      next = body.slice(from).search(/^## /m);
    points.set(
      next < 0 ? body.length : from + next,
      m[1] === "Steps" ? "end-of-steps" : `in:${m[1].trim()}`,
    );
  }
  for (const m of body.matchAll(/^### Step (\d+)(?:-(\d+))?\b[^\r\n]*$/gm)) {
    points.set(m.index!, `before-step:${m[1]}`);
    const from = m.index! + m[0].length,
      next = body.slice(from).search(/^#{2,3} /m);
    if (!points.has(next < 0 ? body.length : from + next))
      points.set(next < 0 ? body.length : from + next, `after-step:${m[2] ?? m[1]}`);
  }
  return points;
}
function anchorOffset(body: string, anchor: string): number {
  const points = anchors(body);
  for (const [offset, value] of points) if (value === anchor) return offset;
  const step = anchor.match(/^(before|after)-step:(\d+)$/);
  if (step) {
    for (const m of body.matchAll(/^### Step (\d+)(?:-(\d+))?\b[^\r\n]*$/gm)) {
      if (Number(step[2]) < Number(m[1]) || Number(step[2]) > Number(m[2] ?? m[1])) continue;
      if (step[1] === "before") return m.index!;
      const from = m.index! + m[0].length,
        next = body.slice(from).search(/^#{2,3} /m);
      return next < 0 ? body.length : from + next;
    }
  }
  if (anchor.startsWith("in:") || anchor === "end-of-steps") {
    const compartment = anchor === "end-of-steps" ? "Steps" : anchor.slice(3);
    if (!/^[\w -]+$/.test(compartment)) return -1;
    const found = [...body.matchAll(/^## ([^\r\n]+)$/gm)].find((m) => m[1].trim() === compartment);
    if (found) {
      const from = found.index! + found[0].length,
        next = body.slice(from).search(/^## /m);
      return next < 0 ? body.length : from + next;
    }
  }
  return -1;
}
function insertionFragments(base: string, edited: string, plugin: string): Fragment[] | null {
  if (base === edited) return [];
  const points = anchors(base),
    boundaries = [...new Set([0, ...points.keys(), base.length])].sort((a, b) => a - b);
  const fragments: Fragment[] = [];
  let cursor = 0;
  for (let index = 0; index < boundaries.length - 1; index++) {
    const start = boundaries[index],
      segment = base.slice(start, boundaries[index + 1]);
    const found = edited.indexOf(segment, cursor);
    if (found < 0) return null;
    if (found > cursor) {
      const anchor = points.get(start);
      if (!anchor) return null;
      fragments.push({
        anchor,
        order: 100 + fragments.length * 10,
        plugin,
        prose: edited.slice(cursor, found),
      });
    }
    cursor = found + segment.length;
  }
  if (cursor < edited.length) {
    const anchor = points.get(base.length);
    if (!anchor) return null;
    fragments.push({
      anchor,
      order: 100 + fragments.length * 10,
      plugin,
      prose: edited.slice(cursor),
    });
  }
  if (
    fragments.some(
      (f) => !f.prose.trim() || /^## fragment:/m.test(f.prose) || /<!--\s*plugin:/i.test(f.prose),
    )
  )
    return null;
  return fragments;
}

export function coreStageContribution(
  item: CustomizationItem,
  plugin: string,
  items: CustomizationItem[],
): { content?: string; omittedFields: string[] } {
  if (item.kind !== "stage" || item.owner !== "core" || !item.originalContent)
    return { omittedFields: ["definition"] };
  const base = parse(item.originalContent),
    edited = parse(item.content),
    omitted = new Set<string>();
  const adds: Record<string, unknown[]> = {};
  for (const key of new Set([...Object.keys(base.data), ...Object.keys(edited.data)])) {
    const before = base.data[key],
      after = edited.data[key];
    if (equal(before, after)) continue;
    if (
      !ADDS.has(key) ||
      !Array.isArray(after) ||
      (before !== undefined && !Array.isArray(before))
    ) {
      omitted.add(key);
      continue;
    }
    const prior = (before ?? []) as unknown[];
    if (prior.some((entry) => !after.some((next) => equal(entry, next)))) omitted.add(key);
    const added = after
      .filter((entry) => !prior.some((old) => equal(old, entry)))
      .filter((entry) => {
        if (key === "consumes") {
          if (
            !record(entry) ||
            !name(entry.artifact) ||
            prior.some((old) => record(old) && old.artifact === entry.artifact)
          ) {
            omitted.add(key);
            return false;
          }
        } else if (typeof entry !== "string") {
          omitted.add(key);
          return false;
        }
        if (key === "produces" && !(entry as string).startsWith(`${plugin}-`)) {
          omitted.add(key);
          return false;
        }
        if (
          key === "scopes" &&
          !items.some(
            (i) =>
              i.kind === "scope" &&
              i.runtimeId === entry &&
              i.owner === "plugin" &&
              i.pluginId === plugin,
          )
        ) {
          omitted.add(key);
          return false;
        }
        return true;
      });
    if (added.length) adds[key] = added;
  }
  const fragments = insertionFragments(
    base.body.replaceAll("\r\n", "\n"),
    edited.body.replaceAll("\r\n", "\n"),
    plugin,
  );
  if (fragments === null) omitted.add("body");
  if (!Object.keys(adds).length && !fragments?.length)
    return { omittedFields: [...(omitted.size ? omitted : ["no-additive-change"])] };
  const fm = {
    target: item.runtimeId,
    plugin,
    ...(Object.keys(adds).length ? { adds } : {}),
    ...(fragments?.length
      ? { fragments: fragments.map(({ anchor, order }) => ({ anchor, order })) }
      : {}),
  };
  const content = `---\n${Bun.YAML.stringify(fm, null, 2).trimEnd()}\n---\n${(fragments ?? []).map((f) => `\n## fragment: ${f.anchor}\n\n${f.prose.trim()}\n`).join("")}`;
  return { content, omittedFields: [...omitted] };
}

function contributionParts(item: CustomizationItem): { parsed: Parsed; fragments: Fragment[] } {
  const parsed = parse(item.content),
    declared = parsed.data.fragments ?? [];
  if (!Array.isArray(declared))
    throw new CustomizationError("contribution-fragments", "fragments must be an array.");
  const headings = [...parsed.body.matchAll(/^## fragment: ([^\r\n]+)\r?$/gm)];
  if (declared.length !== headings.length)
    throw new CustomizationError(
      "contribution-fragments",
      "Each declared fragment needs one matching prose block.",
    );
  const fragments = headings.map((heading, index) => {
    const entry = declared[index];
    if (!record(entry) || entry.anchor !== heading[1] || !Number.isSafeInteger(entry.order))
      throw new CustomizationError(
        "contribution-fragments",
        "Fragment anchor/order must match the prose block.",
      );
    const prose = parsed.body
      .slice(heading.index! + heading[0].length, headings[index + 1]?.index ?? parsed.body.length)
      .trim();
    if (!prose || /<!--\s*plugin:/i.test(prose))
      throw new CustomizationError("contribution-fragments", "Empty or reserved fragment content.");
    return {
      anchor: String(entry.anchor),
      order: Number(entry.order),
      prose,
      plugin: String(parsed.data.plugin),
    };
  });
  return { parsed, fragments };
}
export function validatePortableContribution(
  item: CustomizationItem,
  items: CustomizationItem[],
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const error = (message: string) =>
    diagnostics.push({ severity: "error", code: "contribution-invalid", message, itemId: item.id });
  try {
    const { parsed, fragments } = contributionParts(item),
      data = parsed.data;
    if (Object.keys(data).some((k) => !["target", "plugin", "adds", "fragments"].includes(k)))
      error("Contribution has unsupported top-level fields.");
    if (!name(data.plugin) || data.plugin !== item.pluginId)
      error("Contribution owner must match its plugin.");
    const target = items.find(
      (i) => i.kind === "stage" && i.owner === "core" && i.runtimeId === data.target,
    );
    if (!target || (item.target?.contributionTo && data.target !== item.target.contributionTo))
      error("Contribution target must resolve to its core stage.");
    const adds = data.adds ?? {};
    if (!record(adds)) error("adds must be an object.");
    else
      for (const [field, entries] of Object.entries(adds)) {
        if (!ADDS.has(field) || !Array.isArray(entries)) {
          error(`Unsupported contribution field ${field}.`);
          continue;
        }
        for (const entry of entries) {
          if (field === "consumes") {
            if (
              !record(entry) ||
              !name(entry.artifact) ||
              (entry.required !== undefined && typeof entry.required !== "boolean") ||
              (entry.conditional_on !== undefined &&
                (typeof entry.conditional_on !== "string" ||
                  !/^\w+$/.test(entry.conditional_on))) ||
              Object.keys(entry).some(
                (k) => !["artifact", "required", "conditional_on"].includes(k),
              )
            )
              error("Invalid consume entry.");
          } else if (typeof entry !== "string" || !entry.trim() || /[\r\n]/.test(entry))
            error(`Invalid ${field} entry.`);
          else if (field !== "required_sections" && !name(entry)) error(`Invalid ${field} name.`);
          if (
            field === "produces" &&
            typeof entry === "string" &&
            !entry.startsWith(`${item.pluginId}-`)
          )
            error("Produced artifact must use the plugin namespace.");
          if (
            field === "scopes" &&
            !items.some(
              (i) =>
                i.kind === "scope" &&
                i.runtimeId === entry &&
                i.owner === "plugin" &&
                i.pluginId === item.pluginId,
            )
          )
            error("Scope must be owned by the same selected plugin.");
          if (
            field === "sensors" &&
            !items.some((i) => i.kind === "sensor" && i.runtimeId === entry)
          )
            error("Contribution sensor is missing from the selected configuration.");
        }
      }
    if (target)
      for (const fragment of fragments)
        if (anchorOffset(parse(target.originalContent ?? target.content).body, fragment.anchor) < 0)
          error(`Unknown fragment anchor ${fragment.anchor}.`);
  } catch (cause) {
    error(cause instanceof Error ? cause.message : "Invalid contribution.");
  }
  return diagnostics;
}

/** Call once per target, with a fresh canonical baseline plus explicit core overrides. */
export function mergePortableContributions(
  baseStage: string,
  contributions: CustomizationItem[],
): string {
  const base = parse(baseStage),
    data = structuredClone(base.data),
    fragments: Fragment[] = [];
  for (const item of [...contributions].sort(
    (a, b) => (a.pluginId ?? "").localeCompare(b.pluginId ?? "") || a.id.localeCompare(b.id),
  )) {
    const part = contributionParts(item),
      adds = part.parsed.data.adds ?? {};
    if (!record(adds))
      throw new CustomizationError("contribution-invalid", "adds must be an object.");
    for (const [field, entries] of Object.entries(adds)) {
      if (!ADDS.has(field) || !Array.isArray(entries))
        throw new CustomizationError("contribution-invalid", `Unsupported ${field}.`);
      const current = data[field] ?? [];
      if (!Array.isArray(current))
        throw new CustomizationError("contribution-invalid", `Target ${field} is not an array.`);
      for (const entry of entries) {
        if (current.some((existing) => equal(existing, entry))) continue;
        if (
          field === "consumes" &&
          record(entry) &&
          current.some((existing) => record(existing) && existing.artifact === entry.artifact)
        )
          throw new CustomizationError(
            "contribution-conflict",
            "Cannot replace an existing consume edge.",
          );
        current.push(entry);
      }
      data[field] = current;
    }
    fragments.push(...part.fragments);
  }
  let head = base.head;
  for (const field of ADDS) {
    if (equal(data[field], base.data[field])) continue;
    const rendered = Bun.YAML.stringify({ [field]: data[field] }, null, 2)
      .trimEnd()
      .replaceAll("\n", base.newline);
    const fieldPattern = new RegExp(
      `^${field}:[^\\r\\n]*(?:\\r?\\n(?![a-z_][a-z0-9_]*:|---)[^\\r\\n]*)*`,
      "m",
    );
    if (fieldPattern.test(head)) head = head.replace(fieldPattern, rendered);
    else
      head = head.replace(
        /\r?\n---(?:\r?\n)?$/,
        `${base.newline}${rendered}${base.newline}---${base.newline}`,
      );
  }
  const positioned = fragments.map((f) => ({ ...f, offset: anchorOffset(base.body, f.anchor) }));
  if (positioned.some((f) => f.offset < 0))
    throw new CustomizationError(
      "contribution-anchor",
      "Fragment anchor is absent from the target.",
    );
  const groups = new Map<number, typeof positioned>();
  for (const fragment of positioned) {
    const group = groups.get(fragment.offset) ?? [];
    group.push(fragment);
    groups.set(fragment.offset, group);
  }
  let body = base.body;
  for (const [offset, group] of [...groups.entries()].sort((a, b) => b[0] - a[0])) {
    const prose = group
      .sort((a, b) => a.order - b.order || a.plugin.localeCompare(b.plugin))
      .map((f) => `${f.prose.trim()}${base.newline}${base.newline}`)
      .join("")
      .replaceAll(/\r?\n/g, base.newline);
    body = body.slice(0, offset) + prose + body.slice(offset);
  }
  return head + body;
}
