# Finance section: the build plan

This is the working plan for the Finance section. It spans both repos. Any
agent, in any session, can pick it up, do the next unticked task, tick it, and
leave the file better than it found it.

Started 2026-10-14. Owner: Richard Somda (the user). It began with a request
from Nii Mantse: monthly sales for each branch since it opened.

---

## How to use this file

1. Read the whole file before touching code.
2. Work one phase at a time, top to bottom, unless the user says otherwise.
3. Tick a box (`- [x]`) only when the thing is done and checked. Put the commit
   hash after it.
4. Add anything the next agent needs to **Section 11, Learnings**, with a date.
5. Keep **Section 1, Status** true. Update it at the end of every session.
6. Ask the user before any push and any deploy. One approval covers one push.
7. Write in the house style: plain words, one idea per sentence, no em or en
   dashes. This covers this file, code comments, commits and screen copy.
8. Never put real sales figures in this repo. Both repos are public. Check
   figures against the review page instead (Section 4).

---

## 1. Status

| Phase | What | State |
|---|---|---|
| 0 | Branches cut, plan written | Done 2026-10-14 |
| 1 | Backend: one endpoint that returns the finance data | Done 2026-10-14. Four commits on the backend's `feat/finance-section`, head `bf976dc`. Not pushed. |
| 2 | Frontend: types, service, and the figures ported to TypeScript | Done 2026-10-14. `14f4b5c`, `0aa6bc9` and the review's mend `bb3ba22` on the frontend's `feat/finance-section`, with the ticks. Not pushed. |
| 3 | Overview screen | Done 2026-10-14. `dde7bc4`, `87a71e1`, `d6dbeca` and `16900c7` on the frontend's `feat/finance-section`, with the ticks. Not pushed. |
| 4 | Compare screen | Not started |
| 5 | Ledgers screen | Not started |
| 6 | Download: the sheet, the PDF and the CSV | Not started |
| 7 | Partner portal: the same section, limited to the partner's branches | Not started |
| 8 | Phone pass and design pass | Not started |
| 9 | Ship to prod through `master` and `main` | Not started |

Branches, both cut 2026-10-14:

- Frontend: `feat/finance-section`, off `origin/main` at `85867a7`.
- Backend: `feat/finance-section`, off `origin/master` at `1451004`.

Neither branch has an upstream. That is on purpose. A bare `git push` would
otherwise go to `main` or `master`, and both deploy to prod.

Last updated: 2026-10-14, at the end of Phase 3. Next: Phase 4, Compare.

---

## 2. What we are building

A **Finance** tab for admins and for branch partners.

It shows money, not operations. How much each branch sold, month by month and
day by day. How the months compare. How customers paid. What was cancelled
after payment. It downloads as a proper PDF report and as a spreadsheet.

A partner sees only the branches they fund. The server decides that, never the
screen.

The review page shows the look and the behaviour the user has already seen:
https://claude.ai/artifact/Spg55L9eG6TMcPQFNDirzv

It is shared with all four of the user's accounts. Read it with the Artifact
tool, `action: "read"`. Its `<script id="core">` holds every figure as plain
functions. Its `buildPdf` holds the PDF. Port both. Do not copy its data into
this repo.

---

## 3. Decisions

| # | Date | Decision |
|---|---|---|
| D1 | 2026-10-14 | Finance is its own tab, in the admin portal and the partner portal. It is not inside Analytics. |
| D2 | 2026-10-14 | It ships straight to `master` and `main`, not through beta. Beta holds other work, and the user needs this fast. Each push still waits for the user's go. |
| D3 | 2026-10-14 | Simple words. One sentence per idea. No helper line that repeats a title. |
| D4 | 2026-10-14 | Built from the inventory kit: `PageHeader`, `SegmentedTabsLink`, `FilterBar`, `CustomSelect`, `DataTable`, `TONE`. Light only. |
| D5 | 2026-10-14 | Three tabs: **Overview**, **Compare**, **Ledgers**. No Notes tab. The notes live on the last page of the PDF. |
| D6 | 2026-10-14 | A sale is a paid order that was not cancelled. Net sales is `total_amount - delivery_fee`. This is the same rule as `AnalyticsQueryBuilder::revenueOrders`, so Finance and Analytics agree. |
| D7 | 2026-10-14 | **Change** compares sales a day, not monthly totals. A part month must not look like a fall. |
| D8 | 2026-10-14 | Orders cancelled after payment split three ways: refunded, money kept, no charge. None of them is in net sales. |
| D9 | 2026-10-14 | Branch is the only series colour. Ashaiman `#2a78d6`, Lakeside `#eb6834`, East Legon `#1baf7a`. These pass the dataviz validator on the cream card. A fourth branch needs its colour checked with the validator first. |
| D10 | 2026-10-14 | Partners see only their own branches. The backend enforces it. |
| D11 | 2026-10-14 | Figures are live and include today. "So far" and the forecast use complete days only, up to yesterday. |
| D12 | 2026-10-14 | Share of sales is a donut for the chosen months. The user found the 100% bars hard to read. |
| D13 | 2026-10-14 | In Branch against branch, the best figure is bold in deep gold `#9a6410`. No "Best" pill. |
| D14 | 2026-10-14 | The **Month by month, branch by branch** grid goes back on Overview. The user called it the best view. |
| D15 | 2026-10-14 | Months since opening keeps "Month 1, 2, 3" on the chart. Each table cell also names the real month. |
| D16 | 2026-10-14 | The month-so-far bars carry their own labels: "So far", "Forecast", and the last month's mark. |
| D17 | 2026-10-14 | The download is redesigned. See Section 7. |
| D18 | 2026-10-14 | No pattern views: no busy hours, no best and worst days, no channel mix. "We're focused on the financials." |
| D19 | 2026-09-18 | Items are named by `receiptName()` from `lib/utils/receiptName.mjs`. Never join the item and the option. |
| D20 | 2026-10-14 | The PDF keeps the Hubtel note and the test payments note. |

---

## 4. Facts that cost time to find

**Data on prod.**
- Three branches. First sales: Ashaiman 27 March 2026, Lakeside 2 August 2026, East Legon 3 August 2026.
- Every order has at most one completed payment. There are no split payments yet.
- `subtotal - discount + service_charge + delivery_fee = total_amount` holds on every order.
- No discount has been given yet. The columns still belong in the statement.
- Most delivery fees are collected by riders in cash, so the delivery figure is small.
- 13 test payments of GHS 0.10 or GHS 0.20 are counted as sales.
- 32 of the 70 options sold have no `display_name`. Option 8 on Noodles shows as a bare "Seafood". `php artisan menu:stamp-receipt-names` fixes it. The user runs it, not an agent.
- The review page's figures are a snapshot read at 2026-10-14 00:14. To check the new screens, set the end date to 13 October 2026 and compare totals with the review page.

**Code to reuse.**
- Branch scoping: `AdminAnalyticsController::filters()`, `restrictBranchScope()` and `assignedBranchIds()`. Move them into a trait and use it in the new controller. Do not write a second copy.
- `User::isCompanyWide()` must be asked before any branch-scoped query.
- The revenue expression: `AnalyticsQueryBuilder::revenueExpr()`.
- Partner scope: `PartnerScopeProvider` and `app/components/partner/BranchScopeSelector.tsx`.
- Server time: `serverNow()` from `lib/utils/serverClock.ts` for the "read at" stamp and the PDF date.
- `jspdf` is already a dependency (`^4.2.1`). The partner Order Ledger imports it dynamically. `jspdf-autotable` is not installed yet. Pick the version that supports jsPDF 4.

**Traps.**
- The backend working tree has uncommitted work on `fix/order-number-skips-deleted`. Do not switch branches in it. Use a worktree: `git worktree add ../cedibites_api_finance feat/finance-section`.
- `view_analytics` is held by admin, tech_admin, manager and branch partner. Gate the endpoint on it, as Analytics does.
- PDF fonts: the built-in Helvetica cannot draw "ɔ" (in Kɔkɔɔ). Embed a Noto Sans subset (about 22 KB a weight) holding U+0020 to U+017F, U+0186, U+0190, U+0254, U+025B, U+20B5 and the quote marks. The review page did this with `fontTools.subset`.
- Never cancel a frontend deploy once `npm ci` has started. It wipes `.next/static`.
- The deploy gate is `npm run lint:hooks`. It also runs the receipt name check.
- `orders.created_at` is stored without a time zone. The database runs on Africa/Accra, which is UTC all year.
- A local HTML file has no viewport tag. Test phone layouts in the real app, not a saved file.

---

## 5. The backend endpoint

One endpoint. It returns compact rows. The frontend works out every figure, as
the review page does.

```
GET /v1/admin/finance/ledger?from=2026-03-01&to=2026-10-31&branch_ids[]=1
Middleware: permission:view_analytics
Scope: the branch scoping trait (D10)
```

Response:

```json
{
  "data": {
    "read_at": "2026-10-14T00:14:03Z",
    "today": "2026-10-14",
    "branches": [{ "id": 1, "name": "Ashaiman", "first_sale": "2026-03-27" }],
    "sales": [["2026-03-27", 1, "pos", "pickup", "cash", 9, 1374.00, 0.00, 0.00, 1374.00, 0.00]],
    "cancelled": [{ "order_number": "AC081", "placed_at": "2026-04-03 13:22", "cancelled_at": "2026-04-03 13:40",
                    "branch_id": 1, "source": "pos", "type": "pickup", "method": "cash",
                    "outcome": "refunded", "amount": 75.00, "reason": "Duplicate order" }],
    "items": [["2026-03", 1, "pos", "pickup", "cash", 42, 18, 1710.00]],
    "options": { "42": { "item": "Fried Rice / Jollof Rice / Noodles + 3 pieces of Chicken",
                         "display_name": "Assorted Fried Rice + 3 pieces of Chicken",
                         "label": "Assorted Fried Rice", "category": "Combos" } }
  }
}
```

- `sales` columns: date, branch, source, type, method, paid orders, gross, discount, service charge, net, delivery fee. Grouped by those five keys. Only orders with a `completed` payment and `status <> 'cancelled'`. Soft-deleted orders left out.
- `cancelled`: every order with `status = 'cancelled'` and a payment of `completed`, `refunded` or `no_charge`. `outcome` maps `refunded` to refunded, `completed` to kept, `no_charge` to no_charge. `amount` is `total_amount - delivery_fee`.
- `items` columns: month, branch, source, type, method, option id, quantity, sales. Same order filter as `sales`.
- `options`: the current item name, receipt name, label and category for each option id. The frontend names each line with `receiptName(item, display_name || label)`. Lines that come out with the same name and category are added together.
- `first_sale`: the date of the branch's first paid order.
- The SQL from the review page is in the session notes. It ran read-only on prod in under a second.

---

## 6. The screens

Routes are places. Each tab is its own route.

- Admin: `/admin/finance`, `/admin/finance/compare`, `/admin/finance/ledgers`.
- Partner: `/partner/finance`, `/partner/finance/compare`, `/partner/finance/ledgers`.
- Both portals mount the same components from `app/components/finance/`.

### The order on every Finance page

The user could not tell where to look. Hold this order, top to bottom:

1. **PageHeader.** Title "Finance". One line under it: the branches and the dates. One primary button: **Download**.
2. **The tabs.** Overview, Compare, Ledgers. Right under the header. They are the first control the eye meets.
3. **The FilterBar.** Branch, then From and To months. On a laptop, Channel, Order type and Payment sit in the same row. On a phone they fold behind **More filters**. Each active filter shows as a chip with a cross.
4. **The page itself.**

On a partner page, the branch filter is the existing `BranchScopeSelector`.

### Controls on a chart

Each chart has one control row under its title. Each group has a short caption:

- **Show**: Net sales, Orders, Average order, Sales a day.
- **Chart**: Lines, Bars, Stacked.

The title says what is on screen. "Net sales by month" changes to "Orders by month" when Orders is chosen.

A chart's own branch and payment choice hides behind a small **Filter this chart** button. When one is set, a chip says so, for example "Lakeside, MoMo". Its cross puts the chart back on the page filters.

### Overview

1. Four figures. **Net sales** is larger than the other three. Then Paid orders, Best month, Cancelled after payment.
2. **Net sales by month.** Lines by default. Hollow dots mark part months. Click a month to see its days. "Back to all months" returns.
3. **Month by month, branch by branch.** The grid from the first review page: for each branch, net sales, orders, sales a day and change. Totals at the foot.
4. **Daily sales.** Seven day average or each day. 7 days, 30 days, 90 days, All. Drag across to zoom. Zoom out.
5. **Average sales by day of the week.**

### Compare

1. **Period against period.** This month so far, Last full month, or Pick dates. One table, branches as rows. No cards inside the panel. Paired bars below it.
2. **This month so far.** One labelled bar per branch (D16). Then the table: days so far, sales so far, same days last month, change, sales a day, forecast, last month, forecast against last month.
3. **Months since opening** (D15).
4. **Share of sales.** A donut for the chosen months, with a month picker. Each slice labelled with its share. A small table under it (D12).
5. **Branch against branch.** Chips choose the branches. "Only the days every chosen branch was open" is on by default. The figures table marks the best in bold deep gold (D13). Then the menu items table and the category mix.

### Ledgers

1. **Monthly statement.** A month opens to show its days.
2. **Daily takings.** Every open day for every branch. Sorts, pages, downloads as CSV.
3. **Cancelled after payment.** All, Refunded, Money kept, No charge, each with a count. Sorts, pages, downloads as CSV.
4. **How customers paid.**
5. **What sold.** Sales or items sold.

### Spacing and look

The user said the spacing was a mess. Follow these:

- Spacing comes from named steps. Nobody types a pixel value.
- Tight inside a group. Open between groups.
- A border or a shadow, never both. No card inside a card.
- One thing is visibly first on each screen.
- Surfaces are `bg-neutral-card`, border `#f0e8d8`, `rounded-2xl`. Controls are at least 44px tall. Columns of numbers use `tabular-nums`.

### On a phone

- A wide table becomes a list, one block per row. Only the month grid and the monthly statement scroll sideways, because comparing across columns is their point. Their first column stays fixed.
- Pickers and the download open as bottom sheets.
- Charts keep their tooltip on tap.
- Nothing scrolls the page sideways at 360px.

---

## 7. The download

One **Download** button in the header opens a sheet. A bottom sheet on a phone, a dialog on a laptop.

1. **What do you want?** Report (PDF) or Spreadsheet (CSV).
2. **For the PDF, how much?**
   - **Short report.** Summary, month by month, monthly statement. About 4 pages.
   - **Full report.** Every section except the two long lists.
   - **Choose sections.** A checklist. The daily takings and the cancelled orders are unticked, with their page counts beside them.
3. One line says the report follows the filters on screen.
4. One primary button: **Download PDF** or **Download CSV**.
5. After it, one line says what happened: saved, or what went wrong.

**The PDF.** A4, wide pages. It is built with jsPDF and autotable, not a screenshot. Port `buildPdf` from the review page. It keeps:

- A title block, a gold rule, and five summary boxes.
- Charts drawn as vector shapes.
- Tables with headers that repeat on each page.
- A running header and footer with "Page x of y".
- The notes on the last page (D5, D20).
- The date from `serverNow()`.

---

## 8. Phases

### Phase 1. Backend endpoint

- [x] Worktree on `feat/finance-section` (Section 4, Traps). (BE `1451004`, where the worktree starts. A worktree leaves nothing to commit.)
- [x] Move the branch scoping out of `AdminAnalyticsController` into a trait. Analytics still uses it. Its tests still pass. (BE `675ac7e`) The trait is `ScopesToAssignedBranches`. See Q5.
- [x] `FinanceController::ledger`, route `GET admin/finance/ledger` under `permission:view_analytics`. (BE `a6ea6fa`) The queries live in `FinanceLedgerService`. See Q6 to Q11.
- [x] Tests: a partner gets only their branches, even when asking for another by `branch_ids`. A cashier gets 403. Cancelled orders land in the right outcome. Soft-deleted orders are left out. Net excludes the delivery fee. (BE `40a907d`, mended in `bf976dc`) `tests/Feature/Finance/FinanceLedgerTest.php`, 17 tests. It also pins Q6, Q7, Q10 and Q11, and a partner with no branches.
- [x] Run the full suite. Note the known failures from the baseline memory, and only those. (BE `40a907d`, no code changed.) Run at 02:29: 6 failed, 1388 passed. The six are the baseline's: two IAM `SecurityHardeningTest` (IAM-011, IAM-016/017) and four `SmartCategoryTest`. The 17 more passes are the ledger tests. The mend `bf976dc` changed two numbers in one test after the run started, so that file was run again on its own: 17 passed.

Done when: the endpoint returns the shape in Section 5 and the tests pass.

### Phase 2. Frontend data

- [x] Types in `types/finance.ts`. Service in `lib/api/services/finance.service.ts`. Hook `useFinanceLedger(filters)`. (FE `14f4b5c`) The hook is in `lib/api/hooks/useFinance.ts`. Sale and item rows are typed as tuples, in the order the endpoint sends them. Source, type and method are plain strings, as stored.
- [x] Port the review page's `core` script to `lib/finance/figures.ts`: `compute`, `periods`, `pace`, `since`, `versus`, `itemTable`, `weekday`, `dailySeries`, `bestMonth`. Pure functions, no DOM, no `new Date()` for "now". (FE `0aa6bc9`) `openBook(ledger, { end })` makes a book once for each read, and every function takes the book first. Fields are spelt out: `orders`, `discount`, `serviceCharge`, `deliveryFee`, where the page had `n`, `disc`, `svc`, `dlv`. Checked in scratch: the page's own `core` and the port, run over the page's data, give the same figure to the last digit on every function, for each branch, source, type and method, and under four time zones. Recommended, taken: Q12, Q14, Q15 and Q16 in Section 10.
- [x] Item names through `receiptName()`. (FE `0aa6bc9`) `openBook` names each option with `receiptName(item, display_name || label)`. Options that come out with the same name and category are one line. Recommended, taken: Q13 in Section 10.
- [x] Check: with the end date set to 13 October 2026, the totals match the review page. (FE `0aa6bc9`, no code changed.) Matches: net sales, paid orders, the count cancelled after payment and each of its three parts, and September for all branches. The check ran on the page's data, shaped as the endpoint sends it, because the build cannot reach prod. The soft deleted payments of Q11 cannot show in it, since that data came from the page's own SQL. Run again on the mend `bb3ba22`: it still matches. The look on prod is Phase 9's fourth box.

### Phase 3. Overview

- [x] Admin nav: **Finance** in the Overview group, after Analytics, with a money icon. (FE `dde7bc4`) The entry is in `ADMIN_GROUPS` in `app/admin/layout-client.tsx`, so it shows to everyone the admin portal lets in, as Analytics does. The staff portal's menu is untouched, so managers get no tab (Q1). Recommended, taken: Which money icon? `MoneyIcon`, a banknote. The dollar sign icons name the wrong currency. Recommended, taken: Is Finance in the admin phone bar? No. The bar keeps its five and Finance is in the menu drawer.
- [x] `app/admin/finance/layout.tsx` with the header, tabs and FilterBar. (FE `87a71e1`) The layout mounts `FinanceShell` from `app/components/finance/`. The partner portal mounts the same shell in Phase 7 and passes its own branch control in. `FinanceProvider` reads the whole ledger once, makes one book, and holds the page filters for all three tabs. `lib/finance/format.ts` holds the review page's words for numbers and dates. Not looked at in a browser yet: the session ran out of room before it could start a backend. The look waits for the Overview box or Phase 8. Recommended, taken: Where is the Download button? Left out until Phase 6 makes it, so no dead button ships. Recommended, taken: What do Compare and Ledgers show before Phases 4 and 5? A plain panel that says the tab is not built yet. Overview shows the same until its box. Recommended, taken: Where do the filters live? In the layout's state, not the address. They hold from tab to tab and reset on a reload. Recommended, taken: Where is the "read at" stamp? In one line at the foot of every Finance page, from the ledger's `read_at`. Recommended, taken: How do the filters fold on a phone? Channel, Order type and Payment open in place under More filters. The bottom sheet is Phase 8's. Recommended, taken: Is a narrowed span of months a chip? Yes, one chip for From and To together.
- [x] Chart parts in `app/components/finance/charts/`: lines over months, columns, lines over days with zoom, donut. Ported from the review page and drawn in SVG. (FE `d6dbeca`) `CategoryLineChart`, `ColumnChart` and `TimeLineChart` are the page's three charts. `BandPlot` is the frame the first two share. `ChartTip` is the readout and `ChartLegend` the legend. The colours of D9 are in `lib/finance/branchColours.ts`, by branch name. Looked at in headless Edge at 1280 wide, on a scratch page with made up numbers: all four draw as the page's do. Headless Edge goes no narrower than 500, so a true 390 was not seen. They drew right at about 450, and the phone look is Phase 8's. The readout on hover and the drag to zoom were not seen in a browser. Recommended, taken: What colour does a fourth branch take (Q4)? The next slots of the dataviz palette in its own order: yellow, pink, green, violet, red. The eight pass the validator together in that order on the cream card. A ninth branch is grey. Recommended, taken: Where does the donut come from? It is new. The page drew bars to 100, which D12 dropped, so the columns have no "to 100" mode. Each slice carries its share and its name. Recommended, taken: Can a chart be read from the keyboard? Yes. Each chart is one Tab stop, the arrow keys walk its points, and Enter opens a month. Recommended, taken: Is the page's button that opens a chart to the full screen ported? No. The plan does not ask for it. Recommended, taken: Which grey is a chart's small text? `#6f6353`, as on the review page. The kit's grey is too pale at that size on the cream card.
- [x] The Overview sections in the order of Section 6. (FE `16900c7`) `FinanceOverview` in `app/components/finance/overview/` holds the five sections, and Phase 7 mounts it too. `ChartPanel` is the frame every chart sits in: the title, one row of Show and Chart, and Filter this chart with its chip. `FinanceProvider` makes the branch colours once, from the whole book, so a filter never repaints a branch. Change is a `TONE` pill on sales a day (D7), and the running month leaves today out (D11). Looked at once in headless Edge at 1280 wide, on a scratch route with made up numbers: all five sections draw. The grid scrolls sideways at that width, with the month held in place, and its fit is Phase 8's. The readout on hover, the click on a month and the drag to zoom were not seen in a browser. Recommended, taken: Where does the month grid come from? Section 6's words, since the live review page no longer has it. Recommended, taken: How is a month opened? A click on it, and Back to all months. No month picker. Recommended, taken: What does Chart offer when the branches cannot add up? Lines and Bars. Stacked is left out, not greyed. Recommended, taken: Does the grid have Filter this chart? No. It is a table, and it follows the page filters. Its branch groups are parted by room, not by a rule down one side.

### Phase 4. Compare

- [ ] The five Compare sections in the order of Section 6.

### Phase 5. Ledgers

- [ ] The five Ledgers sections, on the kit's `DataTable`.

### Phase 6. Download

- [ ] The sheet from Section 7.
- [ ] `lib/finance/pdf.ts`, ported from `buildPdf`, with the Noto Sans subset in `public/fonts/`.
- [ ] CSVs for the statement, the daily takings and the cancelled orders.
- [ ] Open the PDF and look at every section once.

### Phase 7. Partner portal

- [ ] **Finance** in `PARTNER_NAV`. Check the phone bar fits at 360px. See Q2.
- [ ] `app/partner/finance/` routes mounting the shared components, with `BranchScopeSelector`.
- [ ] Log in as a partner. Check that only their branches appear, on screen and in the PDF.

### Phase 8. Phone and design pass

- [ ] 360px and 390px wide: no sideways page scroll, lists instead of wide tables, sheets for pickers.
- [ ] Read back every line of copy against the house rules. No dashes, one idea per sentence, no repeated labels.
- [ ] Spacing from named steps only.

### Phase 9. Ship

- [ ] `npm run lint:hooks` and `npm run build` pass on the frontend branch.
- [ ] Ask the user. Merge the backend branch into `master`. The deploy runs. Check the endpoint on prod with an admin login.
- [ ] Ask the user. Merge the frontend branch into `main`. Do not cancel the deploy.
- [ ] On prod: open Finance as an admin and as a partner. Compare the totals with the review page for the same end date.
- [ ] Update Section 1 and the session memory.

---

## 9. Work that can run side by side

For agents working at the same time. Each owns its files.

| Stream | Phases | Owns | Waits for |
|---|---|---|---|
| A, backend | 1 | the backend worktree | nothing |
| B, figures | 2 | `types/finance.ts`, `lib/finance/figures.ts`, the service and hook | the contract in Section 5 only |
| C, charts | part of 3 | `app/components/finance/charts/` | nothing |
| D, PDF | 6 | `lib/finance/pdf.ts`, the fonts | B |
| E, screens | 3, 4, 5, 7 | `app/admin/finance/`, `app/partner/finance/`, the rest of `app/components/finance/` | B and C |

A, B and C can start at once. E starts when B and C land. One agent merges.

---

## 10. Open questions

Each has a default. Build on the default until the user says otherwise.

| # | Question | Default |
|---|---|---|
| Q1 | Do managers get the Finance tab? They hold `view_analytics`. | No tab. The endpoint already limits them to their branch. |
| Q2 | The partner phone bar would have six items. | If six do not fit at 360px, Finance takes the place of My Branch in the bar. My Branch stays in the side menu. |
| Q3 | Where does Finance sit in the admin menu? | In Overview, after Analytics. |
| Q4 | What does a fourth branch's colour become? | Pick from the dataviz palette, then run the validator. |
| Q5 | Does the branch scoping trait ask `User::isCompanyWide()`? | No. It keeps admin and tech_admin only, as Analytics had it. `isCompanyWide()` is also true for the warehouse, purchasing and the call centre. Recommended, taken in Phase 1. |
| Q6 | An order paid in two parts would join to two payments. | It counts once, under the method of its first completed payment. Recommended, taken in Phase 1. |
| Q7 | Does `first_sale` follow `from` and `to`? | No. It is the day of the branch's first paid order ever. Recommended, taken in Phase 1. |
| Q8 | Which branches does the endpoint list? | Every live branch in the caller's scope, with `first_sale` null if it never sold. A closed branch is listed only if it sold. Recommended, taken in Phase 1. |
| Q9 | What comes back with no `from` and no `to`? | Everything since the first sale. Recommended, taken in Phase 1. |
| Q10 | A line sold with no option. | It comes back under option id 0 and has no entry in `options`. Recommended, taken in Phase 1. |
| Q11 | Are soft deleted payments counted? | No. Analytics leaves them out, so Finance does. The review page's SQL did not, so a total can differ from it by a deleted payment. Recommended, taken in Phase 1. |
| Q12 | Does today count in sales a day? | No. Today is in every total. Sales a day, the weekday averages and the seven day average leave it out, because a day that is not over reads as a fall (D7). "So far" and the forecast stop at yesterday (D11). Recommended, taken in Phase 2. |
| Q13 | What is a line with no option called? | "Dish not recorded", under "Uncategorised". Its row holds no dish name, so it cannot be named from the item. An option that is no longer in `options` reads the same. Prod has no such line today. Recommended, taken in Phase 2. |
| Q14 | Is a branch that never sold in the figures? | No. It has no first sale to count days from. The endpoint still lists it, so a screen can name it. Recommended, taken in Phase 2. |
| Q15 | Which month is "This month so far" on the 1st? | The month before, whole, with no days left. No day of the new month is complete yet. Recommended, taken in Phase 2. |
| Q16 | Do the screens read the ledger with a `from`? | No. They read the whole ledger and choose months on the screen, as the review page does. A day the endpoint left out would count as a day open with no sales. An end date goes to `openBook` as `end`. Recommended, taken in Phase 2. |

---

## 11. Learnings

- 2026-10-14. The review page was built and checked in one night. These came out of it.
- 2026-10-14. A grid or flex child holding a wide table needs `min-width: 0`. Without it the table pushes the whole page wider on a phone.
- 2026-10-14. `[hidden]` loses to any class that sets `display`. Add `[hidden] { display: none !important; }`.
- 2026-10-14. jsPDF's built-in fonts drop "ɔ". The Noto Sans subset fixed it and added the cedi sign.
- 2026-10-14. Headless Edge over the debug protocol makes a good check: console errors, screenshots at two widths, and a full PDF build. PyMuPDF in a scratch venv renders PDF pages, since this machine has no poppler.
- 2026-10-14. Four comparison cards in a row at laptop width cut off their last column. Two per row fits. A table is better still (Section 6).
- 2026-10-14. The backend worktree is `cedibites_api_finance`, beside the main tree. It needs its own `composer install` and a copy of the main tree's `.env`. Tests run on SQLite in memory, so it needs no database.
- 2026-10-14. `composer install` unpacked every package in 21 seconds, then sat for ten minutes before writing the autoloader, most likely on a network call. Stopping it and running it again finished in seconds.
- 2026-10-14. Backend test baseline, before any Finance change, at `1451004`, run at 02:07: 6 failed, 1371 passed. Two are the IAM `SecurityHardeningTest` failures (IAM-011 and IAM-016/017). Four are in `SmartCategoryTest`, and they swing with the clock because SQLite cannot read `EXTRACT(HOUR FROM ...)`. The last box of Phase 1 must show these and no others.
- 2026-10-14. `PaymentController`, `AdminDashboardController` and `BranchController` each hold their own copy of the assigned branches rule. The plan does not ask to move them, so they are left. The owner decides.
- 2026-10-14. The ledger was run read only on the local dev Postgres, never prod or beta. Net, paid orders, delivery fees and the cancelled count matched Analytics' own totals on three filter sets, in 350 ms. The month is `TO_CHAR` on Postgres and `strftime` on SQLite, so the tests cannot prove the Postgres line. This run did.
- 2026-10-14. `php artisan tinker <file>` waits at a prompt and never exits when an agent runs it. Use `php artisan tinker --execute="require '<file>';" < /dev/null`.
- 2026-10-14. Backend suite at the end of Phase 1, run at 02:29: 6 failed, 1388 passed. The same six as the baseline, and 17 more passes, which are the ledger tests. This is the count to match from here on.
- 2026-10-14. Laravel's JSON drops a zero fraction. A whole amount reaches the frontend as `195`, not `195.00`. The screen formats every amount itself. The ledger tests compare rows with `toEqual` for the same reason.
- 2026-10-14. With nothing sold, `options` comes back as `{}`, never `[]`. A Laravel test's `json()` reads both as an empty array, so the tests check the raw body.
- 2026-10-14. The menu item factory gives every dish a Standard option, and the order item factory fills an empty option with it. To test a line with no option, clear the option after the line is made.
- 2026-10-14. Helper functions in Pest files are global across the whole suite. The ledger test's helpers all start with `ledger` or `financeLedger`, so they cannot collide with another file's.
- 2026-10-14. Node 22 runs the frontend's TypeScript with `node --experimental-strip-types`, when the file takes its types with `import type` and its code by a relative path with the extension. `lib/finance/figures.ts` is written that way, so a scratch script can run it. The frontend still has no test runner.
- 2026-10-14. The review page's data is not the endpoint's shape. Its item rows hold a place in a list of names built beforehand, not an option id. Its cancelled orders are arrays, with `free` where the endpoint says `no_charge`. A check script has to reshape it first.
- 2026-10-14. The review page never had a part day: it ended the day before it was read. `Sums` carries `partDays` and `partNet` so that `perDay` can leave today out. A screen that divides `net` by `days` itself brings the fall back. Use `perDay` and `change`.
- 2026-10-14. A branch filter that matches no branch gives empty figures. The review page gave the first day as `Infinity` there, and formatting it throws. Since `bb3ba22` `start` falls back to the book's end. This is the one place the port leaves the page.
- 2026-10-14. `TZ=... node` does not reach Node from Git Bash on Windows. Set `process.env.TZ` at the top of the script.
- 2026-10-14. The scratch checks for the figures are not in the repo, because the page's data holds real figures. To check again: read the review page with the Artifact tool, cut out `<script id="core">`, run it in `node:vm` with `window = {}`, and compare it with the port over the same data.
- 2026-10-14. An order cancelled after payment is in `ledger.cancelled` but in no `Sums` when it was placed before its branch's first sale, or at a branch that never sold. `dayMap` and `sumRange` start at `openDay`. A list of cancelled orders can so hold more rows than the count beside it.
- 2026-10-14. The frontend's eslint runs the React Compiler's rules as errors. A variable reassigned inside a `.map` in render fails it. So does setting state straight inside an effect. Work the value out instead, as `useChartFilter` does with a pick the ledger no longer holds.
- 2026-10-14. `next dev` writes every route into `.next/dev/types`, and `tsconfig.json` reads it. A scratch route deleted after a look leaves `tsc` red until its lines come out of `validator.ts` and `routes.d.ts` there.
- 2026-10-14. A screen can be looked at with no backend. A scratch route seeds a `QueryClient` with `setQueryData` under the ledger's query key, with made up numbers and `staleTime: Infinity`, and mounts `FinanceProvider` inside it. Never commit it.
- 2026-10-14. `pace` sets `vsMonthBefore` from a forecast for the whole month over the month before as it was. A branch that opened part way through that month reads as growth. The review page did the same. Left as ported, for the owner.
