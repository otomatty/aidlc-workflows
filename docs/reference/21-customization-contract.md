# Customization coordinator

The customization coordinator lets an IDE or Guide client review a candidate and apply it through the engine. It is a development addition; the published 2.8.2 release does not expose this contract. Clients must inspect capabilities instead of inferring support from the version number.

## Protocol

Invoke `bun <harness-dir>/tools/aidlc-customization.ts <action> --project-dir <workspace>` with one JSON request on stdin. Every request includes `schemaVersion: 1`. Stdout contains a JSON envelope with either `data` or a structured error; diagnostics are data, not shell commands.

| Action | Purpose |
| --- | --- |
| `capabilities` | Attest every installed harness, reader guard, and supported operation. |
| `catalog` | Read sources, immutable defaults, identities, diagnostics, and the configuration revision. |
| `validate` | Validate the selected draft without executing its stages, sensors, scripts, or hooks. |
| `plan` / `generate` | Build an isolated candidate, compile graphs and runners, and persist the reviewed file plan. |
| `apply` | Apply a stored `planId`, `requestId`, and `expectedConfigurationRevision` under the engine lock. |
| `operation` | Read the durable outcome by request or transaction ID without repairing it. |
| `recover` | Complete or roll back the matching interrupted transaction. |
| `export` | Produce Guide JSON or a standard plugin ZIP with the selected harness projections. |
| `install-plan` | Plan installer file changes and replay customizations through the same coordinator. |
| `end-operation` | Close a specific operation lease only with `confirmedEnded: true` after its worker has stopped. |

Types live in `core/tools/aidlc-customization-model.ts`; installer inputs live in `aidlc-customization-install.ts`. Changes are submitted as items plus `removedItemIds`. Existing runtime identifiers and plugin ownership are fixed; replacement identities require adding and removing items. Unknown source fields and unrelated rule sections remain intact.

## Admission and recovery

Each new workflow records its configuration revision. New work uses the current configuration; a completed record from an older revision cannot be resumed against changed settings. Before applying, the engine checks all spaces, including paused workflows, approval waits, archived but incomplete records, and operations that have not created a record yet. Missing or inconsistent state blocks application.

Single-stage and compose work hold durable leases. Process exit or elapsed time does not prove that their delegated work ended. Normal reports close single-stage leases; intent creation transfers pre-initialization and compose ownership to the workflow record. After a rejected or abandoned compose proposal and after its worker has stopped, the conductor can run `bun <harness-dir>/tools/aidlc-utility.ts compose-end --confirmed-ended`. This only ends the operation lease; it does not approve a gate or advance a stage.

The transaction checks both the reviewed revision and individual file fingerprints. A durable journal fences readers while files change. Recovery is idempotent and preserves an external edit instead of overwriting it. A lost response is resolved with the same request ID. Do not delete a pending marker or invent a new request ID to bypass recovery.

Applied source definitions are stored under `aidlc/guide-customization/`. Machine-local journals and leases live under the ignored `aidlc/.aidlc-customization/`; Guide drafts and conversations use the ignored `aidlc/guide-customization/.local/`. Document originals remain in the selected space's `knowledge/documents/`, and DocumentKB changes participate in the same transaction.

## Generation and distribution

The packager records immutable definition and tier baselines plus guard hashes in every generated harness. Candidate generation operates in a temporary workspace, including graph and runner paths. It projects agent definitions onto the Claude, Cursor, Codex, Copilot, Kiro CLI, Kiro IDE, and opencode native surfaces. It never loads plugin code as a generator or runs a project's commands.

Guide JSON carries the full editable configuration. Standard plugin export supports new owned definitions and the existing additive stage contribution seam. Replacements that a standard plugin cannot express are returned as omissions for the client to disclose. Native installer plans replay authored changes on the candidate distribution and fail on conflicting changes. A legacy install can adopt the contract only after all existing work has ended and a complete candidate contract is supplied.

Validation covers apply/retry, interrupted commit points, external edits, multiple harnesses, legacy bootstrap, native installer replay, document registration, source preservation, leases, and native agent projection. These local tests do not claim a public release or live AI-provider certification.
