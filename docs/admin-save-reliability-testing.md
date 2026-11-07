# Manual checks for save and refresh reliability (A06)

Run the app with `npm run dev`, sign in, and use an unpublished test FAQ at
`/admin/faqs`. Open browser developer tools before the failure checks.

## Refresh preserves a draft

1. Edit a FAQ and change its answer without saving.
2. Select **Refresh list** in the page header.
3. Confirm the table refreshes and **Last loaded** advances, while the editor
   retains your answer and **Unsaved changes** indicator.
4. Select **Cancel**, the close button, another record's **Edit**, or an admin
   navigation link. Decline the discard prompt and confirm the draft remains.

## A rejected save keeps the form

1. Put more than 250 characters in the FAQ question, then save.
2. Confirm the server's field-validation error appears, the form remains open,
   and its input is retained. The Network panel should show a 422 PATCH response.
3. Correct the question and save. Confirm the editor closes and the updated
   value appears in the table.

## A successful save followed by a failed refresh

1. Open an existing test FAQ in the editor.
2. In developer tools, enable request blocking for the exact list URL, for
   example `http://localhost:3000/api/admin/faqs`. Adjust the port if needed.
   Block only that URL; leave `/api/admin/faqs/<record-id>` unblocked.
3. Change the answer and save. Use **Edit**, not **Add new**, because creation
   uses the same URL as the list.
4. Confirm the PATCH succeeds, its subsequent list GET is blocked, and the page
   shows both a saved confirmation and a refresh warning. Further writes should
   be disabled until the list can refresh.
5. Disable request blocking and select **Refresh list**. Confirm the saved
   answer appears, the warning clears, and editing is enabled again. There
   should have been just one PATCH, without an automatic retry.

## An expired session preserves input

1. Edit the test FAQ and enter an unsaved answer.
2. In developer tools under Application/Storage > Cookies, remove the admin
   session cookie for this site. Its name is `universal_admin_session` in
   development, or `__Host-universal_admin_session` in production.
3. Save. Confirm the PATCH returns 401, the page explains session expiry, and
   the draft remains open. No success confirmation should appear.
4. Select **Sign in in a new tab**, sign in there, and return to the original
   editor tab.
5. Select **Refresh list**. Confirm the expiry notice clears, your draft remains,
   and you can explicitly save it.

## A connection failure leaves the mutation outcome unknown

1. Edit the test FAQ and change its answer.
2. Set the Network panel to **Offline**, then save.
3. Confirm the page says the outcome is unconfirmed and asks you to refresh and
   check the record. It must retain the draft and disable further writes.
4. Restore the Network panel to **Online**, then select **Refresh list**.
5. Compare the table with your draft before deciding whether to save again.
   No mutation should be retried automatically.

## The lead queue refreshes while idle

1. Open `/admin/bookings` with no editor open and keep the tab visible.
2. In the Network panel, confirm one list GET approximately every 30 seconds.
3. Open an editor or switch away from the tab. Confirm polling pauses while an
   editor is open and no new polling requests are sent while the tab is hidden.
4. Manual **Refresh list** should retain an open editor's selected status.

Restore request blocking and network settings after testing, and remove your
test FAQ when finished.
