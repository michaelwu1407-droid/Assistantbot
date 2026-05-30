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

## Tracey number IS the business number (default)
Every workspace is auto-provisioned a Twilio number at signup. That is the business number — this is the default path (90% of new tradies). Code, copy, and onboarding should treat provisioning as automatic and invisible.

**Supported option — keep your number:** An established tradie who already has a public number can keep it and forward missed calls to Tracey. The engine for this already exists in `lib/call-forwarding.ts` (backup/full/off modes, carrier-aware, tap-to-dial `tel:` links). Surface this in phone settings as a single one-tap toggle — never expose raw MMI codes. This path is owner-only (gate with `user.id === workspace.ownerId`).

Do NOT present forwarding as the default or required setup. Auto-provisioning is the path for new tradies; forwarding is an opt-in for existing ones.

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

## Homepage / marketing palette — warm cream surfaces
The homepage uses a warm cream palette (not the app's cool-gray `--background`). Use the following tokens for homepage/marketing sections only:
- `bg-paper` → `#F6F4EE` — default section background
- `bg-cream` → `#F1ECDD` — alternate/accent section background
- Forest bookends: hero (`bg-forest`) + footer (`bg-forest`) only
- `var(--color-ink)` / `var(--color-ink2)` for headings and body text on warm surfaces
- Never replace `--background` or `--card` globally — these are app-only tokens

**Do NOT:** use `bg-[#F8FAFC]`, `bg-muted/30`, or `text-midnight` on homepage sections — these are cool-gray and clash with the warm palette.

**App pages (TODO — review pass pending):** App pages should also prefer warm cream surfaces over the current cool-gray `--background`. This is a separate pass — do not implement until explicitly approved. The current app `--background: #F7F8FA` is the baseline to replace.

**TODO (revisit later):** serif display font for homepage headings (currently Plus Jakarta Sans for everything).

## Typography — font strategy
- Body + headings: Plus Jakarta Sans (`--font-sans`) for everything
- No monospace font (JetBrains Mono, etc.) — skip unless explicitly adding code displays
- No serif display font yet — deferred to future polish pass

## Tracey visual identity — two marks, two roles
- **Earlymark logo** (headset roundel): product identity — top bar, favicon, splash, footer
- **Tracey glyph** (chat-bubble): Tracey the AI assistant — bottom-nav button, chat avatars, inline action tags
- These are NOT interchangeable. Never put the Earlymark logo where Tracey speaks.
- On mobile: exactly ONE Tracey entry point (bottom-nav centre button). Never add a second Tracey shortcut to the top bar.

## App sidebar — forest green
The sidebar (`components/core/sidebar.tsx`) uses forest green `var(--color-forest)` as its background (45px wide, icon-only). Icon states: inactive `text-white/55`, active `bg-white/15 text-white`, hover `hover:bg-white/10 hover:text-white`.
