# Automation Triggers — plan of record

**Status: not built.** Written 2026-08-08. Nothing in this document exists in code yet.

Automated messages that fire when something happens to an order, instead of when somebody presses
send. The first use is asking for feedback; the engine is deliberately not built as a feedback
feature, because the same machinery does win-backs, thank-yous and service recovery.

Read [`SMS_CAMPAIGNS_PLAN.md`](./SMS_CAMPAIGNS_PLAN.md) first — this reuses its audience rules, its
message meter, its shortener and its send rails.

---

## 1. The shape

> **Event** (when) → **Conditions** (only if) → **Message** → **Guardrails** (but never…)

A campaign is a list you push to. A trigger is a rule that waits. Everything else is the same:
the same audience language, the same cost arithmetic, the same short links.

### The one-sentence test

Every trigger should read as a sentence an operator would say out loud:

> *"When somebody orders for the first time, and it was delivery, ask them how it went — three hours
> later, but never more than once a fortnight."*

If a trigger cannot be read back as that sentence, the UI is wrong.

---

## 2. Data model

### `automation_rules`

| column | why |
|---|---|
| `name` | Operator's words. Shown everywhere. |
| `event` | One of the events in §3. The "when". |
| `conditions` (JSON) | `AudienceRules` plus event-specific extras. The "only if". |
| `message` | Text, with merge fields (§5). |
| `short_link_id` | Optional, nullable. Same as campaigns. |
| `delay_minutes` | How long after the event. Per-rule, because 3h is a guess (§7). |
| `is_active` | Off by default. Nothing fires until somebody turns it on. |
| `priority` | Lower wins when several rules match. See §4. |
| `cooldown_days` | Per-person, across **all** rules. See §4. |
| `max_per_customer` | Lifetime cap. Nullable = no cap. |
| `sample_rate` | 1–100. Ask a fraction, not everybody. See §6. |
| `created_by_user_id` | |

### `automation_fires`

Append-only. One row per person per firing: `automation_rule_id`, `order_id`, `customer_phone`,
`fired_at`, `sent_at`, `suppressed_reason` (nullable), `order_feedback_id` (nullable).

**Why a log rather than a counter:** the cooldown, the lifetime cap and the response rate are all
questions about history. A counter answers none of them, and cannot answer "why did this person not
get it?" — which is the question actually asked when a trigger looks broken.

**Suppressed firings are recorded too.** A rule that matches 400 orders and sends 12 because of the
cooldown is working correctly, and that is invisible unless the 388 are written down.

---

## 3. Events

Ordered roughly by expected value.

### Built on the first pass

| Event | Notes |
|---|---|
| **First ever order** | Their #1. The highest-response ask there is. |
| **First order at a branch** | New to that branch, even if not to us. |
| **First delivery** | First time using a fulfilment type they have not used before. |
| **Ordered something new** | An option they have never bought. **Option-level, not dish-level** — "Jollof Regular → Jollof Large" is a different signal from "Jollof → Waakye", and only the option can tell them apart. |
| **Nth order** | 3rd, 10th, 25th. Configurable. |
| **Returned after a gap** | First order after N quiet days. A win-back that worked — worth acknowledging. |
| **Order over GHS X** | The big-spend acknowledgement. |

### Later

Order ran late (needs a prep-time threshold from `OrderStatusHistory`), order cancelled, after a
refund, post-complaint follow-up, first-order anniversary.

### Not customer-facing, same engine

Wastage spike on a dish; a branch's prep time over a threshold. These notify staff, not customers.
Worth remembering the engine generalises, but **not** worth building until the customer side is
proven.

---

## 4. Guardrails

**This is the most important section in the document.** Automated messaging fails on volume, not on
logic, and every one of these is a rule about what must *not* happen.

- **One global cooldown.** Never message the same person twice within `cooldown_days`, counted
  across *all* rules, not per rule. Per-rule cooldowns are the trap: three rules each politely
  waiting a fortnight still produce three texts in one afternoon.
- **One trigger wins.** A first delivery, of a new dish, at a new branch is three matches on one
  order. Evaluate in `priority` order, fire the first, record the rest as suppressed.
- **Lifetime cap** per customer per rule.
- **Send window and seed mode** — reuse `CampaignSender`'s rails exactly. An automated send is still
  a send.
- **Re-check every guard inside the job, not at dispatch.** Hours pass between the event and the
  message. By then the order may be cancelled, the customer may have ordered again, the rule may be
  switched off, or the kill switch may be down. `RequestOrderFeedback` already does this — follow it.
- **Never ask somebody who just answered.**
- **Suppression list** — opted out, complained, staff, test numbers.

### Kill switch

One global `AUTOMATION_ENABLED`, **off**, plus `is_active` per rule, **off**. Two switches because
they answer different questions: "is this feature live?" and "is this rule live?".

---

## 5. Message templating

Merge fields: `{name}`, `{dish}`, `{branch}`, `{order_number}`.

- **Every merge field changes the length**, and length is money. The composer must meter the message
  with the *longest* plausible substitution, not with the placeholder — otherwise a message that
  costs one text in preview costs two for everybody called Akosua Owusu-Ansah.
- Missing values need a fallback that reads naturally. `{name}` on a guest order with no name must
  not produce "Hi ,".
- `é` is free, `’` is not. Same GSM-7 rules as campaigns — reuse `MessageMeter`.

---

## 6. Before it can go live

### Dry run — non-negotiable

Run any rule against the **last 30 days of real history** and show what it *would* have done:

> *Fired 412 times. Would have sent 47 after the cooldown. GHS 1.14. Here are the 47.*

Sends nothing. This is how you find the rule that fires on every order **before** it fires on every
order.

### Sampling

`sample_rate` — ask a random 20%. At a busy branch you do not need everyone's opinion, and a fifth
of the cost is also a fifth of the annoyance. Sampling must be **stable per person**, not random per
evaluation, or the same customer gets picked and skipped at random and the cooldown does nothing.

### Projected monthly cost, per rule

From how often the event actually fired in the last 30 days. A rule with no cost figure beside it is
a rule nobody can approve.

---

## 7. Measurement

- **Response rate per rule.** The only way to learn which asks work. Expect first-order asks to do
  well and 10th-order asks to do almost nothing — and expect to delete the second kind.
- **The full funnel: asked → tapped → completed.** The feedback link is already a short link with
  click tracking, so this is nearly free. If lots tap and few finish, the *form* is the problem, not
  the timing.
- **Timing is a guess and should be tested.** 3 hours is not a finding. Make `delay_minutes`
  per-rule and try 1h, 3h and next-morning.
- **Ratings should reach the menu.** Per-dish scores by branch turn "jollof is rated 3.1" into
  "jollof is rated 3.1 at Ashaiman and 4.6 at Mother Kitchen" — a kitchen problem, not a recipe
  problem, and invisible from an overall score.

---

## 8. Service recovery — the highest-value piece

**A 1–2 star rating should reach a human immediately.** Alert the branch manager; optionally offer a
promo.

Closing the loop on one angry customer is worth more than collecting a hundred happy ratings, and
this is the part most feedback systems never build. It should not wait for phase two.

---

## 9. Build order

1. `automation_rules` + `automation_fires`, model, kill switch. Nothing fires.
2. Evaluation from the order lifecycle (`OrderObserver` is the proven seam) + the guardrails. Log
   firings, send nothing.
3. **Dry run** and the projected-cost figure.
4. Sending, behind both switches, seed-list first.
5. Admin UI: rule list, the one-sentence builder, dry-run screen, per-rule response rate.
6. Negative-rating routing (§8).

Steps 1–3 are safe to build and ship dark: they touch no customer.

---

## 10. Constraints — read before designing anything

- **The `CediBites` sender ID cannot receive replies.** Confirmed from a handset. Recipients see
  *"Sender can't accept replies."* So **"reply 1–5" is impossible** — every feedback path must be a
  link. Do not design around replies without a number plan from Hubtel.
- **`ORDER_FEEDBACK_ENABLED` is off**, and the existing post-order feedback fires on *every*
  completed order. That blunt rule is what this replaces; it must be turned off, not left running
  alongside, or customers get two asks.
- **Prod backend has no campaign code** while prod frontend has the campaign UI. None of this can
  reach a real customer until that is resolved.
- **The 2,000 recipient cap** does not apply to triggers — they fire one at a time — so the cap is
  not the brake here. The cooldown is. Size it before switching anything on.

---

## 11. Decisions taken 2026-08-08 — do not relitigate

1. **Cooldown: 3 days**, global across all rules. `AUTOMATION_COOLDOWN_DAYS`, changeable without a
   deploy.

   *Worth knowing what this buys:* a customer who orders twice a week can receive up to about ten
   automated texts a month. The money is nothing — ten texts is GHS 0.24 — so the thing to watch is
   patience, not cost. The dry run (§6) reports the busiest recipient in the sample precisely so this
   is visible before anything is switched on, and the number can be raised at any time.

2. **Sampling off to start**, `sample_rate` defaults to 100. The toggle is built and sits on the rule,
   so it can be turned down for a busy branch without a deploy.

3. **Bad ratings go to a central inbox** the admins see — not a per-branch alert. Simpler, cheaper,
   and it means nothing depends on a manager having their phone to hand. Branch routing stays
   possible later; the inbox is the thing that closes the loop.

4. **Sender stays `CediBites`.** No branch branding. `{branch}` remains available inside the message
   body, but who the text is *from* does not change.

5. **Trigger sends count toward SMS health** — `is_campaign = false`, like any transactional message.
   The consequence, accepted: a badly written rule that fails repeatedly will drag the health verdict
   and look like an outage. That is the trade for noticing when automated messages stop arriving,
   which is otherwise invisible because nobody is watching for a text they did not send by hand.
