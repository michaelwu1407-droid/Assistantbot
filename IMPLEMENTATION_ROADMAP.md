# Pj Buddy — Implementation Roadmap

> Phases 1-4 completed. Remaining future phases below.

---

## Completed

- **Phase 1:** Prisma `directUrl` for Supabase pgbouncer — DONE
- **Phase 2:** Auth migrated from Supabase to Clerk — DONE
- **Phase 3:** Chat UI responsiveness (dvh, safe-area, responsive breakpoints) — DONE
- **Phase 4:** Chat refactored to Vercel AI SDK `useChat` + `/api/chat` route — DONE

---

## PHASE 5: Integrate Open Source CRM Components (Future)

### Recommended Source: Atomic CRM (MIT License)
**Repo:** https://github.com/marmelab/atomic-crm

### Components to extract:
1. **Deal Pipeline Kanban Board** — drag-and-drop deal stages
2. **Contact List with Filters** — search, sort, filter contacts
3. **Activity Timeline** — chronological activity feed per contact/deal
4. **Task Management** — task cards with due dates and completion

### Integration pattern:
- Clone the Atomic CRM repo locally
- Copy component files into `/components/crm/`
- Adapt imports to use your Prisma `db` client instead of Supabase direct
- Adapt styling to match your Tailwind/shadcn theme

---

## PHASE 6: Voice Agent for Inbound Calls (Future)

### Recommended Framework: LiveKit Agents
**Repo:** https://github.com/livekit/agents
**Starter:** https://github.com/livekit-examples/agent-starter-react

### Architecture:
```
[Inbound Call]
  → Twilio Phone Number (already configured in .env.local)
  → Twilio SIP Trunk → LiveKit Server
  → LiveKit Agent (Python or Node.js microservice)
  → Agent calls Pj Buddy API for CRM operations
  → Audio response streamed back to caller
```

### Components needed:
1. **LiveKit Agent Service** — separate microservice (Python recommended)
2. **Twilio SIP Trunk** — configure in Twilio console to forward to LiveKit
3. **CRM API endpoints** — expose key actions (create lead, schedule job, etc.)
4. **STT:** Deepgram (best real-time accuracy)
5. **TTS:** ElevenLabs or Cartesia (natural voices)
6. **LLM:** Claude or GPT-4o for conversation reasoning

### Alternative (simpler, faster to deploy): Dograh
**Repo:** https://github.com/dograh-hq/dograh
- Visual workflow builder (drag-and-drop call flows)
- Built-in Twilio integration
- Can be running in under 2 minutes
- Self-hostable via Docker
