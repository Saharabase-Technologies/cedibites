# Recruitment form — build plan

Written 2026-08-01, **built the same day**. Spans both repos. **Backend first, frontend second** —
the public submit endpoint has to exist before the page that posts to it.

> **Status: built, not deployed.** 51 tests in `tests/Feature/Recruitment/RecruitmentTest.php`
> pass; the full backend suite sits at its documented baseline (683 passed / 6 pre-existing
> failures). Frontend typechecks, lints and builds.
>
> **One thing in this plan turned out wrong and was corrected during the build — see
> "Who may recruit" below.** Managers do not hold `manage_employees`, so they cannot recruit at
> all. Everything else was built as written.

## What it is

**This is not a job application.** The hiring decision is made before anyone is sent a link — these
are people who have already been taken on, and the form is how their details reach the system. That
was settled 2026-08-01 and it governs every word on screen: nothing may read like a competition, and
nothing may suggest the outcome is in doubt.

The words, fixed:

| Facing | Word | Not |
|---|---|---|
| The new staff member | **Joining** Lakeside · *Send my details* | Applying, submitting an application |
| The admin | **Onboarding** · *Create their account* · *Discard* | Recruitment, approve, reject |
| Status | **Waiting / Added / Discarded** | Pending / Approved / Rejected |

*Onboarding* is right on the admin side — that genuinely is what they are doing — and wrong facing
the new starter, where it would presume an account that does not exist yet. *Enrolling* is not the
English for a job (you enrol in a course), and *applying* is false here.

**Discarding is not a rejection.** It is for a duplicate, a mistyped number, or somebody who did not
end up starting. The UI says so, because a button called "Reject" invites the wrong use.

**Internal names still say `Recruitment*` / `*Application`** — the tables, models, routes and enum
cases. Renaming them would mean a migration on a table that is already on prod, for something nobody
using the system can see. The user-facing strings are the contract; the class names are not.

A public form the new starter fills in once. It collects everything the staff editor collects, plus a
password they choose themselves. Nothing is created on submit — the submission sits waiting. An
admin checks it, picks a role, and creates the account.

The link carries the posting. Two kinds:

| Link kind | Stamps | Roles the approval screen offers |
|---|---|---|
| **Branch** | one `branch_id` | `manager`, `sales_staff`, `kitchen`, `rider`, `branch_partner` |
| **Call centre** | nothing | `call_center` only |

The split is the whole design. `call_center` is `BranchRule::None`, and a call-centre agent carrying
a branch row is worse than broken — `employee_branch` cannot tell *"not confined to a branch"* from
*"assigned no branches"*, so they log in to an empty order list and nothing on screen looks wrong.
Keeping the link kinds apart means the branch is genuinely absent rather than ignored. See
`Role::branchRule()` and `User::isCompanyWide()`.

Decided with the user, do not relitigate: recruit never picks their own role; no document uploads;
no phone verification (a caution line on the form instead); no manual kill switch; no headcount cap;
rejection is silent. Links expire on a date set at creation — that is the only thing that closes
them.

---

## Backend

### Migrations

**`recruitment_links`**

| Column | Notes |
|---|---|
| `id` | |
| `token` | `string(64)`, unique, indexed. `Str::random(48)`. **Not sequential.** Order numbers are guessable and that is already a known exposure (see the comment above guest order tracking in `routes/public.php`); do not repeat it here. |
| `kind` | `enum('branch','call_center')` |
| `branch_id` | nullable FK, **required when `kind = branch`, null when `call_center`** — enforce with a DB check constraint as well as in the request |
| `created_by_user_id` | FK `users` |
| `expires_at` | not null |
| `label` | nullable string — "Lakeside Nov intake", so a list of links is readable |
| timestamps | |

**`recruitment_applications`**

| Column | Notes |
|---|---|
| `id` | |
| `recruitment_link_id` | FK |
| `name`, `phone`, `email` | `phone` stored **normalised** via `User::normalizePhone` and indexed |
| `password_hash` | `Hash::make` at submit. Plaintext is never stored — see the password note below |
| HR fields | `ssnit_number`, `ghana_card_id`, `tin_number`, `date_of_birth`, `nationality` — mirror `CreateEmployeeRequest` exactly |
| Emergency contact | `emergency_contact_name`, `_phone`, `_relationship` |
| `status` | `enum('pending','approved','rejected')`, default `pending`, indexed |
| `reviewed_by_user_id`, `reviewed_at` | nullable |
| `created_user_id` | nullable FK — set on approve, the audit trail from application to account |
| timestamps | |

Add `App\Enums\RecruitmentLinkKind` and `App\Enums\ApplicationStatus` rather than raw strings, to
match how `Role` / `BranchRule` / `EmployeeStatus` are done.

### The refactor that has to happen first

`EmployeeController::store` (`app/Http/Controllers/Api/EmployeeController.php:95-211`) holds the only
correct account-provisioning path in the codebase: existing-user reuse by phone, `syncRoles` (not
`assignRole`), `syncPermissions([])`, the locked `employee_no` derivation, `branches()->sync()`, and
`notifyQuietly` **outside** the commit.

**Extract it to `App\Domain\Staff\EmployeeProvisioningService::provision(...)` and have both
`store` and the approval endpoint call it.** Copying it is not acceptable — every one of those
details is a bug that was already paid for once, and a second copy will drift.

Two behaviours the approval path needs that `store` does not have:

1. **Password already chosen.** The applicant set it; we hold only the hash. So `provision()` takes
   either a `password_mode` (existing callers) or a pre-hashed password (approval).
   On the approval path: `recoverable_password = null`, `must_reset_password = false`. The admin has
   no business seeing a password the applicant picked, and the reversible vault exists for
   admin-generated passwords only.
2. **A different notification.** `StaffAccountCreatedNotification` sends the password. Approval must
   send a new `StaffApplicationApprovedNotification` — *"your account is ready, sign in with the
   password you chose"* — carrying no password. SMS is live again, so this will actually arrive.

### Endpoints

**Public** — `routes/public.php`, unauthenticated, throttled.

```
GET  recruit/{token}          throttle:20,1   → link validity, posting name, expiry
POST recruit/{token}          throttle:5,1    → submit application
```

`GET` returns `{ valid, kind, branch_name|null, label, expires_at }` and a flat 404 for a bad or
expired token. **Do not leak why** — the same 404 for "never existed" and "expired" — otherwise the
endpoint enumerates valid tokens.

`POST` validation mirrors `CreateEmployeeRequest` minus `role`, `branch_ids`, `status`,
`password_mode`, and with `password` **required, min 8, confirmed**. Add `phone_confirmation` (type
it twice) since there is no OTP. Normalise the phone in `prepareForValidation` **before** the
uniqueness check, exactly as `CreateEmployeeRequest:36` does — `024…` and `+233…` are the same phone
to everyone except a string comparison.

Reject at submit if the phone already belongs to a **staff** user (reuse the closure at
`CreateEmployeeRequest:54-59`) or to a pending application on the same link. A phone belonging to a
plain **customer** is fine and expected — that is the reuse path.

**Admin** — `routes/admin.php`, under the existing `permission:manage_employees` group.

```
GET    recruitment-links
POST   recruitment-links                        { kind, branch_id?, expires_at, label? }
GET    recruitment-applications                 ?status=&branch_id=
GET    recruitment-applications/{application}
POST   recruitment-applications/{a}/approve     { role }
POST   recruitment-applications/{a}/reject
```

### Approval rules — the part that must not be got wrong

```php
// role must be assignable at all
Rule::in(Role::assignableByAdmin())          // excludes tech_admin

// and must match the link kind
$link->kind === Branch
    ? $role->branchRule()->requiresBranch()   // true for the five branch roles
    : $role === Role::CallCenter;             // BranchRule::None
```

Then:

- **Branch comes from the link, never from the request body.** The approve payload carries `role`
  and nothing else. There is no branch field to tamper with.
- `branch_ids = $link->branch_id ? [$link->branch_id] : []`. For `rider` / `branch_partner`
  (`OneOrMore`) that is a valid starting set of one; more branches are added later in the staff
  editor.
- **Re-run the duplicate-phone check at approve.** Time passes between submit and review; the
  person may have been hired by hand in the meantime. Approving then would collide.
- Wrap approve in a transaction and guard against double-approval — `status = pending` in the
  `where`, or a `lockForUpdate`.

Reject sets `status`, `reviewed_by_user_id`, `reviewed_at`. **Sends nothing.**

### Who may recruit — corrected during the build

**The plan said managers hold `manage_employees` for their own branch. They do not.** The role
rules overhaul took it off them deliberately — *"no hiring, no role changes, no suspending access"*
(`RoleSeeder`); they got `employee.notes.manage` instead. Six tests written to the plan's assumption
failed with 403, which is how this surfaced.

Approving an application **is** hiring — the account exists from that moment. So recruitment sits
behind `manage_employees`, the same gate as the staff editor, and the manager is deliberately
outside it. Letting him approve would reopen the ceiling by another door: a branch posting can
appoint `manager`, so he could promote his own replacement, or himself next time.

**Recruitment is an admin function.** No new permission was invented to give managers a slice of it.

The controller still scopes every query by branch, and `isCompanyWide()` is asked first — an admin
belongs to no branch, and read as *"assigned no branches"* they would see nothing at all. Nothing
branch-confined can reach these routes today, so that scoping is insurance rather than live
behaviour: the day anyone grants `manage_employees` to a branch role, it is the difference between
seeing one branch's applicants and reading every HR record in the company. Five tests exercise it by
granting the permission directly, so it cannot rot unnoticed.

---

## Frontend

### Public page — `app/recruit/[token]/page.tsx`

Sits at the app root, **outside** `(staff-auth)`, `admin` and `staff`. No auth provider, no staff
chrome, no session. Server-fetch the token on load; invalid or expired renders a plain "This link is
no longer open" page.

One form, sectioned: Your details · Emergency contact · HR information · Choose a password. The
phone field carries the caution line agreed with the user:

> Use a number you can actually answer. This is how we reach you about the job, and how you reset
> your password.

Heading shows the posting — "Sales Staff — Lakeside" or "Call Centre" — so the recruit can see they
opened the right link. On submit: "Thanks. We'll be in touch." No account status, no timeline, no
way to check back. Nothing exists yet and the page must not imply otherwise.

### Admin — `app/admin/staff/recruitment/`

New tab in `app/admin/staff/StaffTabNav.tsx`, two panes. Built as `page.tsx` (react-query, not a
`useEffect` + `setState` load — eslint's `react-hooks/set-state-in-effect` rejects the latter),
`LinksPane.tsx`, `ApplicationsPane.tsx`, `CreateLinkDialog.tsx`.

**Links.** Create (kind, branch, expiry, label), then a list with a copy button, the full URL on
screen, applications-received count and days-until-expiry. Expired rows greyed, not hidden — you
still want to see what you sent out. No close button; the date is the control.

*Not built: the QR code.* Copy-to-clipboard covers WhatsApp, which is how these actually travel. A
QR needs a dependency and only earns its place if links get printed — say so and it is a small
addition.

**Applications.** Default filter `pending`, with a "show decided" toggle for history. Row opens a
read-only detail panel with every submitted field. Two actions: **Approve** (role picker, offering
only what the link kind allows) and **Reject** (click twice to confirm, then silent).

### Types

`types/staff.ts` already mirrors the backend as `ROLE_RULES`. `types/recruitment.ts` adds
`rolesForKind()` derived from it — branch roles vs. call centre — so the picker is filtered from one
source and cannot drift from `Role::branchRule()`. The UI prefers the `assignable_roles` each
response carries and falls back to this only if an older payload lacks them.

---

## Watch-outs

1. **The `isCompanyWide()` trap.** A call-centre approval must write zero rows to `employee_branch`.
   This has broken the call centre once already.
2. **Name overwrite on reuse.** `EmployeeController:126` sets `name` on an existing user. Fine here —
   the applicant typed their own name — but it is the line the identity-separation work deliberately
   killed on the *customer* registration path. Do not "fix" it into the provisioning service without
   checking `project_identity_separation` first.
3. **Token in a URL is a bearer credential.** Anyone the link is forwarded to can apply. Acceptable —
   applications are inert — but it is why the expiry matters and why the default should be short
   (30 days).
4. **Throttle the public POST.** Without a cap or a kill switch it is the only thing between you and
   a flooded pending list.
5. **Test trap:** `Notification::fake()` is required or the approval test makes a real Hubtel call.
   And the auth guard caches the resolved user for a whole test — two identities in one test
   silently authenticate as the first.

### Found while building

6. **The open-application unique index has to be partial.** A plain unique on
   `(link, phone, status)` also forbids a *second rejected* row, so anyone rejected once could never
   apply to that posting again — and it would surface as a 500 on the form, not as a rule anyone
   could see. It is `CREATE UNIQUE INDEX … WHERE status = 'pending'`; Postgres and SQLite both take
   it, MySQL would not, and this app does not run on MySQL.

7. **The closed-link check lives in `authorize()`, not the controller.** A form request validates
   before the action runs, so a shut link posted with a typo in the phone answered 422 about the
   phone and said nothing about the link. `failedAuthorization()` throws the 404 instead — the same
   404 as a token that never existed, so the endpoint cannot be used to test whether a token is real.

8. **The approval claim sits outside the provisioning transaction, so it does not roll back with
   it.** If provisioning throws, the application is put back to `pending` explicitly. Without that, a
   failed hire leaves a row marked approved that no account exists for and no reviewer can touch
   again.

9. **`custom` password mode nearly stopped notifying.** The first cut of `PasswordPlan` gave the
   notification closure the *disclosable* password, which is null for `custom` — so an admin who
   typed a password would have created an account that told nobody. `plain` and `disclosable` are
   now separate fields for exactly this reason.

## Build order — as executed

1. ✅ Migrations + enums + models (`RecruitmentLinkKind`, `RecruitmentApplicationStatus`).
2. ✅ Extracted `EmployeeProvisioningService` + `PasswordPlan` + `ProvisionedEmployee`, repointed
   `EmployeeController::store`, existing staff tests green (51) before anything else started.
3. ✅ Public `GET`/`POST` + `SubmitRecruitmentApplicationRequest`.
4. ✅ Admin links + applications endpoints, approve/reject, branch scoping.
5. ✅ `StaffApplicationApprovedNotification` + `emails/staff/application-approved.blade.php`.
6. ✅ 51 tests in `tests/Feature/Recruitment/RecruitmentTest.php`.
7. ✅ Frontend public page (`app/recruit/[token]/`).
8. ✅ Frontend admin tab (`app/admin/staff/recruitment/`).

## Before deploying

- Run the two migrations. Nothing else needs a command — no seeder, no backfill.
- Backend deploys first: the frontend calls endpoints that must already exist.
- `NEXT_PUBLIC_API_URL` already covers the public routes; they sit under the same `/v1` prefix.
