#!/usr/bin/env bun
// JSON-only engine API. The Guide and IDE adapters use the same coordinator.
import { realpathSync } from "node:fs";
import { resolve } from "node:path";
import { withAuditLock, withConfigurationTransactionAccess } from "./aidlc-lib.ts";
import {
  type CustomizationRequest,
  customizationCapabilities,
  readCustomizationCatalog,
  validateCustomizationSelection,
} from "./aidlc-customization-model.ts";
import { generateCustomizationPlan } from "./aidlc-customization-generate.ts";
import {
  applyCustomization,
  recoverCustomization,
  storeCustomizationPlan,
  readCustomizationOperation,
} from "./aidlc-customization-transaction.ts";
import {
  CustomizationError,
  activeCustomizationLeases,
  finishCustomizationOperation,
  assertCustomizationReadable,
} from "./aidlc-customization-guard.ts";
import { exportCustomization } from "./aidlc-customization-export.ts";
import {
  type InstallationRequest,
  generateInstallationPlan,
} from "./aidlc-customization-install.ts";

export function customizationCommand(
  root: string,
  action: string,
  request: CustomizationRequest,
): unknown {
  if (request.schemaVersion !== 1)
    throw new CustomizationError("bad-request", "schemaVersion 1 is required");
  if (action === "capabilities") return customizationCapabilities(root);
  if (action === "apply") return applyCustomization(root, request);
  if (action === "recover") {
    const recovered = recoverCustomization(root, {
      requestId: request.requestId,
      transactionId: request.transactionId,
    });
    if (recovered.status !== "nothing-to-recover") return recovered;
    const existing = readCustomizationOperation(root, request.requestId, request.transactionId) as {
      result?: unknown;
    } | null;
    return existing?.result ?? recovered;
  }
  if (action === "operation")
    return withConfigurationTransactionAccess(() =>
      withAuditLock(root, () =>
        readCustomizationOperation(root, request.requestId, request.transactionId),
      ),
    );
  if (action === "end-operation") {
    const confirmation = request as CustomizationRequest & {
      leaseId?: string;
      confirmedEnded?: boolean;
    };
    if (!confirmation.confirmedEnded || !confirmation.leaseId)
      throw new CustomizationError(
        "operation-confirmation-required",
        "Confirm that the external agent operation has ended and supply its leaseId.",
      );
    const lease = activeCustomizationLeases(root).find((l) => l.id === confirmation.leaseId);
    if (!lease) throw new CustomizationError("unknown-operation", "No active lease has that ID");
    finishCustomizationOperation(root, lease.sessionId, lease.operationId);
    return { status: "completed", leaseId: lease.id };
  }
  return withAuditLock(
    root,
    () => {
      assertCustomizationReadable(root);
      if (action === "install-plan") {
        const plan = generateInstallationPlan(root, request as InstallationRequest);
        storeCustomizationPlan(root, plan);
        return {
          id: plan.id,
          configurationRevision: plan.configurationRevision,
          canApply: plan.canApply,
          diagnostics: plan.diagnostics,
          files: plan.files.map(({ beforeBase64: _before, afterBase64: _after, ...file }) => file),
        };
      }
      const catalog = readCustomizationCatalog(root, request.spaceId);
      if (action === "catalog") return catalog;
      if (action === "validate") {
        const diagnostics = validateCustomizationSelection(catalog, request);
        return { valid: !diagnostics.some((d) => d.severity === "error"), diagnostics };
      }
      if (action === "plan" || action === "generate") {
        const plan = generateCustomizationPlan(root, catalog, request);
        storeCustomizationPlan(root, plan);
        return {
          id: plan.id,
          configurationRevision: plan.configurationRevision,
          canApply: plan.canApply,
          diagnostics: plan.diagnostics,
          files: plan.files.map((f) => ({
            relativePath: f.relativePath,
            beforeHash: f.beforeHash,
            afterHash: f.afterHash,
            before:
              f.beforeBase64 === null
                ? null
                : Buffer.from(f.beforeBase64, "base64").toString("utf8"),
            after:
              f.afterBase64 === null ? null : Buffer.from(f.afterBase64, "base64").toString("utf8"),
            content:
              f.afterBase64 === null ? null : Buffer.from(f.afterBase64, "base64").toString("utf8"),
            itemIds: f.itemIds,
            generated: f.generated,
          })),
        };
      }
      if (action === "export") return exportCustomization(catalog, request);
      throw new CustomizationError("unknown-command", `Unknown customization command: ${action}`);
    },
    undefined,
    undefined,
    600,
    100,
    false,
  );
}

export async function main(argv: string[]): Promise<void> {
  try {
    const action = argv[0],
      rootFlag = argv.indexOf("--project-dir");
    if (!action || rootFlag < 0 || !argv[rootFlag + 1])
      throw new CustomizationError(
        "bad-request",
        "Usage: aidlc-customization <command> --project-dir <workspace>; JSON request on stdin",
      );
    const raw = await Bun.stdin.text();
    if (Buffer.byteLength(raw) > 72 * 1024 * 1024)
      throw new CustomizationError("request-too-large", "Request exceeds 72 MiB");
    let request: CustomizationRequest;
    try {
      request = raw.trim() ? JSON.parse(raw) : { schemaVersion: 1 };
    } catch {
      throw new CustomizationError("bad-request", "Input must be one JSON object");
    }
    if (!request || typeof request !== "object" || Array.isArray(request))
      throw new CustomizationError("bad-request", "Input must be one JSON object");
    const data = customizationCommand(realpathSync(resolve(argv[rootFlag + 1])), action, request);
    process.stdout.write(`${JSON.stringify({ ok: true, data })}\n`);
  } catch (error) {
    process.stdout.write(
      `${JSON.stringify({ ok: false, error: { code: error instanceof CustomizationError ? error.code : "customization-failed", message: error instanceof CustomizationError ? error.message : "The engine could not complete the customization operation.", ...(error instanceof CustomizationError && error.details !== undefined ? { details: error.details } : {}) } })}\n`,
    );
    process.exitCode = 1;
  }
}
if (import.meta.main) await main(process.argv.slice(2));
