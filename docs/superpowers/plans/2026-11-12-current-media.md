# Mi momento and compact collections

**Requested outcome:** Compact collections instead of fragmented mosaics; separate optional series, film, book and song slots on Home.
**Implementation:** Reuse collection filtering, LoadingImage, existing song storage and forms. Store the three new slots in private user preferences with existing revision checks and Storage. No new dependencies or public sharing.

- [x] Replace mosaics with compact single-thumbnail navigation.
- [x] Add Mi momento, showing only filled slots and offering all four categories from its menu.
- [x] Add title, optional cover, current/finished state, edit and removal for the three new slots.
- [x] Preserve existing songs, other slots and old clients; keep uploaded paths stable.
- [x] Apply additive schema to the matching configured Supabase project and run temporary SQL tests.
- [x] Address review finding: local-state validation permits web data URLs before upload; repository validation requires persisted paths.
- [x] Verify: 38 focused tests and TypeScript pass; SQL tests pass; local route HTTP 200. Lint retains 14 pre-existing errors. Visual browser/mobile verification remains unavailable.

Rollback: use the previous client while retaining the nullable current_media column and validator. No existing account data was rewritten by the migration or its tests.
