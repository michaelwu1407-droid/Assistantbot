# Earlymark Testing Strategy

## Current State

- **52 test files** in `__tests__/` using **Vitest + jsdom**
- Good coverage on: utilities (`chat-utils`, `encryption`, `idempotency`, `rate-limit`), health/monitoring routes, voice config, and some component rendering
- Significant gaps in: webhook handlers, server actions, billing, auth flows, and the AI chat pipeline

---

## Testing Layers

### Layer 1: Unit Tests (Fast, Isolated, Highest ROI)

Test pure functions and business logic in isolation. These run in milliseconds and catch the most bugs per line of test code.

**Already covered:**
- `chat-utils.ts` (titleCase, categoriseWork, resolveSchedule, enrichAddress)
- `encryption.ts`, `idempotency.ts`, `rate-limit.ts`
- `voice-fleet.ts`, `voice-agent-runtime.ts`, `voice-latency-config.ts`
- `customer-agent-readiness.ts`, `launch-readiness.ts`
- `customer-contact-policy.ts`, `voice-prompts.ts`

**Gaps to fill (Priority 1 - High Impact):**

| File | What to test | Why critical |
|------|-------------|-------------|
| `lib/deal-stage-rules.ts` | Stage transition validation, required fields per stage | Core CRM logic - wrong transitions corrupt pipeline |
| `lib/deal-attention.ts` | Overdue/stale/rotting signal detection | Drives dashboard alerts and automation triggers |
| `lib/billing-plan.ts` | Plan-to-Stripe price ID mapping, interval logic | Billing errors = revenue loss |
| `lib/invoice-number.ts` | Sequential invoice number allocation, prefix formatting | Duplicate/invalid invoice numbers break accounting |
| `lib/email-filters.ts` | Lead provider email pattern matching (hipages, airtasker, etc.) | Misclassified emails = lost leads |
| `lib/lead-capture-email.ts` | Email alias construction and validation | Malformed aliases = inbound leads not received |
| `lib/enrichment.ts` | Company enrichment from email domain | Edge cases with unknown/personal domains |
| `lib/call-forwarding.ts` | Carrier-specific forwarding code generation | Wrong codes = broken call forwarding for customers |
| `lib/display-name.ts` | Name resolution, phone-like string filtering | User-facing display bugs |
| `lib/digest.ts` | Morning digest generation with priority ranking | Business-critical daily summary |
| `lib/ai-models.ts` | Model tier selection and fallback | Wrong model = degraded AI quality or errors |
| `lib/comms-provision.ts` | Fallback between full/simple provisioning | Provisioning failure = customer can't use voice |
| `lib/livekit-sip-config.ts` | SIP URI construction | Bad URIs = voice calls fail silently |

**Gaps to fill (Priority 2 - Medium Impact):**

| File | What to test |
|------|-------------|
| `lib/accessibility.ts` | Screen reader announcements |
| `lib/crm-selection.ts` | Browser event dispatching |
| `lib/dashboard-shell.ts` | Cache state management |
| `lib/ai-service.ts` | Model tier routing and fallback behavior |

---

### Layer 2: Server Action Tests (Business Logic + DB Interaction)

Server actions are the mutation layer — they're where data gets created, updated, and deleted. Bugs here corrupt customer data.

**Approach:** Mock Prisma (`db`) and external services, test the orchestration logic.

**Priority 1 - Revenue & Data Integrity:**

| Action file | Key scenarios to test |
|------------|----------------------|
| `actions/deal-actions.ts` | Create deal, stage transitions, health score calculation, automation triggers on stage change |
| `actions/contact-actions.ts` | Create/update contacts, duplicate detection, balance tracking |
| `actions/billing-actions.ts` | Stripe checkout session creation, subscription management, plan upgrades/downgrades |
| `actions/messaging-actions.ts` | SMS send, WhatsApp routing, inbox management, message delivery tracking |
| `actions/tradie-actions.ts` | Quote generation, invoice creation with GST, post-job followup triggers |
| `actions/chat-actions.ts` | LLM context building, tool invocation, response streaming, error recovery |

**Priority 2 - Core CRM Operations:**

| Action file | Key scenarios to test |
|------------|----------------------|
| `actions/workspace-actions.ts` | Workspace creation, role management, onboarding status transitions |
| `actions/task-actions.ts` | Task CRUD, due date validation, deal linkage |
| `actions/automation-actions.ts` | Automation rule evaluation, trigger execution, preventing duplicate fires |
| `actions/kanban-automation-actions.ts` | UI-triggered automations (notifications, calls) |
| `actions/search-actions.ts` | Cross-entity search (contacts, deals, tasks, activities) |
| `actions/template-actions.ts` | Template CRUD, variable substitution correctness |
| `actions/onboarding.ts` | Multi-step validation (trade type, pricing, logistics completeness) |
| `actions/settings-actions.ts` | Agent mode toggle, business hours, call forwarding, lead capture config |

**Priority 3 - Supporting Operations:**

| Action file | Key scenarios to test |
|------------|----------------------|
| `actions/calendar-actions.ts` | Google Calendar sync, activity creation from events |
| `actions/accounting-actions.ts` | Xero/MYOB invoice sync |
| `actions/portal-actions.ts` | REA/Domain listing import |
| `actions/referral-actions.ts` | Referral tracking, Stripe commission |
| `actions/geo-actions.ts` | Geocoding, nearby booking lookup |
| `actions/knowledge-actions.ts` | Service/pricing/scope rules management |
| `actions/pricing-actions.ts` | Price lookup validation (ensures AI only quotes approved prices) |
| `actions/dedup-actions.ts` | Fuzzy duplicate detection (email, phone, name similarity) |
| `actions/stale-job-actions.ts` | Stale/rotten marking, outcome recording |
| `actions/scraper-actions.ts` | Business info scraping edge cases |

---

### Layer 3: API Route & Webhook Tests (System Boundaries)

These are your app's external interfaces. Malformed input, missing auth, and race conditions live here.

**Already covered:**
- `health-route.test.ts`, `launch-readiness-route.test.ts`
- `voice-fleet-health-route.test.ts`, `voice-synthetic-probe-route.test.ts`
- `twilio-sms-webhook.test.ts`, `twilio-voice-gateway-probe-auth.test.ts`
- `passive-communications-health-route.test.ts`
- `public-feedback-route.test.ts`

**Gaps to fill (Priority 1 - Security & Money):**

| Route | Key scenarios |
|-------|--------------|
| `api/webhooks/stripe/route.ts` | Signature verification, payment success/failure, subscription lifecycle, idempotency, replay protection |
| `api/webhooks/twilio-voice-gateway/route.ts` | Inbound call routing, SIP setup, rate limiting (3/hr), caller validation |
| `api/webhooks/twilio-voice-fallback/route.ts` | Fallback recording when agent unavailable |
| `api/webhooks/twilio-usage/route.ts` | Circuit breaker trigger at $50 spend threshold, re-enable logic |
| `api/chat/route.ts` | Auth check, streaming response, tool calling, context window limits, error recovery |
| `api/auth/*` | OAuth callback handling, phone OTP verification, session creation |

**Gaps to fill (Priority 2 - Lead Capture & Communication):**

| Route | Key scenarios |
|-------|--------------|
| `api/webhooks/inbound-email/route.ts` | Resend webhook signature, Gemini email parsing, lead creation from email |
| `api/webhooks/email-received/route.ts` | Gmail PubSub webhook, email sync trigger |
| `api/webhooks/email/route.ts` | Lead provider routing (hipages, airtasker, oneflare) |
| `api/webhooks/resend/route.ts` | Delivery/bounce event handling, Svix signature |
| `api/webhooks/webform/route.ts` | Embeddable form submission, deal creation, validation |
| `api/webhooks/whatsapp/route.ts` | WhatsApp message routing, user lookup |

**What to test for every webhook:**
1. Valid signature accepted
2. Invalid/missing signature rejected (401/403)
3. Malformed body returns 400 (not 500)
4. Idempotent — duplicate delivery doesn't double-process
5. Happy path creates expected database records
6. Error path doesn't leave partial state

---

### Layer 4: Middleware & Auth Tests

**Already covered:** `middleware.test.ts` (basic)

**Gaps to fill:**

| Area | Key scenarios |
|------|--------------|
| `middleware.ts` | Session refresh behavior, route protection, skipped routes (/auth, /pricing), internal route blocking in production |
| `lib/auth.ts` | Session retrieval, workspace context resolution, role-based access |
| Auth flow pages | OAuth redirect handling, OTP validation, error states, signup with existing email |

---

### Layer 5: Component Tests (UI Correctness)

**Already covered:**
- `auth-flow-pages.test.tsx`, `dashboard-layout.test.tsx`
- `chat-interface.test.tsx`, `navbar.test.tsx`
- `tracey-onboarding-email-preview.test.tsx`

**Gaps to fill (test rendering + key interactions):**

| Component area | What to test |
|----------------|-------------|
| CRM Kanban board | Column rendering, drag-and-drop stage transitions, empty state |
| Contact list/detail | Search, filter, pagination, edit form validation |
| Deal detail view | Stage badge, timeline, linked contacts, action buttons |
| Settings pages | Form submission, validation errors, toggle states |
| Invoice/quote forms | Line items, GST calculation, PDF generation trigger |
| Onboarding wizard | Step progression, validation gates, completion detection |
| Map view | Marker clustering, popup content, empty state |

---

### Layer 6: Integration Tests (Cross-Component Flows)

Test critical user journeys end-to-end with mocked external services.

**Priority 1 — Revenue-critical flows:**

| Flow | Steps to test |
|------|--------------|
| **New lead to deal** | Inbound call/email/form -> contact created -> deal created -> appears in pipeline |
| **Deal lifecycle** | New -> Contacted -> Negotiation -> Won (or Lost), verify automations fire at each stage |
| **Billing flow** | Plan selection -> Stripe checkout -> subscription active -> features unlocked |
| **Voice agent setup** | Onboarding complete -> Twilio provisioned -> SIP configured -> test call succeeds |
| **SMS automation** | Trigger condition met -> template resolved -> SMS sent -> activity logged |

**Priority 2 — Operational flows:**

| Flow | Steps to test |
|------|--------------|
| **Onboarding** | Account creation -> trade setup -> pricing -> voice provisioning -> dashboard ready |
| **Chat agent** | User message -> context loaded -> Gemini tool call -> CRM mutation -> response streamed |
| **Email lead capture** | Inbound email -> Gemini parse -> contact match/create -> deal created -> notification sent |
| **Invoice generation** | Quote -> accepted -> invoice created -> sent -> payment tracked |

---

### Layer 7: Edge Case & Error Path Tests

These catch the bugs your users will find first.

**For every external service call (Twilio, Stripe, Gemini, Deepgram, LiveKit):**
- Service returns 500 — does your app degrade gracefully?
- Service returns 429 (rate limited) — do you retry with backoff?
- Service times out — do you have a timeout and fallback?
- Service returns unexpected schema — do you handle it without crashing?

**Data edge cases:**
- Empty workspace (no deals, contacts, or activities)
- Contact with no phone number (voice features should be disabled/hidden)
- Deal with no contact linked
- Workspace with expired/cancelled subscription
- Concurrent updates to the same deal (optimistic locking)
- Very long text fields (names, descriptions, notes)
- Unicode/emoji in all text fields
- Australian phone number formats (+61, 04xx, landline)
- Timezone handling (AEST/AEDT transitions)

**Auth edge cases:**
- Expired session mid-operation
- User removed from workspace while active
- Role changed while user is on a protected page
- Multiple browser tabs with different workspaces

---

## Implementation Plan

### Phase 1: Quick Wins (1-2 days)
Write unit tests for the 13 uncovered `lib/` utility files listed in Layer 1 Priority 1. These are pure functions — easy to test, high ROI.

### Phase 2: Action Safety Net (3-5 days)
Write tests for the 6 Priority 1 server actions (deal, contact, billing, messaging, tradie, chat). Mock Prisma and external services. Focus on happy path + the most dangerous edge cases.

### Phase 3: Webhook Armor (2-3 days)
Write tests for all 10 webhook handlers. Focus on signature verification, idempotency, and malformed input handling. These are your attack surface.

### Phase 4: Auth & Middleware (1-2 days)
Harden auth flow tests — session expiry, role changes, protected route enforcement.

### Phase 5: Integration Flows (3-5 days)
Build integration tests for the 5 revenue-critical flows. These are slower to write but catch the bugs that matter most.

### Phase 6: Component & UI (2-3 days)
Add component tests for Kanban, deal detail, invoice forms, and onboarding wizard.

### Phase 7: Error Paths & Chaos (Ongoing)
Systematically test external service failures, edge case data, and concurrent operations.

---

## Test Patterns to Follow

### Mocking External Services
```typescript
// Example: mocking Prisma for action tests
const { db } = vi.hoisted(() => ({
  db: {
    deal: { create: vi.fn(), update: vi.fn(), findUnique: vi.fn() },
    contact: { create: vi.fn(), findUnique: vi.fn() },
    activity: { create: vi.fn() },
  },
}));
vi.mock("@/lib/db", () => ({ db }));
```

### Testing Webhooks
```typescript
// Example: webhook signature + idempotency test
describe("POST /api/webhooks/stripe", () => {
  it("rejects invalid signature", async () => {
    const req = new Request("http://localhost/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "invalid" },
      body: "{}",
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("handles duplicate events idempotently", async () => {
    // Send same event ID twice, verify only one DB write
  });
});
```

### Testing Server Actions
```typescript
// Example: deal stage transition
describe("updateDealStage", () => {
  it("transitions from NEW to CONTACTED", async () => {
    db.deal.findUnique.mockResolvedValue({ id: "1", stage: "NEW" });
    db.deal.update.mockResolvedValue({ id: "1", stage: "CONTACTED" });
    
    await updateDealStage("1", "CONTACTED");
    
    expect(db.deal.update).toHaveBeenCalledWith({
      where: { id: "1" },
      data: expect.objectContaining({ stage: "CONTACTED" }),
    });
  });

  it("rejects invalid stage transition", async () => {
    db.deal.findUnique.mockResolvedValue({ id: "1", stage: "NEW" });
    await expect(updateDealStage("1", "WON")).rejects.toThrow();
  });
});
```

---

## Running Tests

```bash
# Run all tests
npm test

# Watch mode (re-run on file changes)
npm run test:watch

# Run a specific test file
npx vitest run __tests__/deal-actions.test.ts

# Run tests matching a pattern
npx vitest run --reporter=verbose -t "stage transition"

# Run with coverage
npx vitest run --coverage
```

---

## Metrics to Track

| Metric | Current | Target |
|--------|---------|--------|
| Test files | 52 | 90+ |
| Line coverage (lib/) | ~30% est. | 80% |
| Line coverage (actions/) | ~5% est. | 70% |
| Line coverage (webhooks) | ~15% est. | 90% |
| All webhook signature tests | partial | 100% |
| CI test runtime | ~15s | < 60s |

---

## Key Principle

> **Test the things that would wake you up at 2am if they broke.**
>
> For Earlymark, that means: billing, voice provisioning, webhook processing, lead capture, and deal stage transitions. Start there.
