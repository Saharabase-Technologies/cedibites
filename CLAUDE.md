# CediBites frontend

## Design rules

**No side borders.** Do not use a coloured left or right edge on a card, row or
panel — no accent rails, no status stripes down the side of a list item. State
belongs in a badge or a pill (see `app/inventory/_components/status-tokens.ts`),
where it sits with the content it describes and reads the same on every screen
width. A full border on all four sides is fine; a border on one side is not.

**The inventory portal is the design language.** New staff-facing screens are
built from `app/inventory/_components` rather than hand-rolled:

- `PageHeader` — title (`font-brand`), subtitle, up to two actions
- `SegmentedTabs` / `SegmentedTabsLink` — every tab strip and in-page filter
- `FilterBar`, `SearchBar`, `FilterSelect` — the filter row
- `DataTable` — sortable, paginated lists
- `status-tokens.ts` (`TONE`) — the only source of status colour

Surfaces are `bg-neutral-card` with `border-[#f0e8d8]` and `rounded-2xl`.
Interactive controls get `min-h-11`. Numbers that line up in a column get
`tabular-nums`.
