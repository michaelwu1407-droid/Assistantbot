# Real Integration Verification

This is the next layer above mocked tests. The goal is to verify real Stripe, Twilio, Resend, LiveKit, auth, and production-shaped config behavior against a safe staging environment.

## Scope

This checklist is for:

- real third-party integration checks
- concurrency and duplicate-delivery checks
- auth/session edge-case checks
- production-like env/config/data validation

This is not for:

- local-only unit tests
- manual poking in production first

## Preconditions

Before running these checks:

1. Use a staging deployment or safe preview URL, not production.
2. Use test-mode credentials where supported.
3. Use a dedicated staging workspace and test phone numbers/email inboxes.
4. Make sure the app and worker point at the same intended environment.
5. Run:

```bash
npx tsx scripts/verify-real-integrations.ts
```

Expected result:

- the protected readiness surfaces respond successfully for your staging environment
- provisioning/integration readiness reports the integrations you want to verify as ready
- no required Stripe/Twilio/Resend/LiveKit/auth env vars are missing

Important:

- In production, middleware intentionally rewrites `/api/health` and `/api/check-env` to `404` unless `ENABLE_INTERNAL_DEBUG_ROUTES=true`.
- For production-like verification, prefer:
  - `/api/internal/launch-readiness`
  - `/admin/ops-status`
  - any explicitly authenticated internal verifier route you are using for the environment

## Stripe

Verify against Stripe test mode:

1. Start a checkout session from the app billing flow.
2. Confirm the returned checkout URL opens correctly.
3. Complete checkout with a Stripe test card.
4. Deliver a real webhook event to the staging app.
5. Confirm:
   - subscription status is updated in DB
   - workspace billing state changes as expected
   - duplicate webhook delivery is idempotent
   - failed signature is rejected

Suggested checks:

- `checkout.session.completed`
- `customer.subscription.updated`
- `invoice.paid`
- replay the same webhook twice

## Twilio

Verify in a dedicated staging Twilio setup:

1. Send a real SMS from the CRM/contact flow.
2. Confirm the message reaches the destination handset.
3. Confirm outbound message status updates are ingested if configured.
4. Trigger an inbound SMS webhook to the staging route.
5. Trigger an inbound voice call to the staging number.
6. Confirm:
   - webhook URLs are correct
   - fallback route works
   - usage thresholds and alerts behave correctly
   - duplicate webhook payloads do not create duplicate CRM effects

Important:

- use staging numbers only
- verify the expected callback URLs from your authenticated readiness/config surface, not public debug routes

## Resend

1. Send a real outbound email from a staging workflow.
2. Confirm delivery to a real test inbox.
3. Deliver a real Resend webhook event to staging.
4. Confirm:
   - signature verification passes for legitimate events
   - bad signature is rejected
   - delivery/bounce/open events do not corrupt state
   - inbound email parsing still produces correct lead/contact fields

## LiveKit

1. Verify app env and worker env point at the same LiveKit project.
2. Generate a real token and connect a client.
3. Verify room join succeeds.
4. Verify SIP trunk config and routing via the authenticated readiness/config surface for the environment.
5. Run one real inbound or synthetic voice flow against staging.
6. Confirm:
   - worker release and app release match expectations
   - voice routing and SIP health are green
   - transcripts/logs/latency are persisted

## Auth / Session Edge Cases

Run these manually in staging:

1. Login, then expire the session mid-flow and retry a save.
2. Downgrade a user role while the page is open, then retry privileged actions.
3. Verify OTP or OAuth callback failures show recoverable behavior.
4. Verify stale cookies do not bypass middleware protections.
5. Verify logout clears access to cached or sensitive pages after refresh.

## Concurrency / Race Conditions

Use two browser sessions or scripted parallel requests:

1. Submit the same Stripe webhook twice.
2. Trigger two stage updates on the same deal at nearly the same time.
3. Trigger two assignment changes on the same job.
4. Trigger duplicate inbound SMS/email webhook deliveries.
5. Trigger repeated invoice-paid or provisioning transitions.

Expected result:

- no duplicate side effects
- no corrupted final state
- last-write or idempotency behavior is explicit and acceptable

## Production-like Config / Data Checks

Seed or simulate:

- legacy rows with null metadata
- malformed phone numbers
- unexpected enum casing or stale values
- workspaces with partial setup
- missing optional third-party config

Confirm the app:

- fails safely
- logs actionable errors
- does not crash entire pages/routes for one bad record

## Recommended Order

1. Passive readiness:
   - `npx tsx scripts/verify-real-integrations.ts`
2. Stripe test-mode checkout + webhook
3. Twilio real SMS + inbound webhook
4. Resend real outbound + webhook
5. LiveKit token + room + SIP verification
6. Auth/session edge cases
7. Concurrency and duplicate-delivery checks

## What still needs separate work

This checklist gives you a real verification path, but it does not yet automate active third-party side effects. That is intentional. Active checks should be added only once staging credentials, test numbers, and cleanup rules are locked down.

