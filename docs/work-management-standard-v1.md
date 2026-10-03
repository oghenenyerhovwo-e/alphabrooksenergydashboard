# Alpha Brooks Work Management Standard v1

Status: DRAFT for Yaroh's review. Supersedes how the current operating engine started. Where this document and the existing code disagree, this document wins.

---

## 1. Principles

1. **One model for all work.** Procedures are often unclear until work starts, so every task uses the same model. Subtasks, follow-ups and targets are optional layers, never required up front.
2. **Targets are the main thing; tasks are the effort.** Targets are monthly and outcome-based. Tasks are what people do to reach them. A target can be met without logged tasks, and tasks can be completed without the target being met.
3. **Code calculates, AI explains.** All arithmetic (targets, pace, rewards, allocations) is done in server code. ARIA/AI may explain results but never computes them.
4. **Everything that affects a number is audited.** Who, when, what changed, old value, new value.
5. **Manual first, automation later.** Where automation is not safe yet, a human enters the data, and the design leaves room to automate.
6. **Light touch for non-technical users.** The boss and non-Microsoft staff must be able to use the parts they need with minimal screens.

---

## 2. People and access

- **Staff** may or may not have Microsoft accounts. Drivers and one other staff member do not. The `User` model must allow staff without an `entraId` (make it optional; add another sign-in method or a no-login "staff record" for people who don't sign in).
- **Boss**: a registered user with no volume target. She sets the targets (by instruction), and approves month-end allocation (see 6.6).
- **Everyone else, including Yaroh, has a monthly volume target.** The margin is the same for everyone.
- **Driver**: one driver for now. Build for one; do not hard-code it so a second driver is impossible.
- **Yaroh (business technology)** enters targets and allocates sales. Because Yaroh also has a target, month approval by the boss is required (see 6.6).

---

## 3. Work tasks

### 3.1 Task fields

- ID, title, **category** (e.g. Vendor registration, Social media, Business development), owner, created date
- Overall deadline
- Status (see 3.2)
- Optional: linked target (see 5.4), related customer/supplier, description, evidence/attachments
- Subtasks (0..n), each with: title, deadline, status, optional **waiting on** (named party) and follow-up date
- History log (all changes, handovers, follow-ups)

### 3.2 Task statuses

`NOT_STARTED → ONGOING → SUBMITTED → AWAITING_RESPONSE (follow-up) → CLOSED`

- Moving to ONGOING happens when work begins. Subtasks can be added at any time.
- **Submit trigger:** when all subtasks are done and the owner submits, the system must ask: *"Is this finished for good, or does it need follow-up?"*
  - Finished → CLOSED with an outcome.
  - Needs follow-up → AWAITING_RESPONSE with a **required follow-up date**.
- On or after the follow-up date the task appears in the daily list. The owner then chooses: another follow-up date, back to ONGOING (new subtasks), or CLOSED.
- Every follow-up cycle is logged ("chased 3 times, last on Thursday").

### 3.3 Outcomes (only on CLOSED)

`SUCCESSFUL`, `FAILED` (reason required), `CANCELLED` (no longer needed), `OTHER` (free-text reason required, saved by the system).

Status and outcome are separate fields. Never use "Failed" as a status.

### 3.4 Ownership and handover

- Owner is a field with history.
- Transfer creates a handover note (what is done, what is pending, contacts, promises, where documents are). The new owner must acknowledge; until then the task shows "handover pending".
- Previous owner remains visible as "previously handled by".

### 3.5 Daily view ("My day")

Each person sees: tasks due today, overdue tasks, follow-ups due today, ongoing work, and any reminders from section 5.6. Managers can view the same for others.

### 3.6 Recurring weekly expectations

Categories can have weekly expectations (e.g. vendor registrations, social posts, platform registrations). These are shown as progress ("2 of 3 this week"), are only activity measures, and never replace the monthly outcome target.

---

## 4. Seplat/DeltaAfrik reference case

Seplat registration: someone else started it; ownership transferred to Yaroh. Chain: Seplat requirements → bank reference letter (waiting on bank) → Dun & Bradstreet registration (waiting on D&B) → submit to Seplat → wait and follow up → Seplat may require more → approved or failed. DeltaAfrik follows the same pattern. The model in section 3 must represent this naturally: emergent subtasks, named waiting parties, submit prompt, repeated follow-ups, external confirmation to close, success/failure outcome.

---

## 5. Targets

### 5.1 Definition

- A target is **monthly**, per person, per product (AGO first; CNG and LPG exist in the schema).
- `targetGeneratedValue = targetVolume × targetMarginPerUnit` (already in `OutcomeTarget`; keep it server-derived, never directly editable).
- Example: 80,000 L × ₦80 = ₦6,400,000.
- Volume is individual and dynamic; margin per unit is the same for everyone. Both are set at the end of the previous month.

### 5.2 Who sets targets

The boss decides; Yaroh enters. Each target records "set by instruction of [boss]" with the date.

### 5.3 Achievement

A person's achievement for a month = the sum over their allocations of `allocatedLitres × marginPerLitre` (see section 6). It is a **derived** value from the ledger, not a typed total. The existing `OutcomeAchievement` monthly totals become a computed summary of the ledger.

### 5.4 Task-target link

A task may optionally link to a target. Tasks without a target are valid. Where linked, the dashboard can show how much linked activity happened for a target.

### 5.5 Activity measures

Optional activity measures can sit alongside the outcome target (registrations completed, enquiries received, quotes sent). They are leading indicators and do not replace the outcome.

### 5.6 Pace and suggestions

- The dashboard home page shows progress toward the month's target as a percentage, with how much of the month has passed.
- **Suggestions** begin at the start of the month and are light reminders only (for example: make contacts, do tasks that help the target). They are labelled **early signals / suggestions**, never warnings or diagnoses.
- Do not tell people to "review your tasks". Do not infer causes. Sales are lumpy (one large order can land late in the month), so pace is informational.

---

## 6. Sales ledger and allocation

### 6.1 When a sale counts

A sale counts when **the money arrives** (payment received), not at order, delivery or invoice.

### 6.2 Source: Zoho Books

- Zoho Books is the source of payment truth. Pull customer payments and the invoices they are applied to.
- A mapping table (Zoho item → product) identifies AGO. Only AGO line items count toward AGO targets.
- For a payment applied to an invoice, credit only the AGO line items. If an invoice mixes AGO and other items, or a payment is partial, credit proportionally by amount.
- Each payment creates a **Pending allocation** entry and a dashboard notification to Yaroh.
- Item hygiene is a business dependency: the accountant must use the correct Zoho item for AGO consistently.

### 6.3 Allocation

- Yaroh allocates the litres of each pending sale to people with shares that **must total 100%** (two or more people can share one sale in an agreed ratio).
- A sale does not count toward anyone's achievement until it is allocated.
- Each allocation stores: sale/payment reference, invoice number, person, litres, margin per litre, entered by, date.
- The Pending allocation queue doubles as the reconciliation check: unallocated sales stay visible.

### 6.4 Edits and audit trail

Every create/edit/delete of targets, sales and allocations is logged: who, when, field, old value, new value. Logs are visible to the boss/finance and cannot be edited.

### 6.5 Refunds

Assumption for v1: payments are never refunded. The data model must still be able to record a reversal later without restructuring.

### 6.6 Month approval and lock

Because Yaroh holds a target and also allocates sales, each month's allocations are approved by the boss (or finance) before being locked. Interface for the boss: one plain-language screen with a single **Approve month** button, mobile friendly. Locked months can only be changed through a logged correction.

---

## 7. Rewards (display only in v1)

- `excess = max(0, achieved − target)` (₦, volume × margin basis)
- `reward = 5% × excess` for every person.
- The driver earns **2% of each other person's reward**, in addition to the driver's own reward if the driver exceeds their own target.
- Worked example: target ₦6,400,000, achieved ₦6,500,000 → excess ₦100,000 → reward ₦5,000 → driver share ₦100.
- The system **only displays estimated rewards**. The accountant approves them. Payment is outside the system.
- Because the driver's 2% is tied to other people's rewards, no link between a sale and a driver is needed.

---

## 8. Dashboard and UX

- The dashboard layout is rebuilt around the targets home page, then the daily view and pending allocations.
- Layout style follows the supplied reference screenshots (bento-style): pill-shaped top navigation, large rounded cards, generous spacing, soft shadows, one primary accent at a time, progress rings and bars, calendar and table views, and a detail panel. Replace the HR content with Alpha Brooks features. It is **not** an HR dashboard.
- Colour: green as the main brand colour with complementary colours so it does not feel flat. Suggested: warm cream/off-white surfaces, deep forest or teal for emphasis, amber/gold accents. Do not use black backgrounds everywhere.
- Responsive (phone to desktop), neat, large spacing. The boss's approval screen must work well on a phone.
- Use CSS Modules (existing convention).

---

## 9. Existing codebase notes

Found in the uploaded operating engine (Next.js 16, Prisma 7, React 19):

- `OutcomeTarget` and `OutcomeAchievement` already exist per user/product/month with quantity × margin; extend, do not rewrite.
- `User.entraId` is required: needs to allow non-Microsoft staff.
- No task, subtask, follow-up or sales-ledger model exists yet.
- Zoho integration only reads customers; payments and invoices are new.
- Reusable: leads, quote requests, internal orders, notifications, audit log patterns (`CommercialAuditLog`, `DeliveryAuditLog`).

---

## 10. Assumptions and open items

1. **Margin per sale.** Assumed: each allocation stores a margin per litre entered by Yaroh at allocation time, prefilled from the Profitability module when the order is linked and always editable with audit. To be confirmed.
2. **Driver's 2%.** Assumed paid on top of the person's reward (not deducted from it). To be confirmed. Display only in v1.
3. **Roles without volume targets.** Everyone except the boss has one.
4. **Boss approval mechanism** (single button) to be confirmed with her.
5. **Zoho item hygiene** with the accountant before relying on automatic AGO detection.
6. **Advance payments, overpayments and credit notes** are not specified; handle as unallocated and flag for review.

---

## 11. Suggested build slices

1. **Sales ledger + allocation + audit + targets rework** (extends the existing Outcomes models; manual entry first).
2. **Zoho payments ingestion + Pending allocation queue + notifications.**
3. **Targets home page with progress, pace, suggestions, and month approval.**
4. **Tasks, subtasks, submit trigger, follow-ups, outcomes, daily view.**
5. **Handover, categories and weekly expectations.**
6. **Rewards display (estimates only).**
7. **Dashboard visual rebuild applied across all pages** (can start in parallel with slice 3).
