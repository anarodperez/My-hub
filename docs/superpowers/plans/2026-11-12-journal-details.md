# Journal details implementation plan

**Goal:** Implement the five visual improvements requested for Home and Wishlist.
**Architecture:** Reuse existing cards, collection selection, Empty, LoadingImage and save animation. Preserve account data, navigation, equal-height rows and reduced-motion handling.
**Tech stack:** Expo 58, React Native, TypeScript; no added dependencies.

- [x] Show up to three existing cover images in each collection, including pending and completed wishes.
- [x] Group rating and editing in the wish menu; retain direct planning and completion.
- [x] Organize Home into personal plans/music and discovery sections, with a useful song empty state.
- [x] Refine the existing save animation and provide accessible success feedback after persistence.
- [x] Add a journal treatment for Home/Wishlist empty states, preserving clear actions.
- [x] Run focused regression tests, TypeScript and lint; inspect web if accessible.

Validation: 25 focused tests pass; tsc --noEmit passes. Expo lint retains the same 14 pre-existing errors. Local /library returns HTTP 200. Visual QA is blocked: browser host unavailable and native Chrome window cannot be restored with the exposed CUA APIs. No dependencies, backend changes, or data writes.
