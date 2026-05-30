# Map feature — beta gating & copy removal

The Map feature is **hidden behind a beta password wall** and **removed from all
navigation/copy** while in beta. The underlying map code is untouched and fully
functional — only the entry points and the gate changed.

Search the codebase for `BETA_REMOVED` to find every inline reinstatement note.

## Beta password wall
- **New:** `components/beta-gate.tsx` — `<BetaGate>` wrapper. Prompts for a password,
  stores unlock in `localStorage` (`em_beta_map_unlocked`). Password read from
  `NEXT_PUBLIC_MAP_BETA_PASSWORD` (if unset, any input unlocks — open in dev).
- Applied in `app/crm/map/page.tsx` and `app/(dashboard)/tradie/map/page.tsx`
  (the rendered output is wrapped in `<BetaGate>…</BetaGate>`).
- Env var documented in `.env.example`.

## Map entry points removed (reinstate to restore navigation)
| File | What was removed |
|------|------------------|
| `components/core/sidebar.tsx` | Map nav item (desktop sidebar) + `Map` lucide import |
| `components/mobile/_primitives/more-sheet.tsx` | Map entry in mobile "More" sheet + `MapIcon` import |
| `components/tradie/tradie-dashboard-client.tsx` | "Return to Map" button in empty state + `Map` import |
| `components/tutorial/tutorial-steps.ts` | `nav-map` tutorial step |
| `components/tutorial/tutorial-overlay.tsx` | `nav-map` from `BOTTOM_CARD_IDS` and the auto-nav `routes` map |

## Tests updated
- `__tests__/map-page-access.test.tsx` — mocks `@/components/beta-gate` (pass-through).
- `__tests__/tradie-dashboard-client.test.tsx` — empty-state assertion no longer
  checks the removed "Return to Map" link.

## To fully reinstate
1. Search `BETA_REMOVED`, restore each commented block.
2. Remove `<BetaGate>` wrappers from the two map pages (or keep them).
3. Revert the two test changes above.
