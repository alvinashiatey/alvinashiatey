# Implementation Plan

## Goal

Make preview and export render the tafoni at the same apparent scale by removing resolution-dependent differences from the procedural, blur, dither, and quality paths without changing unrelated export features.

## Tasks

1. **Audit and isolate scale-driving render inputs**: Identify every place where preview/export divergence comes from `uResolution`, drawing-buffer size, or export-only quality switches.
   - File: `tafoni.js`
   - Changes: Catalog the current uses of `uResolution`, `uPreviewQuality`, and post-process `uResolution` in the main shader, `renderTafoniCoverage()`, `organicMask()`, `sampleBackground()`, `resizeRenderer()`, and `exportTafoni()`.
   - Acceptance: There is a clear split between values that should track actual pixel output and values that should stay visually consistent across preview and export.

2. **Add shared logical frame metrics for WYSIWYG scaling**: Introduce a single source of truth for aspect and reference sizing that both preview and export can reuse.
   - File: `tafoni.js`
   - Changes: Add helpers/uniforms such as `uFrameAspect` plus a logical/reference resolution (for example based on `BASE_EXPORT_WIDTH` and the selected aspect) so preview and export can share the same visual coordinate system even when their actual canvas sizes differ.
   - Acceptance: Preview and export both receive identical aspect/reference metrics for the same selected aspect, while still rendering to different actual pixel sizes when export scale changes.

3. **Decouple tafoni and mask shape math from actual output resolution**: Stop the procedural artwork from changing size when export scale changes.
   - File: `tafoni.js`
   - Changes: Update `tafoniCoverageBase()`, `renderTafoniCoverage()`, and `organicMask()` to use the new shared aspect/reference metrics instead of raw `uResolution` wherever the intent is visual scale rather than framebuffer size.
   - Acceptance: Exporting at scale 1, 2, or 4 keeps the tafoni formation, blur footprint, and mask footprint visually consistent relative to the frame.

4. **Keep background-image cover logic separate from procedural scaling**: Preserve current background image framing while removing its accidental coupling to procedural scale.
   - File: `tafoni.js`
   - Changes: Leave actual image sampling based on frame aspect, but swap any remaining procedural-only aspect math in `sampleBackground()` call sites to the new shared aspect value so background cover behavior stays unchanged.
   - Acceptance: Background images still fill the frame the same way in preview/export, while tafoni scale no longer shifts with export size.

5. **Make ordered dither use a shared reference grid**: Ensure dither cell size matches between preview and export instead of shrinking/growing with render resolution.
   - File: `tafoni.js`
   - Changes: Add a post-process reference-size uniform (for example `uDitherReferenceResolution`), and compute the Bayer lookup coordinates from normalized UV against that shared reference instead of the actual drawing-buffer size.
   - Acceptance: With the same settings and seed, the dither pattern density appears consistent between preview and exported PNGs, regardless of export scale.

6. **Narrow the preview/export quality divergence to non-scale-affecting detail**: Fix the remaining mismatch caused by export forcing a different shader quality path.
   - File: `tafoni.js`
   - Changes: Replace the broad `uPreviewQuality` preview/export split with either shared octave counts for structure-forming noise or more targeted quality flags that only affect non-structural detail (for example extra blur taps), then use the same structure-driving settings in preview and export.
   - Acceptance: Preview and export produce the same tafoni structure for the same seed; any remaining quality difference is limited to subtle detail/performance tradeoffs rather than scale shifts.

7. **Synchronize the new metrics through preview resize and export rendering**: Wire the logical-vs-actual size model cleanly into both render paths.
   - File: `tafoni.js`
   - Changes: Update `resizeRenderer()`, `syncPreviewUniforms()`, `renderScene()`, and `exportTafoni()` so preview resize updates actual render size plus shared logical metrics, and export scale only changes actual export dimensions.
   - Acceptance: The preview continues resizing correctly in the UI, and exporting at larger sizes increases output resolution without changing the artwork’s apparent size.

8. **Validate the fix against the reported mismatch only**: Confirm the change solves the scale discrepancy without expanding scope into new preview modes or unrelated rendering redesign.
   - File: `tafoni.js`
   - Changes: Manually compare preview versus exports at multiple `export scale` values and aspects using a fixed generated state, with combinations covering dither on/off, mask on/off, and background image on/off.
   - Acceptance: For the same settings and seed, preview and exported PNGs match in tafoni scale, blur footprint, and dither density; only output pixel sharpness increases with export scale.

## Files to Modify

- `tafoni.js` - add shared aspect/reference metrics, decouple procedural and dither scale from actual render resolution, and align preview/export quality behavior.

## New Files

- None.

## Dependencies

- Task 2 depends on Task 1 because the shared logical metrics should be designed from the audited divergence points.
- Tasks 3 and 4 depend on Task 2 because the shaders need the new aspect/reference uniforms before they can stop using raw render resolution.
- Task 5 depends on Task 2 because the dither pass needs the shared reference grid.
- Task 6 depends on Task 1 because the quality-path divergence must be narrowed only after the structural sources of mismatch are identified.
- Task 7 depends on Tasks 2 through 6 because the preview/export wiring must reflect the final uniform model.
- Task 8 depends on all prior tasks.

## Risks

- The biggest product ambiguity is whether preview should exactly match export by sharing the same structural noise settings, or whether some lighter-weight preview optimization must remain for performance; this needs explicit validation during implementation.
- Changing `uResolution` usage in the shader is easy to over-apply; aspect/background-image math and pixel-output math should not be broken while decoupling procedural scale.
- Dither density may need tuning after moving to a shared reference grid so the existing `ditherParams.scale` still feels intuitive.
- There is no automated image-diff coverage in this directory, so final confidence depends on manual side-by-side export checks with a fixed seed.

```acceptance-report
{
  "criteriaSatisfied": [
    {
      "id": "criterion-1",
      "status": "satisfied",
      "evidence": "The plan stays scoped to the preview/export scale mismatch root causes in `tafoni.js` (resolution coupling, dither grid sizing, and quality-path divergence) and does not introduce unrelated UI or export feature work."
    }
  ],
  "changedFiles": [
    "plan.md"
  ],
  "testsAddedOrUpdated": [],
  "commandsRun": [
    {
      "command": "ls .",
      "result": "passed",
      "summary": "Confirmed the local tafoni workspace contents before planning."
    },
    {
      "command": "find .. -pattern scss/tafoni.scss",
      "result": "passed",
      "summary": "Located the related stylesheet that shapes the preview shell."
    },
    {
      "command": "read tafoni.js",
      "result": "passed",
      "summary": "Inspected preview, shader, dither, resize, and export code paths to identify the mismatch sources."
    },
    {
      "command": "read ../scss/tafoni.scss",
      "result": "passed",
      "summary": "Confirmed the preview canvas is CSS-sized and therefore not a true 1:1 export viewport."
    },
    {
      "command": "read research.md",
      "result": "passed",
      "summary": "Used prior repo research to confirm the root-cause hypotheses for the scale mismatch."
    }
  ],
  "validationOutput": [],
  "residualRisks": [
    "Exact preview/export parity may require a product choice between full structural fidelity and lighter preview performance.",
    "Manual visual validation is still required because this area has no automated export-image assertions.",
    "Git staged-file state was not directly verifiable in this tool-limited session and should be checked by the parent session if required."
  ],
  "noStagedFiles": true,
  "notes": "Wrote the requested implementation plan to `src/tafoni/plan.md`; this child session used file-inspection tools only and made no application code changes."
}
```
