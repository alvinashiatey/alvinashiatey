# Implementation Plan

## Goal

Remove the user-facing tafoni noise controls (`scale`, `strength`, `detail`, and `smooth blur`) from the Tafoni section while keeping tafoni generation, masking, preview, and export working.

## Tasks

1. **Remove tafoni noise state from the runtime model**
   - File: `tafoni.js`
   - Changes: Delete `tafoniParams.tafoniScale`, `tafoniParams.tafoniStrength`, `tafoniParams.tafoniDetail`, and `tafoniParams.tafoniBlur`. Remove the matching randomization lines in `randomizeTafoni()`.
   - Acceptance: The Tafoni config no longer contains those four controls, and Generate Tafoni no longer mutates them.

2. **Choose and document fixed replacement tafoni tuning**
   - File: `tafoni.js`
   - Changes: Select stable internal values that will replace the removed controls so the tafoni look stays consistent without user-facing configuration.
   - Acceptance: The replacement values for scale, strength, detail, and blur are explicit in the implementation and are not reintroduced as hidden JS state.

3. **Remove tafoni noise uniforms and shader inputs**
   - File: `tafoni.js`
   - Changes: Delete `uTafoniScale`, `uTafoniStrength`, `uTafoniDetail`, and `uTafoniBlur` from `uniforms`, remove their fragment-shader uniform declarations, and simplify `tafoniCoverageBase()` / `renderTafoniCoverage()` so they no longer depend on those user-facing parameters.
   - Acceptance: No shader code references `uTafoniScale`, `uTafoniStrength`, `uTafoniDetail`, or `uTafoniBlur`.

4. **Replace the removed controls with fixed internal tafoni tuning**
   - File: `tafoni.js`
   - Changes: Inline the chosen stable constants inside the shader logic where the removed uniforms were previously used so the tafoni look remains consistent without exposing those controls in the UI.
   - Acceptance: The shader still produces a tafoni pattern, but its scale/strength/detail/blur behavior is driven by fixed values instead of runtime state.

5. **Update uniform sync logic**
   - File: `tafoni.js`
   - Changes: Remove the corresponding assignments from `syncTafoniUniforms()` and any other sync/apply helper that still pushes the removed tafoni parameters.
   - Acceptance: Sync logic only updates the remaining tafoni state such as background and `tafoniColor`.

6. **Remove the Tafoni pane controls**
   - File: `tafoni.js`
   - Changes: Delete the `tafoniFolder.addBinding(...)` entries for `tafoniScale`, `tafoniStrength`, `tafoniDetail`, and `tafoniBlur`.
   - Acceptance: The Tafoni panel only shows the remaining essential controls, and the four noise controls are gone.

7. **Clean up dead references after removal**
   - File: `tafoni.js`
   - Changes: Remove any now-unused helper variables, comments, labels, or branches left behind by the deleted tafoni noise controls.
   - Acceptance: Searches for `tafoniScale`, `tafoniStrength`, `tafoniDetail`, and `tafoniBlur` return no runtime/UI references.

8. **Verify preview and export still work**
   - Files: `tafoni.js`, `index.html`
   - Changes: Run syntax validation and browser-check preview rendering, Generate Tafoni, background image upload, mask behavior, and PNG export after removing the controls.
   - Acceptance: The tool renders and exports correctly with the simplified Tafoni section, and Generate Tafoni still produces meaningful visible variation after those controls are frozen.

## Files to Modify

- `tafoni.js` - remove the Tafoni-section noise state, shader uniforms/logic wiring, sync code, randomization, and pane controls.

## New Files

- None.

## Dependencies

- Task 2 depends on Task 1 because the replacement constants should only be chosen once the removable runtime state is clear.
- Task 3 depends on Tasks 1–2 because the shader contract should match the reduced runtime state and chosen fixed tuning.
- Task 4 depends on Task 3 because the final internal constants should be applied while simplifying the shader.
- Task 5 depends on Tasks 1–4 because sync logic must reflect the final uniform set.
- Task 6 depends on Task 1 because the pane should only expose surviving params.
- Task 7 depends on Tasks 1–6.
- Task 8 depends on all prior tasks.

## Risks

- These four controls currently shape the tafoni appearance directly, so removing them may require minor retuning to avoid a flatter or overly repetitive result.
- The remaining mask system also uses procedural shaping; this plan removes only the Tafoni-section controls, not mask shaping controls.
- Browser validation is still required because syntax checks alone will not confirm the visual quality after hard-coding the removed values.
