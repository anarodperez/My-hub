# My Hub: fluidity and connected experience

User approved all eight proposed improvements: consistent controls, fewer steps, immediate feedback, stable navigation/loading, better cards, social identity, first-use guidance, restrained motion.

Acceptance:
- Group refresh and confirmed responses retain visible content, scroll and selected date. Network failure leaves usable last-known content and an error; revoked membership still clears private data.
- Feed category switches reuse previously loaded pages; each account is isolated. Filters and calendar selection survive navigation in the current session.
- Fields and choices share existing outlined/segmented controls. Save buttons share primary styling; reduced-motion settings remain respected.
- From recommendations, save into a personal collection and draft a group plan with prefilled title/description. Choosing a group never publishes by itself.
- Cards expose author identity, stable image geometry and contextual loading/error feedback.
- First-use guide derives progress from actual groups, saved wishes and plans. No fabricated people, messages or progress.
- Verify TypeScript, full Node suite, Expo lint and production web export; inspect UI if browser tools become available.

Implementation order:
1. Add account-scoped transient view-state storage and feed category cache; remove destructive refresh resets.
2. Unify existing controls and improve save feedback/collection selection.
3. Add recommendation-to-plan draft flow using existing group-post modal and permission checks.
4. Add first-use guidance and purposeful feed placeholders/author details.
5. Review, test and document exact limitations.

Reuse Expo 58, Router, current palettes, FormDialog, collection model and existing backend operations. No new dependencies, migrations, notifications, recommendation algorithms or external publishing. Existing unsaved content remains until confirmed; no optimistic success claims. Visual browser access has been unavailable, so do not claim visual QA from compilation alone.

## Implemented and checked

- Outlined fields, segmented choices and primary save actions use the existing palette, type scale and button feedback.
- Home, wishlist and calendar filters/selection are retained in account-scoped session memory. Feed categories keep loaded pages and revalidate the activated category, including removed/private posts. Replacing repository/media disposes obsolete controllers.
- Group refresh retains mounted calendar/posts and selected-day modal state. Confirmed membership revocation clears private content. Network errors preserve the usable snapshot and expose retry. Home plans also retain visible content while reloading.
- Recommendation/detail/wishlist cards open a group chooser and then a prefilled plan draft. Publishing still requires the plan form's explicit confirmation and membership check.
- Saved recommendations show a pending indicator, reject duplicate clicks, confirm only after persistence and let the user choose an existing wishlist collection in a dialog.
- Author initials/names, fixed image frames and static feed placeholders improve identity and loading stability. Footers wrap on narrow screens. Existing reduced-motion-aware transitions remain in use.
- The dismissible first-use guide derives its three steps from actual groups, wishes/saved recommendations and plans/calendar entries.

Validation: 159 Node tests pass; TypeScript passes; production web export succeeds. Expo lint was run: 14 existing errors remain (account/provider/detail effect patterns, reminder/product/share effects, notification namespace exports, hydration/reduced-motion hooks), with zero warnings. No lint rules were disabled. HTTP localhost:8082 returns 200. Browser automation host remains unavailable, so actual visual/mobile-device QA is still unverified. Session state survives navigation, not browser reloads; this pass does not add permanent activity history or notifications.
