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

## Color tokens — never use hardcoded slate-* values
| Wrong | Correct |
|-------|---------|
| `text-slate-900` / `text-slate-800` | `text-foreground` |
| `text-slate-500` / `text-slate-600` | `text-muted-foreground` |
| `border-slate-200` / `border-slate-100` | `border-border` / `border-border/50` |
| `bg-slate-50` / `bg-slate-100` | `bg-muted/30` / `bg-muted` |
| `bg-white` (card backgrounds) | `bg-card` |

Exception: intentional dark-surface components (dark dialogs, dark badges) may keep explicit slate-900/slate-800 values.

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
