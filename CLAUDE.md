# CediBites frontend

## Design rules

**No side borders.** Do not use a coloured left or right edge on a card, row or
panel — no accent rails, no status stripes down the side of a list item. State
belongs in a badge or a pill (see `app/inventory/_components/status-tokens.ts`),
where it sits with the content it describes and reads the same on every screen
width. A full border on all four sides is fine; a border on one side is not.

**Times come from the server, never from the machine.** Anything a customer,
an auditor or a manager will read is stamped with `serverNow()` from
`lib/utils/serverClock.ts`, not `new Date()`. The clock offset is learned
passively from the `Date` header on every API response, so it costs nothing.

This is not theoretical. A till at Ashaiman printed a reprint stamped
01:28:00 pm for an order the server had recorded at 02:28:51 pm, because the
Reprinted line was the only thing on that slip asking the local computer what
time it was. That machine was an hour behind and had been since it was set up.
Ghana is UTC+0 all year with no daylight saving, so a clean one-hour gap can
never come from our own formatting.

`new Date()` is still fine for anything the machine alone cares about: a
countdown, an animation, a debounce, how long a ticket has been on screen.

**Anything printed or handed over gets logged, with who and when.** A receipt
is the document somebody brings back when there is a dispute. `receipt_printed_at`
holds only the first print and `receipt_print_count` is a bare total, which is
why `order_receipt_prints` exists: one row per slip, with the employee, the
kind, the reprint number, the screen it came from, and a `printed_at` the
server sets and never accepts from the caller.

**The customer side is a different world from the staff side.** Everything
under `app/(customer)` plus the shared components it owns runs on the CediBites
brand: red `#f40002`, yellow `#ffdd0b`, olive green, mono neutrals, American
Captain over Montserrat. It is scoped to a `.cb-customer` wrapper on
`app/(customer)/layout.tsx`, so the staff portals below keep their warm
foundation. Full reference, including the contrast arithmetic behind each role
and the traps: `docs/CUSTOMER_DESIGN_SYSTEM.md`. Read it before touching a
customer screen.

Four rules from it are worth repeating here because breaking them is expensive:

- **Red is action, yellow is attention, green is confirmation.** White on
  `#f40002` is 4.33:1, so a fill carrying a small white label uses
  `--cb-primary-fill` instead. Yellow never carries white text.
- **The red block heading is display type only.** At body size the contrast
  does not hold.
- **Never attach a photograph to a dish it is not a picture of.** The eight
  shots in `public/brand` are mapped in `lib/constants/branchPhotos.ts`, and one
  deal card is deliberately typographic because no full-chicken shot exists.
- **Radius, page gutter and elevation all come from the token layer**
  (`--radius-*`, `--page-gutter`, `.card-lift`). If you are typing a pixel value
  into a customer component, it probably belongs in `app/globals.css`.

**Light mode only, on purpose.** `ThemeProvider` uses `forcedTheme="light"` and
the root sets `color-scheme: light`. Nothing ever writes `.dark`, so every
`dark:` utility is inert. The dark token blocks are kept so bringing it back is
one line rather than a rebuild.

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
