# App Manual

This is the short operator guide for the web app and local development flow.

## Start Here

- Local setup: [docs/run-the-app-on-your-computer.md](C:/Users/micha/Assistantbot/docs/run-the-app-on-your-computer.md)
- Environment and deployment: [DEPLOYMENT_CHECKLIST.md](C:/Users/micha/Assistantbot/DEPLOYMENT_CHECKLIST.md)
- Voice worker setup: [LIVEKIT_SETUP.md](C:/Users/micha/Assistantbot/LIVEKIT_SETUP.md)
- Release smoke checks: [docs/FINAL_RELEASE_RUNBOOK.md](C:/Users/micha/Assistantbot/docs/FINAL_RELEASE_RUNBOOK.md)

## Daily Use

- Use the CRM for contacts, deals, inbox, schedule, and settings.
- Use `/admin/ops-status` for release truth and operational health.
- Use `/api/check-env` only as an internal readiness surface.

## Notes

- The web app and the LiveKit worker deploy separately.
- Keep debug-only or one-off diagnostic routes out of the production app surface.
