Implemented the homepage image sizing fix by giving each slide a shared responsive media frame and rendering images inside that frame so mixed aspect ratios scale consistently and stay centered.

Changed files:
- `src/js/arenaFetchSlider.js`
- `src/scss/components/_slider.scss`

Validation:
- `pnpm build` passed
- `git diff --cached --name-only` returned no staged files

Open risks/questions:
- Visual acceptance still depends on a browser pass with mixed portrait/landscape Are.na images.
- Build completed with existing Sass legacy API and chunk-size warnings unrelated to this change.

Recommended next step:
- Manually review the homepage on desktop and mobile to tune frame height only if the new composition feels too tall or too tight.