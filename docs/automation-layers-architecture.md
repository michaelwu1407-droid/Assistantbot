# Automation Layers Architecture

## Overview

Earlymark's automation is built on three distinct layers that control how Tracey behaves and how the CRM reacts to data. This document covers how each layer works today, what's reliable, what's broken, and the recommended path forward.

---

## Layer 1: Autonomy Filter (Agent Modes)

### What It Does

A master permission switch that determines how much Tracey can do without human approval. Three modes:

| Mode | Behavior |
|------|----------|
| **EXECUTION** | Tracey performs actions independently (book jobs, send SMS, make calls) |
| **DRAFT** | Tracey prepares actions but waits for human confirmation |
| **INFO_ONLY** | Tracey only collects data — all outbound communication blocked |

### How It's Enforced

Mode checks happen at **multiple enforcement points** across the system:

1. **Tool execution guards** (`actions/chat-actions.ts:95`) — `getCustomerContactGuardResult()` blocks or drafts SMS/email/call actions based on mode
2. **Response rewriting** (`lib/ai/sms-agent.ts:261`, `lib/ai/email-agent.ts:118`) — `enforceCustomerFacingResponsePolicy()` detects and rewrites commitments (firm quotes, bookings, timing promises) in DRAFT/INFO_ONLY modes
3. **API route checks** (`app/api/chat/route.ts:308,403,450`) — Returns 403 for job draft cards in INFO_ONLY mode
4. **System prompt injection** — Mode-specific behavioral instructions via `getCustomerContactCapabilityPolicy()`

### Pattern Detection

The response rewriter catches:
- **Quote patterns**: `$250`, "the price is", "costs will be"
- **Booking patterns**: "you're booked", "locked in", "scheduled you"
- **Outbound commitment patterns**: "I'll call", "we'll text"
- **Timing promise patterns**: "within the hour", "first thing tomorrow"

### What Works Reliably

- Mode switching via Settings UI and onboarding
- SMS/email/call gating through `getCustomerContactGuardResult()`
- Response rewriting for customer-facing channels
- Default to DRAFT mode for new workspaces

### Known Bugs (Must Fix)

#### Bug 1: Draft Card Confirmation Bypasses Mode

**Location**: `components/chatbot/chat-interface.tsx:132`

**Problem**: `confirmJobDraft()` does NOT re-check the agent mode before calling `runCreateJobNatural()`. If a user has a draft card open and switches to INFO_ONLY, they can still confirm the job.

**Fix**: Add mode validation at the start of `confirmJobDraft()`.

#### Bug 2: SMS Agent Job Creation Has No Mode Guard

**Location**: `lib/ai/sms-agent.ts:76-88`

**Problem**: `createJobNatural` is available in SMS customer tools without any mode enforcement. Inbound SMS conversations can create jobs even in INFO_ONLY mode.

**Fix**: Wrap tool execution with mode check, or conditionally exclude `createJobNatural` from SMS tools in non-EXECUTION modes.

#### Bug 3: Direct LLM Tool Calls Skip Mode Checks

**Location**: `lib/ai/tools.ts:157`

**Problem**: The `createJobNatural` tool definition has no mode guard. If the LLM generates a direct tool call (rather than going through the chat route's draft-card flow), mode enforcement is bypassed entirely.

**Fix**: Add mode check in the tool's `execute` wrapper.

#### Bug 4: Automation Emails May Bypass Mode

**Location**: `actions/automation-actions.ts`

**Problem**: Automation-triggered emails may call `runSendEmail()` without the `enforceCustomerContactMode` parameter set to `true`.

**Fix**: Explicitly pass `enforceCustomerContactMode: true` for all customer-facing automation emails.

### Test Coverage

**Existing** (`__tests__/customer-contact-policy.test.ts`):
- EXECUTION mode allows firm quotes/bookings
- DRAFT mode rewrites booking + timing promise violations
- INFO_ONLY mode rewrites quote violations

**Missing**:
- Job creation blocking in INFO_ONLY at chat route
- SMS tool enforcement
- Mode change while draft card is open
- Automation email mode enforcement

---

## Layer 2: Behavioral Rules (The "Learning" Layer)

### What It Does

Natural language instructions that influence Tracey's decision-making during conversations. Examples: "Always ask if a tap is leaking from the handle or the spout", "We don't do gas work".

### Current Storage (4 Overlapping Locations)

This is the biggest architectural problem in the system.

| Storage | Location | Purpose | How It Gets There |
|---------|----------|---------|-------------------|
| `aiPreferences` | `Workspace.aiPreferences` (string) | General behavioral rules | Chat mutation via `updateAiPreferences` tool, or Settings UI |
| `BusinessKnowledge.NEGATIVE_SCOPE` | `BusinessKnowledge` table | Hard rules to decline leads | Manual, scrape, or learned |
| `exclusionCriteria` | `Workspace.exclusionCriteria` (string) | Legacy lead disqualification patterns | Settings UI (legacy) |
| `agentFlags` | `Deal.agentFlags` (JSON array) | Per-deal triage warnings | `addAgentFlag` tool during conversation |

**Problem**: `exclusionCriteria` and `BusinessKnowledge.NEGATIVE_SCOPE` are functionally identical — both store "decline these leads" rules. They're merged at runtime (`[...exclusionCriteria.split(), ...knowledgeNegativeRules]`) which means the same rule can appear multiple times.

### How Rules Are Injected

The `buildAgentContext()` function (`lib/ai/context.ts:86-402`) is the central injection point. It builds context strings that become part of the system prompt:

1. **`preferencesStr`** — Raw `aiPreferences` text, prefixed with "USER PREFERENCES (Follow these strictly)"
2. **`bouncerStr`** — Merged exclusion criteria + NEGATIVE_SCOPE rules, framed as "NO-GO rules (decline ONLY on exact match)"
3. **`knowledgeBaseStr`** — Business identity, services, pricing
4. **`pricingRulesStr`** — Approved prices and call-out fees

### The `updateAiPreferences` Tool

**Definition** (`lib/ai/tools.ts:283-288`):
```
description: "Save a permanent behavioral rule. Prefix [HARD_CONSTRAINT] to strictly decline or [FLAG_ONLY] to just flag."
```

**Implementation** (`actions/settings-actions.ts:178-191`):
```
currentRules + "\n- " + newRule  // Simple append, no dedup
```

### Known Issues

#### Issue 1: No Deduplication

`updateAiPreferences` appends blindly. Calling it 5 times with the same rule creates 5 identical lines. The system prompt grows unbounded.

#### Issue 2: `[HARD_CONSTRAINT]` and `[FLAG_ONLY]` Tags Are Theater

The tool description tells the AI to prefix rules with these tags for severity. But the implementation **never parses or enforces them**. They're treated as literal text in the rule string. No code path distinguishes between a `[HARD_CONSTRAINT]` rule and a regular one.

#### Issue 3: Cache Staleness (2-5 Minutes)

After `updateAiPreferences` writes to the database:
- `revalidatePath("/crm/settings/agent")` is called for the Settings UI
- But `agentContextCache` (2-minute TTL) and voice grounding cache (5-minute TTL) are NOT explicitly invalidated
- Rule changes don't take effect immediately in active conversations

#### Issue 4: No Audit Trail

Changes to `aiPreferences` are not logged. No way to see history of what was added/removed or when. Only `Workspace.updatedAt` changes, which tracks all workspace modifications.

#### Issue 5: Unbounded Agent Flags

`Deal.agentFlags` is appended to without deduplication and never automatically cleaned up. Over time, flags accumulate without limit.

#### Issue 6: Deviation Learning is Semi-Orphaned

When a user overrides an AI decline recommendation (`learning-actions.ts:28-205`), the system logs a `DeviationEvent` and offers to remove the rule. But this only works for `NEGATIVE_SCOPE` rules — there's no corresponding mechanism for `aiPreferences` overrides.

### What Works Reliably

- Preferences injected into system prompts across all channels (chat, SMS, email, voice)
- NEGATIVE_SCOPE rules checked during automatic lead triage (`lib/ai/triage.ts`)
- Settings UI for viewing/editing preferences
- Deviation detection for NEGATIVE_SCOPE rules

---

## Layer 3: Structured Workflow Rules (The "If-Then" Engine)

### What It Does

Rigid automated triggers that run in the background, independent of chat conversations. Managed through the Create Rule Dialog UI.

### Supported Triggers

| Trigger | Event | Status |
|---------|-------|--------|
| `new_lead` | New contact created | Working — fires from `contact-actions.ts:291` |
| `deal_stale` | Deal inactive for N days | Working — fires from stale job sync and manual checks |
| `deal_stage_change` | Deal moves to specific stage | Working — fires from `deal-actions.ts:588` |
| `task_overdue` | Task passes due date | **Defined but never invoked** — no code calls `evaluateAutomations` with this event |

### Supported Actions

| Action | What It Does | Status |
|--------|-------------|--------|
| `notify` | Browser notification to all workspace users | Working |
| `email` | Send email via template with variable substitution | Working |
| `create_task` | Auto-create follow-up task | Working (but no duplicate detection) |
| `move_stage` | Move deal to another pipeline stage | **Defined but not implemented** |

### How Triggers Are Evaluated

`evaluateAutomations()` in `automation-actions.ts:142-333`:

1. Fetch all enabled automations for workspace
2. Match trigger event type against incoming event
3. For stale/overdue triggers, calculate days since last activity against threshold
4. If matched, update `lastFiredAt` timestamp
5. Execute corresponding action

**Call sites (event-driven)**:
- `contact-actions.ts:291-294` — New lead creation
- `deal-actions.ts:588-592` — Deal stage change (wrapped in try-catch, non-blocking)

### Known Issues

#### Issue 1: Race Condition on Concurrent Triggers (HIGH)

`lastFiredAt` is updated AFTER the rule fires, not atomically with the check. No Prisma transactions or database locks are used.

**Scenario**:
```
T0: Request 1 reads lastFiredAt = null → fires rule
T0: Request 2 reads lastFiredAt = null → fires rule (DUPLICATE)
T0: Both update lastFiredAt
```

**Impact**: Duplicate tasks, duplicate notifications, duplicate emails.

#### Issue 2: No Duplicate Detection for Tasks (HIGH)

`automation-actions.ts` creates tasks without checking if an identical task already exists. Contrast with `deal-actions.ts:79-92` which does check for duplicates before creating "Post-job follow-up" tasks.

#### Issue 3: Dead Triggers and Actions

- `task_overdue`: Trigger type exists in the schema but no code ever calls `evaluateAutomations()` with this event type
- `move_stage`: Action type exists in ActionConfig but `evaluateAutomations()` has no handler for it

These appear in the Create Rule Dialog UI, meaning users can create rules that will never fire or never execute.

#### Issue 4: No Idempotency for Email Delivery

`runSendEmail()` is called without checking if the email was already sent for this automation + deal combination. No email delivery log with unique constraints.

#### Issue 5: Notification Broadcast Without Rate Limiting

Notifications are sent to ALL users in the workspace sequentially. No rate limiting, no spam prevention.

### What Works Reliably

- New lead → notify
- Deal stale → create task (at low concurrency)
- Stage change → trigger action
- Rule enable/disable toggle
- Create Rule Dialog UI

---

## How the Layers Interact

```
Customer Input (call/SMS/email/chat)
         │
         ▼
┌─────────────────────────────┐
│  Layer 1: Autonomy Filter   │  ← Can Tracey act on this?
│  (EXECUTION/DRAFT/INFO_ONLY)│
└──────────┬──────────────────┘
           │ If allowed:
           ▼
┌─────────────────────────────┐
│  Layer 2: Behavioral Rules  │  ← How should Tracey handle this?
│  (aiPreferences, bouncer,   │
│   business knowledge)       │
└──────────┬──────────────────┘
           │ Conversation + CRM updates
           ▼
┌─────────────────────────────┐
│  Layer 3: Workflow Rules    │  ← What should happen automatically?
│  (new_lead, stale, stage)   │
└─────────────────────────────┘
```

**Key interaction**: Layer 1 gates what Tracey can do in conversation. Layer 2 shapes how she does it. Layer 3 reacts to CRM state changes regardless of whether Tracey was involved.

**Potential conflict**: Layer 3 automation emails currently may not respect Layer 1's mode setting. An automation could send a customer email even when the workspace is in INFO_ONLY mode.

---

## Recommended Architecture: Confirmed Rule Management

### The Principle

**Every rule or preference — from any layer — requires explicit user confirmation before taking effect.** All active rules are visible, editable, and deletable from a single Settings surface.

### How This Applies to Each Layer

#### Layer 1 (Autonomy Filter)
No change needed. Mode selection is already explicit (radio buttons in Settings/Onboarding). This layer is a permission switch, not a rule engine.

#### Layer 2 (Behavioral Rules)

**Current flow (silent append)**:
> User: "Tracey, remember we don't do roofing"
> Tracey: "Got it!" → writes rule directly to database

**Recommended flow (confirmed)**:
> User: "Tracey, remember we don't do roofing"
> Tracey: "I'll suggest adding that as a rule." → creates a **pending rule suggestion**
> User opens Settings → sees pending suggestion → clicks Accept or Reject

**Implementation**:
1. `updateAiPreferences` tool creates a `PendingRule` record instead of directly appending to `aiPreferences`
2. Settings page shows pending rules with Accept/Reject buttons
3. On accept, rule is added to `aiPreferences` (with dedup check)
4. Settings page shows all active rules with Edit/Delete capability

**Storage consolidation**:
- Keep `aiPreferences` as the single source for behavioral rules
- Keep `BusinessKnowledge.NEGATIVE_SCOPE` for structured decline rules (these are already managed through explicit UI)
- **Deprecate** `exclusionCriteria` — migrate existing values to `NEGATIVE_SCOPE`
- `agentFlags` stays as-is (per-deal, not a global rule)

#### Layer 3 (Workflow Rules)

Already requires explicit creation through the Create Rule Dialog. Changes needed:

1. **Remove dead options from UI**: Don't show `task_overdue` trigger or `move_stage` action until they're implemented
2. **Add edit/delete to existing rules**: Currently rules can be toggled but not easily edited
3. **Show in same Settings surface**: Rules from Layer 2 and Layer 3 should be visible in the same "Rules & Automation" section, clearly categorized

### Unified Settings View

```
Settings > Rules & Automation
├── Behavioral Rules (Layer 2)
│   ├── [Active] "We don't do gas work" [Edit] [Delete]
│   ├── [Active] "Always ask about tap handle vs spout" [Edit] [Delete]
│   └── [Pending] "No roofing work" — suggested by Tracey [Accept] [Reject]
│
├── Decline Rules (Layer 2 - NEGATIVE_SCOPE)
│   ├── [Active] "Gas fitting" [Edit] [Delete]
│   └── [Active] "Solar panel installation" [Edit] [Delete]
│
└── Automations (Layer 3)
    ├── [Enabled] "Notify on new lead" — Trigger: new_lead → Action: notify [Edit] [Delete]
    └── [Disabled] "Follow up stale deals" — Trigger: deal_stale (7 days) → Action: create_task [Edit] [Delete]
```

### Why This Is Safe

1. **No silent accumulation**: Nothing takes effect without user confirmation
2. **Full visibility**: Users can see every rule that influences Tracey's behavior
3. **Easy cleanup**: Edit and delete prevent rule bloat
4. **Deduplication on accept**: Check for existing identical rules before adding
5. **Clear categorization**: Users understand what each rule type does
6. **Audit trail**: Pending → Accepted flow creates natural history

### What This Doesn't Fix (Still Needs Code Work)

- Layer 1 mode bypass bugs (see Layer 1 Known Bugs above)
- Layer 3 race conditions on concurrent trigger evaluation
- Layer 3 duplicate task/notification/email creation
- Cache staleness after rule changes
- `[HARD_CONSTRAINT]`/`[FLAG_ONLY]` tag enforcement (either implement or remove from tool description)

---

## Priority Fixes (Ordered by Risk)

### Critical (Can cause incorrect behavior visible to customers)

1. **Layer 1 Bug 2**: SMS agent job creation with no mode guard — jobs created in INFO_ONLY mode
2. **Layer 1 Bug 3**: Direct `createJobNatural` tool call bypasses mode — same impact as above
3. **Layer 1 Bug 1**: Draft card confirmation after mode change — stale draft can be confirmed

### High (Causes internal data issues)

4. **Layer 2**: Implement pending rule suggestion flow (replaces silent `updateAiPreferences` append)
5. **Layer 3**: Add duplicate detection before task creation in `evaluateAutomations()`
6. **Layer 2**: Deprecate `exclusionCriteria`, migrate to `NEGATIVE_SCOPE`

### Medium (Quality and correctness)

7. **Layer 3**: Remove `task_overdue` trigger and `move_stage` action from Create Rule Dialog UI
8. **Layer 2**: Implement rule deduplication on save
9. **Layer 2**: Invalidate `agentContextCache` when preferences change
10. **Layer 2**: Remove or implement `[HARD_CONSTRAINT]`/`[FLAG_ONLY]` tag enforcement

### Low (Scale preparation)

11. **Layer 3**: Add atomic check-and-update for `lastFiredAt` (Prisma transaction)
12. **Layer 3**: Add idempotency key for automation email delivery
13. **Layer 1**: Ensure automation-triggered emails respect agent mode

---

## Key Files Reference

### Layer 1 (Autonomy Filter)
| File | Purpose |
|------|---------|
| `livekit-agent/customer-contact-policy.ts` | Mode normalization, capability policies, response rewriting |
| `actions/chat-actions.ts:95-116` | `getCustomerContactGuardResult()` — pre-execution guard |
| `lib/ai/tools.ts:349-376` | Tool definitions with `enforceCustomerContactMode` parameter |
| `app/api/chat/route.ts:308,403,450` | INFO_ONLY checks for job draft cards |
| `lib/ai/sms-agent.ts:76-88,261` | SMS customer tools and response enforcement |
| `lib/ai/email-agent.ts:118` | Email response enforcement |
| `app/crm/settings/agent/page.tsx` | Settings UI for mode selection |

### Layer 2 (Behavioral Rules)
| File | Purpose |
|------|---------|
| `lib/ai/context.ts:86-402` | `buildAgentContext()` — central context/prompt builder |
| `actions/settings-actions.ts:178-191` | `updateAiPreferences()` implementation |
| `lib/ai/tools.ts:283-288` | `updateAiPreferences` tool definition |
| `lib/ai/triage.ts` | Lead qualification using NEGATIVE_SCOPE rules |
| `actions/learning-actions.ts:28-205` | Deviation detection and rule removal |
| `lib/ai/prompt-contract.ts` | System prompt assembly from context strings |
| `livekit-agent/voice-prompts.ts` | Voice call preference injection |

### Layer 3 (Workflow Rules)
| File | Purpose |
|------|---------|
| `actions/automation-actions.ts:142-333` | `evaluateAutomations()` — core evaluation engine |
| `actions/contact-actions.ts:291-294` | New lead trigger call site |
| `actions/deal-actions.ts:588-592` | Stage change trigger call site |
| `actions/task-actions.ts` | Task creation (no dedup) |
| `actions/notification-actions.ts` | Notification creation and daily briefs |
| `app/crm/settings/automations/automation-list.tsx` | Create Rule Dialog UI |
| `app/api/cron/job-reminders/route.ts` | Cron-based reminder checks |
| `app/api/stale-jobs/sync/route.ts` | Stale job scanning |

### Shared
| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Data models: Workspace, Automation, BusinessKnowledge, Task, Notification |
| `__tests__/customer-contact-policy.test.ts` | Test coverage for Layer 1 response rewriting |
