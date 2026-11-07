# Service-area names and display positions

Area names are trimmed, repeated spaces collapsed, and word starts capitalized when saved. Acronyms such as ECIL and RGI Airport retain their capitalization. Create and edit reject an existing name regardless of capitalization or extra whitespace. PostgreSQL also enforces normalized uniqueness, including for direct writes.

Display position starts at **1** in the admin screen. A new area defaults to the end. To move an area, edit its position and save; the intervening areas shift automatically. Deleting an area closes the gap. Inactive areas retain their positions and are excluded from the public list, whose relative order matches the admin list. Internally, `sortOrder` remains zero-based for API compatibility. An omitted position appends on creation and keeps the current position on edit. An API position beyond the end is clamped to the end.

Apply the database migration with `npx prisma migrate deploy` when deploying this change. It merges existing capitalization/whitespace duplicates, preferring a name starting with a capital letter and then the record with more subtitle/description content. Every removed record is preserved in `LocationDuplicateArchive` with its complete original data and the retained record's ID. It then converts tied/gapped positions into consecutive positions in the existing ascending order, breaking ties by name and ID. The expression index is SQL-managed and must be retained in future migrations; `prisma db push` is not a substitute for this migration.

Different spellings remain distinct. For example, `secuderabad` (missing an “n”) is not the same spelling as `Secunderabad`. Review and delete that mistaken entry through the admin panel if it was a test; automatic spelling correction could merge genuinely different places.

Regression coverage: `tests/admin-mutations.test.ts` exercises creation/edit duplicate rejection, capitalization, default appending, insertion/movement/deletion, and atomic rollback of reordered rows and audit entries. `tests/location-migration.test.ts` verifies legacy duplicate archival and database uniqueness in isolated PostgreSQL engines.
