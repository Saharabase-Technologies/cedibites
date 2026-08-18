# Staff Messaging — plan of record

Branch: `feat/staff-messaging` (frontend, off `origin/main` @ `68d9667`; backend, off `master` @
`961e3bd`). **Deliberately not built on `feat/sms-campaigns`** — that branch carries the campaign
drift (frontend `main` has the campaign UI, backend `master` has no campaign code) and staff
messaging must not inherit it. Nothing here imports campaign code.

---

## 1. What this is

A way for the IT team and the business owner to reach staff **inside the app they already work in**,
and a rule engine that sends those messages on its own when something measurable goes wrong.

Two halves, useful separately:

- **Half A — messaging.** Compose, target, send, read receipts, replies. Hand-driven.
- **Half B — automation.** Rules that watch orders and shifts and send the same kind of message
  without anybody pressing send.

Half B is why the feature earns its keep, but Half A is not a stepping stone to it — direct
messaging to staff is wanted in its own right and will be used for things that have nothing to do
with order hygiene.

## 2. Decisions taken (2026-08-17, with the user — do not relitigate)

1. **Only `tech_admin` and `admin` may send.** Managers do not send, not yet. One new permission,
   `staff_messages.manage`, which both roles already receive automatically (tech_admin gets every
   permission; admin gets every non-platform permission).
2. **Receiving and replying need no permission** — any live staff token. Gating the inbox on a
   permission would mean touching all ten roles and would silently exclude whoever was missed.
   Same reasoning as `FeedbackTriage`, where submitting is unpermissioned and only triage is gated.
3. **A caution never interrupts work in progress.** It waits for the till to be idle — no order
   being built, no payment open, no modal up. See §6.
4. **SMS is a fallback, not a parallel send.** If a message is unread after its escalation window,
   and only then, it goes out as SMS. Never both at once.
5. **Staff can start a thread upward to the IT team.** Downward-only was rejected.
6. **Rules ship switched off** behind both a global kill switch and a per-rule `is_active`, and
   every rule must be dry-run before it is switched on.

## 3. Data model (backend)

### `staff_messages`
One send. A broadcast to 40 people is one row here and 40 in `staff_message_recipients`.

| column | note |
|---|---|
| `sender_user_id` | nullable — null means the rule engine sent it |
| `rule_id` | nullable FK, set when automation created it |
| `parent_id` | nullable self-FK — this is how a thread continues |
| `kind` | `notice` \| `caution` \| `direct` \| `staff_query` (the upward one) |
| `subject`, `body` | |
| `audience` | json — the rule as chosen, kept so "who was this sent to" survives staff changes |
| `requires_acknowledgement` | bool |
| `allow_custom_reply` | bool — the toggle asked for |
| `quick_replies` | json array of strings |
| `sms_fallback_after_minutes` | nullable; null = never escalate |
| `expires_at`, `sent_at`, `recipient_count` | draft until `sent_at` |

### `staff_message_recipients`
Per-person state. **This table is the deterrent** — it is what makes "seen by 12 of 40" real.

`delivered_at`, `read_at`, `acknowledged_at`, `quick_reply`, `reply_body`, `replied_at`,
`sms_sent_at`, `sms_status`. Unique on `(staff_message_id, user_id)`.

### `staff_message_rules` / `staff_message_rule_fires`
The automation half. Rule holds event + conditions json + target + template + guardrails +
`is_active`. Fires record **every** evaluation including suppressed ones, with a reason — a rule
that matched 300 orders and sent 4 is working correctly and that is invisible otherwise.

## 4. Audience targeting

Staff audiences are **roles × branches × employment status**. Deliberately *not* built on
`AudienceResolver` from the campaign work — that profiles customers from order history and shares
nothing with this but the word "audience".

- `roles[]` — rider, sales_staff, manager, kitchen, call_center, …
- `branch_ids[]` — via the `employee_branch` pivot
- `user_ids[]` — named individuals
- `include_company_wide` — head office, warehouse, call centre hold **no branch assignment**. A
  pure pivot query refuses them every branch instead of allowing them all of them. This is the
  `User::isCompanyWide()` trap that already bit branch scoping; it is handled explicitly here.
- Suspended employees are excluded always, and this is not configurable.

## 5. Delivery chain

1. **Realtime** — `StaffMessageEvent` on private channel `staff-messages.{userId}`. Instant if the
   tab is open.
2. **Web Push** — the existing VAPID/`sw.js`/`updatePushSubscription` stack. Reaches a phone with
   the app closed.
3. **SMS fallback** — a delayed job that **re-reads `read_at` before sending**. Nobody gets an SMS
   about a message they already read. Uses `HubtelSmsService::sendSingle`, which wants `233…` with
   no plus.

## 6. The interruption gate — the part that needs care

A caution that blocks a cashier mid-sale is worse than the problem it reports. So:

A small `InterruptionGate` provider holds a set of "busy" claims. POS registers busy while a cart
has lines or a payment sheet is open; the new-order wizard registers busy while it is on screen;
any open modal counts. The caution interstitial renders **only when the set is empty**, and on
route change it re-checks rather than assuming.

Notices never interrupt at all — they sit in the bell.

## 7. Automation conditions shipped

Each is computable from data already recorded. `order_status_history` stamps `changed_at` and
`changed_by_id` per transition, which is what makes the timing rules possible at all.

| Event | Measures | Default target |
|---|---|---|
| `order_stalled` | order sat in a given status past N minutes | the actor who put it there |
| `suspicious_customer_phone` | contact phone fails Ghana format, or is junk (one repeated digit, sequential run) | order creator |
| `repeated_customer_phone` | same phone on ≥ N orders in a day at one branch | creator + branch manager |
| `staff_cancellation_spike` | one person cancels ≥ N orders in a rolling window | branch manager + admins |
| `no_charge_spike` | ≥ N `no_charge` orders in a window | branch manager + admins |
| `shift_left_open` | shift open past N hours | the staff member + manager |

`order_stalled` is parameterised by status, so "received not moved in 15 min", "ready not collected
in 20", and "out for delivery over an hour" are three rules of one type, not three code paths.

Targets are composable: `actor`, `branch_managers`, `branch_staff`, `roles[]`, `admins`.

## 8. Guardrails

- **Global kill switch** `STAFF_MESSAGING_AUTOMATION_ENABLED`, default off, *plus* per-rule
  `is_active`, default off. Turning the feature on must not turn on every draft.
- **Per-subject cooldown** — one nag per order per rule. Without it a stalled order generates a
  message every five minutes forever.
- **Per-recipient ceiling** — a hard cap of messages per person per hour, across all rules. Three
  rules each politely correct on its own still produce a pile-on.
- **Suppressed fires are recorded** with a reason: `cooldown`, `recipient_capped`, `rule_inactive`,
  `feature_off`, `no_recipients`, `already_resolved`.
- **Re-check at send time**, not just at match time. An order stalled at match may have moved by the
  time the job runs; messaging someone about an order they already handled destroys the credibility
  of every future message.
- **Dry run** — `messages:dry-run {rule} --days=N` replays history, writes and sends nothing,
  reports matched vs would-send and the busiest recipient.

## 9. Out of scope for this pass

- Managers sending (decided: not yet)
- Attachments / images on messages
- Per-branch message branding
- Scheduled/queued sends for a future time

## 10. Also fixed here

`contact_phone` accepts any string up to 20 characters on all three order-creation paths
(`StoreOrderRequest`, `StorePosOrderRequest`, `StoreOrderFromCartRequest`) while `momo_number` in
the same POS request already carries a Ghana regex. That hole is why fake numbers exist at all, and
no message fixes it. Validation is added at the boundary; the `suspicious_customer_phone` rule then
catches what is well-formed but still fake.
