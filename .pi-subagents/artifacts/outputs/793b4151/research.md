# Investigation: images no longer centered

## Summary

The main regression is layout-related, not an image-tag issue. The portfolio slider is absolutely positioned across the full `.content__wrapper`, so slides are centered to the full viewport while the text column still occupies the left side; this makes images appear visually off-center relative to the open portfolio area.

## Findings

1. **Medium — slider ignores the intended two-column grid on desktop**  
   In `src/scss/components/_home.scss`, `.content__wrapper` defines a two-column grid, but `.portfolio` is taken out of that grid with `position: absolute; inset: 0; width: 100%; height: 100%;`. That means the slider centers itself against the entire wrapper instead of the portfolio column, so images can look shifted once the left text column overlays the layout.  
   **Files:** `src/scss/components/_home.scss`

2. **Low/Medium — centering is applied to the frame, not the visible art area**  
   In `src/scss/components/_slider.scss`, `.slide__media` is centered, but the image itself is forced to `width: 100%; height: 100%; object-fit: contain;`. For portrait/narrow assets, the image sits inside a larger fixed frame, so the browser centers the box correctly, but the composition can still look off when compared against the visible right-side space.  
   **Files:** `src/scss/components/_slider.scss`

3. **Low — current slide can visually inherit offset context from older layers**  
   The slider intentionally keeps `.is-previous` and `.is-oldest` layers visible with opacity and transforms. For images that leave more empty space inside the contain frame, those offset layers can peek through and make the active image feel misaligned even though the active layer is centered.  
   **Files:** `src/scss/components/_slider.scss`

4. **Low — source image variant selection may amplify the issue for only some assets**  
   In `src/js/arenaFetchSlider.js`, `getArenaImageUrl()` prefers `image.display` before `large` or `original`. If Are.na's `display` variant is preprocessed/cropped differently per asset, only some images will appear visually off-center even with unchanged CSS.  
   **Files:** `src/js/arenaFetchSlider.js`

## Most likely root cause

The strongest code-level cause is the absolute positioning of `.portfolio` in `src/scss/components/_home.scss`. That removes the slider from the grid column it is supposed to occupy, so the slider is centered to the whole wrapper instead of the actual portfolio region.

## Residual risks

- I could not run the site visually in a browser from this environment, so this is a static code review.
- If the issue started after content changes rather than CSS changes, the `image.display` source variant may be a contributing factor.

```acceptance-report
{
  "criteriaSatisfied": [
    {
      "id": "criterion-1",
      "status": "satisfied",
      "evidence": "Provided concrete findings with severity and file paths: src/scss/components/_home.scss, src/scss/components/_slider.scss, and src/js/arenaFetchSlider.js."
    }
  ],
  "changedFiles": [
    ".pi-subagents/artifacts/outputs/793b4151/research.md"
  ],
  "testsAddedOrUpdated": [],
  "commandsRun": [
    {
      "command": "visual/browser validation",
      "result": "not-run",
      "summary": "No browser/runtime tool was available; investigation was performed via static code review."
    }
  ],
  "validationOutput": [
    "Reviewed layout and slider logic in src/scss/components/_home.scss, src/scss/components/_slider.scss, src/js/arenaFetchSlider.js, and supporting entry files."
  ],
  "residualRisks": [
    "Findings are based on static review only; no live reproduction was possible.",
    "If the regression is content-driven, Are.na display variants may be part of the issue."
  ],
  "noStagedFiles": true,
  "diffSummary": "No product code changed; created an investigation report with root-cause findings.",
  "reviewFindings": [
    "medium: src/scss/components/_home.scss - .portfolio is absolutely positioned across the full wrapper, so slider centering ignores the intended grid column.",
    "medium: src/scss/components/_slider.scss - images are centered within a fixed contain frame, which can still look visually off-center in the overlaid desktop layout.",
    "low: src/js/arenaFetchSlider.js - getArenaImageUrl() prefers image.display, which may introduce asset-specific visual misalignment."
  ],
  "manualNotes": "Most likely fix area is the desktop layout in _home.scss rather than the img tag itself."
}
```
