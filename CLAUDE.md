Do tasks one at a time. Never write a file longer than 150 lines in a single pass. Do not run git diff.

# Product Principles (DO NOT VIOLATE)

## Never ask anything technical of the customer
The customer is a tradie. They are not an engineer. The system must hide all technical complexity — anything that would require the customer to understand, configure, or maintain infrastructure is unacceptable. Examples of asks that are NEVER okay to put in front of a tradie:
- "Configure a cron schedule" / "swap to Vercel cron"
- "Set up email forwarding with this exact filter syntax"
- "Add this environment variable"
- "Edit your DNS records"
- "Install this package / paste this code into your site" (unless it is genuinely one line and copy-paste, and even then only as a last resort)
- "Set up an OAuth app"
- "Choose a delay in seconds" (technical knob → use plain-English presets if a choice is needed at all)

If an external platform genuinely requires configuration the customer must do (e.g. turning on lead notifications inside Google LSA, adding the inbox to Meta Lead Access), the in-app walkthrough must be exact-clicks specific, ideally with screenshots, and ideally we offer to do it for them via OAuth or a service connector. Any unavoidable customer-side action is something we should be embarrassed about, not casual.

If a limitation forces a technical ask onto the customer (e.g. infra delay floor), fix the limitation at the infra/team level — do not punt the cost onto the customer.

## Tracey number IS the business number
Customers do not bring their own number. Every workspace is auto-provisioned a Twilio number at signup and that IS their business number. There is no BYO path, no "keep existing number" toggle, no decline option. Code, copy and flows should reflect this single source of truth.

## Workspace vs teammate
The Twilio number is a workspace-level resource owned by the workspace OWNER. Teammates (MANAGER / TEAM_MEMBER) who join via invite share the workspace's resources but do not get their own number and do not see number-management UI. Phone/billing/provisioning UI is owner-only — gate with `user.id === workspace.ownerId`.

## Auto-call defaults on
`autoCallLeads` is on by default for every new workspace. The tradie can toggle it off in settings but it is not something they need to discover or enable to get value on day 1. Auto-call also requires `voiceEnabled` (workspace circuit breaker), `agentMode === "EXECUTION"` (tradie's autonomy preference) and the workspace having a Twilio number — see `lib/auto-call-eligibility.ts`.

# Global Formatting & Design Policy

## Typography — always use global utility classes
Use the classes defined in `app/globals.css` instead of raw Tailwind text combos:
- `app-page-title` — h1 page headings
- `app-section-title` — h2 section headings
- `app-panel-title` — card/panel headings (replaces `font-semibold text-foreground`)
- `app-body-primary` — primary body text (replaces `text-sm text-foreground`)
- `app-body-secondary` — secondary/muted body text (replaces `text-sm text-muted-foreground`)
- `app-field-label` — form field labels, metadata keys (replaces `text-xs text-muted-foreground uppercase`)
- `app-micro-label` — tiny section labels (replaces `text-xs font-semibold uppercase tracking-wide`)
- `app-kpi-value` — large metric numbers

## Color tokens — never use hardcoded palette values
| Wrong | Correct |
|-------|---------|
| `text-slate-900` / `text-slate-800` | `text-foreground` |
| `text-slate-500` / `text-slate-600` | `text-muted-foreground` |
| `text-gray-900` / `text-gray-800` | `text-foreground` |
| `text-gray-500` / `text-gray-600` | `text-muted-foreground` |
| `border-slate-200` / `border-gray-200` | `border-border` / `border-border/50` |
| `bg-slate-50` / `bg-gray-50` | `bg-muted/30` / `bg-muted` |
| `bg-white` (card backgrounds) | `bg-card` |

Note: `text-neutral-*` values (neutral-900, neutral-500 etc.) ARE the design system's own named tokens and are valid.

Exception: intentional dark-surface components (dark dialogs, dark badges) may keep explicit dark values.

## Border radius — always use rounded-md
The app's standard corner radius is 18px. Use `rounded-md` everywhere — never use `rounded-[18px]` or other arbitrary pixel values.
All `rounded-sm` through `rounded-3xl` variants also resolve to 18px (forced in globals.css), but `rounded-md` is the canonical choice.

## Status / stage colors — always use ott-status-* utilities
Never hardcode `bg-emerald-50 text-emerald-700` or `bg-amber-100 text-amber-800` for deal/job stages. Use:
```tsx
<span className="ott-status-pill ott-status-new">New</span>
<span className="ott-status-pill ott-status-quote">Quote</span>
<span className="ott-status-pill ott-status-scheduled">Scheduled</span>
<span className="ott-status-pill ott-status-awaiting">Awaiting</span>
<span className="ott-status-pill ott-status-complete">Complete</span>
```
The underlying color tokens (`bg-status-new-bg`, `text-status-new`, etc.) are also available for non-pill contexts.

## Form validation errors — always use ott-field-error / ott-field-error-msg
Never hardcode `border-red-500` or `text-red-500` for validation errors. Use:
```tsx
<input className={cn("...", hasError && "ott-field-error")} />
{hasError && <p className="ott-field-error-msg">{errorMessage}</p>}
```
The `text-destructive` / `border-destructive` tokens are the semantic values behind these utilities.

## Focus rings — rely on the global, don't override
The global `*:focus-visible { box-shadow: var(--shadow-focus) }` handles all focus rings automatically. Do NOT add `focus-visible:ring-2` or `focus-visible:ring-ring` to individual elements — this fights the global rule. Only suppress focus styles with `focus-visible:outline-none` on elements that have custom focus handling.

## Text overflow — always guard long strings
- Single-line fields (email, name, title): use `ott-text-truncate` or add `truncate min-w-0` to the element
- Multi-line content (address, notes, descriptions): use `ott-text-wrap` or add `break-words min-w-0`
- Every flex parent containing text children must have `min-w-0` on the text child

## Currency formatting — always use formatCurrency() from lib/format.ts
```ts
import { formatCurrency } from "@/lib/format"
// Always: $97.90, $1,250.00  —  Never: $97.9, $1250
```
Never use raw `.toLocaleString()` for money. Always use `formatCurrency()`.

## Date/time formatting — always use lib/format.ts utilities
```ts
import { formatDate, formatShortDate, formatDateTime, formatTime } from "@/lib/format"
formatDate(date)       // "9 Apr 2026"
formatShortDate(date)  // "9 Apr"
formatTime(date)       // "8:30 PM"
formatDateTime(date)   // "Thu 9 Apr · 8:30 PM"
```
Use en-AU locale (day-first). Never inline `.toLocaleDateString()` with custom options.

## Dialogs & modals — scale with viewport and content
- Use `ott-dialog` class as the base: `w-[calc(100vw-2rem)] max-h-[90vh]`
- Set `max-w-[Xpx]` per modal based on content needs (e.g. `max-w-lg` for confirmations, `max-w-[1440px]` for full detail panels)
- Never use a fixed pixel width — always pair with a viewport-relative width

## Responsive section padding
- Use `py-12 md:py-20` (not `py-20` alone) so sections breathe on mobile
- The `.ott-section` utility already does this — prefer it for marketing/landing sections

## Empty states — use the ott-empty-state pattern
```tsx
<div className="ott-empty-state">
  <div className="ott-empty-state-icon"><Icon className="h-5 w-5" /></div>
  <p className="ott-empty-state-title">Nothing here yet</p>
  <p className="ott-empty-state-body">Helpful description of what to do next.</p>
</div>
```
