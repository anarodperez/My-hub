# Image budget implementation plan

**Goal:** Reduce new photo storage and transfer usage on Supabase Free without changing privacy or deleting referenced images.
**Approach:** Optimize at the shared upload boundary using Expo 58 ImageManipulator, reuse signed URLs only within their validity and account session, and clean replaced files only after successful saves with database reference protection.

- [x] Resize new photos to at most 1280 pixels and encode WebP, with bounded retries and a 256 KiB output limit.
- [x] Apply to personal covers, moments, avatars, group uploads and legacy imports; preserve GIF validation and animation.
- [x] Reuse private signed URLs within their expiry, coalesce concurrent requests, bound memory and reset on account change.
- [x] Add reference-aware Storage deletion protection including Mi momento; attempt cleanup after successful personal saves only.
- [x] Test transformation limits, failures, caching, authorization and reference preservation; run TypeScript, lint and web compilation.

No bulk recompression or deletion of existing files. Rollback keeps the additive safety function/policy and existing immutable paths.

Validation: 39 focused tests pass, TypeScript passes, and the temporary-table SQL cleanup probes pass against the configured project. Web responds HTTP 200 after restarting Metro with two workers to avoid Windows EMFILE. Lint retains 14 existing errors. Reviewer finding addressed: decoding is bounded at 1280×1280 before the first render, limiting peak memory. Live browser/mobile encoding and upload have not been exercised.
