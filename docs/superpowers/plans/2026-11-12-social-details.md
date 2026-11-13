# Group covers and recommendation reactions

**Goal:** Give groups a synced chosen cover and recommendations three optional reactions.
**Architecture:** Reuse the three bundled group photos, existing owner permissions, private groups and recommendation visibility. Add a nullable group cover key and a reaction table with one row per person/post. Batch reaction counts with feed hydration; no image uploads or new dependencies.

- [ ] Add backward-compatible schema, owner-only cover RPC and visibility-protected reaction RPCs.
- [ ] Choose covers from group People settings and display consistently in group lists/header.
- [ ] Show reaction buttons with counts in feed cards and recommendation detail; allow change/removal.
- [ ] Verify ownership, privacy, counts, retries, constraints and existing flows with focused tests.
- [ ] Apply additive migration, verify SQL with isolated temporary fixtures, run lint/TypeScript and review.

Rollback retains added columns/table without rewriting or deleting existing content. Existing clients ignore cover_key and reactions. Custom photo uploads and additional reaction types are outside this first slice.
