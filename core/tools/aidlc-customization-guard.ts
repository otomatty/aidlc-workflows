// Shared admission for configuration readers and writers. Leases belong to
// engine operations, never to the short-lived CLI process delivering a stage.
import { createHash, randomUUID } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  writeFileSync,
  unlinkSync,
  openSync,
  closeSync,
  fsyncSync,
} from "node:fs";
import { dirname, join, resolve, relative, isAbsolute, sep } from "node:path";
import { withAuditLock } from "./aidlc-lib.ts";

export const CUSTOMIZATION_PROTOCOL = 1;
export const REQUIRED_CUSTOMIZATION_GUARDS = [
  "tools/aidlc-lib.ts",
  "tools/aidlc-orchestrate.ts",
  "tools/aidlc-utility.ts",
  "tools/aidlc-steering.ts",
  "tools/aidlc-init.ts",
  "tools/aidlc-customization-guard.ts",
  "hooks/aidlc-session-start.ts",
] as const;
export const CONTROL_DIR = "aidlc/.aidlc-customization";
export const CUSTOMIZATION_MARKER = `${CONTROL_DIR}/pending.json`;
export type ConfigurationLease = {
  id: string;
  sessionId: string;
  operationId: string;
  revision: string;
  status: "active" | "completed";
  createdAt: string;
  record?: { space: string; intent: string };
};
export class CustomizationError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}
export function hashBytes(value: string | Buffer): string {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}
export function safeCustomizationPath(root: string, rel: string): string {
  if (
    !rel ||
    isAbsolute(rel) ||
    rel.includes("\\") ||
    rel.split("/").some((p) => !p || p === "." || p === ".." || p.includes(":"))
  )
    throw new CustomizationError("unsafe-path", `Invalid relative path: ${rel}`);
  const base = realpathSync(root);
  const target = resolve(base, rel);
  if (relative(base, target).startsWith(`..${sep}`) || target === base)
    throw new CustomizationError("unsafe-path", rel);
  let current = base;
  for (const part of rel.split("/")) {
    current = join(current, part);
    try {
      if (lstatSync(current).isSymbolicLink())
        throw new CustomizationError("unsafe-path", `Symbolic links are not supported: ${rel}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  return target;
}
export function syncCustomizationPath(file: string): void {
  let fd: number | undefined;
  try {
    fd = openSync(file, "r");
    fsyncSync(fd);
  } catch (error) {
    // Windows does not support opening a directory through node's open().
    // File data and atomic replacement are still synchronized individually.
    if (!(
      process.platform === "win32" &&
      ["EPERM", "EISDIR", "EINVAL", "EBADF"].includes((error as NodeJS.ErrnoException).code ?? "")
    ))
      throw error;
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}
export function writeCustomizationAtomic(
  root: string,
  rel: string,
  bytes: Buffer | string,
  mode?: number,
): void {
  const file = safeCustomizationPath(root, rel);
  if (mode === undefined) {
    try {
      mode = lstatSync(file).mode & 0o777;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  mkdirSync(dirname(file), { recursive: true });
  const temporary = `${file}.${randomUUID()}.tmp`;
  let fd: number | undefined;
  try {
    fd = openSync(temporary, "wx", mode ?? 0o600);
    writeFileSync(fd, bytes);
    fsyncSync(fd);
    closeSync(fd);
    fd = undefined;
    renameSync(temporary, file);
    syncCustomizationPath(dirname(file));
  } finally {
    if (fd !== undefined) closeSync(fd);
    // A leftover private temporary file is not an active configuration file.
    // Preserve the primary write error if cleanup also fails.
    try {
      unlinkSync(temporary);
    } catch {}
  }
}
export function customizationJson<T>(root: string, rel: string): T | null {
  const file = safeCustomizationPath(root, rel);
  try {
    return JSON.parse(readFileSync(file, "utf8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw new CustomizationError("configuration-unreadable", `Cannot read ${rel}`, String(error));
  }
}
export function assertCustomizationReadable(root: string): void {
  if (existsSync(join(root, CUSTOMIZATION_MARKER)))
    throw new CustomizationError(
      "recovery-required",
      "Configuration is being applied or needs recovery. Run customization recover before continuing.",
    );
}
export function configurationRevision(root: string): string {
  assertCustomizationReadable(root);
  const source = customizationJson<{ configurationId?: string }>(
    root,
    "aidlc/guide-customization/manifest.json",
  );
  if (source?.configurationId) return source.configurationId;
  return (
    customizationJson<{ revision: string }>(root, `${CONTROL_DIR}/current.json`)?.revision ??
    "unmanaged"
  );
}
export function stampWorkflowConfiguration(root: string, space: string, intent: string): void {
  const rel = `aidlc/spaces/${space}/intents/${intent}/configuration-revision.json`;
  writeCustomizationAtomic(
    root,
    rel,
    `${JSON.stringify({ schemaVersion: 1, revision: configurationRevision(root) })}\n`,
  );
}
export function assertWorkflowConfiguration(root: string, space: string, intent: string): void {
  const rel = `aidlc/spaces/${space}/intents/${intent}/configuration-revision.json`;
  const stamp = customizationJson<{ schemaVersion: number; revision: string }>(root, rel),
    current = configurationRevision(root);
  if (!stamp && current === "unmanaged") {
    stampWorkflowConfiguration(root, space, intent);
    return;
  }
  if (stamp?.schemaVersion !== 1 || stamp.revision !== current)
    throw new CustomizationError(
      "workflow-configuration-changed",
      "This record belongs to an earlier configuration. Start a new workflow; applying new configuration to this record is not supported.",
    );
}
export function activeCustomizationLeases(root: string): ConfigurationLease[] {
  const dir = safeCustomizationPath(root, `${CONTROL_DIR}/leases`);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((p) => p.endsWith(".json"))
    .map((p) => {
      const lease = customizationJson<ConfigurationLease>(root, `${CONTROL_DIR}/leases/${p}`);
      if (
        !lease ||
        typeof lease.id !== "string" ||
        typeof lease.sessionId !== "string" ||
        typeof lease.operationId !== "string" ||
        typeof lease.revision !== "string" ||
        typeof lease.createdAt !== "string" ||
        !["active", "completed"].includes(lease.status)
      )
        throw new CustomizationError("operation-state-unknown", `Invalid operation lease ${p}`);
      return lease;
    })
    .filter((l) => {
      if (l.status !== "active") return false;
      if (!l.record) return true;
      // A normal workflow owns its transferred lease across conductor sessions.
      // Only a verified completed record ends it; isolated and compose operations
      // never receive a record binding and need their own completion report.
      if (!/^[a-z][a-z0-9-]*$/.test(l.record.space) || !/^[a-zA-Z0-9._-]+$/.test(l.record.intent))
        throw new CustomizationError("operation-state-unknown", "Invalid lease record binding");
      const key = `${l.record.space}/${l.record.intent}`;
      if (
        !existsSync(
          safeCustomizationPath(
            root,
            `aidlc/spaces/${l.record.space}/intents/${l.record.intent}/aidlc-state.md`,
          ),
        )
      )
        return true;
      return unfinishedCustomizationWorkflows(root).some(
        (record) => record === key || record.startsWith(`${key} (`),
      );
    });
}
export function admitCustomizationOperation(
  root: string,
  sessionId: string,
  operationId = "workflow",
  record?: ConfigurationLease["record"],
): void {
  withAuditLock(root, () => {
    assertCustomizationReadable(root);
    const key = createHash("sha256").update(`${sessionId}\0${operationId}`).digest("hex");
    const rel = `${CONTROL_DIR}/leases/${key}.json`;
    const revision = configurationRevision(root);
    const old = customizationJson<ConfigurationLease>(root, rel);
    if (old?.status === "active" && old.revision !== revision)
      throw new CustomizationError(
        "configuration-changed",
        "This operation belongs to an older configuration. Finish or explicitly end it before restarting.",
      );
    const lease: ConfigurationLease = {
      id: key,
      sessionId,
      operationId,
      revision,
      status: "active",
      createdAt: old?.createdAt ?? new Date().toISOString(),
      ...(record ? { record } : {}),
    };
    writeCustomizationAtomic(root, rel, `${JSON.stringify(lease)}\n`);
  });
}
export function transferCustomizationOperation(
  root: string,
  sessionId: string,
  space: string,
  intent: string,
): void {
  withAuditLock(root, () => {
    admitCustomizationOperation(root, sessionId, `workflow:${space}/${intent}`, { space, intent });
    finishCustomizationOperation(root, sessionId, "workflow");
    finishCustomizationOperation(root, sessionId, "compose");
  });
}
export function finishCustomizationOperation(
  root: string,
  sessionId: string,
  operationId = "workflow",
): void {
  withAuditLock(root, () => {
    assertCustomizationReadable(root);
    const key = createHash("sha256").update(`${sessionId}\0${operationId}`).digest("hex");
    const rel = `${CONTROL_DIR}/leases/${key}.json`;
    const lease = customizationJson<ConfigurationLease>(root, rel);
    if (lease)
      writeCustomizationAtomic(root, rel, `${JSON.stringify({ ...lease, status: "completed" })}\n`);
  });
}
export function unfinishedCustomizationWorkflows(root: string): string[] {
  const result: string[] = [];
  const spaces = safeCustomizationPath(root, "aidlc/spaces");
  if (!existsSync(spaces)) return result;
  for (const space of readdirSync(spaces)) {
    const intentsRel = `aidlc/spaces/${space}/intents`;
    const intents = safeCustomizationPath(root, intentsRel);
    if (!existsSync(intents)) continue;
    const rawRegistry = customizationJson<unknown>(root, `${intentsRel}/intents.json`);
    if (rawRegistry !== null && !Array.isArray(rawRegistry))
      throw new CustomizationError("workflow-state-unknown", `Invalid registry in ${space}`);
    const registry = (rawRegistry ?? []) as Array<{
      dirName?: string;
      slug?: string;
      uuid?: string;
      status?: string;
    }>;
    const matched = new Set<object>();
    for (const record of readdirSync(intents)) {
      const directory = safeCustomizationPath(root, `${intentsRel}/${record}`);
      if (!lstatSync(directory).isDirectory() || record.startsWith(".") || record === "audit")
        continue;
      const matches = registry.filter(
        (e) =>
          e &&
          (e.dirName === record ||
            (!e.dirName &&
              typeof e.slug === "string" &&
              typeof e.uuid === "string" &&
              record.startsWith(`${e.slug}-`) &&
              e.uuid.replaceAll("-", "").endsWith(record.slice(e.slug.length + 1)))),
      );
      const stateFile = safeCustomizationPath(root, `${intentsRel}/${record}/aidlc-state.md`);
      if (matches.length !== 1 || !existsSync(stateFile)) {
        result.push(`${space}/${record} (state unknown)`);
        continue;
      }
      matched.add(matches[0]);
      const status = readFileSync(stateFile, "utf8").match(
        /^- \*\*Status\*\*:[ \t]*(.+?)\r?$/m,
      )?.[1];
      if (!(status === "Completed" && matches[0].status === "complete"))
        result.push(`${space}/${record} (${status ?? "unknown"})`);
    }
    for (const entry of registry)
      if (!matched.has(entry))
        result.push(
          `${space}/${entry?.dirName ?? entry?.slug ?? "unknown"} (registry without verified state)`,
        );
  }
  return [...new Set(result)];
}
