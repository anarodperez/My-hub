# Wishlist collections

Approved direction: personal collections, one collection per item, desktop collection navigation and mobile tabs, search/status/category filters and uniform cards. Existing wishes and saved discoveries stay unassigned. Default collections are Para mí and Ideas para regalos. Creation, renaming, removal and moving items must persist across devices. Removing a collection never removes its items.

Implementation: store the collection names and item assignments in a new optional JSONB field in the existing private, revision-checked user preferences. No wishlist rows need rewriting. Older clients omit this field and preserve it. Keys distinguish wishes from saved discoveries. One preference write atomically renames/removes collections and assignments. Revert by restoring the previous client; retain the added column and all collection data.

- [x] Add validation, collection selectors, ordering and tests for preservation, counts, moving and removal.
- [x] Add the additive SQL migration, preference mapping and repository validation. Verify account isolation and old-client writes.
- [x] Implement collection navigation/management, assignment from new/edit wish and existing tiles, and a responsive Wishlist layout.
- [x] Run focused tests, TypeScript, lint and web build. Apply the additive migration using the configured database connection, verify its shape without reading personal records.

Constraints: Expo 58, Expo Router, no new dependencies, Spanish copy, existing warm palette and typefaces, touch targets at least 48, no secret values in logs. Do not modify unrelated existing lint errors.

Review: corrected removal to use the collection being edited rather than the current tab; wish creation keeps its ID across retries and explains partial persistence. Regression tests cover both. Default ordering preserves the original list; A–Z combines wishes and saved discoveries before sorting.

Verification: Node suite passed (133 tests before the final repository compatibility test, which also passes separately), TypeScript and production web export passed. Expo lint still reports the same 25 preexisting errors, none in the feature files. Additive migration applied and reapplied successfully; remote SQL checks used only temporary rows and rolled back. Browser visual verification remains unavailable from the earlier browser-control limitation. The Impeccable detector could not run because its launcher now requires an unavailable engine cache; no tools or dependencies were installed for it.
