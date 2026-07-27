# Implementation Plan

## Goal

Make homepage portfolio images display at a consistent, centered, responsive scale instead of feeling randomly sized.

## Tasks

1. **Standardize the slide media frame**: Keep every homepage image inside one shared presentation frame so portrait and landscape assets scale against the same responsive bounds.
   - File: `src/scss/components/_slider.scss`
   - Changes: Replace image sizing that depends on each asset’s natural dimensions with a consistent `.slide__media` wrapper or equivalent shared sizing rules; keep `object-fit: contain` and explicit centering.
   - Acceptance: Images no longer appear arbitrarily larger/smaller between slides, and each slide stays centered on desktop and mobile.

2. **Update slide rendering to match the new frame**: Ensure the slider markup supports the shared media frame without changing slideshow behavior.
   - File: `src/js/arenaFetchSlider.js`
   - Changes: Adjust `renderSlide()` so each rendered image uses the agreed wrapper/class structure required by the CSS; do not change data fetching, ordering, or click-to-advance behavior.
   - Acceptance: Slides still advance normally, preload still works, and each image renders within the new responsive frame.

3. **Tune homepage layout only if the frame exposes alignment issues**: Verify the portfolio area still centers correctly within the overlaid homepage layout.
   - File: `src/scss/components/_home.scss`
   - Changes: Only if needed, tighten `portfolio` / `portfolio__wrapper` alignment, overflow, or height rules so the slider frame stays visually centered beside the text column.
   - Acceptance: The image stage remains centered and unclipped across large screens and the stacked mobile layout.

4. **Validate in build and browser**: Confirm the change is scoped to homepage image presentation.
   - File: `package.json`
   - Changes: No code changes expected; use existing scripts.
   - Acceptance: `pnpm build` succeeds, and manual checks confirm consistent sizing/centering for mixed portrait and landscape images.

## Files to Modify

- `src/scss/components/_slider.scss` - define the consistent responsive image frame and centering behavior.
- `src/js/arenaFetchSlider.js` - render slide media with the structure expected by the slider styles.
- `src/scss/components/_home.scss` - optional follow-up layout adjustment if the homepage overlay still offsets the stage.

## New Files

- None.

## Dependencies

- Task 2 depends on Task 1 defining the final class/structure for the media frame.
- Task 3 depends on Tasks 1–2 because layout tuning only makes sense after the new sizing behavior is in place.
- Task 4 depends on all implementation tasks.

## Risks

- The homepage portfolio is absolutely positioned behind the content column, so centering can look wrong even when image sizing is correct.
- Very tall or very wide Are.na images may still create intentional empty space with `object-fit: contain`; that should be reviewed visually, not treated as a bug by default.
- There are no automated UI tests in this project, so final confidence depends on manual browser validation.