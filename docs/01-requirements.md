# Dental Clinic Appointment Booking System — Requirements (MVP)

> **Status:** DRAFT v0.1 — awaiting approval · **Date:** 2026-11-23
> **Scope:** One clinic, one branch, Saudi Arabia, Arabic-first (RTL) + English (LTR).
> **Data rule:** synthetic data only during development. Nothing in this document claims PDPL or ZATCA compliance.

Legend for requirement IDs: `PLT` platform · `PAT` patients · `APT` appointments · `DEN` dentists · `BIL` billing · `NOT` notifications · `RPT` dashboard & reports · `AUD` audit · `ADM` administration.
Items marked **[A-xx]** depend on an assumption listed in §7; items marked **[Q-xx]** depend on an open question in §8.

---

## 1. Functional Requirements

### 1.0 Platform & Access (cross-cutting)

| ID | Requirement |
|---|---|
| PLT-01 | Arabic is the default language with full RTL layout; English uses LTR. A language switcher is available on every page and remembered per user. |
| PLT-02 | All times are entered and displayed in Saudi time (Asia/Riyadh, UTC+3). Gregorian calendar **[Q-05]**. |
| PLT-03 | Staff log in with email + password. Two-factor authentication (authenticator app) is **mandatory for Admin**, optional for other staff. |
| PLT-04 | Patients log in or register with mobile number + one-time code (OTP). In development the OTP is **simulated** (fixed test code, clearly labelled as simulated). |
| PLT-05 | Staff accounts are created only by Admin (no public sign-up for staff). Accounts can be activated / deactivated; deactivated users cannot log in. |
| PLT-06 | Staff sessions expire after a period of inactivity **[A-12]**. |
| PLT-07 | Every page enforces role-based access; direct URL access to a forbidden page shows "not authorised", never the data. |
| PLT-08 | All forms validate input on the server (not only in the browser) and show clear bilingual error messages. |

### 1.1 Patients (PAT)

| ID | Requirement |
|---|---|
| PAT-01 | Staff can register a patient. **Required:** full name, mobile (Saudi format `05XXXXXXXX` / `+9665XXXXXXXX`), date of birth. **Optional:** gender, email, emergency contact (name + mobile), national ID. |
| PAT-02 | Each patient receives an automatic, human-readable file number (e.g. `P-000123`). |
| PAT-03 | Patients can self-register during online booking (mobile + OTP, then name and date of birth) and must accept the privacy notice; acceptance date/time is stored. |
| PAT-04 | **Duplicate detection:** when creating or editing a patient, the system checks for existing patients with the same mobile + date of birth and shows a warning listing the matches. Staff may open the existing record or continue. Possible duplicates are flagged for Admin review **[Q-20]**. |
| PAT-05 | **Family accounts:** an account holder (guardian) can add and book for dependents (name, date of birth, gender, relationship). Dependents may have no mobile of their own; communication goes to the guardian. Staff can link existing patients to a guardian. |
| PAT-06 | Every appointment records both **the patient** (who is treated) and **the booker** (who made the booking). |
| PAT-07 | Patient search by name (Arabic or English), mobile, or file number. |
| PAT-08 | Patient profile shows: personal details, family links, appointment history (upcoming / past / cancelled / no-show), no-show count, and — for users with billing access — outstanding balance. |
| PAT-09 | **Restricted medical information:** allergies, medical conditions, current medications, medical notes; shows last updated by / at. Visible only to authorised roles (§3). Allergies display as a warning banner on the appointment screen for clinical staff. |
| PAT-10 | **Clinical notes:** free-text notes written by the dentist and linked to a specific appointment. Restricted (not visible to receptionists or patients) **[Q-09] [Q-22]**. |
| PAT-11 | Patients can view and edit their own and their dependents' basic details (not mobile number) in the patient portal **[Q-19]**. |
| PAT-12 | Patients are never hard-deleted; they can be deactivated. |
| PAT-13 | *(Future, design-ready)* Excel import of existing patient lists; document uploads. |

### 1.2 Appointments (APT)

**Setup**

| ID | Requirement |
|---|---|
| APT-01 | Admin manages **services**: name (AR/EN), duration (minutes), price, active flag, "bookable online" flag, display colour. Seeded with: General Consultation 30 · Dental Cleaning 45 · Filling 45 · Root Canal 60 · Tooth Extraction 45 · Emergency Visit 30 · Follow-up 20. |
| APT-02 | Admin manages **chairs / treatment rooms**: name, active flag. Seeded with 3 chairs. |
| APT-03 | Admin manages **clinic working hours** per weekday (one or more shifts per day, e.g. split morning/evening), **clinic holidays**, and booking rules: max advance days (90), min notice for online booking (2 h), online cancel/reschedule cut-off (24 h), slot interval **[A-05]**. |

**Availability & booking**

| ID | Requirement |
|---|---|
| APT-04 | A time is **available** only if: inside clinic hours, inside the dentist's shift, not in a break, leave, block, or clinic holiday, the dentist has no overlapping appointment, and at least one of the dentist's assigned chairs is free for the **entire** duration of the service. |
| APT-05 | Patients may choose a specific dentist or **"Any Available Dentist"**. For "Any", the slot list is the union of all qualified dentists' free times; on confirmation the system assigns the dentist with the fewest appointments that day **[A-06]**. |
| APT-06 | The chair is assigned automatically (dentist's preferred chair first, then any assigned free chair). Staff can change it. |
| APT-07 | **Online rules:** booking allowed from 2 hours to 90 days ahead; online bookings are confirmed automatically (status `Booked`). These rules apply to the online channel only; staff bookings are not limited by them. |
| APT-08 | **No double-booking:** the same dentist or the same chair can never hold two overlapping active appointments. This is enforced by the database itself, so two people clicking the same slot at the same second cannot both succeed; the second receives a "slot just taken" message with refreshed times. |
| APT-09 | **Admin override:** Admin may knowingly double-book after a warning, entering a mandatory reason. The override is audited and visibly marked on the calendar. |
| APT-10 | Each appointment stores its **channel**: Online, Phone/Desk, Walk-in, Emergency. |
| APT-11 | Service name, duration, and price are **copied onto the appointment** at booking time, so later price/duration changes never alter existing appointments. |
| APT-12 | Staff can create **walk-in** and **emergency** appointments. Admin can define **reserved emergency blocks** per dentist that are hidden from online booking but bookable by staff. |
| APT-13 | Patients may hold multiple upcoming bookings **[Q-25]**. |

**Status workflow**

| ID | Requirement |
|---|---|
| APT-14 | Statuses: `Booked → Checked-in → In Treatment → Completed`, plus `Cancelled` and `No-show`. Every change records who and when. |
| APT-15 | Allowed transitions: Booked→Checked-in / Cancelled / No-show · Checked-in→In Treatment / Cancelled · In Treatment→Completed. `No-show` can only be set after the start time has passed. Reverting a status (correcting a mistake) is Admin-only with a reason. |
| APT-16 | Cancellation by staff requires a reason. Cancelled and no-show appointments release the dentist and chair time immediately. |
| APT-17 | No-shows are recorded and counted on the patient profile; no automatic penalty in the MVP. |

**Changes**

| ID | Requirement |
|---|---|
| APT-18 | **Patient online cancel / reschedule** allowed until 24 h before the start. Inside 24 h the buttons are disabled with a message to contact the clinic (phone / WhatsApp shown). |
| APT-19 | **Staff reschedule / reassign** at any time (moving to another time, dentist, or chair) with the same availability checks. |
| APT-20 | Rescheduling keeps the same appointment (same reference number); the before/after values are kept in the audit trail. |
| APT-21 | **Dentist absence:** Admin or Receptionist can block a dentist's time (full days, partial day, leave with date range, reason). If existing appointments fall inside the block, the system lists them so staff can reschedule or reassign each one and optionally notify the patient. |
| APT-22 | Dentists can create a **follow-up appointment** from an appointment's details (patient and dentist pre-filled, default service "Follow-up"). |
| APT-23 | Appointments can carry non-clinical **front-desk notes** (e.g. "prefers morning calls"), visible to reception. |

**Calendar**

| ID | Requirement |
|---|---|
| APT-24 | Calendar views: day, week, month; **by dentist** (dentists as columns) and **by chair** (chairs as columns). Filters: dentist, chair, service, status. |
| APT-25 | Staff can move an appointment by drag-and-drop (or via an edit dialog on mobile). The move is validated, confirmed in a dialog, audited, and triggers a reschedule notification. |
| APT-26 | Appointments show status by colour **and** a text/icon badge (not colour alone), with a legend. Blocked times, breaks, and leave are shaded. |
| APT-27 | **Reception queue:** today's appointments in time order with one-click Check-in, plus counts per status. |
| APT-28 | **Patient portal:** "My appointments" (upcoming / past) for self and dependents with Cancel / Reschedule buttons only when eligible. |

### 1.3 Dentists / Doctors (DEN)

| ID | Requirement |
|---|---|
| DEN-01 | Admin manages dentist profiles: name (AR/EN), specialization (AR/EN), photo, phone, email, short bio (optional), active flag, linked login account. |
| DEN-02 | **Weekly schedule** per dentist: for each weekday, one or more working shifts and breaks. |
| DEN-03 | **Days off, leave, and blocks** (see APT-21). |
| DEN-04 | **Assigned chairs:** one or more chairs per dentist, with one preferred chair. |
| DEN-05 | Services each dentist performs: all dentists perform all services in the MVP **[Q-08]**. |
| DEN-06 | Dentist's own area: today's list, own schedule (day/week), "My patients" (patients who have had or have an appointment with them), appointment details with allergies banner, clinical notes. |
| DEN-07 | Public booking page shows active dentists with photo, name, and specialization. |
| DEN-08 | **Dental assistants** are linked to one or more dentists and see those dentists' appointments. |

### 1.4 Billing (BIL)

| ID | Requirement |
|---|---|
| BIL-01 | Each appointment has a simple **bill** whose first line is the booked service at its snapshot price. Staff can add/replace lines with other services performed **[Q-12]**. |
| BIL-02 | **Discounts** (percentage or fixed amount) require a reason. Receptionists may apply up to a configurable limit **[Q-13]**; above the limit the discount stays *pending* until an Admin approves or rejects it. |
| BIL-03 | **VAT:** Admin configures VAT on/off, rate (default 15%), and VAT registration number. VAT is calculated on the amount after discount **[Q-06]**. |
| BIL-04 | **Payments:** method (Cash, Card — recorded manually, Bank transfer — recorded manually), amount, optional reference, date/time, received by. Partial payments allowed. A payment cannot exceed the remaining balance **[A-15]**. |
| BIL-05 | Remaining balance shown per bill and per patient; outstanding balances list. |
| BIL-06 | **Receipt:** printable, bilingual, sequential number, clinic details, VAT number (if set), lines, discount, VAT, total, paid, remaining. Titled **"Receipt / إيصال"**, not "Tax Invoice". |
| BIL-07 | **Refunds:** a receptionist can *request* a refund (amount ≤ amount paid, reason); only Admin approves or records it. Refund history is kept per bill. |
| BIL-08 | Payments are never deleted. A payment entered by mistake can be **voided** by Admin with a reason. |
| BIL-09 | Excluded from MVP: insurance, online payment gateway, deposits, accounting integration, ZATCA e-invoicing. |

### 1.5 Notifications (NOT)

| ID | Requirement |
|---|---|
| NOT-01 | Notifications go through one **provider interface** so WhatsApp / SMS / email providers can be plugged in later without changing business code. MVP ships a **Simulated provider** that records the message instead of sending it. Credentials come only from environment settings. |
| NOT-02 | Patient messages: booking confirmation, 24-hour reminder, 2-hour reminder, cancellation, rescheduling, affected-by-dentist-absence; optional follow-up reminder. Sent in the patient's preferred language. Preferred channel: WhatsApp. |
| NOT-03 | Messages for dependents go to the guardian's mobile. |
| NOT-04 | Reminders are sent by a background job (every ~5 minutes). Each reminder is sent at most once; reminders for cancelled/rescheduled appointments are cancelled or re-planned. Bookings made less than 24 h (or 2 h) ahead skip the reminder that is already past. Walk-ins get no reminders. |
| NOT-05 | **Staff alerts** (in-app bell) for receptionists: new online booking, cancellation, reschedule, emergency booking. |
| NOT-06 | **Notification log:** time, recipient (mobile partially masked), channel, message type, status (queued / sent / failed / simulated), error. Admin can view and resend. |
| NOT-07 | The patient-login OTP uses the same abstraction (simulated in development). |
| NOT-08 | Message templates are fixed in the MVP (AR/EN) **[Q-16]**. Marketing and recall campaigns are excluded. |

### 1.6 Dashboard & Reports (RPT)

| ID | Requirement |
|---|---|
| RPT-01 | **Admin dashboard:** today's appointments, upcoming, completed, cancelled, no-show, total patients, new patients, revenue, outstanding balances, dentist utilization; period selector (today / this week / this month). |
| RPT-02 | **Reception dashboard:** today's queue, status counts, today's collections by payment method, staff alerts. |
| RPT-03 | **Dentist dashboard:** today's patients in order, next patient, allergy flags, own weekly counts. |
| RPT-04 | Reports with charts and filters (date range, dentist, service): daily / weekly / monthly appointments, by dentist, by service, cancellation rate, no-show rate, new patients, revenue, payments (by method), outstanding balances, dentist utilization. Export **[Q-17]**. |
| RPT-05 | **Metric definitions** (so numbers are unambiguous): cancellation rate = cancelled ÷ all appointments in period; no-show rate = no-shows ÷ (completed + no-shows); revenue = payments received − refunds (cash basis); billed = bill totals after discount incl. VAT; utilization = booked minutes ÷ scheduled working minutes per dentist. |

### 1.7 Audit (AUD)

| ID | Requirement |
|---|---|
| AUD-01 | Record: appointment created / changed / cancelled / status changed / overridden; patient record changed; medical info viewed or changed; clinical note created/changed; payment recorded/voided; discount approved; refund requested/approved; staff user & permission changes; settings changes; login of staff. |
| AUD-02 | Each entry stores: timestamp, user, role, action, record affected, and before/after values for changes. |
| AUD-03 | Audit entries cannot be edited or deleted by anyone through the application (enforced in the database). |
| AUD-04 | Audit log viewer is Admin-only, filterable by date, user, action, record. |

### 1.8 Administration (ADM)

| ID | Requirement |
|---|---|
| ADM-01 | Clinic profile: name (AR/EN), logo, address, phone, WhatsApp number, VAT details. |
| ADM-02 | User management: create staff user, assign role, link to dentist profile, activate/deactivate, reset password, see 2FA status. |
| ADM-03 | **Permissions:** fixed roles plus a small set of switchable permissions per user — e.g. "receptionist may view medical info", "may approve discounts" **[A-11]**. |

---

## 2. Non-Functional Requirements

| Area | Requirement |
|---|---|
| **Performance** | Public booking pages usable within 3 s on a mid-range phone over 4G. Loading available times for one date < 1 s. Typical staff actions respond < 0.5 s (server side). Reports over 12 months < 5 s. |
| **Scalability** | Designed for 10 dentists, 80 appointments/day, ~15 concurrent staff and ~100 concurrent patient visitors with no redesign. Data volume (~30k appointments/year) is small for PostgreSQL. Every operational record carries a branch reference so multi-branch can be added later without restructuring. |
| **Security** | HTTPS only · role checks on the server for every action **and** database row-level security as a second lock · passwords hashed by the authentication provider · Admin 2FA · OTP rate limits (max 5 codes/hour per number, lockout after 5 wrong attempts) · secure, http-only session cookies · server-side validation of all input · secrets only in environment variables, never in the code repository · standard security headers · access to medical information logged · mobile numbers masked in logs · synthetic data only in development. |
| **Privacy (PDPL-oriented, not certified)** | Collect only needed data; privacy-notice acceptance stored; admin can export/correct a patient's data on request (manual in MVP); data retention period to be defined **[Q-21]**; hosting location to be assessed before any real patient data is stored (see Risks). |
| **Availability** | Target 99.5% monthly (≈ 3.6 h downtime/month) after deployment, using managed cloud hosting. Daily automatic database backups; one restore test before go-live. Maintenance in off-peak hours. A failed notification never blocks a booking; it is retried and logged. |
| **Maintainability** | Modular code per feature; business rules kept apart from screens; typed code (TypeScript); versioned database migrations; automated tests for booking rules; README and setup guide. |
| **Usability & Accessibility** | Arabic-first; booking in ≤ 7 simple steps on a phone; consistent status colours plus text labels; target WCAG 2.1 AA (labels, keyboard navigation, contrast). |
| **Localization** | All UI text in AR/EN resource files (no hard-coded text); dates, times, currency (SAR) formatted per language; digits **[Q-26]**. |
| **Observability** | Server errors logged with enough context to debug, without patient medical data in logs. |

---

## 3. User Roles & Permissions

Legend: **Full** = create/view/edit · **View** · **Own** = only their own records/appointments · **Linked** = appointments of the dentists the assistant is linked to · **—** = no access.

| Capability | Admin | Receptionist | Dentist | Assistant | Patient |
|---|---|---|---|---|---|
| Clinic settings, hours, holidays, VAT, booking rules | Full | — | — | — | — |
| Staff users & permissions | Full | — | — | — | — |
| Services & prices | Full | View | View | View | View active services (prices **[Q-07]**) |
| Chairs | Full | View | View | View | — |
| Dentist profiles & weekly schedules | Full | View | View own | View linked | Public profile |
| Leave / schedule blocks | Full | Create & edit | View own | — | — |
| Book appointments | Any, no limits | Any (online rules don't apply) | Follow-ups for own patients | — | Self & dependents (online rules) |
| Reschedule / reassign / cancel | Any | Any (reason required to cancel) | — **[Q-24]** | — | Own, ≥ 24 h before |
| Double-booking override | Yes, with reason | — | — | — | — |
| Check-in | Yes | Yes | — | — | — |
| In Treatment / Completed | Yes | — | Own | In Treatment only (linked) | — |
| Mark no-show | Yes | Yes | Own | — | — |
| Revert a status | Yes, with reason | — | — | — | — |
| Calendar | All | All | Own (+ view others **[Q-23]**) | Linked | — |
| Patient basic info | Full | Create & edit | View own patients | View name/age on linked appointments | Own + dependents |
| Medical info (allergies, conditions, meds) | View & edit (logged) **[Q-09]** | Only if granted | View & edit, own patients | — **[Q-11]** | — **[Q-10]** |
| Clinical notes | View (logged) **[Q-09]** | — | Create; view own patients' notes | — | — |
| Bills & discounts | Full; approves above-limit discounts | Create; discount ≤ limit | — | — | — |
| Payments | Full; can void | Record | — | — | — |
| Refunds | Approve & record | Request only | — | — | — |
| Receipts | Print | Print | — | — | — **[Q-18]** |
| Dashboard | Clinic-wide | Reception | Own | Own (linked) | — |
| Reports | All | Daily schedule & own daily collections | — | — | — |
| Notification log | Full, resend | Staff alerts only | — | — | — |
| Audit log | View | — | — | — | — |

---

## 4. Key Business Rules (summary)

1. One dentist and one chair per appointment; neither can overlap another active appointment (Cancelled / No-show don't count).
2. Availability = clinic hours ∩ dentist shift − breaks − leave/blocks − holidays − existing appointments, and a free chair for the full duration.
3. Online channel: 2 h ≤ start ≤ 90 days; auto-confirmed; self-service changes ≥ 24 h before.
4. Staff can book outside online limits; only Admin can double-book (with reason).
5. Price, duration, and service name are frozen on the appointment at booking.
6. Discount above the receptionist limit needs Admin approval; refunds need Admin.
7. Nothing financial or audit-related is ever deleted; corrections are new, audited entries.
8. Medical info and clinical notes are visible only to authorised clinical roles; access is logged.

---

## 5. Core Use Cases (Top 5)

### UC-1 · Patient books an appointment online

- **Actor:** Patient (or guardian booking for a dependent)
- **Goal:** Get a confirmed appointment without calling the clinic.
- **Preconditions:** At least one active, online-bookable service and one dentist with a schedule.

**Main steps**
1. Patient opens the booking page (Arabic by default).
2. Selects a service.
3. Selects a dentist or "Any Available Dentist".
4. Selects a date — only dates within 2 h…90 days that have free time are selectable.
5. System shows available start times; patient selects one.
6. Patient enters mobile number → receives OTP (simulated in dev) → enters code.
   New patient: enters full name, date of birth (gender/email optional) and accepts the privacy notice.
7. Patient chooses who the appointment is for: self, an existing dependent, or adds a new dependent.
8. System shows a summary: service, dentist, date/time, clinic address, cancellation policy. Patient confirms.
9. System re-checks availability, assigns dentist (if "Any") and chair, saves the appointment as **Booked**, records booker + patient + channel "Online", writes audit entry, queues confirmation and reminders, alerts reception.
10. Confirmation page shows a reference number and a link to "My appointments".

**Alternate / error flows**
- **A1 Slot taken meanwhile:** at step 9 the time is no longer free → message "This time was just booked", return to step 5 with refreshed times; earlier choices are kept.
- **A2 Wrong / expired OTP:** error shown; resend allowed after 60 s; after 5 wrong attempts the number is locked for 15 min.
- **A3 No availability:** the chosen date/dentist has no free time → suggest the next available date or "Any Available Dentist".
- **A4 Under 2 hours:** such times are not offered; a note shows the clinic phone for urgent visits.
- **A5 Mobile already on file** (registered earlier by reception): the login is linked to that existing patient record instead of creating a duplicate **[A-08]**.
- **A6 Notification fails:** the booking stays confirmed; failure is logged and retried.

### UC-2 · Receptionist books a phone, walk-in, or emergency appointment

- **Actor:** Receptionist (or Admin)
- **Goal:** Register the patient if needed and book quickly.

**Main steps**
1. Receptionist opens "New appointment" (or clicks an empty slot in the calendar).
2. Searches the patient by mobile, name, or file number.
3. If not found → quick registration (name, mobile, date of birth). System checks mobile + date of birth for duplicates.
4. Selects channel (Phone/Desk, Walk-in, Emergency), service, dentist or "Any".
5. Selects a time from available slots (walk-in defaults to the next free time today). Chair is auto-assigned and can be changed.
6. Adds optional front-desk note; saves.
7. System validates conflicts, saves as **Booked** (walk-in can be checked in immediately), audits, queues notifications (no reminders for walk-ins).

**Alternate / error flows**
- **A1 Possible duplicate found:** warning with matching records → open existing patient, or continue and the new record is flagged for review.
- **A2 Conflict:** chosen dentist/chair is busy → message plus next free times; Admin may override with a reason (marked on calendar, audited).
- **A3 Emergency with no free time:** use a reserved emergency block if one exists; otherwise Admin override.
- **A4 Dentist not working that day:** times are not offered; suggest other dentists.
- **A5 Patient is a child:** receptionist links the child to a guardian (existing or new) so messages go to the guardian.

### UC-3 · Patient cancels or reschedules online

- **Actor:** Patient / guardian
- **Goal:** Change plans without calling the clinic.

**Main steps**
1. Patient logs in with mobile + OTP and opens "My appointments".
2. Selects an upcoming appointment (own or dependent's).
3. **Cancel:** confirms (reason optional) → status **Cancelled**, time released.
   **Reschedule:** picks a new date/time using the same availability rules (same service; dentist may change) → appointment time updated.
4. System audits, sends cancellation/reschedule message, re-plans reminders, alerts reception.

**Alternate / error flows**
- **A1 Less than 24 h before start:** buttons disabled; message "Please contact the clinic" with phone/WhatsApp.
- **A2 Appointment no longer Booked** (checked-in, cancelled, completed): no actions offered.
- **A3 New time taken meanwhile:** "just booked" message, refreshed times.
- **A4 Session expired:** asked to re-enter OTP, then returned to the same appointment.

### UC-4 · Visit day: check-in → treatment → notes → completion

- **Actors:** Receptionist, Dental Assistant, Dentist
- **Goal:** Track the patient through the visit and record the clinical outcome.

**Main steps**
1. Receptionist sees today's queue; patient arrives → **Check-in** (confirm details; any previous outstanding balance shown).
2. Dentist/assistant sees the patient in "Waiting"; when the patient is seated → **In Treatment**.
3. Dentist opens the appointment: allergies banner, medical info, previous notes.
4. Dentist writes the clinical note; optionally updates the services performed **[Q-12]**.
5. Dentist marks **Completed**. Bill becomes ready for reception.
6. Optionally dentist creates a **follow-up** appointment (UC-2 rules, pre-filled).

**Alternate / error flows**
- **A1 Patient doesn't arrive:** after the start time staff mark **No-show**; it appears in the patient's history.
- **A2 Patient leaves before treatment:** Checked-in → Cancelled with reason.
- **A3 Wrong status clicked:** only Admin can revert, with a reason.
- **A4 Unauthorised user opens notes:** receptionist sees "restricted" instead of note content; the attempt is not shown any data.
- **A5 Running late / overrun:** times can be adjusted by staff; overlaps still blocked unless Admin overrides.

### UC-5 · Record payment, discount, receipt (and refund)

- **Actors:** Receptionist, Admin
- **Goal:** Collect payment correctly and give the patient a receipt.

**Main steps**
1. Receptionist opens the bill from the appointment or patient profile.
2. Reviews lines (snapshot prices). Optionally applies a discount with a reason.
3. System calculates subtotal, discount, VAT, total, paid, remaining.
4. Records payment: method, amount (full or partial), reference if card/transfer.
5. System assigns a receipt number, updates balance, audits.
6. Receptionist prints the bilingual receipt.

**Alternate / error flows**
- **A1 Discount above limit:** saved as *pending*; Admin approves/rejects; totals update only after approval.
- **A2 Amount greater than remaining balance:** blocked with a message.
- **A3 Partial payment:** remaining balance shows on the bill, patient profile, and outstanding report.
- **A4 Refund:** receptionist requests (amount ≤ paid, reason) → Admin approves → refund recorded with method → balance and revenue updated.
- **A5 Payment entered by mistake:** Admin voids it with a reason; it stays visible as voided.

*Next-priority use cases (to detail later if needed):* dentist absence & bulk reassignment · admin sets up a new dentist with schedule · end-of-day cash reconciliation.

---

## 6. Explicitly Out of Scope (MVP)

Full dental charting · X-ray / imaging · advanced treatment plans · insurance · accounting integration · online payments & deposits · native mobile apps · AI diagnosis · marketing automation · multi-branch management · inventory · waiting list · two-way WhatsApp replies · document uploads · Excel import · ZATCA e-invoicing.

---

## 7. Assumptions (please confirm or correct)

| ID | Assumption |
|---|---|
| A-01 | Clinic open Sunday–Thursday, two shifts (09:00–13:00, 16:00–22:00); Saturday 16:00–22:00; Friday closed. *(Seed data only — fully configurable.)* |
| A-02 | Currency SAR; prices entered **excluding** VAT. |
| A-03 | Clinic name for the demo is fictional (e.g. "عيادة الابتسامة لطب الأسنان / Smile Dental Clinic"). |
| A-04 | Single time zone Asia/Riyadh (Saudi Arabia has no daylight saving). |
| A-05 | Start times offered every 15 minutes; no buffer between appointments (both configurable). |
| A-06 | "Any dentist" assigns the least-busy dentist that day; ties broken by fixed order. |
| A-07 | There is no temporary "hold" on a slot while the patient completes the steps; availability is re-checked at confirmation (UC-1 A1). |
| A-08 | If someone logs in by OTP with a mobile that already belongs to a staff-registered adult patient, the login is linked to that patient. If several adults share that mobile, reception reviews the link. |
| A-09 | Dependents can be children or adults (e.g. elderly parents). |
| A-10 | Staff-created bookings are not subject to the 2 h / 90-day / 24 h online rules. |
| A-11 | Roles are fixed; Admin can switch a few extra permissions on per user (not a full custom-role builder). |
| A-12 | Staff idle timeout 30 minutes; patient sessions last 7 days. |
| A-13 | Assistant may set only "In Treatment". |
| A-14 | Rescheduled appointments keep the same reference number. |
| A-15 | No overpayment / patient credit balance in MVP. |
| A-16 | Reports are view-on-screen with charts; receipts print through the browser (can be saved as PDF). |

---

## 8. Open Questions

**Blocking — ✅ RESOLVED 2026-11-23**

| ID | Question | Decision |
|---|---|---|
| Q-01 | Live demo or real clinic use? | ✅ **Real clinic use** — full design, built in small demo-able phases |
| Q-02 | Tech stack? | ✅ **Next.js + TypeScript + Tailwind/shadcn, REST API in Next.js route handlers, PostgreSQL via Supabase, Vercel + Supabase Cloud for demo** |
| Q-03 | Phase order? | ✅ **Dentists/Services/Chairs/Schedules before Appointments** |
| Q-04 | Project location? | ✅ **`C:\dev\dental-clinic`** (outside OneDrive; Git for backup) |

**Business rules**

| ID | Question | Suggested default |
|---|---|---|
| Q-05 | Show Hijri dates alongside Gregorian? | Gregorian only in MVP |
| Q-06 | Are prices VAT-inclusive or exclusive? Does VAT apply to all patients equally? (Healthcare VAT for Saudi citizens has special arrangements — please confirm with your accountant.) | Exclusive; one rate for all; per-patient exemption later |
| Q-07 | Show prices on the public booking page? | Yes, "starting from" price |
| Q-08 | Can every dentist perform every service, or are some services restricted (e.g. root canal only by an endodontist)? | All dentists, all services |
| Q-09 | Can Admin read clinical notes and medical info? | Yes, every view logged |
| Q-10 | Can patients enter their own medical history (allergies etc.) online before the visit? | No in MVP; staff record it |
| Q-11 | Can dental assistants see allergies (safety)? | Allergies only, not notes |
| Q-12 | Who sets the final services/charges for a visit — dentist, receptionist, or both? | Dentist marks services performed; receptionist finalises bill |
| Q-13 | Receptionist discount limit? | 10% |
| Q-14 | Real clinic hours, weekend days, Ramadan hours? | See A-01; Ramadan via date-range schedule override |
| Q-15 | Clinic name, logo, colours for the demo? | Fictional (A-03) |
| Q-16 | Should Admin be able to edit message templates in the UI? | No in MVP |
| Q-17 | Do reports need export (Excel/CSV/PDF)? | No in MVP (print only) |
| Q-18 | Should patients see their bills/receipts online? | No in MVP |
| Q-19 | How does a patient change their mobile number? | Through reception only |
| Q-20 | Should staff be able to **merge** duplicate patients in the MVP, or only flag them? | Flag only; merge later |
| Q-21 | How long must patient records be kept? | To be confirmed with legal; no auto-deletion in MVP |
| Q-22 | Can a dentist edit a clinical note after saving? | Editable for 24 h; afterwards addendum only |
| Q-23 | Can dentists see other dentists' calendars? | Yes, view only (busy/free, no patient details) |
| Q-24 | Can dentists reschedule or cancel their own appointments? | No — via reception |
| Q-25 | Limit on upcoming online bookings per account (to prevent abuse/no-shows)? | Max 3 upcoming per patient |
| Q-26 | Digits in Arabic UI: Western (0–9) or Arabic-Indic (٠–٩)? | Western digits |
| Q-27 | Late arrival rule: after how many minutes may staff mark no-show? | Staff decide manually; system suggests after 15 min |

---

## 9. Risks & Trade-offs Flagged

| # | Risk | Impact | Recommendation |
|---|---|---|---|
| R-1 | **Scope vs. simplicity.** The spec (5 roles, bilingual RTL, OTP, drag-and-drop calendar, reports, audit, notifications) is a real product, not a short live demo. | Long build; demo sessions may overrun | Build in thin, working slices; each phase demo-able on its own |
| R-2 | **Data residency (PDPL).** Health data is sensitive; the managed cloud database region (Supabase) may be outside KSA. | Cannot store real patient data until assessed | Use synthetic data now; before go-live choose a KSA-hosted option (self-hosted Supabase/PostgreSQL on a Saudi cloud region) after legal review |
| R-3 | **Hosting plan terms & cost.** Free tiers (e.g. Vercel Hobby) are for non-commercial use and limit background jobs. | Free plan not valid for a real clinic | Demo on free tiers; budget paid plans for production (verify current prices) |
| R-4 | **WhatsApp / SMS go-live.** WhatsApp Business API needs Meta business verification, pre-approved templates, and per-message fees; SMS in KSA needs a registered sender name. Real OTP needs a real provider. | Weeks of lead time | Start the provider registration early; MVP uses simulation |
| R-5 | **ZATCA.** If the clinic is VAT-registered, legally valid e-invoices are required; MVP receipts are not tax invoices. | Compliance gap in production | Keep "Receipt" wording; plan ZATCA integration before real billing |
| R-6 | **Shared family mobile numbers** make mobile + date-of-birth duplicate checks imperfect (e.g. twins) and mean OTP identifies the account holder, not each patient. | False duplicate warnings / account confusion | Warnings only (never auto-merge); booking always asks "who is this for" |
| R-7 | **Calendar component licensing.** Some popular calendar libraries charge for the dentist/chair column views. | Unexpected licence cost | Use an open-source calendar (see architecture doc) and test RTL early |
| R-8 | **OneDrive project folder.** Syncing build files causes slowness and file-lock errors (already seen: `pro.docx` was locked while open). | Build failures | Move the code project outside OneDrive (Q-04) |
