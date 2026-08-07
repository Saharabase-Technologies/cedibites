# SMS campaigns, short links and order feedback — build plan

Written 2026-08-06. Spans both repos. **Backend first, frontend second** — every public endpoint has
to exist before the page that calls it.

> **Status 2026-08-07: phases 0, A, B and C all built and tested. Uncommitted, both repos.
> Nothing deployed.**
>
> Backend suite **796 passed / 6 failed** — exactly the documented baseline (2
> `SecurityHardeningTest` + 4 wall-clock `SmartCategoryTest`), +74 new tests over the pre-work 722.
> Pint clean. Frontend `tsc --noEmit` and `lint:hooks` clean.
>
> | | Tests | |
> |---|---|---|
> | Phase 0 | `SmsHealthTest` 28 | batch-send correctness, `is_campaign` |
> | Phase A | `ShortLinkTest` 19 | shortener |
> | Phase B | `CampaignSendTest` 16 + `MessageMeterTest` 13 | campaign console |
> | Phase C | `OrderFeedbackTest` 26 | post-order feedback |
>
> **Before deploying, read "What shipped, and where it differs from this plan" at the bottom.** Three
> things were done differently from the text above, one of which was a routing bug in the plan.

## What this is

Sending bulk and automated SMS **from our own portal** instead of exporting a CSV and logging into
the Hubtel dashboard. Three subsystems on one foundation:

| | What | Why it exists |
|---|---|---|
| **A** | Link shortener on `cedibites.com` | SMS is billed per 160 characters. A long URL is what pushes a message into a second billed segment. |
| **B** | Campaign console | Compose, target a segment, see the cost, send, measure. This is what replaces the Hubtel dashboard. |
| **C** | Post-order feedback | Automated request a few hours after an order, collected on our own form. |

**The immediate goal is a working demo, not a live marketing programme.** The technical proof is
what unblocks the compliance track, which is a separate team's work.

---

## Decided with the user — do not relitigate

| Decision | Choice | Consequence |
|---|---|---|
| Short domain | `cedibites.com` | Already owned. Verified live: the apex 301s to `app.cedibites.com` **and preserves the path**. No registration, no procurement. |
| Apex redirect rule | **Leave it alone** | Handlers live in the Next.js app. One extra hop nobody perceives. The character saving is the entire point and we already have it. |
| Campaign link | `cedibites.com/r/A7X9Kp` | 6-char token → **22 characters**. |
| Feedback link | `cedibites.com/f/K3mQ9xR2` | 8-char token → **24 characters**. |
| Compliance | **Deferred by decision** | Consent capture and opt-out enforcement are out of scope. The column gets added; nothing reads it yet. |
| Scope | All three phases | Confirmed 2026-08-06. |

### Why the feedback link is not a short link

Because the apex already forwards to the app, `cedibites.com/f/{token}` can **be** the form page
rather than redirecting to it. One fewer hop, one fewer moving part, and no row in `short_links` per
order. Only campaign and external URLs go through the redirect handler.

### Why the tokens are shorter than `RecruitmentLink`'s

`RecruitmentLink::generateToken()` uses `Str::random(48)`, with the comment that guessing "is not a
strategy". That reasoning is right and the length is free there — recruitment links travel by
WhatsApp and email, where nobody pays per character. **Here we pay per character**, so the same
safety comes from a shorter token plus throttling.

| Link | Token | Space | Guarded by |
|---|---|---|---|
| Feedback | 8 base62 | 2.1 × 10¹⁴ | `throttle:20,1`, same as the recruit routes. Walking that space takes longer than the company will exist. |
| Campaign | 6 base62 | 5.7 × 10¹⁰ | Nothing to guess into — everyone in the blast receives the same URL. |

Tokens are **random, never sequential**. Sequential ids would let anyone enumerate every link we have
ever created, reading the unreleased campaign calendar and every feedback form in one script.

---

## What is already done (phase 0)

Found during the audit and fixed 2026-08-06. **Uncommitted, in the working tree.**

### `sendBatch()` reported success for sends that delivered nothing

`sendSingle()` inspects the response body and treats `status >= 100` as a failure. `sendBatch()`
checked **only the HTTP status** — on 200 it called `recordBatch(..., succeeded: true)` for every
recipient. Hubtel signals business failures in the body, including `Payment required on account`,
the exact error behind the three-week July outage. A 28,000-message campaign against an underfunded
account would have reported 28,000 successes, shown a flawless delivery rate, and delivered nothing.

For a demo meant to prove the system works, **a false pass is worse than an honest failure.**

What changed:

- Body-status check in `sendBatch()` — rejects `status >= 100` or an absent `messageIds` array,
  records a failure per recipient, throws. The test uses the exact rejection shape observed from the
  live endpoint: a lone singular `messageId`, `status: 100`, no `messageIds`.
- **A second hole in the same method.** If `parseResponse()` threw on a malformed body, the batch
  escaped *unrecorded entirely* — counted as neither sent nor failed, making a failed campaign
  invisible to the health check rather than merely misreported. Now caught and recorded.
- Empty batches throw before spending a request.

### Campaign volume no longer floods the health signal

`recordBatch()` writes one row per recipient into `sms_delivery_attempts` — the table feeding
`sms:health-check`, which guards transactional order SMS. 28,000 rows per campaign; one failed batch
writes 5,000 failures at once and trips the systemic alert whether or not order texts are broken.

New `is_campaign` column plus `SmsDeliveryAttempt::scopeTransactional()`, applied to every read
behind the health verdict — the failure rate, last-success timestamps, streak diagnosis, affected
notifications, and the recent-failures list on `/admin/platform` so it cannot contradict the status
above it. `sendBatch(..., isCampaign: true)` threads the flag.

**The exclusion must hold in both directions**, and the second is the easier one to get wrong:

1. A failed campaign must not trip the alert for order notifications.
2. A large *successful* blast must not dilute the failure rate enough to hide a real outage.

Both are tested.

### Files

| | File |
|---|---|
| edit | `app/Services/HubtelSmsService.php` |
| edit | `app/Services/SmsHealthService.php` |
| edit | `app/Models/SmsDeliveryAttempt.php` |
| edit | `app/Http/Controllers/Api/PlatformController.php` |
| edit | `tests/Feature/SmsHealthTest.php` (28 pass, 7 new) |
| new | `database/migrations/2026_08_06_100000_add_is_campaign_to_sms_delivery_attempts.php` |

---

## Hubtel — facts established by probing the live API

**Their documentation is gone.** `help.hubtel.com`, `docs.hubtel.com` and
`businessdocs-developers.hubtel.com` do not resolve from any network — verified by curl from the
user's own machine, not just from a sandbox. Retired, not a network fault. The sources that still
work are the `hubtel/hubtel-sms-java` SDK on GitHub and probing the API directly.

### Do NOT migrate to `smsc.hubtel.com`

Hubtel's own FAQ tells integrators to move there. Both hosts resolve to the **same Cloudflare IPs**
but route to different backends. Probed unauthenticated (no credentials, no recipients, nothing sent):

| Endpoint | Result |
|---|---|
| `sms.hubtel.com/v1/messages/send` | 400 — live |
| `sms.hubtel.com/v1/messages/batch/simple/send` | 500 — live |
| `sms.hubtel.com/v1/messages/batch/personalized/send` | 500 — live |
| `smsc.hubtel.com/v1/messages/send` | 400 — live |
| `smsc.hubtel.com/v1/messages/batch/simple/send` | **404 — absent** |
| `smsc.hubtel.com/v1/messages/batch/personalized/send` | **404 — absent** |

`config/services.php` already defaults to `sms.hubtel.com`. **Leave it.** Following that FAQ would
keep single sends working while every bulk campaign silently 404'd — a failure that looks like
nothing at all until a campaign reaches nobody.

> **Outstanding:** confirm prod has not overridden `HUBTEL_SMS_BASE_URL`. Needs prod access. Should
> happen before phase B is demoed.

### What Hubtel gives us that we do not yet use

| Capability | How | Why it matters |
|---|---|---|
| Per-message cost | `rate`, `units` on the response | **Actual** campaign spend, not an estimate. The number the higher-ups will ask for. |
| Delivery status | `GET /messages/{id}` | We can poll whether a message landed. No callback infrastructure needed. |
| Cancel / reschedule | `cancelSchedule()`, `reschedule()` | Provider-side scheduled sends *can* be pulled back. |
| Our own reference | `clientReference` | Stamp campaign + recipient id so reconciliation is a join, not a guess. |
| Inbound keywords | `/campaigns/{id}/keywords` | Reply-keyword handling exists, for opt-out when compliance comes back. |

`batch/simple/send` sends **identical content to everyone**. Per-person links or names require
`batch/personalized/send` — confirmed live, needed only if we want per-recipient attribution.

### Still unknown — only Hubtel can close these

Each is a config value with a conservative default, so a wrong guess is one line rather than a rebuild.

- **Batch ceiling.** Widely reported as 5,000, never confirmed in primary documentation. Chunk size
  defaults to 1,000.
- **Per-message rate.** All cedi figures use general Ghana market rates of ¢2.5–8. The first
  authenticated send returns a real `rate`, after which cost is measured rather than projected.
- **Throughput.** Inter-batch delay is config.
- **Reply handling on the `CediBites` sender ID.** An alphanumeric sender normally cannot receive
  replies without a number plan. Matters when opt-out returns to scope.

---

## The economics, because they drive the design

SMS billing is a **step function, not a slope**. One segment is 160 GSM-7 characters; concatenated
parts are 153 each, so 161 characters buys 306, not 320. Any non-GSM character — a curly quote, an
emoji, an accented letter — collapses the limit to 70.

Trimming characters saves nothing at 100 characters and saves 100% of the send at 161. **That is the
whole case for the shortener.**

A realistic Friday promo:

```
CediBites: Friday treat! 20% off all jollof today only at East Legon &
Spintex. Order: app.cedibites.com/promo/friday-special?utm_source=sms&utm_campaign=aug-friday
→ 164 characters · 2 billed segments   (the URL alone is 77)

CediBites: Friday treat! 20% off all jollof today only at East Legon &
Spintex. Order: cedibites.com/r/A7X9Kp
→  99 characters · 1 billed segment
```

At 28,000 recipients that single change is **GHS 840–2,240 saved on one campaign**, which is more
than the shortener costs to build.

**Never write `https://` in a message.** Handsets auto-link a bare domain; the scheme costs 8
characters and buys nothing.

---

## Phase A — the shortener

Shortens our own and external URLs, counts clicks, admin-gated. Depends on nothing.

### Runtime path

```
customer taps  cedibites.com/r/A7X9Kp
  → 301 (Cloudflare)  app.cedibites.com/r/A7X9Kp
  → Next.js route handler → POST /v1/links/A7X9Kp/resolve   (records click, returns target)
  → 302 → destination
```

### Migrations

**`short_links`**

| Column | Notes |
|---|---|
| `token` | string(16), **unique**. Base62, random, collision retried on the index. |
| `label` | What it is, for the admin list |
| `target_url` | text |
| `campaign_id` | nullable |
| `created_by_user_id` | Who made it — this is audit material, see below |
| `click_count` | unsigned, denormalised so the list does not count rows |
| `expires_at` | nullable |

**`link_clicks`**

| Column | Notes |
|---|---|
| `short_link_id` | |
| `clicked_at` | |
| `user_agent`, `referer` | nullable |
| | index `(short_link_id, clicked_at)`; pruned on a schedule |

### Files

| | File | Notes |
|---|---|---|
| new | `app/Models/ShortLink.php` | Token generation, collision retry |
| new | `app/Models/LinkClick.php` | |
| new | `app/Services/ShortLinkService.php` | Create, resolve, record, build URL from a configurable base |
| new | `app/Http/Controllers/Api/ShortLinkController.php` | Admin CRUD + public resolve |
| new | `app/Console/Commands/PruneLinkClicks.php` | |
| edit | `routes/public.php` | resolve endpoint, throttled |
| edit | `routes/admin.php`, `routes/console.php`, `config/services.php` | |
| new | `app/r/[token]/route.ts` | **The app's first Next.js route handler** |
| new | `app/admin/links/page.tsx` + `_components/` | Create, list, copy, click counts |
| new | `lib/api/services/link.service.ts`, `lib/api/hooks/useLinks.ts` | |
| new | `tests/Feature/ShortLinkTest.php` | |

### Two details that are easy to get wrong

**302, not 301.** A permanent redirect is cached by the browser and the click never reaches us
again — counts silently undercount and a mistyped link can never be repointed.

**Do not add a cache layer.** `CACHE_STORE=database`, so caching the token lookup is another
database round trip; it buys nothing over a unique index on `token`. Revisit only if Redis is
actually running on prod and clicks measurably hurt.

### Store the token, not the URL

Build links from a configurable base. Then moving to a shorter domain later is an environment
variable rather than a rebuild, and every link already sitting in someone's inbox keeps resolving.

### Open redirect

Creation stays behind the admin permission and is activity-logged. Anyone who can create a link can
make `cedibites.com/r/xxxx` point at a phishing page **wearing our brand**. Non-CediBites targets are
flagged in the UI. The upside: a branded short domain has better SMS deliverability than `bit.ly`,
which carriers and spam filters treat with suspicion.

---

## Phase B — the campaign console

The phase that closes the Hubtel dashboard, and the one that gets demoed.

### Migrations

**`campaigns`**

| Column | Notes |
|---|---|
| `name`, `message` | |
| `segment` | Reuses the existing six, see below |
| `status` | draft / scheduled / sending / sent / failed / cancelled |
| `scheduled_for` | nullable |
| `short_link_id` | nullable |
| `recipient_count`, `sent_count`, `failed_count` | **Permanent aggregates** — see the trap below |
| `estimated_cost`, `actual_cost`, `segments_per_message` | |
| `created_by_user_id`, `approved_by_user_id` | |
| `started_at`, `completed_at` | |

**`sms_delivery_attempts`** — add `campaign_id`, nullable, indexed. Per-recipient detail, prunable.

### Reuse the segments, do not invent new ones

`CustomerController::exportContacts()` already resolves six behavioural segments — `all`, `active`
(≤30 days), `at_risk` (31–60), `churned` (60+), `loyal` (2+ orders), `one_time` — deduped by phone
and validated against the Ghana mobile format.

That logic moves into `AudienceResolver` and the controller delegates to it, **so the export and the
send cannot drift apart and start disagreeing about who is in "churned".**

### Files

| | File | Notes |
|---|---|---|
| new | `app/Models/Campaign.php` | |
| new | `app/Services/Campaigns/AudienceResolver.php` | Extracted from `CustomerController` |
| new | `app/Services/Campaigns/MessageMeter.php` | GSM-7 vs UCS-2, segment count, cost. Single source of truth. |
| new | `app/Services/Campaigns/CampaignSender.php` | Chunking, dispatch, aggregate roll-up |
| new | `app/Jobs/SendCampaignChunk.php` | One chunk → `sendBatch(..., isCampaign: true)` |
| new | `app/Http/Controllers/Api/CampaignController.php` | |
| new | `config/campaigns.php` | Chunk size, cap, seed list, send window, inter-batch delay |
| edit | `app/Enums/Permission.php` | `manage_campaigns` — admin + tech_admin |
| edit | `app/Services/HubtelSmsService.php` | Return `rate` + `units` so actual cost can be captured |
| edit | `app/Http/Controllers/Api/CustomerController.php` | Delegate to `AudienceResolver` |
| new | `app/admin/campaigns/page.tsx`, `[id]/page.tsx`, `_components/` | |
| new | `lib/sms/meter.ts` | Mirrors `MessageMeter` for the live counter |
| new | `lib/api/services/campaign.service.ts`, `hooks/useCampaigns.ts` | |
| new | `tests/Feature/Campaigns/CampaignSendTest.php`, `MessageMeterTest.php` | |

### Safety rails, all config-driven

- **Seed-list mode** — send to a fixed list of staff numbers regardless of the chosen segment. This
  is how every mechanism gets proven for a few cedis instead of four figures. **Use this for the
  demo; do not send to the real list to prove the plumbing works.**
- **Hard recipient cap**, raised deliberately. While the audience is 28,000+ and the UI is new, a
  mistyped segment must not be able to become a real blast.
- **Two-step send** — compose, then approve. The confirm step shows recipient count, character
  count, segment count and projected cost.
- **Send window** — 8am–7pm, not Sundays, enforced in code. Cheap now, and it leaves the compliance
  track less to retrofit.

### The trap in this phase

`sms_delivery_attempts` is **pruned by `sms:health-check`**. If campaign reporting read its numbers
from that table, campaign history would silently evaporate at the retention boundary — a report shown
to the board last month returning different figures this month.

So: aggregates are computed at send time and written to the `campaigns` row, which is **never
pruned**. Per-recipient rows stay prunable and are used only for the delivery-status poll, which runs
within hours of the send.

---

## Phase C — post-order feedback

```
order → completed (OrderObserver) → RequestOrderFeedback::dispatch()->delay(3h)
  → job checks guards → creates order_feedback row + token → sends SMS
  → customer taps cedibites.com/f/K3mQ9xR2 → form → submitted
  → visible under /admin/customer-feedback, filterable by branch
```

The token identifies the order, so the form already knows what they ate and from which branch. They
never type an order number.

### Migration

**`order_feedback`**

| Column | Notes |
|---|---|
| `order_id` | **unique** — one request per order |
| `token` | string(16), unique, 8 base62 characters |
| `rating_overall`, `rating_food`, `rating_service` | nullable |
| `comment` | text, nullable |
| `sent_at`, `submitted_at`, `expires_at` | |

### Files

| | File | Notes |
|---|---|---|
| new | `app/Models/OrderFeedback.php` | |
| new | `app/Jobs/RequestOrderFeedback.php` | Guards + send |
| new | `app/Notifications/OrderFeedbackRequestNotification.php` | |
| new | `app/Http/Controllers/Api/OrderFeedbackController.php` | Public show/submit + admin index |
| edit | `app/Observers/OrderObserver.php` | Dispatch on completed / delivered |
| edit | `routes/public.php` | `feedback/{token}` GET + POST, throttled |
| new | `config/order_feedback.php` | Delay, window, per-customer cap, expiry |
| new | `app/f/[token]/page.tsx` + `_components/FeedbackForm.tsx` | Mirrors `app/recruit/[token]/` |
| new | `app/admin/customer-feedback/page.tsx` | |
| new | `tests/Feature/OrderFeedbackTest.php` | |

### Guards, all config-driven

- Completed and delivered orders only — never cancelled, never `order_source === 'manual_entry'`
  (the `OrderObserver` already excludes manual entries from notifications; match that).
- One request per customer per day, even if they order three times.
- Outside 8am–7pm the send rolls to the next morning. The right gap after a 9pm dinner order is
  breakfast, not midnight.
- Links expire, so a forwarded message cannot seed feedback weeks later.

### Naming collision — settle before writing code

There would then be **three unrelated things called feedback**:

| Existing | What it is |
|---|---|
| `FeedbackReport` | The in-app beta bug reporter at `/admin/feedback`, behind `feedback.triage` |
| `MenuItemRating` | Per-dish stars |
| **new** `OrderFeedback` | This — the customer's verdict on one order |

This plan keeps them apart as `order_feedback` at `/admin/customer-feedback`. **If it should be
called Reviews, decide now** — renaming a table and a public URL after links are in customers'
phones is far more expensive than choosing the word today.

---

## What the demo shows

Every figure is measured, not estimated, once A and B are in. The difference between *"we sent
28,000 messages"* (a cost) and *"3,400 people opened the menu"* (a business case).

| Metric | Source |
|---|---|
| Recipients in this segment | `AudienceResolver`, live as you pick |
| Characters and billed segments | `MessageMeter`, live as you type |
| Projected cost | segments × recipients × configured rate |
| **Actual cost** | Hubtel's `rate` field, summed per campaign |
| Accepted vs delivered | `GET /messages/{id}` poll |
| Click-through rate | `link_clicks` ÷ recipients |
| Feedback response rate | `order_feedback` submitted ÷ sent |

---

## Open questions — all four settled 2026-08-07

1. **"Customer feedback" or "Reviews"?** → **Customer feedback.** Table `order_feedback`, model
   `OrderFeedback`, public link `cedibites.com/f/{token}`, admin page `/admin/customer-feedback`.
2. **Feedback questions.** → **Three ratings plus free text**, as the plan assumed. Overall is
   required; food and service are optional and only revealed once the overall score is tapped —
   three empty star rows is a form, one is a question.
3. **Who may send?** → `manage_campaigns`, admin and tech_admin. Built as planned.
4. **Shared or per-recipient campaign links?** → **Shared.** `batch/simple/send`, one link per
   campaign. Per-recipient attribution remains available later behind
   `batch/personalized/send` without a schema change.

## Out of scope, deliberately

Consent capture, opt-out enforcement, and the NCA rules beyond the send-window guard. Deferred by
the user 2026-08-06 so the technical proof can go ahead; a separate team picks this up afterwards.
The nullable opt-out column is added now because adding it later means migrating a live table
carrying campaign history and touching every send path a second time.

For the regulatory detail — the Unsolicited Electronic Communications Code of Conduct and Data
Protection Act 2012 (Act 843) — see the audit artifact, section *"The constraint that reshapes
everything"*.

---

# What shipped, and where it differs from this plan

Written 2026-08-07, after building phases A–C. The plan above is left as written; this section is
what is actually in the working tree.

## Three deliberate deviations

### 1. The feedback route in the plan would have broken the bug reporter

The plan puts `feedback/{token}` in `routes/public.php`. **`routes/feedback.php` already owns that
prefix** — `feedback/reports`, `feedback/my-reports` — and `public.php` is required *before* the
auth group in `api.php`. A `feedback/{token}` wildcard would have matched `feedback/reports` first
and swallowed the authenticated route, taking the in-app bug reporter down.

Shipped as **`order-feedback/{token}`**. The customer-facing URL is still `cedibites.com/f/{token}`
— the API path is invisible to customers, so it costs no characters.

### 2. `short_links.campaign_id` was dropped; `campaigns.short_link_id` is the only link

The plan has both columns, which is one relationship encoded twice and free to disagree. Worse,
adding the foreign key in phase B would have failed: **SQLite cannot add a foreign key to an existing
table**, and the whole test suite runs on SQLite.

`campaigns.short_link_id` is the meaningful direction. The inverse is a `hasOne`.

### 3. Config lives in dedicated files, not `config/services.php`

`config/short_links.php`, `config/campaigns.php`, `config/order_feedback.php` — matching
`config/feedback.php` and `config/inventory.php`. A shortener base URL is not a third-party
credential.

## Things worth knowing before touching this

**The resolve endpoint is throttled at `3000,1`, and that is not a typo.** The only caller is the
Next.js route handler at `app/r/[token]/route.ts`, so *every click in a campaign arrives from one
IP* — our own server's. A per-IP limit sized for a person throttles the entire blast. The handler
therefore also forwards the customer's user agent and referer in the request body; reading them off
the incoming request would record our own server 28,000 times.

**`é` is free; `’` is not.** GSM-7 carries é, à, ö, ñ, ü and others, so stripping accents to save
money saves nothing. What costs is a curly quote, an em dash or an emoji — any one of them re-encodes
the whole message and drops the limit from 160 to 70. The composer names the offending characters
and offers a one-click swap; it never rewrites the operator's copy silently.

**Seed mode ships ON (`CAMPAIGN_SEED_MODE=true`, empty seed list).** With no numbers configured, a
send fails with "nobody is in that segment" rather than reaching customers. Set
`CAMPAIGN_SEED_NUMBERS` before demoing, and turn seed mode off only deliberately.

**Phase C ships OFF (`ORDER_FEEDBACK_ENABLED=false`).** The form and the admin page work; no order
triggers an SMS. The kill switch is checked twice — at dispatch in `OrderObserver` and again inside
`RequestOrderFeedback`, because hours pass between the two.

**`/admin/customer-feedback` is gated on `manage_campaigns`, which is admin-only.** Not because it is
marketing, but because the controller does no branch scoping — opening it to a branch role would hand
one manager every other branch's complaints. Giving a manager their own branch's feedback is worth
doing and needs the `isCompanyWide()` treatment first.

## Deploy checklist

**Backend first, frontend second** (the frontend calls endpoints that must already exist).

1. `php artisan migrate` — five new migrations: `short_links`, `link_clicks`, `campaigns`,
   `sms_delivery_attempts.campaign_id`, `order_feedback`.
2. **`php artisan db:seed --class=RoleSeeder`** — `manage_campaigns` is a new permission. Without
   this, admin and tech_admin do not hold it and the whole console 403s. The seeder grants every
   non-platform permission to admin and everything to tech_admin, so no other change is needed.
3. Confirm **`HUBTEL_SMS_BASE_URL` is not overridden** on prod. It must resolve to
   `sms.hubtel.com`; `smsc.hubtel.com` 404s on both batch paths. Still outstanding from the audit.
4. Set `SHORT_LINK_BASE_URL=https://cedibites.com` if the default is not wanted.
5. Set `CAMPAIGN_SEED_NUMBERS` to the staff test numbers.
6. Verify `cedibites.com/r/{token}` reaches the app — the apex 301 was confirmed live 2026-08-06,
   but confirm it again against a real link before the demo.
7. `links:prune-clicks` is scheduled weekly. PM2 runs the scheduler; nothing to do beyond deploying.
8. Leave `ORDER_FEEDBACK_ENABLED` unset.

## Not built

- **Delivery-status polling.** `GET /messages/{id}` is documented in the plan and the `campaign_id`
  column exists for it, but nothing polls yet. Accepted-vs-delivered is therefore not on the demo.
- **Scheduled sends do not fire by themselves.** A campaign can be given a `scheduled_for` and shows
  as Scheduled, but no scheduler picks it up — sending is still the button. The send-window guard is
  built and enforced in `CampaignSender`, so adding the scheduler later is a `Schedule::command`
  and a query, not a rework.
- **Consent and opt-out.** Deferred by decision; see above.
