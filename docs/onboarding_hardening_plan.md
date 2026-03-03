# Onboarding Hardening Plan (Tracey-Led Flow)

## Summary
Stabilize and harden the onboarding flow so it is idempotent, validation-safe, and config-resilient. The current flow works, but has edge-case failures (URL formatting, weak phone validation, possible duplicated knowledge records, and lack of explicit test coverage). This plan upgrades schema and server-action behavior while preserving current UX and data model.

## Goals
1. Keep current 6-step onboarding UX unchanged for normal users.
2. Prevent avoidable validation failures from user input formatting.
3. Make save operation safe to rerun without duplicating downstream records.
4. Surface non-blocking configuration issues clearly.
5. Add robust automated tests for onboarding data flow and failure modes.

## Non-Goals
1. Redesign onboarding UI/steps.
2. Replace Twilio/LiveKit provisioning architecture.
3. Change voice-agent runtime in this task.
4. Introduce new external services.

## Scope
1. `components/onboarding/tracey-onboarding.tsx`
2. `actions/tracey-onboarding.ts`
3. `actions/scraper-actions.ts`
4. `prisma/schema.prisma` (only if required for idempotency/perf indexes; avoid schema churn if possible)
5. New tests for onboarding action logic and major validation paths.

## Implementation Plan

## 1) Input Normalization and Validation Hardening
1. In `actions/tracey-onboarding.ts`, convert schema fields to use `z.preprocess` where appropriate:
   - `websiteUrl`: accept blank or URL-like values; if non-empty and missing protocol, prepend `https://` before URL validation.
   - `phone`: trim, strip spacing/format chars, normalize AU format in preprocess, then validate against AU regex.
   - `email`, `ownerName`, `businessName`, `tradeType`, `baseSuburb`: trim whitespace before validation.
2. Enforce pricing consistency:
   - For each service item, if both `priceMin` and `priceMax` are present, validate `priceMin <= priceMax`.
3. Enforce emergency consistency:
   - If `emergencyService` is false, ignore/clear surcharge and emergency handling in persisted payload.
4. Add user-friendly validation messages for each rule so UI errors are actionable.

## 2) Make Onboarding Save Idempotent (No Duplicate Knowledge/Repair Rows)
1. Preserve current `ServiceItem` replace behavior.
2. Before writing `BusinessKnowledge` onboarding-derived records, delete existing onboarding-sourced service records for workspace:
   - `where: { workspaceId, category: "SERVICE", source: "onboarding" }`
3. Before writing `RepairItem` onboarding-derived records, delete existing records linked to onboarding source convention:
   - Preferred: add and use metadata/source marker if model supports it.
   - If no source column on `RepairItem`, use deterministic delete strategy scoped to workspace and current service titles.
4. Recreate rows from current validated service set.
5. Keep operation within a single transaction where practical:
   - Use `db.$transaction` for profile/service/knowledge/repair/pricing core writes.
   - Keep external calls (leads email + comms provisioning) outside transaction.

## 3) Transactional Core Write + Safe External Side Effects
1. In `saveTraceyOnboarding`, split into:
   - Phase A (transaction): user/workspace/profile/service/knowledge/repair/pricing.
   - Phase B (best-effort): leads-email allocation and comms provisioning.
2. If Phase B fails:
   - Return `success: true` with `provisioningError` or `leadsEmail` undefined.
   - Never roll back Phase A.
3. Add structured logging context:
   - `workspaceId`, `userId`, `phase`, `errorCode`, `errorMessage`.
4. Ensure consistent `revalidatePath` for dashboard and onboarding surfaces.

## 4) Scraper Resilience and Mapping Tightening
1. In `actions/scraper-actions.ts`, normalize and sanitize scraped fields before returning:
   - Trim strings, drop empty strings, enforce array uniqueness for `services` and `suburbs`.
2. Add simple confidence guardrails:
   - If extracted trade type is not in known trade list, map to `Other` fallback hint in UI (do not force on server).
3. Keep scraper failure non-blocking:
   - No throw path should block onboarding progression.

## 5) UX Safeguards in Client Component
1. In `components/onboarding/tracey-onboarding.tsx`:
   - Normalize website before submit (same logic as server, for immediate UX).
   - Keep server as source of truth; client normalization is convenience only.
2. Surface server-side validation errors cleanly:
   - Distinguish field-validation failures vs generic failure.
3. On submit success with `provisioningError`, maintain current warning panel behavior.

## 6) Configuration Readiness Checks (Non-Blocking)
1. Add helper in onboarding action to compute "readiness flags":
   - `hasGeminiKey` (scrape enrichment)
   - `hasTwilioCore` and `hasLivekitSipUri` (comms provisioning)
2. Include these in logs and optionally return in response as informational metadata.
3. Do not block onboarding completion due to missing config.

## 7) Tests and Validation
1. Unit tests for schema/normalization:
   - Website without protocol becomes valid URL.
   - AU phone normalization and invalid phone rejection.
   - `priceMin > priceMax` rejected.
   - emergency fields cleared when emergency disabled.
2. Server action integration-style tests (mock db + side-effect actions):
   - Happy path persists all core entities.
   - Re-run onboarding does not duplicate `BusinessKnowledge`/`RepairItem`.
   - Provisioning failure returns success with `provisioningError`.
   - Leads email allocation failure remains non-fatal.
3. Scraper tests:
   - Invalid URL rejected.
   - Parse fallback path returns safe minimal payload.
4. Type safety/build checks:
   - `npx tsc --noEmit`
   - Existing lint/test command set as available.

## Public API / Interface Changes
1. `saveTraceyOnboarding` response may include optional informational readiness metadata:
   - `readiness?: { scrapeConfigured: boolean; commsConfigured: boolean }`
2. No breaking change to required input shape; behavior improves via normalization.
3. Validation errors become more specific (message-level change only).

## Migration / Data Compatibility
1. Prefer no Prisma schema migration unless needed for robust `RepairItem` source tagging.
2. If tagging is required, add nullable `source` field on `RepairItem` with default `"manual"` and backfill `"onboarding"` during onboarding writes.
3. If no migration desired, use deterministic delete-and-recreate strategy scoped by workspace + service titles.

## Rollout Plan
1. Implement behind normal code path (no feature flag needed).
2. Deploy to staging/dev first.
3. Run onboarding twice with same workspace to verify idempotency.
4. Verify dashboard reflects single, current service/knowledge dataset.
5. Promote to production.

## Acceptance Criteria
1. User can submit onboarding with `websiteUrl` entered as `example.com` without failure.
2. Invalid AU phone fails with clear message; valid AU phone is normalized.
3. Running onboarding repeatedly does not duplicate onboarding-generated knowledge or repair entries.
4. Core onboarding save succeeds even when provisioning APIs fail; user gets dashboard access.
5. `tsc` passes and onboarding test suite passes.

## Assumptions and Defaults
1. Current 6-step UI remains unchanged.
2. Onboarding remains non-blocking for external provisioning.
3. Default model/source behavior remains as currently implemented.
4. If `RepairItem` cannot be safely source-tagged without migration, deterministic scoped replacement is acceptable.
