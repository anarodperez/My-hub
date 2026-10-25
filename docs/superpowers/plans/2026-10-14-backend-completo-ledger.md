# Backend execution ledger

- User approved the design and plan; execution inline.
- Existing UI edits preserved in the current checkout. Ruling: work in place to keep the active Samsung development app and user edits together; no destructive cleanup or worktree switch.
- PostgreSQL test cluster created in ignored dist/backend-pg, localhost:55432. Existing PostgreSQL service untouched.
- Task 1: migration 002 applied successfully to isolated PostgreSQL. RLS test failed before schema existed, passed after migration: private data, foreign edits, group admission/expulsion, comments and anonymous access tested with three identities.
- Remote Supabase has not been modified; only public client credentials currently available.
- Remaining: storage tests, repository, import, app integration, groups/comments UI, remote deployment and multi-account verification.

## Continuation 2026-10-15
- Existing working tree already includes repository, cloud media/state, import, provider integration, groups and comments screens. These are pre-existing changes, not all independently verified by this continuation.
- Baseline: 36 Node tests passed; Expo lint and TypeScript passed.
- Added comments tests: empty/long body, retry UUID idempotency, mismatched retry body, deletion confirmation, invalid cursor. Two failures reproduced before fixes: deletion with zero affected rows resolved successfully; impossible cursor dates were accepted. Both now pass after narrow repository fixes.
- Added cloud-state integration tests: per-entity title update preserves audience and stable media path; upload failure retains local URI and prevents database write; foreign edits rejected; removing saved entry preserves recommendation.
- Added transactional Storage RLS tests: private/public/group access, foreign upload rejection, referenced-file deletion protection, group expulsion and public-to-private revocation. Passed against existing isolated PostgreSQL at 127.0.0.1:55432 (role hub_test). Existing hub_rls.sql also passed. No remote schema changed.
- Deployment prerequisite checked: no Supabase CLI, administrative environment configuration, or saved Supabase access token found. Public app configuration cannot apply migrations. Remote deployment and real-account/Samsung/web acceptance remain pending; instructions are in supabase/README.md.
- Storage limitation documented: existing signed URLs remain usable until expiry (currently one hour). SQL tests prove authorization for fresh reads, not immediate invalidation of already-issued URLs or HTTP Storage behavior.
- Final continuation checks: 44/44 Node tests passed, npx expo lint passed, npx tsc --noEmit passed. Local PostgreSQL stopped after SQL verification. No commit or remote deployment performed.
- 2026-10-15 GIF comments: approved gallery attachment implemented. Migration 004 applied locally and remotely; remote gif_path, private 5 MB bucket and three policies verified. Local comment_gifs.sql, hub_rls.sql and hub_storage.sql passed; 48 Node tests passed; lint and TypeScript passed. Manual playback stops after eight seconds/on route blur; reduced motion disables playback. Real-session HTTP upload and Samsung/web visual QA pending. Rollback retains attachments/schema; abandoned failed uploads may remain unreferenced (documented).
- 2026-10-15 Inicio: virtualized FlatList, server category filter, descending created_at/id cursor in pages of 20, pull refresh and explicit retry. Feed controller guards concurrent loads, refresh generations and disposal; revalidates loaded entities/comments on focus without resetting order/cursor. Groups/calendar links moved into header so they remain reachable. 57 tests, lint and TypeScript passed. Mobile opened in Expo Go; multi-page real-data scrolling and dark/web visual QA remain unverified (current account has only six sample posts). No migration or dependency added.
