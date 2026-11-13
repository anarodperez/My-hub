# Motion and personality

The user asks for a livelier web experience and delegates visual direction.

- Focal interaction: the navigation rail stays anchored while route content settles by 8 pixels. Preserve the mounted navigator and local form state.
- Feedback: photographic cards gain subtle depth and a bounded image zoom on fine-pointer hover. Navigation icons, selected tabs and controls respond in 160–320 ms. The brand mark tilts only on explicit interaction and links home.
- Budget: reuse CSS and Animated; no added dependencies, per-frame React renders, scroll listeners, autoplay loops, staggered feed entrances or layout animations. Content starts visible.
- Accessibility: keyboard focus remains clear; touch does not inherit hover. Reduced motion disables spatial effects while preserving visible state and confirmations. Web animation uses the JS driver; native uses the native driver.
- Verify interrupted route changes, focus preservation, platform guards, stylesheet compilation, reduced motion, lint and TypeScript. Record any runtime visual QA limitation.
