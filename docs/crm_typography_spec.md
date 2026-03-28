# CRM Typography Spec

Date: 2026-03-27  
Owner: Codex  
Reference tone: CRM dashboard

## Purpose

This spec defines how typography should behave across the CRM app so pages feel related, deliberate, and easier to scan. The dashboard is the visual reference point for tone, but not every page should copy it literally. Operational pages should feel polished and calm. Settings pages should feel clearer and more utilitarian.

The goal is not "make everything the same." The goal is:

- consistent hierarchy
- predictable emphasis
- less filler copy
- fewer arbitrary shifts between dark text and grey text

## Design principles

1. Typography must signal priority, not decoration.
2. Dark text is reserved for the thing the user is most likely to scan, decide on, or act on.
3. Grey text is supporting context, not a default.
4. If two pieces of text look equally important, they should be equally important.
5. Explanatory copy should be rare and specific. If it does not help a decision, remove it.

## Page categories

### 1. Operational CRM pages

Examples:

- Dashboard
- Analytics
- Contacts
- Jobs / Deals
- Team

These pages should feel considered, clean, and strong. They use the highest visual polish.

### 2. Utility CRM pages

Examples:

- Detail drawers
- Modals
- Forms embedded inside operational pages

These should inherit the same hierarchy as operational pages, but with tighter spacing and fewer competing text styles.

### 3. Settings pages

Examples:

- Integrations
- Notifications
- Privacy
- Phone settings

These should be more utilitarian. Still clean, still consistent, but not as stylized or editorial as dashboard/analytics/contacts.

## Type scale

### Page title

Use for the single main title at the top of a CRM page.

- Size: `text-2xl`
- Weight: `font-bold`
- Tracking: `tracking-tight`
- Color: near-black (`text-neutral-900`)

Why:

- big enough to anchor the page
- matches the dashboard's confident tone
- avoids oversized "marketing hero" energy

### Section or card title

Use for KPI cards, table sections, side panels, and major content blocks.

- Default: `text-base`
- Large section variant: `text-lg`
- Weight: `font-semibold`
- Color: `text-neutral-900`

Why:

- strong enough to separate content blocks
- does not compete with the page title

### Primary body text

Use for the core thing being scanned in a table, card, row, or feed item.

- Size: `text-sm`
- Weight: `font-medium` when emphasis is needed, otherwise normal
- Color: `text-neutral-900`

Examples:

- contact name
- job title
- KPI value
- activity title

### Secondary body text

Use for supporting context attached to a primary item.

- Size: `text-sm`
- Weight: normal
- Color: muted neutral (`text-muted-foreground` or equivalent neutral grey)

Examples:

- timestamps
- company names
- secondary meta values
- non-critical explanations inside cards

### Micro labels and utility text

Use for controls, chips, field labels, tiny meta labels, filter labels.

- Size: `text-xs`
- Weight: `font-medium` by default
- Color: muted unless interactive or status-bearing

Examples:

- input labels
- filter labels
- "selected", "loading", "updated 2h ago"

### KPI numbers

Use only for headline values.

- Size: page-dependent, but typically `text-xl`
- Weight: `font-extrabold` or `font-bold`
- Color: dark

Why:

- KPIs need to feel distinct from ordinary table text
- do not use KPI sizing for ordinary counts inside forms or tables

## Color rules

### Dark text

Dark text means one of:

- primary identifier
- important metric
- title of a section
- current actionable state

If dark text is used, there should be a reason.

### Muted text

Muted text means one of:

- supporting context
- helpful metadata
- explanatory copy that is genuinely needed
- empty state support line

Muted text should not carry the main meaning of a row or card.

### Accent color

Accent should be used for:

- interactive emphasis
- positive status
- selected state
- chips/badges where color carries meaning

Accent should not replace proper hierarchy.

## Table rules

Tables need the clearest hierarchy because drift is most visible there.

### Headers

- Size: `text-sm`
- Weight: `font-medium`
- Color: muted

Reason:

- table headers should orient, not compete with data

### Primary data columns

A table should usually have one or two primary columns, not more.

Allowed primary columns:

- the main identifier column
- the most decision-critical adjacent column if needed

Examples:

- Contacts: `Name`, `Last job`
- Jobs: `Job`, possibly `Customer`
- Team: `Member`

These should use dark text.

### Secondary data columns

Everything else should default to muted text unless it represents a status or urgent value.

Examples:

- `Last contact`
- `Balance`
- timestamps
- supporting counts

### Status columns

Statuses should generally not be plain dark text.

Preferred treatment:

- badge/chip
- restrained color coding
- strong readability without shouting

Why:

- status is categorical, not prose
- plain black status text looks accidental next to primary identifier columns

## Helper copy policy

Helper copy should be removed unless it does one of these:

- explains a non-obvious workflow
- prevents a likely mistake
- clarifies a data definition the user could misread

If it only restates the page title, remove it.

Bad example:

- "Manage access and permissions for your workspace"

Good example:

- a short note explaining that a number reflects the selected reporting window

## Settings-page exception

Settings pages follow the same hierarchy, but are allowed to be flatter and more utilitarian.

Rules for settings:

- page title can still be `text-2xl`
- card titles can lean more on `text-base font-semibold`
- helper copy can appear more often, but should still be concise
- avoid decorative emphasis unless it helps orientation

## Immediate implications

### Contacts

- `Name` and `Last job` should be primary
- `Last contact` and `Balance` should be secondary
- `Job status` should become a badge/chip, not plain dark text

### Analytics

- page title remains strong
- KPI values are primary
- comparison labels and explanatory copy stay secondary
- only essential definitions remain

### Team

- page title remains strong
- member name is primary
- role, email, and join metadata are secondary
- avoid oversized helper text

## Implementation order

1. Establish shared typography utility patterns for CRM page titles, section headers, and primary/secondary table text.
2. Normalize operational pages first:
   - dashboard-adjacent surfaces
   - analytics
   - contacts
   - team
3. Normalize jobs/deals pages.
4. Normalize settings with a more utilitarian application of the same rules.

## Success criteria

The spec is working if:

- page titles feel related across CRM pages
- tables clearly indicate what to scan first
- muted text feels intentional instead of default
- helper copy is reduced and more useful
- statuses look designed rather than leftover
