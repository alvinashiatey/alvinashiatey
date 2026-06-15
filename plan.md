# Implementation Plan

## Goal
Make `/tafoni` export the same visual result the user sees in the preview canvas.

## Tasks
1. **Align export with the preview render pipeline**: Stop using a different export-only image treatment.
   - File: `src/tafoni/tafoni.js`
   - Changes: Update `exportTafoni()` so it uses the same post-process path as the preview instead of calling `renderScene(exportRenderer)` with preview post-processing disabled and then running a separate CPU Floyd–Steinberg pass.
   - Acceptance: Export no longer bypasses the ordered GPU dither pass that the preview canvas uses.

2. **Remove the preview/export dithering split**: Use one dithering implementation for both preview and export.
   - File: `src/tafoni/tafoni.js`
   - Changes: Replace the current “GPU ordered dither for preview, CPU Floyd–Steinberg for export” architecture with a single export path based on the same ordered Bayer shader/post-process uniforms used in the canvas preview. Keep export quality improvements limited to resolution/quality settings, not a different dithering algorithm.
   - Acceptance: The exported PNG matches the preview’s ordered-dither look, aside from expected higher-resolution sharpness.

3. **Apply export dimensions to the full post-process path**: Ensure the post-pass and render target use export resolution before capture.
   - File: `src/tafoni/tafoni.js`
   - Changes: Confirm `uResolution`, renderer size, and any `previewRenderTarget` / post-process resources are resized or recreated for export dimensions so the exported dither pattern is generated at the same aspect and scale as the final file.
   - Acceptance: Exported output has the selected `exportParams.scale` and aspect ratio without reusing preview-sized post-process resources.

4. **Preserve the same background/composite behavior in export**: Make sure uploaded background images and mask blending are captured exactly as previewed.
   - File: `src/tafoni/tafoni.js`
   - Changes: Verify the uploaded image background, shader masking, and any fallback background logic all flow through the same scene + post-process path during export.
   - Acceptance: A loaded background image appears in the exported PNG exactly as it appears in the preview composition.

5. **Simplify or remove obsolete export-only helpers**: Clean up code that exists only to produce the current mismatch.
   - File: `src/tafoni/tafoni.js`
   - Changes: Remove or isolate `applyFloydSteinbergDither()` and related export-only canvas logic if it is no longer part of the intended output. If it must remain for an optional future mode, keep it behind an explicit separate export mode rather than the default export button.
   - Acceptance: Default export code path is easy to reason about and does not secretly change the image style.

6. **Verify state restoration after export**: Keep preview behavior stable after exporting.
   - File: `src/tafoni/tafoni.js`
   - Changes: After changing the export path, confirm the function still restores preview resolution, post-process uniforms, and renderer state in `finally` so exporting does not change the live canvas.
   - Acceptance: Exporting does not alter the on-screen preview once the export finishes.

7. **Run validation focused on preview/export parity**: Check the exact problem the user reported.
   - Files: `src/tafoni/tafoni.js`, `src/tafoni/index.html`
   - Changes: Validate with `npm run build` and a manual browser pass comparing the on-screen canvas to the saved PNG for: default scene, uploaded background image, dither controls, and different export scales.
   - Acceptance: The saved PNG visibly matches what is shown in the canvas before export.

## Files to Modify
- `src/tafoni/tafoni.js` - unify preview and export rendering so the exported image uses the same post-processed visual output as the canvas.
- `src/tafoni/index.html` - only if export UI/help text needs to clarify that export now matches the preview exactly.

## New Files
- None required.

## Dependencies
- Task 1 must happen before Tasks 2-5 because the current mismatch starts with export bypassing the preview post-process path.
- Task 2 depends on Task 1 because the dithering architecture decision is implemented inside the corrected export path.
- Task 3 depends on Tasks 1-2 so export resources reflect the final unified pipeline.
- Task 4 depends on Task 3 because background/composite parity must be checked at export resolution.
- Task 6 depends on Tasks 1-5.
- Task 7 depends on all prior tasks.

## Risks
- The main current mismatch is intentional in code: preview uses ordered GPU dithering while export uses CPU Floyd–Steinberg, so parity will not happen until that split is removed or made optional.
- Export may currently rely on preview-sized post-process resources; if those are not resized for export dimensions, the output can still differ even after the pipeline is unified.
- If the design still wants a special high-fidelity export mode later, it should be exposed as a separate option rather than replacing the default “export what I see” behavior.
- `npm run build` will not confirm visual parity; browser-side comparison of canvas vs saved PNG is required.
