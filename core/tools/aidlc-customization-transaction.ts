// Durable configuration transaction, with admission fenced until recovery ends.
import { existsSync, unlinkSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { withAuditLock, withConfigurationTransactionAccess } from "./aidlc-lib.ts";
import type { EnginePlan } from "./aidlc-customization-generate.ts";
import { customizationBootstrapEligible } from "./aidlc-customization-model.ts";
import { allowedInstallPath } from "./aidlc-customization-install.ts";
import {
  type CustomizationRequest,
  SOURCE_DIR,
  customizationCapabilities,
  fileBytes,
  sourceRevision,
} from "./aidlc-customization-model.ts";
import {
  CONTROL_DIR,
  CUSTOMIZATION_MARKER,
  CustomizationError,
  hashBytes,
  safeCustomizationPath,
  writeCustomizationAtomic,
  customizationJson,
  assertCustomizationReadable,
  unfinishedCustomizationWorkflows,
  activeCustomizationLeases,
  syncCustomizationPath,
} from "./aidlc-customization-guard.ts";

type CommitResult = {
  transactionId: string;
  status: "committed" | "rolled-back";
  configurationRevision: string;
};
type Journal = {
  schemaVersion: 1;
  id: string;
  plan: EnginePlan;
  requestId: string;
  requestHash: string;
  phase: "prepared" | "applying" | "committed" | "rolled-back";
  result?: CommitResult;
};
type Marker = { schemaVersion: 1; transactionId: string };
type Receipt = {
  requestId: string;
  requestHash: string;
  transactionId: string;
  result?: CommitResult;
};
const serial = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const receiptPath = (requestId: string) =>
  `${CONTROL_DIR}/requests/${hashBytes(requestId).slice(7)}.json`;
const journalPath = (id: string) => `${CONTROL_DIR}/transactions/${id}/journal.json`;
function checkId(id: string): string {
  if (!/^[a-zA-Z0-9_-]{1,160}$/.test(id))
    throw new CustomizationError("bad-request", "Invalid operation identifier");
  return id;
}
function writeJournal(root: string, journal: Journal): void {
  writeCustomizationAtomic(root, journalPath(journal.id), serial(journal));
}
function checkPlanFiles(plan: EnginePlan): void {
  for (const file of plan.files)
    for (const side of ["before", "after"] as const) {
      const encoded = file[`${side}Base64`],
        expected = file[`${side}Hash`];
      if (
        (encoded === null) !== (expected === null) ||
        (encoded !== null && hashBytes(Buffer.from(encoded, "base64")) !== expected)
      )
        throw new CustomizationError(
          "journal-invalid",
          `Invalid ${side} bytes for ${file.relativePath}`,
        );
    }
}
function put(root: string, rel: string, bytes: string | null, mode?: number): void {
  if (bytes !== null) writeCustomizationAtomic(root, rel, Buffer.from(bytes, "base64"), mode);
  else {
    const file = safeCustomizationPath(root, rel);
    if (existsSync(file)) {
      unlinkSync(file);
      syncCustomizationPath(dirname(file));
    }
  }
}
function clearMarker(root: string, id: string): void {
  const marker = customizationJson<Marker>(root, CUSTOMIZATION_MARKER);
  if (marker?.transactionId !== id)
    throw new CustomizationError("recovery-required", "Pending configuration transaction changed.");
  unlinkSync(safeCustomizationPath(root, CUSTOMIZATION_MARKER));
  syncCustomizationPath(safeCustomizationPath(root, CONTROL_DIR));
}
function finalize(
  root: string,
  journal: Journal,
  crashAt?: "after-current" | "after-receipt",
): CommitResult {
  if (!journal.result)
    throw new CustomizationError("journal-invalid", "Missing transaction result");
  if (journal.result.status === "committed")
    writeCustomizationAtomic(
      root,
      `${CONTROL_DIR}/current.json`,
      serial({ revision: journal.result.configurationRevision, transactionId: journal.id }),
    );
  if (crashAt === "after-current")
    throw new CustomizationError("simulated-crash", "Test stopped after current index");
  writeCustomizationAtomic(
    root,
    receiptPath(journal.requestId),
    serial({
      requestId: journal.requestId,
      requestHash: journal.requestHash,
      transactionId: journal.id,
      result: journal.result,
    } satisfies Receipt),
  );
  if (crashAt === "after-receipt")
    throw new CustomizationError("simulated-crash", "Test stopped after receipt");
  clearMarker(root, journal.id);
  return journal.result;
}
function recoverLocked(
  root: string,
  expected?: { requestId?: string; transactionId?: string },
): CommitResult | { status: "nothing-to-recover" } {
  const marker = customizationJson<Marker>(root, CUSTOMIZATION_MARKER);
  if (!marker) return { status: "nothing-to-recover" };
  const journal = customizationJson<Journal>(root, journalPath(checkId(marker.transactionId)));
  if (journal?.schemaVersion !== 1 || journal.id !== marker.transactionId)
    throw new CustomizationError(
      "recovery-required",
      "The pending transaction journal is missing or invalid.",
    );
  if (
    (expected?.transactionId && expected.transactionId !== journal.id) ||
    (expected?.requestId && expected.requestId !== journal.requestId)
  )
    throw new CustomizationError(
      "operation-conflict",
      "The pending transaction belongs to another request.",
    );
  checkPlanFiles(journal.plan);
  const committed = journal.phase === "committed";
  // Inspect the entire target set before restoring anything. A third-party edit
  // is evidence to retain, never a reason to overwrite it with our backup.
  for (const file of journal.plan.files) {
    const bytes = fileBytes(root, file.relativePath),
      current = bytes ? hashBytes(bytes) : null;
    if (
      committed
        ? current !== file.afterHash
        : current !== file.beforeHash && current !== file.afterHash
    )
      throw new CustomizationError(
        "recovery-required",
        `External change prevents recovery: ${file.relativePath}`,
      );
  }
  if (!committed) {
    for (const file of [...journal.plan.files].reverse())
      put(root, file.relativePath, file.beforeBase64, file.beforeMode);
    journal.phase = "rolled-back";
    journal.result = {
      transactionId: journal.id,
      status: "rolled-back",
      configurationRevision: journal.plan.configurationRevision,
    };
    writeJournal(root, journal);
  }
  return finalize(root, journal);
}
export function recoverCustomization(
  root: string,
  expected?: { requestId?: string; transactionId?: string },
) {
  return withConfigurationTransactionAccess(() =>
    withAuditLock(
      root,
      () => {
        const receipt = expected?.requestId
          ? customizationJson<Receipt>(root, receiptPath(expected.requestId))
          : null;
        const marker = customizationJson<Marker>(root, CUSTOMIZATION_MARKER);
        if (receipt?.result && marker?.transactionId !== receipt.transactionId) {
          if (expected?.transactionId && expected.transactionId !== receipt.transactionId)
            throw new CustomizationError(
              "operation-conflict",
              "The request and transaction identifiers do not match.",
            );
          return receipt.result;
        }
        return recoverLocked(root, expected);
      },
      undefined,
      undefined,
      600,
      100,
      false,
    ),
  );
}
export function readCustomizationOperation(
  root: string,
  requestId?: string,
  transactionId?: string,
): unknown {
  if (requestId) return customizationJson<Receipt>(root, receiptPath(requestId));
  return transactionId
    ? customizationJson<Journal>(root, journalPath(checkId(transactionId)))
    : null;
}
export function storeCustomizationPlan(root: string, plan: EnginePlan): void {
  writeCustomizationAtomic(root, `${CONTROL_DIR}/plans/${plan.id}.json`, serial(plan));
}
export function applyCustomization(
  root: string,
  request: CustomizationRequest,
  testing: {
    failAfter?: number;
    crashAfter?: number;
    crashFinalize?: "after-commit" | "after-current" | "after-receipt";
  } = {},
): CommitResult {
  if (!request.requestId || request.requestId.length > 240 || !request.planId)
    throw new CustomizationError("bad-request", "requestId and planId are required");
  const requestHash = hashBytes(
    JSON.stringify({
      planId: request.planId,
      expectedConfigurationRevision: request.expectedConfigurationRevision,
    }),
  );
  return withConfigurationTransactionAccess(() =>
    withAuditLock(
      root,
      () => {
        const prior = customizationJson<Receipt>(root, receiptPath(request.requestId!));
        if (prior) {
          if (prior.requestId !== request.requestId || prior.requestHash !== requestHash)
            throw new CustomizationError(
              "request-conflict",
              "Request ID was already used with different input.",
            );
          if (prior.result) {
            const marker = customizationJson<Marker>(root, CUSTOMIZATION_MARKER);
            if (marker?.transactionId === prior.transactionId)
              recoverLocked(root, {
                requestId: prior.requestId,
                transactionId: prior.transactionId,
              });
            return prior.result;
          }
          const recovered = recoverLocked(root, {
            requestId: prior.requestId,
            transactionId: prior.transactionId,
          });
          if ("transactionId" in recovered) return recovered;
          const orphan = customizationJson<Journal>(
            root,
            journalPath(checkId(prior.transactionId)),
          );
          if (orphan?.phase === "prepared") {
            checkPlanFiles(orphan.plan);
            for (const file of orphan.plan.files) {
              const bytes = fileBytes(root, file.relativePath);
              if ((bytes ? hashBytes(bytes) : null) !== file.beforeHash)
                throw new CustomizationError(
                  "recovery-required",
                  `Prepared transaction has external changes: ${file.relativePath}`,
                );
            }
            orphan.phase = "rolled-back";
            orphan.result = {
              transactionId: orphan.id,
              status: "rolled-back",
              configurationRevision: orphan.plan.configurationRevision,
            };
            writeJournal(root, orphan);
            writeCustomizationAtomic(
              root,
              receiptPath(orphan.requestId),
              serial({ ...prior, result: orphan.result }),
            );
            return orphan.result;
          }
          throw new CustomizationError(
            "recovery-required",
            "The previous request has an unresolved outcome.",
          );
        }
        assertCustomizationReadable(root);
        const plan = customizationJson<EnginePlan>(
          root,
          `${CONTROL_DIR}/plans/${checkId(request.planId!)}.json`,
        );
        if (!plan?.canApply || plan.diagnostics.some((d) => d.severity === "error"))
          throw new CustomizationError(
            "invalid-plan",
            "The plan is absent or has unresolved errors.",
          );
        const capability = customizationCapabilities(root);
        if (
          !capability.canApply &&
          !(
            plan.kind === "bootstrap-install" &&
            customizationBootstrapEligible(root) &&
            plan.files.every((file) => allowedInstallPath(file.relativePath))
          )
        )
          throw new CustomizationError("engine-capability-missing", capability.reason!);
        const unfinished = unfinishedCustomizationWorkflows(root);
        if (unfinished.length)
          throw new CustomizationError(
            "workflow-active",
            "Finish all workflows before applying configuration.",
            unfinished,
          );
        const leases = activeCustomizationLeases(root);
        if (leases.length)
          throw new CustomizationError(
            "operation-active",
            "An engine operation still uses this configuration.",
            leases,
          );
        if (
          plan.configurationRevision !== sourceRevision(root) ||
          (request.expectedConfigurationRevision &&
            request.expectedConfigurationRevision !== plan.configurationRevision)
        )
          throw new CustomizationError(
            "configuration-changed",
            "Configuration changed since this plan was reviewed.",
          );
        checkPlanFiles(plan);
        for (const file of plan.files) {
          const bytes = fileBytes(root, file.relativePath);
          if ((bytes ? hashBytes(bytes) : null) !== file.beforeHash)
            throw new CustomizationError("configuration-changed", file.relativePath);
        }
        const journal: Journal = {
          schemaVersion: 1,
          id: randomUUID(),
          plan,
          requestId: request.requestId!,
          requestHash,
          phase: "prepared",
        };
        writeJournal(root, journal);
        writeCustomizationAtomic(
          root,
          receiptPath(journal.requestId),
          serial({
            requestId: journal.requestId,
            requestHash,
            transactionId: journal.id,
          } satisfies Receipt),
        );
        writeCustomizationAtomic(
          root,
          CUSTOMIZATION_MARKER,
          serial({ schemaVersion: 1, transactionId: journal.id } satisfies Marker),
        );
        journal.phase = "applying";
        writeJournal(root, journal);
        try {
          for (const [index, file] of plan.files.entries()) {
            const bytes = fileBytes(root, file.relativePath);
            if ((bytes ? hashBytes(bytes) : null) !== file.beforeHash)
              throw new CustomizationError("configuration-changed", file.relativePath);
            put(root, file.relativePath, file.afterBase64, file.afterMode);
            if (testing.crashAfter === index + 1)
              throw new CustomizationError("simulated-crash", "Test stopped before recovery");
            if (testing.failAfter === index + 1) throw new Error("Injected transaction failure");
          }
          for (const file of plan.files) {
            const bytes = fileBytes(root, file.relativePath);
            if ((bytes ? hashBytes(bytes) : null) !== file.afterHash)
              throw new CustomizationError("configuration-changed", file.relativePath);
          }
          // The journal is the authority for both commit status and its revision.
          // current.json is only a reconstructible index, written after this record.
          journal.phase = "committed";
          journal.result = {
            transactionId: journal.id,
            status: "committed",
            configurationRevision: sourceRevision(root),
          };
          writeJournal(root, journal);
          if (testing.crashFinalize === "after-commit")
            throw new CustomizationError("simulated-crash", "Test stopped after commit");
          return finalize(root, journal, testing.crashFinalize);
        } catch (error) {
          if (error instanceof CustomizationError && error.code === "simulated-crash") throw error;
          recoverLocked(root);
          throw error;
        }
      },
      undefined,
      undefined,
      600,
      100,
      false,
    ),
  );
}

/** Stop native refresh from silently overwriting a customization. The update
 * planner must replay the source manifest before invoking a normal commit. */
export function assertCustomizationUpdatePrepared(
  root: string,
  candidateItems?: CustomizationRequest,
): void {
  assertCustomizationReadable(root);
  if (unfinishedCustomizationWorkflows(root).length)
    throw new CustomizationError(
      "workflow-active",
      "Finish all workflows before updating configuration.",
    );
  if (activeCustomizationLeases(root).length)
    throw new CustomizationError(
      "operation-active",
      "End active engine operations before updating configuration.",
    );
  if (existsSync(safeCustomizationPath(root, `${SOURCE_DIR}/manifest.json`)) && !candidateItems)
    throw new CustomizationError(
      "customization-rebase-required",
      "This project has customization sources. Rebase and review the customization plan against the new engine before refreshing.",
    );
}
