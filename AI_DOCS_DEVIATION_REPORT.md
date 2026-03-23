# Documentation Deviations Report

This table outlines every identified deviation where an "Other Doc" (which reads as if it is the current status quo) conflicts with the established reality in `APP_FEATURES.md` (and `AGENTS.md` for voice architecture).

| Feature / Area | `APP_FEATURES.md` (Source of Truth) | Other Document | Deviation found in Other Doc |
| :--- | :--- | :--- | :--- |
| **Pricing & Plans** | • Monthly: **$149/month**<br>• Yearly: **$1,490/year** | `docs/TUTORIAL_HANDBOOK.md` | Lists outdated plans: **Pro ($150/mo)** and **Pro Intro ($60/mo)**. |
| **Kanban Pipeline Stages** | • 6 explicit columns: `new_request`, `quote_sent`, `scheduled`, `ready_to_invoice`, `completed`, `deleted`.<br>• Legacy 'pipeline' stage is explicitly merged.<br>• 'Pending approval' is a visual state inside the Completed column. | `docs/TUTORIAL_HANDBOOK.md` | Lists **10 separate stages** (including Contacted, Negotiation, Pipeline, Invoiced, Pending Completion, Won, Lost, Archived). |
| **Authentication System** | • Fully custom **Unified Auth**.<br>• Native Google OAuth & Email.<br>• Native custom Australian Mobile OTP (`formatPhoneE164`). | `COMMUNICATION_SYSTEM.md` | Describes using **Clerk** for auth, and relies on **MessageBird** as a workaround for Australian SMS verification. |
| **Voice Agent Engine** | • Stack: **LiveKit Agents + Deepgram + Groq + Cartesia**.<br>• Specifically states "**Retell AI** and Vapi are **ARCHIVED and INACTIVE**." | `COMMUNICATION_SYSTEM.md` & `docs/BUSINESS_MODEL.md` | Heavily references **Retell AI** for customer calls, binding Twilio to Retell via `RETELL_API_KEY`. Business Model doc also says internal chat relies on Google Gemini. |
| **Worker Deployment** | • Docker Compose is the standardized architecture for **both** the LiveKit core AND the Earlymark voice workers (`AGENTS.md`). | `APP_MANUAL.md` & `README.md` | Concludes that the voice agent worker is "not yet standardized on Docker and currently runs as a **host process**." |
| **Manager Approvals** | • Features a working "Pending Approval" state (`PENDING_COMPLETION`).<br>• Managers get dedicated **Approve** and **Reject & send back** UI buttons on deal cards. | `docs/team_roles_and_approvals.md` | Explicitly states: "*Currently there is no single 'Approvals' or 'Pending approval' screen*" and jobs move to Completed immediately without review. |

---

*Note: These are all the meaningful discrepancies found between the canonical app feature status quo and the rest of the documentation.*
