# QStash setup — sub-minute callback scheduling

Delayed lead callbacks (any `delaySec > 0`) are scheduled through
[Upstash QStash](https://upstash.com/docs/qstash) for second-precise timing.
If QStash is **not** configured the system falls back to the 5-minute
GitHub Actions cron (`/api/cron/scheduled-calls`) — nothing breaks, the
timing is just coarser. So these keys are **optional but recommended** in
production.

## How it fits together

```
lead arrives → scheduleLeadCallback(delaySec > 0)
                 │
                 ├─ QStash configured? ── yes ─→ publishJSON(delay) ─┐
                 │                                                    │  (delay elapses)
                 └─ no / publish fails ─→ create cron Task           ▼
                                                          POST /api/qstash/callback
                                                          (verifies signature)
                                                          → dials immediately
```

- Publisher: `lib/qstash.ts`
- Receiver: `app/api/qstash/callback/route.ts` (verifies the `upstash-signature` header)
- Wiring: `lib/lead-callback.ts`

## Environment variables

| Key | Where it's used | Required for QStash |
|-----|-----------------|---------------------|
| `QSTASH_TOKEN` | publishing jobs | yes |
| `QSTASH_CURRENT_SIGNING_KEY` | verifying callbacks | yes |
| `QSTASH_NEXT_SIGNING_KEY` | verifying callbacks (rotation) | yes |
| `NEXT_PUBLIC_APP_URL` | callback target URL | already set |

`QSTASH_VERIFY_IN_DEV=true` forces signature verification in non-prod (off by default).

## One-time setup (≈3 minutes)

These steps need a human — the credentials live in the Upstash console and
your Vercel project, both behind login.

### 1. Get the keys from Upstash
1. Go to <https://console.upstash.com/qstash> and sign in.
2. On the **QStash** page, copy three values from the **Request Builder / Keys** panel:
   - **QSTASH_TOKEN**
   - **Current Signing Key** → `QSTASH_CURRENT_SIGNING_KEY`
   - **Next Signing Key** → `QSTASH_NEXT_SIGNING_KEY`

### 2. Add them to Vercel
1. Vercel → your project → **Settings → Environment Variables**.
2. Add the three keys above for the **Production** (and Preview, if you want
   QStash there too) environments.
3. Confirm `NEXT_PUBLIC_APP_URL` is already set to the public site URL
   (e.g. `https://www.earlymark.ai`). QStash calls back to
   `${NEXT_PUBLIC_APP_URL}/api/qstash/callback`.
4. **Redeploy** so the new env vars take effect.

### 3. Verify it's live
- Open the admin integration-readiness view; **qstash** should report ready.
- Or hit the deployed app and submit a webform lead with a delay; the callback
  should fire close to the scheduled second rather than on the 5-min boundary.

## Notes
- QStash only reaches a **publicly deployed** URL — it cannot call `localhost`.
  For local testing use a tunnel (e.g. ngrok) and set `NEXT_PUBLIC_APP_URL`
  to the tunnel URL plus `QSTASH_VERIFY_IN_DEV=true`.
- The GitHub Actions cron stays in place as a safety net regardless. No need
  to disable it.
