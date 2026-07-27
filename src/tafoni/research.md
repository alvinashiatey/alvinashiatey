# Research: Tafoni export scale mismatch

## Summary

What you see in the UI is not a true export preview. The preview intentionally renders in a lower-quality mode, while export switches to a different render resolution and a higher shader quality path, so procedural tafoni, blur, and dithering can all appear at different scales in the saved PNG. The mismatch is coming from the implementation, not from user error.

## Findings

1. **Preview and export use different quality modes by design** — the preview renderer is created with `quality: "preview"`, uses the `editor` runtime profile (`previewPixelRatio: 1`, `previewQuality: 0`), and `exportTafoni()` explicitly switches the shader to `uPreviewQuality = 1` for export. That means the export runs a different shader path than the UI preview. [Source](file:///Users/alvinkwabena/Developer/node/alvinashiatey/src/tafoni/tafoni.js)
2. **Export changes the canvas resolution, which changes scale-sensitive shader behavior** — export size is computed as `BASE_EXPORT_WIDTH * exportParams.scale`, while the UI preview size comes from the CSS-sized preview shell and `resizeRenderer()`. Because the shader uses `uResolution` in multiple places, the exported image is not just a larger copy; it is re-rendered with a different resolution basis. [Source](file:///Users/alvinkwabena/Developer/node/alvinashiatey/src/tafoni/tafoni.js) [Source](file:///Users/alvinkwabena/Developer/node/alvinashiatey/src/scss/tafoni.scss)
3. **At least two visual systems are resolution-dependent** — `renderTafoniCoverage()` derives blur taps from `1.0 / uResolution`, so exports look sharper/tighter at larger sizes, and the ordered dither pass uses `fragCoord = vUv * uResolution`, so the dither pattern becomes finer or coarser relative to the image depending on export size. Those are likely the main reasons the “scale” feels wrong after export. [Source](file:///Users/alvinkwabena/Developer/node/alvinashiatey/src/tafoni/tafoni.js)
4. **The preview shell can also mislead perception before export** — the on-screen canvas is stretched to fill a CSS `aspect-ratio` box, while the export uses fixed pixel dimensions from the selected aspect and export scale. Even when the aspect matches, the preview is still a viewport approximation rather than a 1:1 export simulation. [Source](file:///Users/alvinkwabena/Developer/node/alvinashiatey/src/scss/tafoni.scss) [Source](file:///Users/alvinkwabena/Developer/node/alvinashiatey/src/tafoni/tafoni.js)

## Sources

- Kept: `src/tafoni/tafoni.js` (file:///Users/alvinkwabena/Developer/node/alvinashiatey/src/tafoni/tafoni.js) — primary implementation of preview, export, shader uniforms, and dither logic.
- Kept: `src/scss/tafoni.scss` (file:///Users/alvinkwabena/Developer/node/alvinashiatey/src/scss/tafoni.scss) — shows the preview is CSS-sized, not a fixed export-sized viewport.
- Dropped: none — local source files were the strongest evidence for this issue.

## Gaps

I did not run the app to visually compare specific parameter combinations, so I cannot quantify which control the user notices most (mask scale, dither scale, or overall tafoni size). Best next step: make preview and export share the same quality/resolution path, or add a true “export preview” mode so the UI matches the saved output.
