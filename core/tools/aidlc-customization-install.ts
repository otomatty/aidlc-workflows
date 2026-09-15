// Native setup/updater bridge. It uses the same reviewed plan and transaction
// as the customization page; inputs are candidate bytes, never shell commands.
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import {
  type EnginePlan,
  generateCustomizationPlan,
  mergeCustomizationText,
} from "./aidlc-customization-generate.ts";
import {
  type CustomizationItem,
  type CustomizationRequest,
  SOURCE_DIR,
  configurationFiles,
  customizationCapabilities,
  fileBytes,
  readCustomizationCatalog,
  sourceRevision,
} from "./aidlc-customization-model.ts";
import {
  CustomizationError,
  customizationJson,
  hashBytes,
  safeCustomizationPath,
} from "./aidlc-customization-guard.ts";
import { overrideSourcePath, fileMode } from "./aidlc-customization-model.ts";
import {
  customizationBootstrapEligible,
  installedCustomizationHarnesses,
} from "./aidlc-customization-model.ts";
import { REQUIRED_CUSTOMIZATION_GUARDS } from "./aidlc-customization-guard.ts";

export type InstallationFile = {
  relativePath: string;
  beforeHash: string | null;
  afterBase64: string | null;
  mode?: number;
};
export type InstallationRequest = CustomizationRequest & { installationFiles: InstallationFile[] };
export function allowedInstallPath(path: string): boolean {
  return (
    /^(?:\.(?:claude|cursor|codex|kiro|aidlc|opencode|github|agents)\/|aidlc\/spaces\/[^/]+\/(?:memory|knowledge)\/)/.test(
      path,
    ) ||
    [
      ".aidlc-version",
      "aidlc.settings.json",
      "aidlc.settings.local.json",
      "AGENTS.md",
      "CLAUDE.md",
      ".gitignore",
      ".mcp.json",
    ].includes(path)
  );
}
function normalizedHash(hash: string | null): string | null {
  return hash && !hash.startsWith("sha256:") ? `sha256:${hash}` : hash;
}
export function generateInstallationPlan(root: string, request: InstallationRequest): EnginePlan {
  if (!Array.isArray(request.installationFiles) || !request.installationFiles.length)
    throw new CustomizationError("bad-request", "installationFiles are required");
  const revision = sourceRevision(root);
  if (request.expectedConfigurationRevision && request.expectedConfigurationRevision !== revision)
    throw new CustomizationError(
      "configuration-changed",
      "Installation configuration revision changed",
    );
  const candidate = mkdtempSync(join(tmpdir(), "aidlc-customization-install-"));
  const write = (rel: string, bytes: Buffer) => {
    const p = safeCustomizationPath(candidate, rel);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, bytes);
  };
  try {
    const before = new Map<string, Buffer | null>();
    for (const rel of configurationFiles(root)) {
      const bytes = fileBytes(root, rel)!;
      before.set(rel, bytes);
      write(rel, bytes);
    }
    const seen = new Set<string>();
    for (const file of request.installationFiles) {
      if (
        !file ||
        typeof file.relativePath !== "string" ||
        !allowedInstallPath(file.relativePath) ||
        seen.has(file.relativePath)
      )
        throw new CustomizationError("invalid-installation-file", file?.relativePath ?? "unknown");
      safeCustomizationPath(root, file.relativePath);
      seen.add(file.relativePath);
      const prior = fileBytes(root, file.relativePath);
      if ((prior ? hashBytes(prior) : null) !== normalizedHash(file.beforeHash))
        throw new CustomizationError("configuration-changed", file.relativePath);
      before.set(file.relativePath, prior);
      const path = safeCustomizationPath(candidate, file.relativePath);
      if (file.afterBase64 === null) {
        if (existsSync(path)) rmSync(path);
      } else if (typeof file.afterBase64 === "string")
        write(file.relativePath, Buffer.from(file.afterBase64, "base64"));
      else throw new CustomizationError("invalid-installation-file", file.relativePath);
    }
    if (customizationBootstrapEligible(root)) {
      const attested = installedCustomizationHarnesses(candidate).some((h) => {
        const contract = customizationJson<{
          protocolVersion?: number;
          guards?: Record<string, string>;
        }>(candidate, `${h.dir}/tools/data/customization-capabilities.json`);
        return (
          contract?.protocolVersion === 1 &&
          REQUIRED_CUSTOMIZATION_GUARDS.every((rel) => {
            const bytes = fileBytes(candidate, `${h.dir}/${rel}`);
            return !!bytes && contract.guards?.[rel] === hashBytes(bytes);
          })
        );
      });
      if (!attested)
        throw new CustomizationError(
          "bootstrap-unverified",
          "The installation candidate must introduce a complete verified admission contract.",
        );
      const files = request.installationFiles
        .map((file) => {
          const bytes = before.get(file.relativePath)!,
            after = file.afterBase64 === null ? null : Buffer.from(file.afterBase64, "base64");
          return {
            relativePath: file.relativePath,
            beforeHash: bytes ? hashBytes(bytes) : null,
            afterHash: after ? hashBytes(after) : null,
            beforeBase64: bytes?.toString("base64") ?? null,
            afterBase64: file.afterBase64,
            beforeMode: fileMode(root, file.relativePath),
            afterMode: file.mode,
            itemIds: [],
            generated: true,
          };
        })
        .filter((file) => file.beforeHash !== file.afterHash);
      return {
        id: randomUUID(),
        kind: "bootstrap-install",
        configurationRevision: revision,
        files,
        diagnostics: [
          {
            severity: "warning",
            code: "restart-legacy-sessions",
            message:
              "End sessions that loaded the previous engine before starting workflows with the installed admission protocol.",
          },
        ],
        canApply: true,
        createdAt: new Date().toISOString(),
        items: [],
        requestHash: hashBytes(JSON.stringify(request)),
      };
    }
    const catalog = readCustomizationCatalog(candidate, request.spaceId);
    const saved =
      customizationJson<{ items?: CustomizationItem[] }>(root, `${SOURCE_DIR}/manifest.json`)
        ?.items ?? [];
    const replay: CustomizationItem[] = [];
    for (const item of saved) {
      if (item.owner !== "core") {
        replay.push(item);
        continue;
      }
      const override = customizationJson<{ baseContent: string; item: CustomizationItem }>(
        root,
        overrideSourcePath(item),
      );
      if (!override) continue; // A restored default follows the new baseline.
      const next = catalog.items.find(
        (i) => i.kind === item.kind && i.runtimeId === item.runtimeId,
      );
      if (!next)
        throw new CustomizationError(
          "customization-rebase-conflict",
          `The new engine no longer provides ${item.runtimeId}`,
        );
      try {
        replay.push({
          ...next,
          id: item.id,
          content: mergeCustomizationText(
            override.baseContent,
            override.item.content,
            next.content,
          ),
        });
      } catch (error) {
        throw new CustomizationError(
          "customization-rebase-conflict",
          `Reconcile ${item.runtimeId} against the updated engine.`,
          String(error),
        );
      }
    }
    // The candidate catalog retains source IDs from the existing source manifest.
    const generated = generateCustomizationPlan(
      candidate,
      catalog,
      { schemaVersion: 1, items: replay, spaceId: catalog.spaceId },
      true,
    );
    if (generated.diagnostics.some((d) => d.severity === "error"))
      return { ...generated, configurationRevision: revision, canApply: false };
    for (const file of generated.files) {
      const path = safeCustomizationPath(candidate, file.relativePath);
      if (file.afterBase64 === null) {
        if (existsSync(path)) rmSync(path);
      } else write(file.relativePath, Buffer.from(file.afterBase64, "base64"));
    }
    const paths = new Set([
      ...before.keys(),
      ...configurationFiles(candidate),
      ...generated.files.map((f) => f.relativePath),
      ...request.installationFiles.map((f) => f.relativePath),
    ]);
    const plan: EnginePlan = {
      ...generated,
      id: randomUUID(),
      configurationRevision: revision,
      files: [],
      canApply:
        customizationCapabilities(root).canApply && customizationCapabilities(candidate).canApply,
      requestHash: hashBytes(JSON.stringify(request)),
    };
    for (const rel of paths) {
      const a = before.has(rel) ? before.get(rel)! : fileBytes(root, rel),
        b = fileBytes(candidate, rel);
      if ((a === null && b === null) || (a !== null && b !== null && a.equals(b))) continue;
      plan.files.push({
        relativePath: rel,
        beforeHash: a ? hashBytes(a) : null,
        afterHash: b ? hashBytes(b) : null,
        beforeBase64: a?.toString("base64") ?? null,
        afterBase64: b?.toString("base64") ?? null,
        beforeMode: fileMode(root, rel),
        afterMode: request.installationFiles.find((file) => file.relativePath === rel)?.mode,
        itemIds: generated.files.find((f) => f.relativePath === rel)?.itemIds ?? [],
        generated: true,
      });
    }
    plan.files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
    return plan;
  } finally {
    rmSync(candidate, { recursive: true, force: true });
  }
}
