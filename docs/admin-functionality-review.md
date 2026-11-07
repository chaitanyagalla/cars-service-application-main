# Admin functionality review and implementation plan

**Reviewed:** 6 November 2026  
**Scope:** Existing repository implementation; planning only. No application code, database records, schema, configuration, or dependencies changed.

## 1. Overall assessment

The admin already supports the main workflows for a **car catalogue and WhatsApp enquiry website**. It is not yet a rental operations system: marking an enquiry `CONFIRMED` does not reserve a physical vehicle, check date overlaps, record an agreed price, or collect payment.

The next implementation should improve access to enquiries and the reliability of admin changes before adding large modules. The most important gaps are:

1. Enquiries and audit entries older than the latest 300 cannot be reached through the admin interface.
2. Staff cannot read a customer's complete long enquiry notes inside the admin interface.
3. A mutation can commit successfully and then return an error if its separate audit write fails.
4. Concurrent editors can silently overwrite changes, and concurrent staff-account actions can leave no active administrator.
5. Upload and refresh handling can leave the editor or table in a misleading state.

No authentication bypass was identified in this review. That is a source-review finding, not a penetration-test assurance. Multiple staff roles, payments, and automated reservations are product expansion decisions, rather than missing requirements of the documented enquiry-only model.

## 2. What is already implemented

| Area             | Implemented functionality                                                                                                                                           | Boundary / limitation                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Dashboard        | Total cars, published cars accepting enquiries, active service areas, total enquiries, new leads, published testimonials, latest eight enquiries                    | No reporting period, trends, follow-up queue, or record-specific detail links                              |
| Cars and pricing | Create, edit, delete; publication and enquiry availability; category, specifications, price tiers, deposit, distance/time charges, featured badge and display order | A car is a catalogue entry; no physical vehicle allocation or calendar                                     |
| Images           | Cover image URL and preview; optional Cloudinary cover upload; gallery URLs                                                                                         | Cloudinary depends on environment configuration; gallery upload/library/cleanup absent                     |
| Locations        | Create, edit, delete, activate/deactivate, order                                                                                                                    | Description is saved but not rendered on the public locations page                                         |
| FAQs             | Create, edit, delete, publish/unpublish, order                                                                                                                      | No draft preview or revision history                                                                       |
| Testimonials     | Create, edit, delete, rating, staff verification flag, publication                                                                                                  | Permission is an instruction in the UI; no permission evidence is stored                                   |
| Booking leads    | Saved public enquiries, customer contact details, car, area, optional dates, notes, manual status changes                                                           | Admin editor changes status only; no manual lead creation or full detail view                              |
| CSV export       | Authenticated export, escaped cells and formula-prefix mitigation                                                                                                   | Latest 10,000 records only; no filters, stable lead ID, or explicit truncation notice in the download flow |
| Site settings    | Business name, WhatsApp, phone, email, address, map URL, hero headline and description                                                                              | Requires seeded settings row; brand assets, SEO and most page copy remain in code                          |
| Staff accounts   | Create/edit/delete admins, activate/deactivate, password reset; own deletion/deactivation blocked                                                                   | Single `ADMIN` role intentionally grants all admin capabilities                                            |
| Authentication   | Password hashing, signed one-hour JWT, HttpOnly cookie, live database session checks, logout revocation, password/email-change revocation, login throttles          | No MFA, session-management screen, expiry warning or account recovery workflow                             |
| Audit trail      | Successful login and main resource create/update/delete events; read-only listing                                                                                   | No field differences, preserved actor identity after account deletion, or history pagination               |

Evidence: [admin navigation](../src/app/admin/layout.tsx), [dashboard](../src/app/admin/page.tsx), [admin editor](../src/components/admin-manager.tsx), [resource queries](../src/lib/admin-data.ts), [authentication walkthrough](authentication.md), and [schema](../prisma/schema.prisma).

## 3. Existing defects and implementation gaps

**Priority:** P1 = next implementation phase; P2 = subsequent usability and consistency work. Priorities reflect this project's enquiry workflow, not a general security severity score. Findings below are established from source unless explicitly described as a scenario to reproduce.

### A01 — Older leads and audit records become inaccessible (P1)

**Evidence:** `src/lib/admin-data.ts:46–64` limits bookings and audit listings to `take: 300`. The GET endpoint ignores query parameters, and the table has no pagination, search, or filters. Other resource lists load every row without pagination.

**Impact:** Once 301 newer enquiries exist, an older open enquiry disappears from the working interface even though it remains in the database. Dashboard totals can exceed the number of reachable records. CSV export is a partial workaround for leads, not an admin editing workflow; audit history has no such export.

**Plan:** Add server-side pagination, total counts and deterministic ordering. For leads, support customer name/phone, car, status and date filters. For audits, support actor, action, resource and date filters. Preserve filters in the page URL.

**Acceptance:** A seeded dataset over 300 rows remains fully reachable, filters apply before pagination, and an old lead can be opened and updated without using CSV or database tools.

### A02 — No complete enquiry detail view (P1)

**Evidence:** `src/components/admin-manager.tsx:263–294` truncates displayed strings to 170 characters. The booking editor contains only the status field, while `bookingSchema` accepts notes up to 500 characters.

**Impact:** Staff can miss important instructions after character 170. The full note is present in the API result and CSV, but has no readable admin control. The table also lacks a visible enquiry reference and direct call/WhatsApp actions.

**Plan:** Add a booking detail drawer or page with the full note, stable reference, contact actions, car, pickup/return dates, submitted time and status controls. Make dashboard enquiries link to the same view.

**Acceptance:** A 500-character note is visible in full; staff can open a specific lead by URL and contact the correct customer. WhatsApp contact should open a draft, not claim a message was delivered.

### A03 — Mutations and audit writes are not atomic (P1)

**Evidence:** In `src/app/api/admin/[resource]/route.ts:83` and `[resource]/[id]/route.ts:116,146`, audit creation runs after the mutation. Even the transactional staff and booking updates write their audit entry outside the transaction. Login already writes its event within its transaction.

**Impact:** If the audit insert fails after a successful create/update/delete, the endpoint reports failure even though data has changed. Retrying a create may produce a duplicate or unique-constraint error. The audit log cannot reliably explain the committed change.

**Plan:** Put each mutation and its required audit event in one database transaction. Record a redacted before/after difference, especially status changes. Preserve a minimal actor identifier according to the chosen retention policy: deleting a staff account currently sets historical `userId` to null and the UI displays `Deleted user`.

**Acceptance:** Inject an audit-write failure and verify that the resource mutation rolls back. Verify that password hashes, plaintext passwords and unnecessary customer data never enter audit differences. Add events for exports, credential resets and other sensitive actions; choose deliberately how to record logout and failed logins.

### A04 — Concurrent edits silently overwrite each other (P1)

**Evidence:** The editor sends all editable fields. PATCH accepts no version or original modification timestamp. `Car.updatedAt` exists but is not checked; several other editable models have no revision field. The booking row lock serializes updates but does not detect a stale operator decision.

**Impact:** If two admins open the same car and one changes the price, the second admin can save an older price while only intending to change the description. Similar overwrites affect settings and lead statuses.

**Plan:** Add optimistic concurrency using a revision or modification timestamp checked atomically by the update. Return a conflict response and let the editor reload or reconcile changes.

**Acceptance:** Two clients editing the same revision cannot both save without a visible conflict. The first change remains intact, and the second editor retains its unsaved input.

### A05 — Image upload is not tied to the active record (P1)

**Evidence:** `src/components/admin-manager.tsx:219–230` applies the upload result to whichever form is current when it finishes. Saving checks `busy`, not `uploading`; editor switching, cancellation and repeated upload selection are not blocked while a file is uploading.

**Impact:** Source-derived scenarios to reproduce: start uploading for car A, open car B, and A's result can replace B's cover; save before an upload finishes and the old URL can be persisted; two uploads can finish in reverse order.

**Plan:** Associate uploads with an editor/record identifier and request generation, ignore stale results, and disable or coordinate save while the active upload is pending. Define cancellation behavior and orphan cleanup.

**Acceptance:** Delayed or reordered uploads never alter another record's form. Saving during an upload follows an explicit policy and cannot silently omit the selected image.

### A06 — Refresh failures can be reported as successful saves (P1)

**Evidence:** `src/components/admin-manager.tsx:172–174` ignores non-OK reload responses. Save/delete then show success. A network rejection during reload is caught as if the mutation failed, even if the mutation already succeeded. Initial rows are refreshed only after a mutation or page navigation/reload.

**Impact:** A stale table can remain visible after a successful action. After session expiry or a temporary network failure, staff may retry an operation that already committed. New enquiries do not appear while the screen sits open.

**Plan:** Distinguish mutation outcome from refresh outcome; handle 401 explicitly; keep a clear stale-data/retry state. Add a manual refresh control and last-updated time. Add modest polling or new-lead notifications if the screen is used as a live work queue. Preserve dirty forms during refresh and warn before discarding edits.

**Acceptance:** A successful save followed by failed refresh is reported accurately. Session expiry leads to a clear sign-in path. Refreshing data does not discard an edited form without warning.

### A07 — Last-active-admin protection is incomplete under concurrency (P1)

**Evidence:** `src/app/api/admin/[resource]/[id]/route.ts:58–75,135–141` blocks self-deactivation and self-deletion. Deletion checks the active count outside a transaction; deactivation does not enforce a shared active-admin invariant.

**Impact:** Source-derived race scenario to reproduce: admins A and B each pass authorization, then disable one another. Both requests can succeed and leave zero active admins. Concurrent mutual deletion can also pass both count checks. Per-target account locks do not serialize a rule spanning all active admins.

**Plan:** Enforce the same at-least-one-active-admin rule for deletion and deactivation under shared transaction-level serialization, using a dedicated lock or equivalent strategy with retries. Keep the self-action protections.

**Acceptance:** Concurrent mutual deletion/deactivation tests always leave at least one active admin. A blocked request receives a useful explanation.

### A08 — Settings cannot be initialized or repaired from admin (P2)

**Evidence:** `src/lib/store.ts` supplies public fallback settings if `main` is absent. The admin list reads existing rows, creation is disabled for settings, and PATCH always updates `id: 'main'`. The route accepts a different URL ID but logs that supplied ID.

**Impact:** If seeding was missed or the singleton row is absent, the public site can display fallback values while the admin shows an empty settings table with no recovery action. An arbitrary settings URL ID can produce a misleading audit resource ID.

**Plan:** Provide a singleton settings screen backed by safe initialization/upsert; validate the singleton ID and log the actual updated record. Surface fallback use clearly.

**Acceptance:** The settings screen can initialize an empty database's singleton through an authorized workflow. A noncanonical ID is rejected or normalized consistently.

### A09 — Some admin inputs do not match their saved/public behavior (P2)

**Evidence and corrections to plan:**

- The testimonial rating input uses `step="0.1"` (`admin-manager.tsx:422`), but the server requires an integer from 1 to 5 (`validation.ts`). Use a matching integer selector with the same bounds and field-level errors.
- Location `description` is editable and stored, but `src/app/locations/page.tsx` and the home location cards render only name/subtitle. Decide whether to display it or remove the misleading editing affordance.
- Testimonial `carName` is editable and stored, but home review cards do not display it. Decide whether it belongs in the public card or should be labeled as internal information.
- Admin-created testimonials default to published because `newDefaults.published` is true; the database default is false. The UI asks for permission but stores no permission evidence. Default new testimonials to drafts and decide what permission record publishing requires.
- Admin business-name edits update some public text, but global SEO titles and logo labels remain hardcoded in `src/app/layout.tsx` and `src/components/site-shell.tsx`. Clarify the setting's scope or wire the relevant branding consistently.

**Acceptance:** Controls accept the same values as the server, every editable field has a clear purpose, and creating a testimonial requires an explicit publishing decision.

### A10 — Unavailable car detail pages retain a broken WhatsApp action (P2)

**Evidence:** `src/app/cars/[slug]/page.tsx` hides the enquiry form when `available` is false, but still renders `Book on WhatsApp` pointing to `/api/whatsapp/[slug]`. That endpoint returns 404 for unavailable cars. The listing card already handles unavailability separately.

**Impact:** An admin's availability toggle creates a customer action that opens an error page.

**Plan:** Show an unavailable state and a suitable alternative contact or browse action on the detail page.

**Acceptance:** Turning enquiry availability off consistently updates the listing, detail page, form and WhatsApp action; the public API must continue rejecting new enquiries for the unavailable car.

## 4. Missing features to consider

These are proposals, not assertions that the current code violates an agreed requirement. Source absence is based on the reviewed admin components, route set and Prisma schema.

### Useful for the current enquiry business

| Feature                                 | Current gap                                                                                                                     | Proposed scope / completion criterion                                                                                                                                                                | Suggested timing                            |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Manual enquiry creation and corrections | Only the public form creates leads; admin can update only status                                                                | Staff can record phone/WhatsApp enquiries and correct name, phone, area, car and dates; preserve change history and enquiry source                                                                   | After Phase 1                               |
| Follow-up workspace                     | No staff notes, owner, reminder, last-contact time, or closed/cancelled reason                                                  | Separate customer-submitted notes from timestamped internal notes; add assignment and due follow-ups                                                                                                 | After lead detail view                      |
| Lead notifications                      | No email/in-app new-lead alert or unattended-lead queue                                                                         | Start with an in-app unread/new indicator and pending-follow-up list; choose an external notification channel separately                                                                             | After refresh behavior                      |
| Deliberate status policy                | Except for completion/rated-history checks, the API allows any enum transition                                                  | Agree valid moves and required reasons; preserve from/to history. If confirmation represents a rental, define required dates, agreed price and allocation first                                      | During lead-workflow design                 |
| Reliable filtered exports               | Fixed latest-10,000 export with no query controls or lead ID                                                                    | Export the selected filters, include stable references and a stated timezone, and support complete chunked exports or explicit limits                                                                | With pagination                             |
| Personal account and session management | Self-password edit exists through Staff Users, but no dedicated current-password flow, device/session list or revoke-all action | Add an account screen with current-password reauthentication for sensitive self-changes, active-session visibility and logout-all                                                                    | After Phase 1                               |
| Account recovery                        | Another signed-in admin can reset a password; bootstrap script refuses when any active admin exists                             | Document and implement a controlled owner recovery path for the sole-admin-forgot-password case; test it without weakening public login                                                              | Before operational handover                 |
| MFA                                     | Password-only login                                                                                                             | Choose TOTP or passkeys with enrollment and recovery, based on the deployment and owner needs                                                                                                        | Before exposing a valuable production admin |
| Retention and anonymization             | No booking deletion/anonymization workflow; old sessions and throttle keys have no scheduled cleanup in the repo                | Agree retention periods, create restricted anonymization and scheduled cleanup, account for historical Customer/CarRating relations, and retain necessary non-personal history                       | Before sustained real-data collection       |
| Dashboard reporting                     | Only lifetime counters and latest eight enquiries                                                                               | Add date filters, enquiries by status/car, conversion and follow-up counts; do not call confirmed-lead totals revenue                                                                                | After reliable status history               |
| Media management                        | Single cover uploader and raw gallery URL entry                                                                                 | Multiple gallery uploads, reorder/remove/preview, provider asset IDs, safe orphan cleanup and useful upload errors                                                                                   | After upload correctness                    |
| Content and publishing                  | No policy/about/SEO editor, logo settings, preview or revision rollback                                                         | Start with the specific business-owned text that changes often; policies currently display draft notices. Add preview and explicit publication; preserve old-slug redirects if slugs remain editable | According to content needs                  |
| Bulk actions and recovery               | Single-row edits and permanent deletes for content                                                                              | Add scoped bulk publish/unpublish/order actions with clear selection feedback; consider archive/restore where accidental deletion matters                                                            | Later, when record volume warrants          |

**Important distinctions:** Customer login and new customer rating submission were intentionally removed. Do not reinstate them as an incidental admin improvement. Historical ratings are read-only; testimonials are a separate admin-managed feature. WhatsApp link clicks do not prove a message was sent, and direct WhatsApp clicks currently do not create leads. Optional click analytics should remain distinct from saved enquiries and confirmed rentals.

### Only if the product expands into rental operations

| Module                                     | What implementation would require                                                                                               | Decision before building                                                         |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Physical fleet and availability calendar   | Vehicle instances, registration/reference, maintenance blocks, pickup/return schedule, allocation and atomic overlap prevention | Is each existing Car one physical vehicle or a model with multiple vehicles?     |
| Confirmed rental record and quote snapshot | Link enquiry to rental; preserve agreed rates, currency, deposit and charges instead of reading today's car price               | What exactly does `CONFIRMED` mean to the business?                              |
| Pickup and return operations               | Actual handover/return, odometer, fuel, condition, damage and late-return handling                                              | What evidence and approvals are needed at each handover?                         |
| Payments, deposits, refunds and receipts   | Separate financial records, payment status, provider verification, refund handling and reconciliation                           | Is money managed outside the system, manually recorded, or collected online?     |
| Document verification                      | Restricted document storage, verification state, retention and access controls                                                  | Does the website need to hold documents, or will staff verify outside it?        |
| Staff permissions                          | Owner/admin/operator roles, endpoint enforcement and matching UI restrictions                                                   | Single `ADMIN` is intentional today; add roles when staff duties actually differ |
| WhatsApp integration                       | Provider integration, opt-in handling, verified webhooks, delivery states and inbox ownership                                   | Are draft links sufficient, or is an integrated communication inbox required?    |

An availability toggle is sufficient to stop new enquiries globally for a listing. It is not a substitute for date-specific reservations. Build the physical-fleet and rental data model before promising automated booking availability.

## 5. Recommended implementation order

### Phase 1 — Make the existing admin dependable

1. **Enquiry access:** A01 and A02; include filtered exports and direct dashboard-to-lead navigation.
2. **Mutation integrity:** A03 and A04; settle the audit shape and revision contract before extending update routes.
3. **Account continuity:** A07; add a documented recovery procedure for the owner.
4. **Editor reliability:** A05 and A06; coordinate uploads, saves, refreshes and session expiry.
5. **Consistency fixes:** A08–A10, including draft testimonial defaults and field validation parity.

**Phase exit:** Staff can find any lead, read the full request, safely update data alongside another admin, and understand the outcome of a failed request. These changes should not imply automatic vehicle reservations or payments.

### Phase 2 — Improve daily follow-up and administration

Add manual enquiries/corrections, internal notes, assignment, reminders, contact actions and agreed status rules. Add account/session tools, MFA as appropriate, retention workflows, media management and the specific content controls the owner needs. Reporting should use the newly reliable status history.

### Phase 3 — Expand only after the rental model is agreed

If required, design physical vehicles, rental periods, quote snapshots and reservations first. Then add handovers, financial records, verification and external integrations in dependency order. Do not implement payment or document collection merely to complete an admin checklist.

## 6. Verification performed and remaining test plan

### Performed during this review

- Read admin pages, the shared editor, admin/auth/public enquiry routes, CSV export, upload handling, validation, security helpers, Prisma schema/migrations, public consumers and existing documentation.
- **`npm.cmd test`: PASS — 3 files, 32 tests.** Authentication routes use mocked Prisma access; migration tests use isolated in-memory PGlite PostgreSQL. These tests do not use the configured Neon database.
- **`.\node_modules\.bin\tsc.cmd --noEmit --incremental false`: PASS.** Disabling incremental output avoided writing a TypeScript build cache for this check.
- No new tests or application code were written. No server build, migration, seed, credential change, live database query or authenticated browser workflow was performed. Cloudinary configuration, deployed proxy behavior, production backups and runtime UI layout were not verified.
- `next-env.d.ts` was already modified before this review and was left untouched. The only intended addition from this review is this report.

### Tests to implement with the fixes

| Area                    | Meaningful verification                                                                                                                                         |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| List/detail/export      | More than 300 leads; old open leads; search/filter correctness; full 500-character notes; deterministic pagination; filtered export and limit disclosure        |
| CRUD and errors         | Happy paths for all resources; invalid inputs; duplicates; missing records; linked-car delete restriction; unauthorized writes and DELETE coverage              |
| Atomicity/concurrency   | Audit failure rollback; two stale editors; simultaneous mutually disabling/deleting admins; lead status conflicts against a real isolated database              |
| Editor/upload lifecycle | Slow upload then save; upload then switch/cancel; reversed completion order; successful mutation followed by failed reload; expired session and unsaved changes |
| Public consistency      | Publish/unpublish and availability across pages/APIs; settings initialization; location/testimonial field behavior; draft testimonial publication               |
| Status workflow         | Existing completion guards, future return time, retained rated-history rules, and whatever transition policy is agreed                                          |

Existing passing tests provide useful authentication coverage, but do not establish complete CRUD correctness, admin browser usability, upload success handling, export completeness, or concurrency safety.

## 7. Decisions for the planning discussion

1. Keep this as an enquiry website, or expand into a reservation/rental system?
2. Can all staff keep full admin access, or are owner/operator permissions needed?
3. Should phone and direct WhatsApp enquiries be entered manually into the same lead queue?
4. Which statuses and follow-up rules reflect the actual business process?
5. Which public content must the owner edit without a developer, and what permission record is needed before publishing testimonials?
6. How should owner recovery, customer-data retention and production notifications work?

**Recommended starting scope:** Phase 1, followed by manual lead handling and follow-up tools. Decide on calendar, payments and integrations separately before planning their schema or implementation.
