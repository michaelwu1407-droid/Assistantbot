Do tasks one at a time. Never write a file longer than 150 lines in a single pass. Do not run git diff.

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
