# Dental Clinic MVP — REST API Specification

> **Status:** DRAFT v0.1 — awaiting approval · **Date:** 2026-11-23
> **Base URL:** `/api/v1` · **Format:** JSON (UTF-8) · Built on [03-database-design.md](03-database-design.md).

*Plain words:* the API is the list of "counter windows" the screens (and later a mobile app or WhatsApp provider) can use to ask the system for something. Each window states who may use it, what to hand in, and what comes back.

---

## 1. Conventions

### 1.1 Authentication
| Caller | How it proves identity |
|---|---|
| Web app (staff & patients) | Secure, http-only session cookie set at login (Supabase session). |
| Future mobile app / tools | `Authorization: Bearer <access_token>` |
| Background job | `X-Cron-Secret: <secret from environment>` (internal endpoints only) |

**Auth column legend:** `Public` (no login) · `Patient` · `Staff` (any staff role) · `A` Admin · `R` Receptionist · `D` Dentist · `As` Assistant · `+perm` = needs extra permission. Admin endpoints additionally require a 2FA-verified session (`aal2`).

### 1.2 Request rules
- Field names `camelCase`; dates `YYYY-MM-DD`; timestamps ISO-8601 with offset (`2026-12-01T10:30:00+03:00`); money as strings with 2 decimals (`"150.00"`) to avoid rounding.
- `Accept-Language: ar | en` selects the language of error messages and bilingual fields.
- Lists: `?page=1&pageSize=25` (max 100), `?sort=startsAt` / `?sort=-startsAt`.
- Updates to appointments send the record's `version`; a stale version returns **409 VERSION_CONFLICT** (someone else changed it first).
- `Idempotency-Key` header **required** on `POST …/payments` and recommended on bookings: repeating the same request never creates a second record.

### 1.3 Response envelope
Success:
```json
{ "data": { }, "meta": { "page": 1, "pageSize": 25, "total": 134 } }
```
Error:
```json
{
  "error": {
    "code": "SLOT_UNAVAILABLE",
    "message": "هذا الموعد تم حجزه للتو، يرجى اختيار وقت آخر",
    "details": { "field": "startsAt" }
  }
}
```

### 1.4 Status codes
| Code | When |
|---|---|
| 200 OK | Read or update succeeded |
| 201 Created | Record created (`Location` header set) |
| 202 Accepted | Accepted for background processing (e.g. OTP sent) |
| 204 No Content | Success with nothing to return |
| 400 Bad Request | Malformed JSON / wrong types |
| 401 Unauthorized | Not logged in / session expired |
| 403 Forbidden | Logged in but not allowed (`FORBIDDEN`, `MFA_REQUIRED`) |
| 404 Not Found | Record doesn't exist **or** caller may not know it exists |
| 409 Conflict | `SLOT_UNAVAILABLE`, `VERSION_CONFLICT`, `DUPLICATE_PATIENT`, `ALREADY_EXISTS` |
| 422 Unprocessable | Valid data that breaks a business rule (`OUTSIDE_BOOKING_WINDOW`, `CHANGE_CUTOFF_PASSED`, `INVALID_STATUS_TRANSITION`, `AMOUNT_EXCEEDS_BALANCE`, `DISCOUNT_NEEDS_APPROVAL`…) |
| 429 Too Many Requests | OTP / login rate limits |
| 500 Internal Error | Unexpected; logged with a correlation id, no internal details returned |

### 1.5 Error codes (catalogue)
`VALIDATION_ERROR` · `UNAUTHENTICATED` · `INVALID_CREDENTIALS` · `ACCOUNT_INACTIVE` · `FORBIDDEN` · `MFA_REQUIRED` · `MFA_INVALID` · `NOT_FOUND` · `SLOT_UNAVAILABLE` · `OUTSIDE_BOOKING_WINDOW` · `OUTSIDE_WORKING_HOURS` · `CHANGE_CUTOFF_PASSED` · `MAX_UPCOMING_REACHED` · `INVALID_STATUS_TRANSITION` · `VERSION_CONFLICT` · `DUPLICATE_PATIENT` · `OTP_INVALID` · `OTP_EXPIRED` · `OTP_LOCKED` · `RATE_LIMITED` · `NOTE_EDIT_WINDOW_CLOSED` · `BILL_LOCKED` · `AMOUNT_EXCEEDS_BALANCE` · `REFUND_EXCEEDS_PAID` · `DISCOUNT_ABOVE_LIMIT` · `INTERNAL_ERROR`

---

## 2. Auth

| Method | Path | Auth | Request | Response | Codes |
|---|---|---|---|---|---|
| POST | `/auth/staff/login` | Public | `{ email, password }` | `{ user, role, mfaRequired, mfaEnrolled }` | 200, 400, 401 `INVALID_CREDENTIALS`, 403 `ACCOUNT_INACTIVE`, 429 `RATE_LIMITED` |
| POST | `/auth/staff/mfa/enroll` | Staff | — | `{ factorId, qrCodeSvg, secret }` | 201, 401 |
| POST | `/auth/staff/mfa/verify` | Staff | `{ factorId, code }` | `{ aal: "aal2" }` | 200, 401, 422 `MFA_INVALID` |
| POST | `/auth/patient/otp/request` | Public | `{ mobile }` | `{ expiresInSeconds: 300, resendAfterSeconds: 60, simulated: true }` | 202, 400, 429 |
| POST | `/auth/patient/otp/verify` | Public | `{ mobile, code }` | `{ isNewAccount, patient? }` | 200, 401 `OTP_INVALID`, 410 `OTP_EXPIRED`, 429 `OTP_LOCKED` |
| POST | `/auth/patient/register` | Patient (OTP-verified, new) | `{ fullName, dateOfBirth, gender?, email?, preferredLocale, privacyConsent: true }` | `{ patient }` | 201, 400, 409 |
| POST | `/auth/logout` | Any | — | — | 204 |
| GET | `/auth/me` | Any logged-in | — | `{ id, type: "staff"\|"patient", role, permissions[], locale, dentistId?, patientIds[]? }` | 200, 401 |
| PATCH | `/auth/me/locale` | Any logged-in | `{ locale: "ar"\|"en" }` | `{ locale }` | 200 |

Passwords are reset by Admin (see §11) or through the Supabase reset-email flow.

---

## 3. Public (booking website, no login)

| Method | Path | Request (query) | Response | Codes |
|---|---|---|---|---|
| GET | `/public/clinic` | — | `{ name, address, phone, whatsapp, hours[], logoUrl }` | 200 |
| GET | `/public/services` | — | `[{ id, name, durationMinutes, priceFrom, color }]` (online-bookable, active) | 200 |
| GET | `/public/dentists` | `serviceId?` | `[{ id, name, specialization, photoUrl }]` | 200 |
| GET | `/public/availability/dates` | `serviceId, month=YYYY-MM, dentistId? (omit = any)` | `{ dates: ["2026-12-01", …] }` | 200, 400 |
| GET | `/public/availability/slots` | `serviceId, date, dentistId?` | see example | 200, 400 |

**Example — `GET /public/availability/slots?serviceId=…&date=2026-12-01`**
```json
{
  "data": {
    "date": "2026-12-01",
    "serviceId": "7c1e…",
    "durationMinutes": 45,
    "slots": [
      { "startsAt": "2026-12-01T09:00:00+03:00", "dentistIds": ["d1", "d3"] },
      { "startsAt": "2026-12-01T09:15:00+03:00", "dentistIds": ["d3"] }
    ]
  }
}
```
Only times that respect the online rules (≥ 2 h, ≤ 90 days) are returned. No patient information is ever exposed.

---

## 4. Patient Portal (`/me`)

| Method | Path | Auth | Request | Response | Codes |
|---|---|---|---|---|---|
| GET | `/me/patients` | Patient | — | `[{ id, fullName, dateOfBirth, relationship: "self"\|"child"…, fileNo }]` | 200 |
| POST | `/me/dependents` | Patient | `{ fullName, dateOfBirth, gender?, relationship }` | `{ patient }` | 201, 400, 409 `DUPLICATE_PATIENT` |
| PATCH | `/me/patients/{id}` | Patient (own/dependent) | `{ fullName?, email?, gender?, emergencyContactName?, emergencyContactMobile?, preferredLocale? }` | `{ patient }` | 200, 400, 404 |
| GET | `/me/appointments` | Patient | `?scope=upcoming\|past` | `[{ id, referenceNo, patient, service, dentist, startsAt, endsAt, status, canCancel, canReschedule }]` | 200 |
| POST | `/me/appointments` | Patient | see example | `{ appointment }` | 201, 400, 409 `SLOT_UNAVAILABLE`, 422 `OUTSIDE_BOOKING_WINDOW` / `MAX_UPCOMING_REACHED` |
| POST | `/me/appointments/{id}/cancel` | Patient | `{ reason? }` | `{ appointment }` | 200, 404, 422 `CHANGE_CUTOFF_PASSED` / `INVALID_STATUS_TRANSITION` |
| POST | `/me/appointments/{id}/reschedule` | Patient | `{ startsAt, dentistId? }` | `{ appointment }` | 200, 409, 422 |

**Example — `POST /me/appointments`**
```json
// Request
{ "patientId": "p-self-or-dependent", "serviceId": "svc-clean", "dentistId": null,
  "startsAt": "2026-12-01T09:15:00+03:00" }

// 201 Response
{ "data": {
    "id": "apt-uuid", "referenceNo": "A-000457", "status": "booked", "channel": "online",
    "patient": { "id": "…", "fullName": "…" },
    "dentist": { "id": "d3", "name": "د. …" },
    "chair": { "id": "c2", "name": "Chair 2" },
    "service": { "id": "svc-clean", "name": "تنظيف الأسنان", "durationMinutes": 45, "price": "200.00" },
    "startsAt": "2026-12-01T09:15:00+03:00", "endsAt": "2026-12-01T10:00:00+03:00"
} }
```
`dentistId: null` = "Any Available Dentist"; the server assigns dentist and chair.

---

## 5. Settings & Clinic Configuration

| Method | Path | Auth | Request | Response | Codes |
|---|---|---|---|---|---|
| GET | `/settings` | Staff | — | `{ clinic, branch, rules, vat, notifications }` | 200 |
| PATCH | `/settings` | A | any subset of settings fields | `{ settings }` | 200, 400 |
| PATCH | `/settings/clinic` | A | `{ nameAr, nameEn, legalName, vatRegistrationNo, phone, whatsapp, addressAr, addressEn }` | `{ clinic }` | 200, 400 |
| POST | `/settings/logo` | A | multipart `file` (png/jpg/svg ≤ 1 MB) | `{ logoUrl }` | 201, 400, 413 |
| GET | `/settings/clinic-hours` | Staff | — | `[{ weekday, startTime, endTime, validFrom?, validTo? }]` | 200 |
| PUT | `/settings/clinic-hours` | A | full list (replaces) | same | 200, 400 |
| GET | `/holidays` | Staff | `?year=` | `[{ id, dateFrom, dateTo, name }]` | 200 |
| POST | `/holidays` | A | `{ dateFrom, dateTo, nameAr, nameEn }` | `{ holiday, affectedAppointments[] }` | 201, 400 |
| PATCH | `/holidays/{id}` | A | partial | `{ holiday }` | 200, 404 |
| DELETE | `/holidays/{id}` | A | — | — | 204, 404 |

---

## 6. Dentists / Doctors

| Method | Path | Auth | Request | Response | Codes |
|---|---|---|---|---|---|
| GET | `/dentists` | Staff | `?active=true` | `[{ id, name, specialization, photoUrl, isActive, chairs[] }]` | 200 |
| POST | `/dentists` | A | `{ nameAr, nameEn, specializationAr, specializationEn, phone?, email?, bioAr?, bioEn?, acceptsOnlineBooking, staffId? }` | `{ dentist }` | 201, 400, 409 |
| GET | `/dentists/{id}` | Staff | — | `{ dentist, chairs[], assistants[], shifts[] }` | 200, 404 |
| PATCH | `/dentists/{id}` | A | partial (incl. `isActive`) | `{ dentist }` | 200, 400, 404 |
| POST | `/dentists/{id}/photo` | A | multipart `file` (jpg/png ≤ 2 MB) | `{ photoUrl }` | 201, 400, 413 |
| PUT | `/dentists/{id}/chairs` | A | `{ chairs: [{ chairId, isPreferred }] }` | `{ chairs[] }` | 200, 400 |
| PUT | `/dentists/{id}/assistants` | A | `{ assistantIds: [] }` | `{ assistants[] }` | 200, 400 |
| GET | `/dentists/{id}/shifts` | Staff | — | `[{ weekday, startTime, endTime, validFrom?, validTo? }]` | 200 |
| PUT | `/dentists/{id}/shifts` | A | full weekly list (replaces) | same; `affectedAppointments[]` if existing bookings fall outside new hours | 200, 400, 422 |
| GET | `/dentists/{id}/schedule` | Staff (D: own) | `?from&to` | `{ shifts[], blocks[], appointments[] }` | 200, 403 |

---

## 7. Services & Chairs

| Method | Path | Auth | Request | Response | Codes |
|---|---|---|---|---|---|
| GET | `/services` | Staff | `?active=` | `[{ service }]` | 200 |
| POST | `/services` | A | `{ code, nameAr, nameEn, durationMinutes, price, color, isOnlineBookable, isActive }` | `{ service }` | 201, 400, 409 |
| GET | `/services/{id}` | Staff | — | `{ service }` | 200, 404 |
| PATCH | `/services/{id}` | A | partial | `{ service }` | 200, 400, 404 |
| GET | `/chairs` | Staff | — | `[{ chair }]` | 200 |
| POST | `/chairs` | A | `{ nameAr, nameEn, notes? }` | `{ chair }` | 201, 400, 409 |
| PATCH | `/chairs/{id}` | A | partial (incl. `isActive`) | `{ chair }` | 200, 404 |

Services and chairs are deactivated, not deleted, once used.

---

## 8. Schedule Blocks (leave, blocks, emergency reserve)

| Method | Path | Auth | Request | Response | Codes |
|---|---|---|---|---|---|
| GET | `/schedule-blocks` | Staff | `?dentistId&from&to&type` | `[{ block }]` | 200 |
| POST | `/schedule-blocks/preview` | A, R | `{ dentistId, startsAt, endsAt }` | `{ affectedAppointments: [{ id, referenceNo, patient, startsAt }] }` | 200 |
| POST | `/schedule-blocks` | A, R | `{ dentistId, blockType, startsAt, endsAt, reason, notifyAffected: boolean }` | `{ block, affectedAppointments[] }` | 201, 400 |
| PATCH | `/schedule-blocks/{id}` | A, R | partial | `{ block }` | 200, 404 |
| DELETE | `/schedule-blocks/{id}` | A, R | — | — | 204, 404 |

Affected appointments are **not** moved automatically; staff reschedule/reassign each one (§9).

---

## 9. Appointments (staff)

| Method | Path | Auth | Request | Response | Codes |
|---|---|---|---|---|---|
| GET | `/availability/slots` | A, R, D | `?serviceId&date&dentistId?&chairId?` | like public, plus `chairIds[]`; ignores online-only rules | 200 |
| GET | `/appointments` | Staff | `?from&to&dentistId&chairId&status&serviceId&patientId&channel` (D/As auto-scoped) | `[{ appointment }]` (calendar feed) | 200 |
| GET | `/appointments/today-queue` | A, R | — | `{ counts: { booked, checkedIn, inTreatment, completed, noShow, cancelled }, items[] }` | 200 |
| GET | `/appointments/{id}` | Staff (scoped) | — | `{ appointment, statusHistory[], hasAllergies, billSummary? }` | 200, 404 |
| POST | `/appointments` | A, R | see example | `{ appointment }` | 201, 400, 409, 422 |
| PATCH | `/appointments/{id}` | A, R | `{ version, startsAt?, dentistId?, chairId?, frontdeskNote?, notifyPatient?, override? }` | `{ appointment }` | 200, 400, 404, 409, 422 |
| POST | `/appointments/{id}/status` | A, R, D, As (see transition table below) | `{ status, reason? }` | `{ appointment }` | 200, 403, 422 `INVALID_STATUS_TRANSITION` |
| POST | `/appointments/{id}/revert-status` | A | `{ toStatus, reason }` | `{ appointment }` | 200, 422 |
| POST | `/appointments/{id}/follow-up` | A, R, D (own) | `{ serviceId?, startsAt, dentistId? }` | `{ appointment }` | 201, 409, 422 |

**Example — `POST /appointments` (receptionist, walk-in)**
```json
// Request
{ "patientId": "p-uuid", "serviceId": "svc-consult", "dentistId": "d1", "chairId": null,
  "startsAt": "2026-11-24T17:00:00+03:00", "channel": "walk_in",
  "frontdeskNote": "Pain lower left", "checkInNow": true,
  "override": null }

// Admin override (only Admin; required when slot is taken)
"override": { "reason": "Urgent swelling, approved by Dr. …" }

// 409 Response when taken and no override
{ "error": { "code": "SLOT_UNAVAILABLE", "message": "…",
  "details": { "conflictWith": "dentist", "nextAvailable": ["2026-11-24T17:30:00+03:00"] } } }
```

**Status transition rules enforced by `POST /appointments/{id}/status`**

| From → To | Allowed for |
|---|---|
| booked → checked_in | A, R |
| booked → cancelled | A, R (reason required) |
| booked → no_show | A, R, D (only after start time) |
| checked_in → in_treatment | A, D, As |
| checked_in → cancelled | A, R (reason required) |
| in_treatment → completed | A, D |
| any → previous (correction) | A only, via `/revert-status` |

---

## 10. Patients, Medical Info, Clinical Notes

| Method | Path | Auth | Request | Response | Codes |
|---|---|---|---|---|---|
| GET | `/patients` | A, R, D (own patients), As (linked) | `?q=name\|mobile\|fileNo&page` | `[{ id, fileNo, fullName, mobileMasked, dateOfBirth, noShowCount }]` | 200 |
| POST | `/patients/duplicate-check` | A, R | `{ mobile, dateOfBirth }` | `{ matches: [{ id, fileNo, fullName }] }` | 200 |
| POST | `/patients` | A, R | `{ fullName, mobile, dateOfBirth, gender?, email?, nationalId?, emergencyContactName?, emergencyContactMobile?, preferredLocale?, acknowledgeDuplicates? }` | `{ patient, flaggedAsPossibleDuplicate }` | 201, 400, 409 `DUPLICATE_PATIENT` (unless acknowledged) |
| GET | `/patients/{id}` | scoped | — | `{ patient, family[], stats: { upcoming, completed, noShows }, balance? }` | 200, 404 |
| PATCH | `/patients/{id}` | A, R | partial | `{ patient }` | 200, 400, 404, 409 |
| POST | `/patients/{id}/deactivate` | A | `{ reason }` | `{ patient }` | 200 |
| GET | `/patients/{id}/appointments` | scoped | `?scope` | `[{ appointment }]` | 200 |
| GET | `/patients/{id}/family` | A, R | — | `{ guardians[], dependents[] }` | 200 |
| POST | `/patients/{id}/dependents` | A, R | `{ dependentPatientId, relationship }` | `{ link }` | 201, 409 |
| DELETE | `/patients/{id}/dependents/{dependentId}` | A, R | — | — | 204 |
| GET | `/patients/duplicates` | A | `?status=pending` | `[{ patient, possibleDuplicateOf }]` | 200 |
| POST | `/patients/{id}/duplicate-review` | A | `{ status: "not_duplicate" }` | `{ patient }` | 200 |
| GET | `/patients/{id}/medical` | A, D (own patients), R `+medical.view` — **every call audited** | — | `{ allergies, medicalConditions, currentMedications, medicalNotes, updatedAt, updatedBy }` | 200, 403, 404 |
| PUT | `/patients/{id}/medical` | A, D (own patients) | same fields | same | 200, 400, 403 |
| GET | `/patients/{id}/clinical-notes` | A, D (own patients) | — | `[{ note }]` | 200, 403 |
| GET | `/appointments/{id}/clinical-notes` | A, D | — | `[{ note }]` | 200, 403 |
| POST | `/appointments/{id}/clinical-notes` | D (own appointment) | `{ note, parentNoteId? }` | `{ note }` | 201, 400, 403 |
| PATCH | `/clinical-notes/{id}` | D (author, within edit window) | `{ note }` | `{ note }` | 200, 403, 422 `NOTE_EDIT_WINDOW_CLOSED` |

---

## 11. Staff Users & Permissions

| Method | Path | Auth | Request | Response | Codes |
|---|---|---|---|---|---|
| GET | `/staff` | A | `?role&active` | `[{ id, fullName, email, role, isActive, mfaEnabled, lastLoginAt }]` | 200 |
| POST | `/staff` | A | `{ fullNameAr, fullNameEn, email, phone?, role, temporaryPassword, dentistId? }` | `{ staff }` | 201, 400, 409 |
| GET | `/staff/{id}` | A | — | `{ staff, permissions[] }` | 200, 404 |
| PATCH | `/staff/{id}` | A | partial (name, phone, role) | `{ staff }` | 200, 400 |
| POST | `/staff/{id}/activate` | A | — | `{ staff }` | 200 |
| POST | `/staff/{id}/deactivate` | A | `{ reason }` | `{ staff }` (sessions revoked) | 200, 422 (cannot deactivate last admin) |
| POST | `/staff/{id}/reset-password` | A | `{ temporaryPassword }` | — | 204 |
| PUT | `/staff/{id}/permissions` | A | `{ permissions: ["medical.view", …] }` | `{ permissions[] }` | 200, 400 |

---

## 12. Billing

| Method | Path | Auth | Request | Response | Codes |
|---|---|---|---|---|---|
| GET | `/bills` | A, R | `?status&patientId&from&to&hasBalance` | `[{ bill }]` | 200 |
| POST | `/appointments/{id}/bill` | A, R | — (creates from appointment snapshot, returns existing if any) | `{ bill }` | 201 / 200 |
| GET | `/bills/{id}` | A, R | — | `{ bill, lines[], discount?, payments[], refunds[] }` | 200, 404 |
| POST | `/bills/{id}/lines` | A, R, D (own appointment) | `{ serviceId \| (descriptionAr, descriptionEn, unitPrice), quantity }` | `{ bill }` | 201, 422 `BILL_LOCKED` |
| DELETE | `/bills/{id}/lines/{lineId}` | A, R | — | `{ bill }` | 200, 422 `BILL_LOCKED` |
| POST | `/bills/{id}/discount` | A, R | `{ type: "percent"\|"fixed", value, reason }` | `{ bill, discount: { status: "approved"\|"pending" } }` | 201, 400 |
| GET | `/discounts` | A | `?status=pending` | `[{ discount, bill }]` | 200 |
| POST | `/discounts/{id}/approve` | A (`+discount.approve`) | — | `{ bill }` | 200, 422 |
| POST | `/discounts/{id}/reject` | A | `{ reason }` | `{ discount }` | 200 |
| POST | `/bills/{id}/payments` | A, R — **`Idempotency-Key` required** | `{ method, amount, reference? }` | `{ payment, bill }` | 201, 400, 422 `AMOUNT_EXCEEDS_BALANCE` |
| POST | `/payments/{id}/void` | A | `{ reason }` | `{ payment, bill }` | 200, 422 |
| GET | `/payments/{id}/receipt` | A, R | `?lang=ar\|en` | receipt data for the print page | 200, 404 |
| POST | `/bills/{id}/refunds` | A (approved immediately), R (requested) | `{ amount, method, reason, paymentId? }` | `{ refund, bill }` | 201, 422 `REFUND_EXCEEDS_PAID` |
| GET | `/refunds` | A | `?status=requested` | `[{ refund }]` | 200 |
| POST | `/refunds/{id}/approve` | A (`+refund.approve`) | — | `{ refund, bill }` | 200, 422 |
| POST | `/refunds/{id}/reject` | A | `{ reason }` | `{ refund }` | 200 |

**Example — `POST /bills/{id}/payments`**
```json
// Request (header Idempotency-Key: 6f1c…)
{ "method": "card", "amount": "100.00", "reference": "last4-4821" }

// 201 Response
{ "data": {
  "payment": { "id": "…", "receiptNo": "R-000790", "method": "card", "amount": "100.00",
               "receivedAt": "2026-11-24T18:05:00+03:00" },
  "bill": { "subtotal": "200.00", "discountAmount": "20.00", "vatAmount": "27.00",
            "total": "207.00", "paidAmount": "100.00", "balance": "107.00", "status": "partially_paid" }
} }
```

---

## 13. Notifications

| Method | Path | Auth | Request | Response | Codes |
|---|---|---|---|---|---|
| GET | `/notifications` | A | `?status&channel&templateKey&from&to&appointmentId` | `[{ id, templateKey, channel, recipientMasked, status, scheduledFor, sentAt, lastError }]` | 200 |
| POST | `/notifications/{id}/resend` | A | — | `{ notification }` | 202, 422 |
| GET | `/staff-alerts` | A, R | `?unread=true` | `[{ id, type, message, appointmentId, createdAt, isRead }]` | 200 |
| POST | `/staff-alerts/{id}/read` | A, R | — | — | 204 |
| POST | `/staff-alerts/read-all` | A, R | — | — | 204 |
| POST | `/internal/notifications/dispatch` | `X-Cron-Secret` | — | `{ queued, sent, failed, simulated }` | 200, 401 |

---

## 14. Dashboard & Reports

All report endpoints accept `from`, `to` (dates) and optional `dentistId`, `serviceId`. They return `{ series: [...], totals: {...} }` ready for charts.

| Method | Path | Auth | Returns |
|---|---|---|---|
| GET | `/dashboard/admin?period=today\|week\|month` | A | KPI cards (RPT-01) |
| GET | `/dashboard/reception` | A, R | queue counts, today's collections by method, unread alerts |
| GET | `/dashboard/dentist` | D, As | today's patients, next patient, allergy flags, weekly counts |
| GET | `/reports/appointments?groupBy=day\|week\|month` | A (R: today only) | counts by status per period |
| GET | `/reports/appointments/by-dentist` | A | counts per dentist |
| GET | `/reports/appointments/by-service` | A | counts per service |
| GET | `/reports/cancellations` | A | cancellation rate + list |
| GET | `/reports/no-shows` | A | no-show rate + list |
| GET | `/reports/new-patients?groupBy=` | A | new patients per period |
| GET | `/reports/revenue?groupBy=` | A `+reports.financial` | payments − refunds per period |
| GET | `/reports/payments` | A (R: own day) | payments by method, list |
| GET | `/reports/outstanding` | A, R | bills with balance > 0 |
| GET | `/reports/utilization` | A | booked ÷ scheduled minutes per dentist |

Codes: 200, 400 (bad range, max 366 days), 403.

---

## 15. Audit

| Method | Path | Auth | Request | Response | Codes |
|---|---|---|---|---|---|
| GET | `/audit-logs` | A | `?from&to&actorId&action&entityType&entityId&page` | `[{ id, occurredAt, actor, action, entityType, entityId, reason }]` | 200 |
| GET | `/audit-logs/{id}` | A | — | `{ …, before, after, ip }` | 200, 404 |

---

## 16. Endpoint Count

| Module | Endpoints |
|---|---|
| Auth | 9 |
| Public | 5 |
| Patient portal | 7 |
| Settings & holidays | 10 |
| Dentists | 10 |
| Services & chairs | 7 |
| Schedule blocks | 5 |
| Appointments | 9 |
| Patients, medical, notes | 18 |
| Staff users | 8 |
| Billing | 16 |
| Notifications | 6 |
| Dashboard & reports | 13 |
| Audit | 2 |
| **Total** | **125** |
