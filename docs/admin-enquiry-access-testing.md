# Manual checks for enquiry access and feedback

Start the app with `npm run dev` and sign in. Use disposable test enquiries and
unpublished test content when changing records.

## Find and open an enquiry

1. Open **Booking Leads**. Search by customer name, phone, or the full enquiry
   reference. Combine that with car, status, and submitted-date filters.
2. Check the matching count and move between pages. Change the page size, copy
   the URL into another tab, and confirm the same filters are restored.
3. Select **View enquiry**. Confirm the complete request is visible, including
   the end of a 500-character note, plus contact details and India-time dates.
4. Select **Update status** and save. Confirm a success toast and the refreshed
   status. This is a manual lead status; it does not reserve a car or collect money.
5. Open the dashboard and select a customer's name under **Latest Enquiries**.
   Confirm it opens that exact enquiry. **New Leads** should open the NEW filter.

## Export exactly the selected matches

1. Apply filters and select **Export filtered CSV**.
2. Confirm the file includes all matching pages, enquiry references, full notes,
   and explicitly labelled UTC timestamps. Submitted-date filters use India time.
3. If more than 10,000 records match, confirm an explanatory toast and no partial
   file; narrow the filters and export again.
4. Expire the session and try exporting. Confirm a sign-in toast and the sign-in
   link on the page, rather than navigating to a JSON error page.

## Read older audit history

1. Open **Audit Trail** and filter by actor email/ID, action, resource, and date.
2. Move between pages and confirm the URL preserves the filters.
3. **Refresh list** should retain the current filters and page.

The automated tests use 351 enquiries and 351 audit entries in an isolated
PostgreSQL engine to check access past the former 300-record limit.

## Check toast and confirmation feedback

1. Submit invalid login credentials. Confirm a toast appears on the login page.
2. Save an unpublished test FAQ. Confirm a success toast. Trigger server-side
   validation and confirm an error toast while the draft stays open.
3. Edit a record without saving, then close it, switch records, navigate, apply
   filters, or sign out. Confirm a styled dialog; **Cancel** must keep the draft.
4. Delete disposable test content. Confirm a styled delete dialog; cancellation
   must leave the record intact. Confirming deletion should produce a toast.
5. In the public enquiry form, enter only one of pickup/return dates. Confirm a
   date-validation toast.
6. Follow `admin-save-reliability-testing.md` for failed refresh, expired-session,
   and unknown-request-outcome checks.

Application code no longer calls `alert`, `confirm`, or `prompt`. Closing or
reloading a tab with unsaved work still uses the browser's own leave-page warning;
browsers do not allow a custom toast to replace that system-controlled dialog.

## Code changes and reasons

| File                                                                                                    | Reason                                                                                                                    |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/admin-query.ts`                                                                                | Validates filters and pagination, defines India-date boundaries, and builds shared list/export conditions.                |
| `src/lib/admin-records.ts`                                                                              | Reads filtered counts and pages in a consistent transaction with deterministic ordering.                                  |
| `src/lib/admin-data.ts`                                                                                 | Removes the legacy hard-coded 300-record enquiry/audit reads.                                                             |
| `src/app/api/admin/[resource]/route.ts`                                                                 | Returns paginated enquiry/audit results and rejects invalid filters.                                                      |
| `src/app/admin/[resource]/page.tsx`                                                                     | Restores filters from the URL and supplies the initial result count and page.                                             |
| `src/components/admin-record-filters.tsx`                                                               | Adds lead and audit filter controls.                                                                                      |
| `src/components/admin-manager.tsx`                                                                      | Adds page navigation, filtered CSV downloads, lead links, global toast feedback, and styled discard/delete prompts.       |
| `src/lib/admin-requests.ts`                                                                             | Refreshes the selected filters/page and validates paginated responses while retaining the existing save-outcome handling. |
| `src/app/api/admin/bookings/export/route.ts`                                                            | Exports all selected matches with stable references and UTC labels; refuses oversized exports explicitly.                 |
| `src/app/admin/bookings/[id]/page.tsx`                                                                  | Adds an authenticated full enquiry view, contact links, and manual status editing.                                        |
| `src/lib/lead-contact.ts`                                                                               | Normalizes supported phone formats for correctly addressed call/WhatsApp links.                                           |
| `src/app/admin/page.tsx`                                                                                | Links dashboard customers to their enquiry and the New Leads card to the NEW filter.                                      |
| `src/components/app-feedback.tsx`                                                                       | Provides a shared styled confirmation dialog and makes the existing toast provider available throughout the app.          |
| `src/app/layout.tsx`, `src/app/admin/layout.tsx`                                                        | Mount feedback once at the root, including login and public forms.                                                        |
| `src/components/admin-login.tsx`, `src/components/booking-form.tsx`, `src/components/logout-button.tsx` | Replace inline request errors with toasts and preserve the unsaved-work decision before sign-out.                         |
| `src/components/request-notice.tsx`                                                                     | Shows invalid list-query feedback through a toast and a readable persistent explanation.                                  |
| `src/app/globals.css`                                                                                   | Styles the confirmation dialog, filter controls, page navigation, and full enquiry details.                               |
| `tests/admin-records.test.ts`, `tests/lead-details.test.tsx`                                            | Verify older-record access, filters, exports, complete notes, contacts, and authentication.                               |
| `tests/admin-requests.test.ts`, `tests/admin-auth.test.ts`                                              | Cover the paginated response contract and update existing authentication regression checks.                               |
