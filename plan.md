# Implementation Plan

## Goal
Add an optional organic erosion mask to the gradient tool so every render mode can look "eaten away" into the background and the effect exports correctly.

## Tasks
1. **Add mask configuration state and uniform sync wiring**
   - File: `src/gradient/gradient.js`
   - Changes: Add a new `maskParams` object near `grainParams` with initial controls such as `enabled`, `amount`, `scale`, `feather`, `contrast`, `warp`, and `detail`. Add matching shader uniforms in the `uniforms` object. Create `syncMaskUniforms()` and call it from the existing uniform sync flow so preview/export stay in sync.
   - Acceptance: Changing mask params in JS updates shader uniform values; export path still uses the same uniforms without extra special-case code.

2. **Implement a reusable organic mask helper in the fragment shader**
   - File: `src/gradient/gradient.js`
   - Changes: In the fragment shader, add mask uniforms and create a helper such as `organicMask(vec2 uv)` using layered procedural noise (`fbm` plus higher-frequency edge breakup). Reuse existing noise utilities where possible instead of adding texture dependencies.
   - Acceptance: Shader compiles successfully and the helper returns a stable 0..1 alpha mask without breaking existing render modes.

3. **Apply the mask after mode rendering and before final output**
   - File: `src/gradient/gradient.js`
   - Changes: In `main()`, keep existing mode selection intact, then if masking is enabled, mix the rendered base color against `toLinear(uBackground)` using the organic mask alpha. Apply the mask before grain so grain remains part of the visible surviving image unless the intended art direction changes during implementation.
   - Acceptance: The mask affects Points, Flow, Voronoi, and Aurora consistently; disabled mask preserves current visuals.

4. **Expose mask controls in Tweakpane**
   - File: `src/gradient/gradient.js`
   - Changes: Add a new pane folder for mask controls with bindings for all new params. Keep labels consistent with existing pane structure and ensure changes trigger rerender through current pane change handling.
   - Acceptance: Users can toggle and tune the mask live from the control panel without page reload.

5. **Set sensible defaults and verify interaction with current modes**
   - File: `src/gradient/gradient.js`
   - Changes: Tune default mask values so enabling the effect produces a clearly organic result without overwhelming the base gradient. Check whether `vUv` or warped UVs produce better results per mode and standardize on one implementation path.
   - Acceptance: Default mask settings look intentional across at least Points, Flow, Voronoi, and Aurora; no single mode looks obviously broken or unusable.

6. **Validate export and regression behavior**
   - File: `src/gradient/gradient.js`
   - Changes: Run the existing preview/export flow and verify the mask appears identically in exported PNG output. Confirm grain, palette randomization, field randomization, aspect changes, and mode switching still work.
   - Acceptance: Exported PNG includes the mask, and existing controls still function without shader/runtime errors.

7. **Worker TODO checklist**
   - File: `plan.md`
   - Changes: Use this checklist while implementing:
     - [x] Add `maskParams` defaults in `src/gradient/gradient.js`
     - [x] Add `uMask*` uniforms to the shader material
     - [x] Add `syncMaskUniforms()` and wire it into `syncUniforms()`
     - [x] Add `organicMask(vec2 uv)` to the fragment shader
     - [x] Apply `mix(background, base, maskAlpha)` before grain/output
     - [ ] Add a `Mask` Tweakpane folder and bindings
     - [ ] Test all four render modes with mask on/off
     - [ ] Test PNG export with mask enabled
   - Acceptance: Worker can execute the feature without guessing missing steps.

## Files to Modify
- `src/gradient/gradient.js` - add mask params, uniforms, shader logic, pane controls, and sync wiring.
- `plan.md` - implementation plan and worker checklist.

## New Files
- None.

## Dependencies
- Task 2 depends on Task 1 because the shader needs new uniform definitions.
- Task 3 depends on Task 2 because the mask helper must exist before it can be applied.
- Task 4 depends on Task 1 because UI bindings need backing params.
- Task 5 depends on Tasks 2-4 because tuning requires the full end-to-end effect.
- Task 6 depends on all prior tasks.

## Risks
- The exact noise recipe may need iteration; plain `fbm` could look too cloudy, so edge breakup may need extra ridged or Voronoi-like detail.
- UV choice is slightly ambiguous: applying the mask in `vUv` space may feel cleaner, while using already-warped UVs may better integrate with some modes. This should be visually validated rather than assumed.
- Applying the mask before grain is the most likely desired behavior, but if art direction prefers grain on the revealed background too, the blend order may need adjustment.
- Additional uniforms and noise work could affect performance slightly, especially during export at larger sizes; confirm the shader remains responsive.
- There are no dedicated automated tests in the current file, so validation is likely manual and should be done carefully across preview and export paths.
