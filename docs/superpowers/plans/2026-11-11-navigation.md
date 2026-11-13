# Shared navigation implementation plan

**Goal:** a coherent app shell and a predictable Amigas → group → People flow.

**Approach:** move the existing primary destinations into a shared shell around the root Stack; retain Tabs for route state with no duplicate tab bar. Reuse current routes and house components. Group identity and navigation become shared components.

- [x] Test active destinations, shell visibility, mobile layout and navigation actions.
- [x] Implement the authenticated shell and simplify the tab layout.
- [x] Share group covers, identity and four section tabs; preserve calendar entry intent and invitation permissions.
- [x] Refine shared palette, headers and group cards; expose invitations before member management.
- [x] Run focused regressions, lint and typecheck; inspect render when available and document limitations.

Review direct links, account recovery, editor dismissal, group membership revocation, narrow screens and enlarged text. Do not change backend permissions or remove confirmation prompts.

Validation: full suite 172/172 passed before final fallback-only adjustment; final typecheck and focused checks below. Global lint retains 14 existing hook errors, including the pre-existing effect in group/[id].tsx. Independent review found no important defects; runtime navigation and visual QA remain a stated limitation.
