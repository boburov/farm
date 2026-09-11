# Click presentation pass — implemented (2026-09-11, continued by Claude Fable 5.1 session 2)

User request: replace scrolling with a premium white, six-chapter click-controlled presentation. Preserve all Uzbek content, figures/calculations/editor, Three.js scene, models, raycasting, Explore and all 16 internal beats. No Kage source or assets.

## State
- Backups: `backups/click-presentation/` (index, cinematic CSS/JS, environment JS, previous handoff) — the pre-pass scroll version.
- Dev server: `npm run dev` → http://127.0.0.1:5173 (a server was already running on this port during both sessions).
- Scroll systems removed: the 2400vh track, `window.scrollY` timeline, `syncScroll`, scroll listener/smoothing, wheel/touch autoplay cancellation, progress scrubbing (`#progress` is now a read-only progressbar), resize/Explore scroll restoration, `enhanceSceneUI` panel toggles. `html,body{overflow:hidden}`; document height equals the viewport (QA asserts this). Wheel is used only for Explore zoom inside the canvas.
- Controller: `assets/presentation.js` (`window.FarmPresentation`, state object `presentation` = {currentChapter, currentBeat, isTransitioning, isPlaying, isPaused, remainingTime, sequenceElapsed, sequenceComplete, holdElapsed, panel, queuedChapter, completed, transition, opening}). index.html keeps `goTo/setPlaying/updateHUD/setExplore/openEditor/closeEditor` as thin shims to it.
- Chapters `CH` (index.html ≈7103): **4 chapters** since the user removed 01 Boshlanish and 02 Ferma va bozor (beats 0–2 stay defined, unused). Beats 3,5 / 6,13,7 / 8,9,10,12,4 / 11,14,15; the intro beat 3 of the first chapter was sped up 4× (6 s → 1.5 s) on request → chapter durations 5.5 / 15 / 15 / 14 s, `hold` 4 s for autoplay. Chapter counts (`/ 04`, categories, details table on the last chapter) are derived from `CH.length`. `beatAt(ci,p)` maps chapter progress to a beat + local progress; `poseAt()` drives the authored `camFn`/curves.
- Transition (`P.goTo` → `transitionTick`): veil over the 3D frame 0–0.32 s, commit (camera/env/content) at 0.32 s, veil clears by ~1.04 s, unlock at 1.45 s; navigation during a transition queues the latest target. `commit()` blends the camera (`blend`, 1.08 s) unless the environment/location changes (then a cut behind the veil). Reduced motion: instant commit, sequences are static at their final pose.
- Opening countdown (`P.start` → `openingTick`): 3 → 2 → 1 over 3 s while chapter 1 is posed and rendered behind it; `started` becomes true at 0, the ECON stage is initialised and chapter 1's sequence begins. Replay (`#replay` / play button on the finished last chapter) reruns it.
- Autoplay (`P.setPlaying`): `remainingTime` = sequence remainder + hold; `#auto-countdown` shows `Keyingi bo‘lim: mm:ss` and a bar; hidden in manual mode; reset on chapter change; frozen while a panel is open, the tab is hidden or Explore is on; stopped on the last chapter (play button becomes `Qayta ko‘rish`).
- Completed rail marks: a chapter is marked ✓ when its sequence completes or when the user leaves it.
- Camera framing (`assets/cinematic.js` `camera.lookAt` wrapper): `setViewOffset` projects the scene into `#scene-frame`; vertical FOV is derived so the horizontal field of view matches the authored 16:10 composition (studio: the 1.24 desktop frame), capped at 62°/72°. `viewAspect()` (index.html) replaces `W/H` for the exploded-cuts camera back-off.
- Info panel (`P.renderSummary`): category → title → one sentence → 2–4 metrics (`uzNumber`, tabular, unit, context/delta) → optional comparison bars / value path / cluster chain → sticky `.slide-foot` with the conclusion, `Batafsil` (details dialog with the chapter's original beat DOM + the stage table on chapter 6) and replay. Mobile: collapsed by default (`#info-toggle` expands).
- Explore: `P.explore` saves/restores chapter + progress + timers; `Taqdimotga qaytish` button, Escape.
- QA: `node scripts/qa-click.mjs` (full click flow: countdown, every chapter, keys, rapid clicks, beat nav, autoplay/editor/hidden-tab pauses, details, Explore, tooltip, number format, replay, idle render stop, 1100×700, 844×390, reduced motion, iPhone swipe/rail/info/autoplay/Explore) and `npm run qa:quick` (`scripts/qa.mjs`, updated to click navigation). Both pass with 0 errors / 0 missing after the 4-chapter change (`qa/click-4ch/`, `qa/click-std/`).

## Full-bleed layout pass (session 2, later) — 3D as the background, MDX-style composition
- User request: the boxed scene frame looked fragmented; the 3D models must be the full-screen background with text/figures composed over them, in the style of a light studio landing (big title bottom-left with a dark pill CTA, paragraph + figures + chips bottom-right, minimal top bar).
- `#gl` is full-viewport again (no clip-path). `#scene-frame` is now an invisible composition rectangle (top ≈ header, bottom 24% desktop / 52% mobile); `camera.lookAt` still centres the subject inside it via `setViewOffset`, so subjects sit in the upper-middle, clear of the text bands.
- `#grade` = soft fades to the page colour (bottom 56 %, top 20 %, thin side fades); `#scene-layer::before` / `#data-layer::before` add blurred local scrims so text stays readable over buildings.
- DOM (index.html overlay): top bar = brand · round play/pause · `01 — title · 01 / 04` · status · `Klasterni kezish ↗` · `Raqamlar ↗` · `≡` (opens Batafsil). Bottom-left `#scene-layer` = eyebrow, title, one sentence, `#next` dark pill (`Keyingi bo‘lim` → `Qayta ko‘rish` on the last chapter, replays the countdown) + `#prev` text. Bottom-right `#data-layer` = `.data-lead` (bold conclusion + muted lead sentence), 2×2 metrics, cluster chain (chapter 2), `#rail` chapter chips (active = dark, ✓ = visited). Bottom centre = beat index/title/dots; autoplay countdown above it; 2 px progress line at the very bottom.
- Comparison bars / value path / secondary figures moved into the Batafsil dialog (`visualsHTML` at the top of `renderDetails`).
- Mobile (≤ 900 px): `#overlay` is a flex column anchored to the bottom (caption → title/CTA → lead/metrics/chips); intro, lead, metrics 3–4 and contexts collapse behind `#info-toggle`; `#explore-btn` is a pill fixed under the header; chips scroll horizontally.
- QA: `scripts/qa-click.mjs` updated (`next-becomes-replay-at-end`); `qa/fullbleed-qa/` and `qa/fullbleed-std/` pass with 0 errors. Screenshots of every chapter/mode: `qa/fullbleed/`.
- Previous boxed-frame stylesheet kept at `build/presentation.before-fullbleed.css` (not shipped).

## Concurrent edit noticed (14:53 local)
While session 2 was running QA, a separate Claude Code session (`eb27a724`, see `.claude/WORKLOG.md`, asked by the user to switch the site to bold Archivo) edited `assets/presentation.css`, `assets/cinematic.css`, `assets/fonts.css`, `index.html` in the same second and added `assets/fonts/Archivo-700-normal-latin.woff2`: the display font was switched from Instrument Serif to Archivo and all text weights to 700/800 (`--display`, `body`, `h1,h2`, eyebrows, buttons, SVG chart labels). Session 2 kept it (it was the user's request); the original serif/400 design remains in git history (`git diff assets/fonts.css assets/presentation.css`).

## Remaining limitations
- Short desktop windows (≤ 720 px tall) still scroll the info panel for chapters 2–6; the sticky conclusion keeps the key message visible.
- Beat 4 anchors (cut labels) can overlap pieces on desktop; the tooltip covers the details.
- Mobile swipe uses horizontal pointer gestures on the canvas; vertical drags are ignored.

The historical handoff below is preserved for asset provenance and previous work.

---

# Bir tovuqdan — cinematic continuation

## Scope and baseline
Continue the existing 8,417-line Three.js r128 site. Preserve Uzbek narrative, six chapters, sixteen scene definitions, figures/schema, economics, editor, Explore, traffic, flock and construction APIs. No framework migration.

## Inspected
Read the existing file throughout: textures/materials, legacy and active bird geometry, skinning/IK, flock LOD, people, vehicles/traffic, production equipment, world assembly, environment/PMREM, custom composite, scene director, scrolling, editor, anchors and raycasting.
Browser baseline: 1440×900 and 390×844; screenshots in /private/tmp/ferma-before-*.png. Ready in ~4.47 s on this host. Detected repeated `undefined.pos` error in last chapter, mobile panels covering subjects, visible film noise/blur, overbright outdoor terrain. Existing render.info resets during post passes so baseline draw-call numbers are invalid.

## Files
- backups/index.before-cinematic.html — untouched original
- HANDOFF.md — ongoing record

## Findings / decisions
- No Blender installed; use reproducible local mesh/texture generation with actual GLB files, preserve the existing rig bone layout and caller APIs.
- Original chick is largely a scaled adult; original studio live mesh even calls henStaticGeo with missing adult argument.
- Cut geometry is baked in world coordinates and explodes around origin. Replace with local pivots and saved rest transforms.
- Active chapters skip beats 5, 9, 13 but retain their definitions; preserve this narrative structure.
- Progress bar uses equal chapters while document scroll uses duration; seeking 100% wraps to beginning of final chapter.
- Last-chapter truck camera refers to obsolete `.ctl` instead of `.veh`.
- FootPlanner resets swing before finalizing its touchdown. Fix required.
- All ticker callbacks run even for hidden scenes; frame loop runs continuously while static.
- Do not change any FIG_SCHEMA defaults or claim new economic results.

## Next steps
1. Finish full baseline beat capture; fix baseline faults, color/post and mobile hierarchy.
2. Build local anatomical adult/chick, dressed bird, separate cuts with UV PBR maps; preserve rig and part mappings.
3. Add close architecture/machinery detail, tune environment.
4. Refine deterministic scroll, touch Explore, reduced motion, static rendering/adaptive quality.
5. Full visual + functional QA at required five sizes, report measured results and honest limitations.

## Exact next action
Create reproducible asset generator and integration; trace baseline errors through browser stacks first.

## Passes 1–2 implemented (2026-09-11)
- Valid HTML, local Three/GLTF loader, no duplicate enhancement script.
- Correct duration-based seek/scroll including 100%, truck `.veh` camera, foot touchdown, responsive camera composition and reduced post effects.
- Local original GLBs: adult and chick hero / LOD, anatomical food cuts and whole carcass; authored UV PBR color/normal/ORM maps, 2K desktop / 512 mobile. Existing skeleton API retained with authored GLB region weights. Correct centroid pivots and absolute explode/reassemble transforms; tenderloins mapped to breast economics.
- Indexed GLBs: hen hero 29,060 triangles / 1.53 MB; distant hen 1,768 / 116 KB; chick hero 23,716 / 1.21 MB; distant chick 1,524 / 85 KB; whole/cuts set 39,984 / 932 KB. Previously unindexed preliminary files were much larger.
- Narrow-screen expandable data panels, visible titles, focus management, progress dragging, Explore pinch, original Uzbek text and FIG_SCHEMA retained.
- Corrected feather surface normals to follow body; closed swept cut ends; smaller matte studio pedestal; reduced ground normal/noise/bloom; sRGB canvas environment and vertex color conversion.
- FXAA added to existing composite; unused outdoor blur/bloom work skipped. Accurate total renderer.info stats exposed as CINEMA_STATS.
- Bounded render invalidation: paused settles then stops RAF/GPU. Background tab pauses rendering, reduced-motion freezes ambient movement, manual scroll damped without overriding native scroll.

## Files added through this pass
`package.json`, `package-lock.json`, `scripts/generate-assets.mjs`, `scripts/qa.mjs`, `assets/poultry-runtime.js`, `assets/cinematic.js`, `assets/cinematic.css`, `assets/vendor/{three.min.js,GLTFLoader.js,FXAAShader.js,THREE-LICENSE.txt}`, `assets/models/*.glb`, `assets/models/manifest.json`, `assets/textures/*.{webp}`, `qa/current/*`.

## Validation so far
Initial post-change 65 screenshots: all 13 active beats × five requested sizes; zero page errors/missing assets. Visual review found wiry feather direction, oversized shiny studio platforms, cropped mobile cut spread and primitive worker/architecture; corrective pass underway. No photorealism claim: these are authored procedural surfaces, not scans. Blender unavailable. npm install reported a dependency advisory that remains to inspect.

## Exact next step
Inspect quick QA of corrected models/FXAA/on-demand loop, then complete pass 3 close worker/architecture/vehicle/environment detailing. Follow with functional interactions, timing/performance measurement, fresh mobile/reduced-motion contexts, licenses/server and final full QA.

---

## Session 3 (Claude, 2026-09-11 10:00) — audit of the Codex session and continuation plan

### Inspected (read-only audit)
- Full read of `index.html` (8,162 lines) via three parallel code explorers (bird/people systems; rendering/materials/post; narrative/scroll/world/UI), the diff against `backups/index.before-cinematic.html` (898 diff lines), all four `assets/*.js|css` modules, `scripts/*.mjs`, the QA report and 65 screenshots in `qa/current/`.
- State at hand-over: `index.html` and `assets/world-detail.js` were last edited at 09:05, **after** the last QA run (08:39) → that state was unverified (baseline re-run recorded below).

### Findings that drive the plan
- 2,091 ms single frame on first entry to beat 10: three PointLights created inside `processingInterior` (`world-detail.js:76`) flip `NUM_POINT_LIGHTS` 0→3 when `G.interiorP` becomes visible → every MeshStandardMaterial recompiles, on the same frame as 307 new geometries and a forced PMREM bake (`envSnap("interior")`). The same class of stall exists on the first studio entry (spot lights).
- Farm beat renders 3.26 M triangles: `buildKinds` allocates adult **and** chick instance slots for every plumage variant (600 slots for 300 birds); parked slots are scale 0 but still rasterised, and `castShadow=true` doubles it (≈1.98 M); instanced trees 308 × 972 tris (≈0.3 M); 12 pooled 29k-tri hero rigs, all `frustumCulled=false`.
- Crushed blacks and the green cast come from CSS `#grade` (index.html:49-55): 46% radial vignette plus a vertical ramp to 80% of `#040806`; the GLSL grade is mild (7% S-curve, +1% saturation, cyan shadow lift of ≤0.006).
- `cinematic.js:23-26` replaced `BEATS[2].up` and dropped `flashCut(.8)` and `TRAFFIC.tickManual` → unmasked camera teleport at beat 2 p=0.60 and a hero lorry with frozen wheels/trailer.
- Camera blends through fog between the studio (y=300, z=4200) and the farm at beat 8→10 (no `cut`), and `envSnap("day")` fires mid-blend at beat 11→12.
- Dead scaffolding: `rtHist`, `blurMix`, `motionBlur`, `histValid`, three chromatic-aberration fetches with `ca=0`, `tBlur/tBloom` bound to `rtMain` outside the studio, `sun.shadow.radius` (no-op under PCFSoft), DPR cap 1.75 at boot vs 1.5 after resize, four identical chick geometries cached per variant, `autoSkin` computed over 21k worker vertices then overwritten, frame-rate-dependent `envMix` with per-frame allocations, `#progress` seeking twice per click, `package.json` `dev` script pointing at a missing `scripts/serve.mjs`, empty `assets/environment/`.
- Foreground farm hens use the 1.8k-triangle LOD mesh (LOD0 threshold 18 m with a 12-rig pool); cuts and whole bird read as smooth plastic (2K procedural maps are too subtle); terrain is a single tiled 6000 m plane; trees are lollipops; the day/morning states are washed out; mobile landscape beat 4 labels collide with `#econ`.

### Decisions (user-approved 2026-09-11)
- Install Blender 5.2.1 via Homebrew for reproducible hero assets (`scripts/blender/*.py`), with the Node generator kept as an automatic per-family fallback.
- Download CC0 Poly Haven HDRIs and PBR texture sets (`scripts/fetch-assets.mjs` → `assets/environment/`, `assets/textures/pbr/`, provenance in `assets/ASSET-SOURCES.md`). Only `dl.polyhaven.org` is reachable from this machine; its API, GitHub raw, ambientCG and cdnjs are not.
- Hero birds remain authored procedural models (no licensed scan available); the final report must say so explicitly.
- Fix regressions inside `index.html`/existing modules directly; new systems go into `assets/environment.js`, `assets/terrain.js`, `assets/quality.js`.

### Plan of record
`/Users/shukrullo/.claude/plans/continue-improving-the-attached-snug-fog.md` (Passes 0–5, verification list). Pass 0 = tooling + baseline; Pass 1 = lighting/exposure/post/camera jumps; Pass 2 = Blender hero assets + LOD; Pass 3 = terrain/buildings/vehicles/interiors; Pass 4 = choreography/mobile; Pass 5 = performance + final QA.

### Exact next step
Pass 0: Blender install (running), `scripts/serve.mjs` (created), quick QA baseline into `qa/baseline-2/`, asset download (running), then extend `scripts/qa.mjs` and start Pass 1.

## Pass 0–1 progress (Claude, 2026-09-11 11:30)
- Tooling: Blender 5.2.1 installed (`/Applications/Blender.app`, headless smoke `scripts/blender/smoke.py` OK, Metal GPU visible), `scripts/serve.mjs` (port 5173), extended `scripts/qa.mjs` (frame timing, entry-stall gap, interactions, reduced-motion + iPhone contexts, `summary.md`), `scripts/inspect-env.mjs` (lighting diagnostics).
- Assets: `scripts/fetch-assets.mjs` downloaded 19 Poly Haven HDRI candidates and 14 PBR sets (CC0) into `build/downloads/`; WebP texture sets in `assets/textures/pbr/` (15 MB); provenance in `assets/ASSET-SOURCES.md`. `scripts/prep-environment.mjs` measures each candidate's sun elevation/strength, scores by state (pure-sky preferred, soft-sun allowed for golden/dusk with a synthetic key), calibrates gain for a mid-grey ground target, folds the gain into `assets/environment/<state>.hdr` (+ `-lo` half-res for mobile) and writes `assets/environment/manifest.json` (sunDir, shiftU, sunI, sunColor, horizon, sunClamp). Selected: dawn syferfontein_6d_clear, morning kloofendal_38d_partly_cloudy, day kloofendal_48d_partly_cloudy, golden evening_road_01, dusk qwantani_sunset, studio studio_small_09, interior empty_warehouse_01.
- `assets/environment.js` (new): sky dome drawn at the far plane (independent of `setClip` far), samples the state HDRI with a per-state azimuth shift, crossfades A→B on wall-clock time; a probe copy (sun clamped) is rendered through `pmrem.fromScene` so `scene.environment` is always RGBE-encoded (no material recompiles when states change). Half-float textures on WebGL2, RGBE 8-bit fallback. Manifest calibration overrides `ENVS[*].sun/sunI/sunC/fog`, `hemiI` ≤ .18, `ambient` 0, `fill` .10. Prefetches the current + next chapter's states. Bug found and fixed on the way: the probe must include three's `encodings_fragment` (RGBE output) or the PMREM decodes to black.
- `index.html`: constant light counts (`STUDIO_ON` flag replaces `studioRig.visible`; spot/point intensities dimmed to 0; three hall PointLights live at scene root — `hallLights` — instead of inside `processingInterior`), two loader steps `Shaderlar tayyorlanmoqda` (`renderer.compile`, ≈2.2 s) and `Grafik xotira isitilmoqda` (one warm frame, ≈1 s) → beat 10 entry stall 2,091 ms → 17 ms. Post: removed `rtHist/histValid/blurMix/motionBlur/prevCam`, single scene fetch (no chromatic aberration), vignette .18 + post-gamma grain .012 (.004 reduced motion), AO floor .50, bloom threshold .90, studio buffers allocated lazily, DPR cap 1.5 both at boot and resize. Shadows: frustum radius damped from camera-to-focus distance (24…beat r), target snapped to the shadow texel grid, no-op `shadow.radius` removed. Transitions: `goTo` honours `opts.hard`, autoplay advances soft, `cut:true` on beats 1/3/10/11/12/15, debounced `flashCut(.7)` dip on cuts; beat 2 lorry route is a pure function of progress with the 60 % cut restored and wheel speed derived from Δu; arc-length camera curves (`getPointAt`); progress bar single seek. `cinematic.js`: field of view eases (λ 7) instead of popping, `.z-right` query cached per beat. `cinematic.css`: light vignette (20 % corners, 26–28 % bands) instead of the 80 % ramp; local radial scrims behind `.z-title`/`.z-center`.
- QA (quick, 1440×900 + 390×844, beats 0/1/2/4/10/11): 0 errors, 0 missing, entry gaps ≤ 117 ms, ready ≈ 2.4 s (warm-up included).
- Known open items: terrain tiling, lollipop trees, primitive market/retail props (Pass 3); beats 7/14 reveals, anchor clamps (Pass 4); flock triangle budget 3.2 M and adaptive DPR (Pass 5); hero assets (Pass 2, next).

## Pass 2 progress (Claude, 2026-09-11 11:30) — Blender hero pipeline
- `scripts/asset-spec.json` (single source of truth: HEN/MAN landmarks, 21/19-bone tables, analytic weight segments, part names, budgets, tolerances), `scripts/lib/glb.mjs` (GLB/glTF reader + writer), `scripts/validate-assets.mjs` (structure, skins, joint rest positions vs spec, node/bone name collisions, budgets, bounds, watertight cuts, textures; checks the spec against index.html), `scripts/build-assets.mjs` (runs Blender per family, packs PNG bakes to WebP colour/normal/ORM + 512 variants, rewrites URIs, writes GLBs, validates, installs, manifest with `source: blender | node-fallback`).
- `scripts/blender/lib/*` (args, coords, geom: lofts/sweeps with rotation-minimizing frames, superellipse sections, subdivision/decimate via depsgraph, cards, bevelled plates, UV rects, vertex colours; uv, rig: armature from the spec + port of the site's `autoSkin`; materials; bake: Cycles NORMAL/AO/EMIT colour+roughness with multi-object targets; export with RNA-filtered options), `scripts/blender/hen.py` (adult hen + `--chick`), `scripts/blender/preview.py` (turntable renders), `scripts/blender/smoke.py`, `scripts/feather-atlas.py` (system Python + Pillow: 8-cell feather atlas with alpha + normal → `assets/textures/hen-cards*.webp`).
- Node generator fixed (closed loft ends) and moved to `--out build/node` as the fallback; the hen family is now Blender-built: `hen-hero` 22.5k tris (body sweep tail→beak, sculpted keel/saddle/wing bulge, comb/wattles/lobes/beak/nostrils, eyes with iris at the outer pole, upper lids on the `lids` bone, feathered thighs, scaled shanks, 4 toes + claws, ~110 feather cards), `hen-mid` 7.8k, `hen-lod` 1.7k; 2K plumage colour/normal/ORM, 1K keratin, 256 eye.
- `assets/poultry-runtime.js` rewritten: bone-name joint remap (Blender skins) with the `_rig_*` path kept for Node GLBs, attribute canonicalisation (Float32 vec3 colour, Uint16 joints, normalised weights), manifest-driven optional tiers (`hen-mid`, `chick-mid`), `rigGeometry(variant, adult, tier)`, tinted slots 0 and 3, `featherCard` material (alphaTest, DoubleSide), `cuts()` honours `userData.home/dir/attachTo` when present. `index.html` `assignRigs`: two nearest birds get the hero tier, others mid; pooled rig state reset on reassignment.
- Lessons: Blender's glTF importer adds an icosphere bone shape (exclude it in previews); joined meshes lose the active colour attribute unless re-activated (else no COLOR_0); mesh node names must not equal bone names (GLTFLoader renames them); Metal's first Cycles bake pays ~2 min of kernel compilation, later bakes take seconds.
- Next: hen refinements (cards on the body surface, folded primaries), chick via `hen.py --chick`, `dressed.py` (whole bird + 16 watertight cuts with `extras.home/dir/attachTo`), `worker.py`, then Pass 3.

## Pass 2 complete (Claude, 2026-09-11 11:55)
- All eight model files are Blender-built and validated (`assets/models/manifest.json`, `source: blender`): hen-hero 22.4k / hen-mid 7.7k / hen-lod 1.7k, chick-hero 19.2k / chick-mid 6.2k / chick-lod 1.3k, poultry-cuts 38.7k (whole + cavities + 16 watertight cuts with `extras.home/dir/attachTo`), worker-surfaces 13.7k (torso with sleeves, trousers, mitten palms, boots, face with brow/nose/chin/ears + neck, eyes, pupils, hair, cap, hairnet, helmet).
- `scripts/blender/dressed.py` (carcass sweep with paired breast domes and keel groove, folded wings, forward legs, tail nub, neck ring, inward cavity tubes; cuts modelled in the beat-4 rest layout; skin 2K + meat 1K bakes with pores/mottling and fibre/membrane), `scripts/blender/worker.py` (no bakes: the site applies its own cloth/skin/gear materials and role colours). `index.html` `humanRigSpec` now consumes `face/eyes/pupils/hair/cap/net/helmet` with a guarded fallback to the old primitive head when a Node-generated surfaces file is installed.
- Size: models 4.2 MB, textures 26 MB (hero maps 2K/1K + 512 variants, PBR sets 1K + 512, atlases), environment 38 MB (HDRIs 2K + half-res). Note for Pass 5: load the `-lo` HDRI first so the loader is not gated on a 5 MB file, then upgrade.
- Known limitations (state honestly in the final report): all birds/cuts are authored procedural models (lofts, sweeps, bakes), not scans; feather cards are alpha quads from a drawn atlas; Blender's own importer shows card alpha as black patches (three.js cuts them correctly).

## Pass 3 progress (Claude, 2026-09-11 12:20) — terrain, environment, buildings
- `assets/terrain.js` (new): heightfield ground (3200 m fine grid at 200×200 desktop / 110 mobile inside a 9000 m coarse grid) with relief only outside the farm/cluster/market/retail rectangles, the eight field patches and ±(road width/2+6 m) corridors (60 m smooth margins); `WORLD.groundAt(x,z)`. Ground material factory `groundMaterial(set,opts)`: `MeshStandardMaterial` + `onBeforeCompile`, sampled by world XZ at two scales (near 1/3 m, far 1/23 m, blended by distance), grass ↔ dirt ↔ dry-mud weights from a rotated multi-scale noise texture (no visible period), a painted farm-yard splat (bare earth, worn paths to the feeders, mud at the drinker line, dust baths), cloud-shadow drift per state (day .22 / morning .16 / golden .10 / dawn .06) and fine luminance breakup. `MAT.grass/field/soil/gravel/asphalt` are replaced by world-projected sets (aerial_grass_rock 2K, park_dirt, brown_mud_dry, stony_dirt_path, grassy_cobblestone, asphalt_02). `TERRAIN.triplanar(set,opts)`: world-space triplanar projection for architecture → `MAT.wall/wallGreen/barnSide` = white profiled sheet (flat white colour + corrugated_iron_03 relief/occlusion), `MAT.roof` grey sheet, `MAT.wallDark` painted concrete, `MAT.concrete` worn floor, `MAT.concreteSmall` concrete wall. Hills use the terrain material. The old yard decal plane is gone (splat), flock ground height 0.006.
- Trees: `scripts/blender/trees.py` renders four procedural species (round, wide, poplar, orchard) from two angles into `assets/textures/trees-atlas.webp` (1792×1280, 8 cells, `trees-atlas.json`, composed by `scripts/compose-trees.mjs`); `world-detail.js` `makeTreeBelt` now draws the far belts as two crossed alpha cards per tree (instanced, per-instance atlas cell, placed on the terrain) with the 3D card trees kept for the near windbreak rows north of the barns and along the gate road; falls back to 3D trees if the atlas is missing.
- Field patches 3 and 4 moved so they no longer cover the market square and the supermarket floor (they had been drawing above those floors since the original build).
- Remaining Pass 3 candidates (not done): vehicle paint/tyre PBR beyond Codex's rounded tyres, market stall and retail prop detail, studio backdrop material, scale props.

## Pass 4–5 progress (Claude, 2026-09-11 12:50) — choreography, mobile, performance
- Beat 7 ("Yagona zanjir"): the eight value-chain links are revealed one by one (`enter/up/exit` on `BEATS[7]`, tube + particle opacity and emissive ramp), so the orbit is no longer static. Beat 14: lamp and window emissive warm up over p .30–.78, first text at `data-at=0.12` (was 0.5), yard dust removed from the aerial beats.
- Anchors (`updateAnchors`) stay below the `#econ` band (`measureAnchorBand()` on enter/resize) and inside a tighter box on short landscape screens; the exploded cuts camera backs off 32 % in portrait so every piece stays inside the viewport (was failing at 390×844).
- `assets/quality.js` (new): `QUALITY.mergeAll()` merges static opaque meshes per material inside every facility stage group, barn, market, retail and lamp group (573 meshes → 76, keeping construction staging, interior shell toggles and Explore raycasting intact; world-detail batches and any object under a ticking/animated parent are excluded); adaptive quality tiers measured while the story plays (desktop: dpr ×1/.85/.72/.6, AO on/on/off/off, shadow map 3072/2048/2048/1024; mobile ×1/.85/.7) with hysteresis and a 45-frame settle after each change, exposed as `CINEMA_STATS.quality`; far static meshes stop casting shadows beyond 260 m.
- Flock (`ChickenManager.updateAll/poseInstanced`): instance matrices are packed every frame (`im.count` = birds actually drawn), only unrigged birds inside the camera frustum and within 160 m are written, scratch `Euler` reused, overlap solve every second frame. Farm beat 2.43 M → 0.68 M triangles; cluster aerials 2.1 M → 0.22–0.27 M.
- `assets/environment.js`: the half-resolution HDRI gates the loader; the full-resolution one streams in 2.5 s later on desktop and crossfades. `assets/terrain.js` disposes the canvas ground/cladding textures it replaces. Loader warm-up now 0.2 s compile + 0.1 s render (merged scene).

---

# FINAL REPORT (Claude Fable 5.1 session, 2026-09-11)

## 1. Summary of improvements

- **Hero models (55 %)**: every bird and food model is now a Blender-built asset with real subdivision surfaces, region-packed UVs and baked PBR maps, wrapped into the unchanged site APIs. Adult hen (hero 22.4k / mid 7.7k / far 1.7k triangles) with a continuous tail-to-beak body, breast keel, saddle, folded wing rows of alpha feather cards, hackle and saddle feathers, fanned tail, comb, wattles, ear lobes, nostrils, eyes with iris, blinking upper lids, feathered thighs, scaled shanks, four toes and claws; chick with its own proportions (big head, stub wings, down); whole dressed chicken with paired breast domes, keel groove, folded wings, forward legs, tail nub and real neck/rear cavities; 16 watertight cuts in the beat-4 rest layout with per-part pivots, explode directions and bone attachment; worker surfaces with a sculpted face, ears, eyes, hair, cap, hairnet and helmet. Bone names are remapped at load, so the 21-bone hen rig, the 19-bone worker rig, IK, foot planting, pecking, breathing, blinking and the pooled LOD system all keep working. The two nearest flock birds carry the hero mesh, the rest the mid mesh; instanced far birds use the low tier.
- **Lighting, environment, cinematography (25 %)**: each of the seven environment states now has a CC0 HDRI sky (sun-aligned by azimuth shift, calibrated gain, sun-clamped probe for reflections) with image-based lighting that never recompiles shaders; the analytic sun keeps readable shadows with a smoothed, texel-snapped frustum; the crushed 80 % CSS overlay is gone in favour of a light vignette and local text scrims; post-processing was cleaned (no dead history buffers, no chromatic aberration fetches, post-gamma grain, studio-only bloom/DOF). Terrain is a heightfield with flat footprints and a world-projected, noise-blended grass/dirt/mud material with a painted farm-yard splat and cloud-shadow drift; buildings use triplanar white profiled cladding, sheet roofs, painted and worn concrete; far tree belts are Blender-rendered impostors of four species with 3D windbreak rows near the barns; the market square is cobbled.
- **Scroll animation (15 %)**: soft chapter advances with cuts and a debounced dip only where the location changes, arc-length camera curves, eased field of view, deterministic lorry route with the market cut restored, progressive value-chain reveal in the chain beat, golden-hour lamp warm-up, earlier text in the final aerial, single progress-bar seek, anchors clamped away from the data band, portrait framing of the exploded cuts.
- **UI (5 %)**: lighter grade, text scrims, self-hosted fonts, loader steps in Uzbek for sky/terrain/shader warm-up.
- **Performance**: beat-10 entry stall 2,091 ms → 17 ms (constant light counts + loader warm-up), farm beat 3.26 M → 0.68 M triangles, cluster aerials 2.1 M → 0.22–0.27 M, 573 static meshes merged into 76, adaptive quality tiers, render-on-demand preserved (0 frames rendered while idle), half-resolution sky gates the loader (ready ≈ 2.2–2.9 s here).

## 2. Files changed or created

Changed: `index.html` (lights, warm-up steps, post pipeline, shadows, transitions, beats 2/7/10/12/14, anchors, flock instancing, worker head assembly, terrain/loader hooks, fonts link), `assets/poultry-runtime.js` (rewritten), `assets/cinematic.js`, `assets/cinematic.css`, `assets/world-detail.js`, `scripts/generate-assets.mjs` (closed loft ends, `--out`), `scripts/qa.mjs` (rewritten), `package.json`, `HANDOFF.md`, `assets/models/manifest.json`.
Created: `assets/environment.js`, `assets/terrain.js`, `assets/quality.js`, `assets/fonts.css`, `assets/fonts/*.woff2`, `assets/environment/{dawn,morning,day,golden,dusk,studio,interior}.hdr` + `-lo` + `manifest.json`, `assets/textures/pbr/*.webp` (14 sets), `assets/textures/{hen,chick,dressed}-*.webp`, `assets/textures/hen-cards*.webp`, `assets/textures/trees-atlas*.webp|json`, `assets/models/{hen,chick}-{hero,mid,lod}.glb`, `assets/models/poultry-cuts.glb`, `assets/models/worker-surfaces.glb`, `assets/vendor/{RGBELoader,BufferGeometryUtils}.js`, `assets/ASSET-SOURCES.md`, `scripts/{serve,fetch-assets,prep-environment,build-assets,validate-assets,compose-trees,inspect-env,inspect-calls}.mjs`, `scripts/lib/glb.mjs`, `scripts/asset-spec.json`, `scripts/feather-atlas.py`, `scripts/blender/{hen,dressed,worker,trees,preview,smoke}.py`, `scripts/blender/lib/{args,coords,geom,uv,rig,materials,bake,export,log}.py`, `qa/current/*` (canonical run), `build/*` (downloads, Blender output, logs — not shipped).
Backups: `backups/index.before-cinematic.html` (original), `build/index.before-pass1b.html`, `build/index.before-pass5.html`, `build/poultry-runtime.before-blender.js`, Node fallback GLBs in `build/node/`.

## 3. Asset sources and licenses

- HDRIs and PBR texture sets: Poly Haven, CC0 1.0 (no attribution required); every file, URL and use is listed in `assets/ASSET-SOURCES.md`.
- Models, feather atlas, tree impostors, baked maps: original procedural assets generated by this project's scripts (Blender 5.2.1 headless + Node/sharp); no downloaded or AI-generated models.
- Fonts: Instrument Serif and Archivo, SIL OFL 1.1, self-hosted.
- three.js r128 and its example loaders/utils: MIT.

## 4. Performance measurements

Machine: Apple M4, headless Chromium via ANGLE/Metal; numbers from `qa/final/report.json` (canonical re-run in `qa/current/`). Ready time 2,851 ms (baseline 6,185 ms on the same host earlier in the day, both after warm caches).

### Per-beat load (1440×900, headless Chromium on Apple M4 via ANGLE/Metal)

| beat | triangles | draw calls | entry stall ms |
|---|---|---|---|
| 0 | 141,170 | 105 | 16.8 |
| 1 | 682,020 | 398 | 100 |
| 2 | 195,644 | 124 | 16.8 |
| 3 | 381,468 | 165 | 16.8 |
| 4 | 135,174 | 68 | 16.8 |
| 6 | 196,208 | 425 | 16.8 |
| 7 | 211,104 | 602 | 16.8 |
| 8 | 199,604 | 185 | 100 |
| 10 | 362,652 | 445 | 16.8 |
| 11 | 176,938 | 348 | 16.8 |
| 12 | 611,422 | 439 | 16.8 |
| 14 | 255,742 | 825 | 16.8 |
| 15 | 259,836 | 879 | 16.8 |

### Frame timing while playing (60 frames per beat; the headless swapchain is vsync-capped at 60 Hz, so p50 ≈ 16.7 ms means the GPU had headroom; cpu p95 is the JavaScript + submission cost per frame)

| beat | fps | p50 ms | p95 ms | max ms | cpu p95 ms |
|---|---|---|---|---|---|
| 0 | 59.9 | 16.7 | 16.8 | 16.8 | 2.6 |
| 1 | 59.9 | 16.7 | 16.7 | 16.8 | 2.3 |
| 2 | 59.9 | 16.7 | 16.8 | 16.8 | 3 |
| 3 | 59.9 | 16.7 | 16.7 | 16.8 | 2.7 |
| 4 | 59.9 | 16.7 | 16.8 | 16.8 | 2.7 |
| 6 | 59.9 | 16.7 | 16.7 | 16.8 | 2.4 |
| 7 | 59.9 | 16.7 | 16.8 | 16.8 | 3.1 |
| 8 | 59.9 | 16.7 | 16.7 | 16.8 | 2.7 |
| 10 | 59.9 | 16.7 | 16.7 | 16.8 | 2.8 |
| 11 | 59.9 | 16.7 | 16.7 | 16.8 | 3.3 |
| 12 | 59.9 | 16.7 | 16.7 | 16.8 | 2.6 |
| 14 | 59.9 | 16.7 | 16.7 | 16.8 | 2.7 |
| 15 | 59.9 | 16.7 | 16.7 | 16.7 | 3.7 |

### Baseline before this session (Codex hand-over state, same harness)

| beat | triangles | draw calls |
|---|---|---|
| 1 | 3,263,398 | 234 |
| 4 | 384,704 | 65 |
| 8 | 443,758 | 164 |
| 10 | 489,640 | 501 |

Asset footprint: models 4.2 MB, textures 26 MB (all with 512 mobile variants), environment 38 MB (HDRIs, half-res first), fonts 0.2 MB, vendor 0.8 MB. Everything loads lazily by chapter except the first sky, the grass set and the living GLBs.

## 5. Remaining limitations (stated honestly)

- Birds, cuts and workers are authored procedural models (lofts, sweeps, subdivision, procedural bakes, drawn feather atlas), not photogrammetry; they read as premium stylised-realistic, not photoreal. No licensed scan was available on this network.
- The headless frame timing is vsync-capped (60 Hz), so the FPS column proves headroom rather than measuring a ceiling; no real mid-range phone was available — the mobile path was validated in an emulated iPhone context (390×844, DPR 1.35, 512 textures, half-res skies, low tiers).
- Draw calls in the last chapter still reach ~800–960 on desktop (cranes, excavators, construction site and animated groups are not merged); the adaptive tiers cover it, but a further merge of the expansion props would help low-end GPUs.
- KTX2/Basis compression is not used (r128 has no non-module KTX2 loader); textures ship as WebP.
- Blender's own importer shows the feather-card alpha as black in preview renders; three.js cuts it correctly.
- Vehicles kept Codex's rounded tyres and detail but did not get dedicated PBR paint/decal maps; market stalls and retail props are still simple boxes.

## 6. Prioritized unfinished list

1. Vehicle materials (clearcoat paint, tyre/rim maps, decals) and market/retail prop detail (Pass 3 leftovers).
2. Hero hen polish: softer feather-row bake, more tail feathers, iris texture detail; chick down density.
3. Merge or instance the expansion-site props and cranes to bring the last chapters under ~600 draw calls.
4. Hero studio hen driven by the full ChickenController idle (pecking/preening on the plinth) instead of the light breathing loop.
5. Optional 4K sky for the cluster aerials if cloud blockiness is noticed on large displays.

## Exact next step
Run `npm run dev` and open http://127.0.0.1:5173 (the server also listens on 0.0.0.0, so other devices on the same Wi-Fi can open the printed `network:` URL, e.g. http://<mac-ip>:5173; set `HOST=127.0.0.1` to keep it local-only); `npm test` for the full QA; `node scripts/build-assets.mjs --family=hen --gpu` to rebuild a family after editing `scripts/blender/hen.py`.

## Addendum (2026-09-11 13:30) — photoreal studio hen from the chicken2 project
- `assets/models/hen-photoreal.glb` = "Chicken" by pooiloui2 (Sketchfab, **CC BY 4.0**, attribution shown in the loader and as `#credit` on beat 8; provenance in `assets/ASSET-SOURCES.md`). Copied from `/Users/shukrullo/Desktop/chicken2/public/models/chicken.glb` (prepared there by `scripts/build-chicken.mjs`). 57k triangles, PBR, no skeleton.
- `PoultryAssets.loadHero()/hero(height)` (poultry-runtime.js) normalises it: comb-based auto-yaw to +Z, feet at y=0, scaled to the procedural hero's height. `G.installHeroHen()` (index.html, studio build) swaps it in when loaded and keeps the procedural rig hidden as fallback (`G.heroHenPhoto`). `cinematic.js` idles it with breathing/sway; the bone-driven idle now runs only for the procedural rig.
- Beat 8 copy moved to the left column at every size (cinematic.css) so it never covers the bird. QA beat 8 clean at 1440×900, 844×390, 390×844 (303k triangles).
- Requested "Stylized Raw Chicken – Low Poly" (LarkArt Store, Sketchfab `309f01749c39493aa6baecc1ff8da99a`): Sketchfab API reports **Standard (paid) licence, `isDownloadable:false`**, published 2024 → not in the Objaverse mirror, cannot be fetched without purchase. Awaiting the purchased file to integrate into beat 4.
