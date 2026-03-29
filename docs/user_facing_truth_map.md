# User-Facing Truth Map

## Settings ownership

| Surface | What belongs here | Source of truth | Runtime consumer | Safe to expose |
| --- | --- | --- | --- | --- |
| `Account` | Personal phone, Tracey number, provisioning status, call forwarding mode | `Workspace` + workspace `settings` + Twilio provisioning state | Twilio forwarding / account setup flows | Yes |
| `My business` | Business details, business hours, specialty, service pricing, Google review link | `Workspace` + workspace `settings` | Onboarding, pricing prompts, review follow-up CTA | Yes |
| `Calls & texting` | Customer contact hours, urgent-call routing, automated customer messages | Workspace `settings` + `AutomatedMessageRule` | SMS/call scheduling rules and reminder/follow-up messaging | Yes |
| `AI Assistant` | Autonomy mode, rules/preferences, learning/guardrails | `Workspace.agentMode` + `Workspace.aiPreferences` | Call/SMS/email policy generation | Yes |
| Debug / transcript history | Raw voice-call history, transcript diagnostics | `VoiceCall` and related ops tables | Support / diagnostics only | No |

## Feedback and ratings

| Surface | Source of truth | Capture path | Runtime consumer | Safe to expose |
| --- | --- | --- | --- | --- |
| Public customer rating | `CustomerFeedback` | Job approved/completed -> feedback SMS -> public feedback page -> `submitFeedbackFromPublicToken()` | Analytics, contact feedback panels, low-score alerts | Yes |
| Google review CTA | `Workspace.settings.googleReviewUrl` | Shown only after a strong internal score on the public feedback page | Post-feedback reputation flow | Yes |
| Low-score alerts | `CustomerFeedback.score <= 6` | Created during feedback submission | Notifications, contact follow-up | Internal only |

## Analytics / KPI definitions

| Metric | Definition | Time window | Intake dependency |
| --- | --- | --- | --- |
| Revenue | `WON` deals whose `stageChangedAt` falls in range, preferring `invoicedAmount` over `value` | Selected report range | Deal completion data |
| Customers | Unique contacts touched in range: created in range, attached to in-range deals, or with in-range feedback | Selected report range | Contacts + deals + `CustomerFeedback` |
| Satisfaction | Average `CustomerFeedback.score` in range | Selected report range | `CustomerFeedback` |
| Latest feedback | Most recent `CustomerFeedback` rows in range | Selected report range | `CustomerFeedback` |
| Jobs won with Tracey (analytics) | In-range deals at scheduled-or-beyond stages with Tracey/system lead-source metadata | Selected report range | Deal metadata |
| Jobs won with Tracey (dashboard card) | Current-month completed deals with Tracey/system lead-source metadata, revenue preferring invoiced amount | Current month | Deal metadata + completion data |
| Attention required | Count from `countAttentionRequiredDeals()` over current dashboard board state | Live dashboard state | Deal attention signals |

## Removed or intentionally hidden from customer settings

| Surface | Reason removed |
| --- | --- |
| `Recent voice calls` in Settings | Diagnostic/history surface, not configuration |
| `Enable voice agent` customer toggle | Did not control the production runtime kill switch |
| `Language / Voice / Speed` | Not wired to the active customer voice runtime |
| `Transcription settings` | Internal/system behavior, not a trustworthy customer-facing control |
| `Auto-respond to messages` | Duplicated Tracey mode policy and contradicted call/SMS/email behavior rules |
