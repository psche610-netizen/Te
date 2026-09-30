# SHUTDOWN

> The building is hunting you. And it can hear you.

Landscape, single-player stealth horror for mobile. You are trapped inside Facility 07, run by an AI called **OVERSEER**. The facility rebuilds itself around you, hunts you with machines, learns your habits, and listens through your real microphone. Shut it down sector by sector, then kill the Core.

**Target:** RevenueCat Shipaton 2026 — **Next Gen** category (student). Deadline: Sep 30, 2026, 11:45pm PT.
**Budget:** $0.

---

## 1. Pitch

- **One line:** Dead by Daylight meets GLaDOS, where the level itself is the killer.
- **What makes it ours (not a DBD clone):**
  1. **The map rearranges live** — walls slide, doors lock, routes close in front of you.
  2. **Your real voice is noise** — gasp, talk, scream, and the hunter hears it. Hide in a locker and physically hold your breath.
  3. **Adaptive AI** — OVERSEER remembers your hiding spots and routes and counters them.
  4. **It talks back** — dry, deadpan corporate subtitles react to what you do.
- **3-second video hook:** a person covering their mouth while a red eye passes a locker slit.

---

## 2. Art direction — V4 (anti-slop rules)

> **V4 replaces the v3 flat-shaded rules (updated 2026-09-28).** The v3 look (one flat color per face, primitives only) is what the shipped code currently renders; Phases 13–27 (section 17) migrate it to V4: assets first (13–20), integration later (21–27). Where old notes in section 16 say "flat" / "primitives only", V4 wins.

Reference board: `shutdown-kit/concepts/v4/01–11.png` (source of truth for look). Asset kit: `shutdown-kit/assets/v4/` (see `AUDIT.md` there for status of every asset).

| Rule | Spec |
|---|---|
| Render | Low-poly, chunky silhouettes, bevelled edges. Hand-painted matte enamel from ONE shared atlas (`assets/v4/textures/painted-enamel-atlas.png`, 4 quadrants). Roughness ~0.9, metalness 0. No photoreal PBR, no glossy speculars. |
| Camera | Orthographic isometric, ~45°. Reads like an architectural diorama. (Unchanged.) |
| Light | Warm amber key light, cool blue-indigo shadows, contact AO (baked or cheap SSAO-free fake). Emissive only on lamps, interactables and the red slit. |
| Palette | Tokens in `assets/v4/ui/tokens.json`: petrol `#23474C` · teal `#507C79` · ivory `#DED7BC` · amber `#DEA33A` (player / interactables / edge lines) · indigo `#142127` (darks, void) · danger `#D84726` (enemy / danger only). Concrete greys allowed for floors/walls. |
| Crew colors | Teal and ivory suits (teammates only — roadmap). |
| Type | Display: Bebas Neue. Instrument/labels: Share Tech Mono. Files in `assets/v4/ui/fonts/`. |
| UI | Swiss grid, 1px rules, sharp corners, v4 panels/buttons/icons from `assets/v4/ui/` (`v4.css`, `icons.svg`). No bevels, no glow. |
| Markings | Stencil text decals (SECTOR B, B-1, G-02, room names, OVERSEER slogans) and amber/black hazard stripes on edges, floors and moving parts. Allowed and expected. |
| Effects | Allowed: dark water with ripples, waterfall, molten pour glow (Foundry only), flat red vision cone. Keep them cheap and readable. |
| Banned | Sparks, lens flare, bloom haze, decorative particles, chrome/glossy, faces, emoji, gradients in UI. |
| Characters | Faceless. Operator = bulky amber hazmat suit, rounded helmet, dark visor, backpack. Warden = tall ivory/indigo robot, box head, one wide red slit. Weaver = chunky armored six-legged unit "W-01". |

---

## 3. Screen flow

```
Title ─► Mic calibration (first launch) ─► Sector map ─► Loadout ─► NIGHT
                                                                    │
            ┌───────────────────────────────────────────────────────┘
            ▼
      Gameplay ─► (caught) Second Wind? ─► continue / FAIL
            │
            ▼
      Exit gates ─► Results ─► Next night / Loadout
            │
   Sector cleared ─► next sector ─► ... ─► THE CORE (finale) ─► Ending

   Paywall appears: locked sector tap, after Sector 1 clear, Loadout skin tab.
```

| # | Screen | Art ref |
|---|---|---|
| 1 | Title | `v4/01-title.png` |
| 2 | Mic calibration | `v4/02-mic.png` |
| 3 | Sector map | `v4/03-sectors.png` |
| 4 | Loadout | `v4/04-loadout.png` |
| 5 | Gameplay — shifting map | `v4/05-shift.png` |
| 6 | Locker — hold breath | `v4/06-locker.png` |
| 7 | Crew rescue (roadmap, not v1) | `v4/07-crew.png` |
| 8 | The Core finale | `v4/08-core.png` |
| 9 | Results | `v4/09-results.png` |
| 10 | Paywall | `v4/10-paywall.png` |
| 11 | Overseer Mode (roadmap) | `v4/11-overseer.png` |

---

## 4. Core loop

### One night (5–8 min)
1. **Spawn** — random start, random generator / locker / gate placement.
2. **Explore & repair** — find generators, complete a repair trial. Fail = noise burst.
3. **Survive** — break line of sight, hide, hack.
4. **Building shifts** — every ~45s (or when triggered), OVERSEER moves walls / locks doors.
5. **Escape** — 5/5 generators powers the gates. 60s final chase, hunter speeds up.
6. **Results** — scrap from generators, stealth, breath held. (Mockup's "CREW SAVED" row is dropped in v1.)

### Between nights
- Spend scrap on perks, equip 3.
- Pick next night / sector.

### Campaign
- Sector 1 **The Plant** (free) → Sector 2 **Cold Storage** (free) → Sector 3 **The Foundry** (paid) → **The Core** (free finale, unlocked after Sector 2).
- Each sector = 3 nights, final night has a modifier.

---

## 5. Mechanics

### Player
- Joystick move, **RUN** (fast, loud), **HIDE** (lockers), **HACK** (context: door, wall, camera).
- Crouch-walk by default near hunter (auto, quieter).

### Noise system (central)
- Every action emits noise radius: walk small, run large, failed repair large, door slam medium.
- **Mic input** adds noise in real time, calibrated to the room's baseline.
- Hunter hears noise within radius → investigates last heard position.
- **Mic-off mode:** noise from actions only. Must be fully playable.

### Hiding
- Enter locker → view switches to locker slit (screen 6).
- Hunter searches: mic level must stay under threshold for N seconds.
- Mic-off: short timing mini-game (keep a needle in a zone) replaces breath.

### Repair trials (rotate, harder each night)
- **Needle** — stop a rotating needle in the zone.
- **Wires** — cut the called color.
- **Hold** — hold and release inside a window.

### Shifting map
- Level built on a grid of modules. Some walls / doors are **dynamic**.
- OVERSEER shifts dynamic pieces on a timer and in response to player behavior.
- Shifts are telegraphed (floor track lights + sound) 1.5s before moving. Never instantly trap the player.
- Guarantee: pathfinding check always leaves a route to at least one unrepaired generator.

### Hacking
- Limited charges per night.
- Lock a door on the hunter, reverse a shift, blind a camera for 10s.

### Crew (AI teammates) — ROADMAP, not in v1
- 2 bots: repair, hide, flee, get caught.
- Caught = processing pod with timer. Player frees them with **FREE** (hold).
- Pod timer runs out = teammate lost for the night.

---

## 6. OVERSEER AI

### Hunter state machine
`PATROL → SUSPICIOUS → INVESTIGATE → CHASE → SEARCH → PATROL`
- Vision cone (flat red on floor), line-of-sight via raycast.
- Hearing via noise events.
- Catches player on contact during CHASE.

### Adaptive director (the "it learns" system)
Tracks per-run stats and reacts:

| Player habit | OVERSEER response |
|---|---|
| Hides in lockers often | Checks lockers first, gasses a locker room |
| Uses the same corridor | Seals it with a shift |
| Loud (mic) | Hunter patrols closer to last loud spot |
| Rushes generators | Locks generator rooms more often |
| Stays still too long | "Please remain where you are." then sends hunter to check |

### Voice / subtitles
- Short, dry, deadpan lines (see section 15), triggered by events. Displayed as monospace subtitle at top.
- Examples: "That route is closed now." · "I heard that." · "You were supposed to stay." · "Locker four. Again?"
- Optional TTS later. Subtitles only for v1.

---

## 7. The Core (finale)
- Circular arena of rotating concentric rings over a void.
- 4 kill-switch terminals on the rings. Each activation = a repair trial.
- **PURGE** timer counts down. Rings rotate and drop segments. Two hunters.
- OVERSEER dialogue escalates. All 4 switches → the red slit goes dark → ending.

---

## 8. Progression & perks

**Currency:** scrap (earned only, never sold).

| Perk | Effect |
|---|---|
| Soft Step | Walking noise -30% |
| Quick Hands | Repair speed +20% |
| Second Wind | Escape one catch per night |
| Awareness | Hunter outline visible through walls when close |
| Steady | Wider repair zones |
| Deep Pockets | +1 hack charge |
| *Foundry: Ghost* | Hidden from cameras for 5s after hacking |
| *Foundry: Decoy* | Throwable noise maker |
| *Foundry: Override* | One free map-shift reversal per night |

---

## 9. Monetization (RevenueCat)

Fair, non pay-to-win. One purchase unlocks content, not power.

| Product | Type | Price | Contents |
|---|---|---|---|
| `foundry_pass` | Non-consumable | $2.99 | Sector 3 The Foundry, hunter THE WEAVER, 3 Foundry perks, Daily Night mode |
| `skin_pack` | Non-consumable | $0.99 | Jumpsuit + hunter cosmetic skins |

- **Entitlements:** `foundry`, `skins`.
- **Paywall triggers:** tap locked Sector 3 · after clearing Sector 1 (once) · skins tab in Loadout.
- **Restore purchases** button always visible.
- **Implementation:** RevenueCat **Test Store** (free, no store account) for the demo. Real purchase flow, real entitlements.
- Judges: document a promo path in the README (Test Store purchases need no card).

---

## 10. Tech

| Layer | Choice |
|---|---|
| App shell | Next.js (static export) + Capacitor → Android APK |
| 3D | Three.js via React Three Fiber + drei |
| Models | **V4:** authored in Blender via script (`assets/v4/source/build_assets.py`, Blender 5.0.1 / `bpy`), exported as GLB (Y up, metres, ground origin), loaded with drei `useGLTF`, one shared texture. Code primitives stay as fallback until each GLB is integrated. |
| Textures | One shared painted atlas (+ one decal/stencil atlas). GLBs must NOT embed their own copy in the shipped build (strip with `@gltf-transform/cli`). KTX2 compression in Phase 21. |
| UI | HTML/CSS overlay (Tailwind) on top of the canvas |
| Pathfinding | Grid A* on the level module grid |
| Audio in | Web Audio API `AnalyserNode` on mic stream (Capacitor mic permission) |
| Audio out | CC0 SFX + ambient loop |
| Haptics | `@capacitor/haptics` (hunter close, caught, repair fail) |
| Purchases | RevenueCat Capacitor SDK + Test Store |
| Save data | Local device storage (progress, scrap, perks) — single-player save file, no backend |
| Build | GitHub Actions → debug APK artifact (free for public repos) |
| Orientation | Landscape locked |

**Performance targets:** 60fps on mid-range Android, <150 draw calls, instanced meshes for walls/props, no real-time shadows beyond one directional light.

---

## 11. Build checklist

### Foundation
- [x] Project setup: Next.js static export, R3F, Tailwind, fonts, palette tokens
- [x] Landscape lock + fullscreen + safe-area handling
- [x] Orthographic isometric camera following player

### Level & movement
- [x] Grid-based level module system (floor, wall, dynamic wall, door, locker, generator, gate)
- [x] Sector 1 layout
- [x] Player controller: joystick, run, collision
- [x] Touch controls: HIDE / RUN / HACK buttons

### Hunter & AI
- [x] Hunter model (primitive-built) + walk animation
- [x] Vision cone + line of sight
- [x] Noise event system
- [x] State machine: patrol / suspicious / investigate / chase / search
- [x] Grid A* pathfinding
- [x] Adaptive director (habit tracking + responses)
- [x] OVERSEER subtitle lines

### Signature mechanics
- [x] Dynamic walls with telegraph + route-safety check
- [x] Mic calibration screen
- [x] Mic → noise pipeline
- [x] Locker hide view + breath meter
- [x] Mic-off fallback (timing mini-game)

### Objectives
- [x] Generators + 3 repair trials
- [x] Exit gates + final chase
- [x] Caught → Second Wind check → night failed
- [x] Hacking (door lock, shift reverse, camera)

### Content
- [x] Sector 2 layout + Blackout modifier
- [x] The Core finale arena
- [x] Sector 3 The Foundry + THE WEAVER (paid) — Phase 10
- [x] Perks (6 free + 3 Foundry: Ghost, Decoy, Override) — Phase 10
- [x] Daily Night (seeded, Foundry Pass) — Phase 10

### Screens
- [x] Title
- [x] Sector map
- [x] Loadout
- [x] HUD
- [x] Results
- [x] Paywall
- [x] Settings (mic on/off, sound, haptics)

### Monetization
- [ ] RevenueCat project + Test Store + products + entitlements (dashboard side: user must create; code expects `foundry_pass`/`skin_pack`, entitlements `foundry`/`skins`)
- [x] Capacitor RevenueCat SDK wired
- [x] Paywall purchase + restore flow
- [x] Entitlement gates (Foundry, skins)

### Juice
- [x] SFX: footsteps, hunter servo, wall slide, repair, fail buzz, heartbeat
- [x] Ambient drone loop
- [x] Screen shake (catch, wall slam)
- [x] Haptics
- [x] Hunter proximity heartbeat + vignette

### Ship
- [x] Capacitor Android project (config + `scripts/prepare-android.mjs`; `android/` generated, not committed)
- [x] GitHub Actions APK build (+ GitLab CI job at the repo root)
- [ ] Public repo (user) + [x] MIT LICENSE
- [x] README (pitch, tech decisions, RevenueCat setup, how to build; screenshots still to add)
- [x] App icon (adaptive vector icon + web `icon.svg`)
- [ ] Screenshot 1179×2556 for Devpost
- [ ] Demo video < 2 min
- [ ] Devpost submission (student email primary on account)

---

## 12. Demo video script (< 2 min)

| Time | Shot |
|---|---|
| 0:00–0:05 | Black. "IT CAN HEAR YOU." Player's real face, hand over mouth, locker slit, red eye passes. |
| 0:05–0:20 | Title → isometric gameplay. Generator repair. |
| 0:20–0:35 | Wall slides shut in front of player. Subtitle: "That route is closed now." |
| 0:35–0:50 | Chase → dive into locker → hold breath (split-screen with real player). |
| 0:50–1:05 | OVERSEER adapts: "Locker four. Again?" — hunter goes straight to the player's usual locker. |
| 1:05–1:20 | The Core finale, rings rotating, purge timer. |
| 1:20–1:35 | Paywall → Test Store purchase → Foundry unlocks → THE WEAVER reveal. |
| 1:35–1:50 | Tech: adaptive director, mic pipeline, script-authored Blender GLB kit, Capacitor. |
| 1:50–2:00 | Roadmap: online co-op with proximity voice the hunter hears, Overseer Mode. End card. |

---

## 13. Roadmap (post-hackathon, pitch only)
- **Crew bots:** AI teammates, processing pods, rescue (see section 5, `v4/07-crew.png`).
- **Online co-op:** 4 survivors vs AI facility.
- **Proximity voice chat the hunter can hear.**
- **Overseer Mode:** 1 player *is* the building (walls, locks, sends hunters) vs 4 survivors. See `v4/11-overseer.png`.
- iOS + Galaxy Store release.
- Daily seeded nights with leaderboards.

---

## 14. Risks
| Risk | Mitigation |
|---|---|
| Mic is annoying / unfair | Calibration, generous threshold, full mic-off mode |
| Shifting map feels cheap | Always telegraph, never trap, route-safety check |
| Hunter too hard/easy | Tunable constants file, playtest early |
| Looks like AI slop in-engine | V4 palette tokens + one painted atlas + stencil decals; compare every asset against `concepts/v4` at the game camera before integrating; no post FX beyond subtle vignette |
| V4 assets too heavy for mobile | Shared atlas (no per-GLB textures), triangle budgets, instancing, KTX2, measure draw calls per phase |
| Deadline (Sep 30) vs art pass | Each V4 phase keeps the game shippable (primitive fallback). If time runs out, ship with whatever phases are done; Phase 14 + 15 give the biggest visual win |
| Scope creep | Checklist order = priority. Foundry is cuttable; Sector 1 + Core + paywall are not. Crew already cut to roadmap. |

---

## 15. Decisions (locked)
- [x] **Name: SHUTDOWN.** Short, verb-like, doubles as the goal (you shut the facility down). Works as an icon word.
- [x] **OVERSEER tone: dry corporate, deadpan.** Polite facility-announcement voice that is quietly menacing. Never jokes, never insults, no "puny human" lines — open mockery reads as generic AI villain. Humor comes from calm understatement.
  - Good: "That route is closed now." · "Locker four. Again?" · "Please remain where you are." · "Your shift has been extended."
  - Bad: "You can't escape me, fool!" · "HAHAHA" · anything with exclamation marks.
- [x] **Crew: solo only in v1.** Crew bots move to the roadmap (they come back as online co-op). Frees time for the mic, map shifts and the Core, which are the actual hook. Crew rules in section 5 are kept as future reference.

---

## 16. Progress log

**Status:** Phases 0–12 complete (code, v3 flat look). **V4 art pass: Phases 13–27 in section 17 — Part A (13–20) authors ALL assets first, Part B (21–27) integrates them into the game later.** Current: **Part A done (86/86 built, reviewed). Part B: Phases 21–24 done (tsc + `pnpm build` clean, in-game checked in the browser). Phase 22 fixed `pivot_part` in `complete_library.py` (animated doors were exported offset); the user must rerun the props Blender build. Next: Phase 25.** Rules in section 2 are now V4.

**Next step (agent):** continue the first unchecked phase in section 17. Do one phase per turn, then stop, report, commit + push.

**Phase 24 (Sectors 2 + 3 in game) — DONE. Verified: `tsc --noEmit` + `pnpm build` clean; browser (898x624): Sector 2 (cold doors, coolant tanks, refrigeration units, water, outlets + waterfalls on the S/E piers) and Sector 3 (weaver GLB with cone, furnaces/troughs, north-ledge ladle rig + smokestack); no page errors.**
- `lib/game/v4-effects.ts`: shader materials for the manifest effects (`water`, `fall-water`, `foam`, `foam-splash`, `molten-core`, `molten-glow`), one shared time uniform, `instanceMatrix`-aware vertex shaders so they work on `InstancedAsset`. `assets.ts`: `assetMaterial(name)` = effect shader or atlas material (used by `applyV4Materials` + instancing; `AssetPart.material` is now `Material`), `tickAssetEffects(t)` (time + `molten` flicker 3 ± 15 % at 5 Hz), driven by `<EffectsClock>` in `V4Shell`. **Deviation:** `molten-glow` alpha .35 (spec .5) to stay clear of bloom haze.
- `v4-layout.ts`: sea = ONE `water-tile` scaled around the level at `WATER_Y` -2.2 (pier top -0.3, tide mark -1.3). `outlet-pipe` + `waterfall` (scale .6, anchor `waterfall_anchor_blender`) on every 3rd pier of the S and E ledges (camera side), all grid sectors. Crate sites → `crateDressing`: Sector 2 coolant-tank / refrigeration-unit, Sector 3 foundry-furnace / casting-trough (scaled to the 1.24 m collider), Sector 1 supply-crate. North ledge (behind the level from the camera): Sector 2 frost silos + refrigeration units, Sector 3 two tall smokestacks + the ladle rig (`SetPiece`); guardrails skipped on those ledge cells. `doorKit(levelId)`: Sector 2 doors = `cold-storage-door` (leaf `cold-door`), else sliding bulkhead; `V4Doors` takes the kit. `SECTOR_ASSETS` preloads per sector.
- `level/set-pieces.tsx`: `FoundryPour` = gantry + crucible on the hook held at the end of `pour` (`PosedAsset`, AnimationMixer at clip end) + trough + molten stream stretched from the trough surface to the tilted spout (values from the `foundry-floor` recipe), rotated so the pour points out over the water.
- Weaver: `WardenModel`/`WardenRig` take `kind` (`HUNTER_RIGS`: weaver GLB, walk clip `scuttle`, speed ref `HUNTER_PROFILES.weaver.patrolSpeed`); `hunter-view.tsx` now uses the GLB for both hunters (Blackout / Awareness x-ray / skins work the same). `WeaverBody` stays as the primitive fallback. `strike` is not wired.
- The primitive `sectorProps` boxes remain only in the `PrimitiveShell` fallback. Nothing in `lib/game/*` rules changed.
- For the playtest: weaver foot sliding vs speed and leg clearance in corridors (GLB feet reach x ±0.92 incl. splay); cold-door slide direction/extent; molten glow reads hot, not hazy; waterfall size under the deck; frame rate on device with the extra effect shaders.

**Phase 23 (Characters in game) — DONE. Verified: `tsc --noEmit` + `pnpm build` clean; browser (898x624): loadout operator, in-night operator walking + x-ray behind walls, warden with cone; no page errors.**
- `components/game/v4-character.tsx`: `OperatorModel` (player + loadout) and `WardenModel` (grid + Core). Each instance = SkeletonUtils clone + own `AnimationMixer`; all clips play at once and are blended by weight (smoothed, rate 10/s). `walkPhase` clips (walk/run/crouch/chase) have timeScale 0 and are scrubbed with `walkPhaseTime`, so steps match ground speed; `time` clips advance with dt. Operator: crouch when crouching, else walk/run × speed/`PLAYER.walkSpeed` + idle. Warden: stunned; else walk (chase in chase mode) × speed/`HUNTER.patrolSpeed` + scan (suspicious/investigate/search) or idle. Sim `headYaw` is added to the `head` bone after the mixer (reset to rest first). `grab`, `hide-enter`, `repair`, `caught` are not wired (no view-side state for them; lib/game stays untouched).
- Skins: `tintAsset` suit slot only when the skin isn't the default (operator amber / warden petrol); warden Porcelain = ivory shell + petrol trim. Tinted slots lose the paint strokes (flat color), per `tintAsset`.
- X-ray (player always, warden with Awareness): silhouette SkinnedMesh siblings bound to the same skeleton (no extra skinning pass). **Stencil mask**: body materials are per-instance clones that write stencil 1 and render at renderOrder 5 (after the level); the silhouette draws only where stencil ≠ 1, so it shows behind walls but no longer over the character's own pack/legs. Needs `gl.stencil: true` (`game-canvas.tsx`).
- Blackout hides all warden meshes except the `danger-red` slit. Core passes its `useSlitMaterial` as the slit (dims at the ending; not cloned).
- `hunter-view.tsx` exports `WardenRig` (places the model from sim state); the Weaver keeps `WeaverBody` until Phase 24. All primitives stay as `V4Only` fallbacks. Locker view: player is hidden while in the locker, the warden checking it plays scan (no locker-specific code needed).
- For the playtest: walk/run foot sliding, crouch pose, warden head yaw direction vs the cone, Porcelain/Hazmat/Night Shift tints. Headless browser ran at ~2 fps, so clip timing wasn't judged there.

**Phase 21 (Engine pipeline + V4 look) — DONE. Verified by the agent: `tsc --noEmit` clean, `pnpm build` clean, static `out/` checked in the browser. `<V4Model>` takes the kit id as `asset` (not `id`: `group` already has a string `id` prop).**
- `game/scripts/sync-v4-assets.mjs` (`pnpm assets:sync`, also runs first in `pnpm dev` / `pnpm build`): copies the 86 GLBs → `public/models/v4/<id>.glb`, `v4-atlas.png` + `decals-atlas.png` → `public/textures/v4/`, and writes the trimmed runtime manifest `lib/game/v4-manifest.json` (materials, effects, per-asset clips/clip_meta/tint_slots/anchors/decals). **Deviation:** the public copies are gitignored (they duplicate `assets/v4`, ~15 MB); the JSON is committed so typecheck works without the script. GLBs already carry no images, so nothing to strip.
- `lib/game/assets.ts`: `AssetId` (typed from the manifest), `assetUrl`, `preloadAssets(ids)` (`useGLTF.preload`, Draco off so the APK never hits a CDN), lazy shared `atlasTexture()` / `decalTexture()` (flipY false, sRGB), `v4Material(name)` = one cached `MeshStandardMaterial` per manifest name (atlas cell → atlas map, rough .9, metal 0; else `fallback_color`; `emission` → emissive; decals: decal atlas, transparent, depthWrite off, polygonOffset, mask = tinted), `applyV4Materials(root)`, `tintAsset(root, id, {suit, trim})` (clones only the slot materials), `useV4Asset(id)` (memoized clone; SkeletonUtils for rigged), `walkPhaseTime(meta, walkPhase)`.
- `components/game/v4-model.tsx` `<V4Model id fallback>`: Suspense + error boundary, renders the primitive while loading / on error / when `V4.models` is false (`config.ts`). Not mounted anywhere yet (Phase 22+).
- Palette: `PALETTE` = V4 tokens; v3 keys kept as aliases (ink=indigo, graphite=petrol, concrete=#62716C muted, bone=ivory, signal=amber, danger=#D84726) + new keys petrol/teal/ivory/amber/indigo. Same in `globals.css` (+ `bg-petrol` etc. utilities). `facility-map.tsx` hex literals → `PALETTE`.
- Fonts: Bebas Neue + Share Tech Mono via `next/font/local` from `app/fonts/` (OFL files copied from `assets/v4/ui/fonts`), CSS vars `--font-bebas` / `--font-share-tech` feed `font-display` / `font-mono` / `font-sans`. The `@fontsource/anton` + `jetbrains-mono` deps are now unused (remove in Phase 27).
- Lights: `components/game/v4-lights.tsx` shared by `GameRig`, `SceneRig`, `LoadoutDiorama`: amber key `LIGHT.keyColor` (the only shadow caster, still follows the player), indigo fill `LIGHT.fillColor` from `fillDirection`, indigo ambient `LIGHT.ambientColor`. Tune in `config.ts` `LIGHT` from the screenshot. The primitives still use flat Lambert materials, so only colors/light change visually this phase.

**Phase 19 (Core) — scripts only, not built yet (`complete_library.py`, `scene_recipes.py`, `scenes/core-arena.json`):**
- All core geometry now comes from constants that mirror `config.ts` `CORE` (`CORE_PILLAR`, `CORE_RINGS`, `CORE_RIM`, `CORE_SPOKE_HALF`, `CORE_SEGMENTS`, `CORE_SEAM`, depth 0.6). The old pieces used different radii (2.2/4.4/6.6); if `CORE` changes, update both.
- Angle rule: game angle a = atan2(z, x) in three = Blender angle −a. Segment pieces (`core-ring-*`, `core-retracting-segment`, `core-rim-segment`, `core-shaft-wall`) span game [0, SEG_ARC]. Part B: instance seg j at `rotation.y = -j * SEG_ARC` inside the ring group (`rotation.y = -ring.angle`), same as `RingView`; drop/warn animate the instance like the annulus now. `core-radial-bridge` runs along +X → `rotation.y = -spokeAngle` (same as the box now).
- Spokes are static and overlap the rotating rings, so ring pieces keep everything at or below z .006 (the "railing posts" are fascia stanchions + rail below the deck edge). The spoke deck spans z .012–.08, and its trusses sit only in the ring gaps.
- `core-spindle`: sensor band at z 6 = the game slit height (`anchors_blender.sensor_band`); Part B can drive the band from `useSlitMaterial` instead of the separate slit box. The pillar collider radius stays 3.2 (plinth).
- `core-arena` recipe = full game layout: 12×3 ring segments (ring 3 seg 4 = retracting variant), 12 rim + 12 wall panels, 4 spokes, 10 support columns (r 16.2, offset .2), kill switches at `CORE.terminals` ring mids, operator at the spawn.
- For review: shaft wall (top z 3.5) on the camera side may hide the rim at the iso camera. Part B: hide the near panels or cut them to deck height. Spindle ~2.6k tris estimated (32-sided cylinders). Kill-switch facing (outward tangent) is unchecked.

**Phase 18 (Foundry) — scripts only, not built yet (`complete_library.py`, `scene_recipes.py`, `effects/v4-effects.js`):**
- `make_rig` specs take an optional 5th item (roll vector → `align_roll`, so local Z = leg-plane normal = flex axis). Helpers `frame_along`, `armor_seg`, `hydraulic`, `seg_decal`; the Phase 17 mesh helpers (`_uv_mesh`, `grid_plane`, `sweep`, `annulus` + `inward`, new `blob` ico droplet) and `EFFECTS` moved above the props so the Foundry assets can use them.
- `weaver`: rebuilt as the chunky "W-01" (see AUDIT). `WEAVER_GAIT` (exported as manifest `gait`) mirrors `weaver-body.tsx`: hip (±.24, .98), rows game z .3/.02/-.26, splay ±.55 baked into the rest pose, knee (.4,.34), extra ankle (.62,-.6), foot (.58,-.98). Bones: `root`, `hips`, `head`, `hip{j}.{L|R}` (yaw = rotation_euler[1], lift = location.y, like the TSX group), `leg/shin/foot{j}.{L|R}`. Clips idle / scuttle / chase / scan / strike / stunned; tripod phase `(j + side) % 2`, legs swing forward while lifted.
- `foundry-crucible` = hanging ladle; origin = bail eye, goes at gantry `anchors_blender.hook` (0,0,3.3). `pour` clip tilts 1.05 rad about the trunnions (z -1.3); `anchors_blender.pour_lip` = spout lip at full tilt (0,-.904,-1.669).
- `overhead-gantry`: hazard-strip decals replace the amber boxes, knee braces, `code-f-03` + rail stripes (0.002 m proud so they don't z-fight), hook block/sheave/hook at 3.3.
- `molten-stream`: origin on the receiving surface, lip (0,0,1.25), ballistic path, 0.5 m/s out along -Y. New materials `molten-core` (opaque, emissive 5) and `molten-glow` (alpha .5, BLENDED). `EFFECTS` `molten` (flicker), `molten-core` (scroll), `molten-glow` (additive scroll). `v4-effects.js`: `createMoltenMaterial({glow})`, `updateAssetEffects` flicker now follows the spec (3 ± 15 %, 5 Hz).
- NEW `tall-smokestack` (machinery, ~9 m, concept 03).
- `scene_recipes.py`: foundry-floor hangs the ladle at the hook and scales the stream Z so its lip meets the tilted spout (trough surface z .333); stack added. Sector-foundry miniature uses the stack instead of the chimney.
- Manifest: `anchors_blender` and `gait` per asset.
- For review: the Weaver's 3-joint legs have 25+ parts each; tri count vs 6000 is unverified. The `molten-glow` sheath is additive at alpha .5. Check at the game camera that it reads as a hot core, not bloom haze (section 2); drop to 0.3 or make it opaque if it looks hazy. `hip{j}` yaw sign relative to the TSX `-side * (SPLAY + swing)`: splay is baked into the rest pose, so the clip only applies `-side * swing`. The strike clip reach sign is unverified. Part B: `weaver-body.tsx` does not move the ankle; the GLB adds one knee flex.

**Phase 14 (environment shell) — scripts only, not built yet:**
- `build_assets.py`: `box(..., seg=1)` single-chamfer option (repeated tiles/blocks stay in budget). Decal system: `DECALS` (from `textures/decals-layout.json`), materials `decal-ivory` / `decal-indigo` / `decal-amber` (mask, tinted) + `decal-hazard` (color), all `BLENDED` with custom props `decal_atlas`/`decal_kind`; `decal(item, p, w, h, mat, facing, vertical)` builds a UV-mapped quad (`-Y/+Y/+X/-X/+Z`, `vertical` runs stripes up the quad). Stencil text on the rebuilt pieces uses decals instead of `label()` text meshes.
- Thick wall kit: `wall_run(axis, a, b, ends)` = 0.8 m concrete body (`WALL_H` 2.0 = `GRID.wallHeight`), cap, dark plinth course, staggered block seams/joints both faces; ends `free`/`edge`/`host` avoid coplanar cap overlaps at cell edges and T joins. Grid pieces (one 2 m cell, origin at centre, arms +X/+Y/-Y): `wall-post`, `wall-end`, `wall-straight`, `wall-corner`, `wall-t`, `wall-cross`. `bulkhead-wall` = 4 m run with conduit + TURBINE / HALL / A stencils.
- Floors: `floor_tiles(n)` 1 m worn concrete tiles on a `concrete-dark` slab (tile top z=0.03). `walkway-floor` (4 m, amber edge lines, hazard dashes both ends), `floor-cell`, `floor-cell-edge` (edge line + dashes on -Y), `floor-cell-drain`.
- `sliding-bulkhead`: vertical hazard stripes on both uprights, header stripe, leaf stripes, B-1 + KEEP CLEAR decals (on the moving leaf). Hydraulic rails moved outward.
- `complete_library.py`: `foundation-pier` = dark concrete block, coping, pilasters on 4 faces, pour seams, waterline stain at z=-1; old thin `wall-corner` removed (now in the kit). Manifest: decal materials get `atlas: "decals"` + `decal_kind`, decal assets get `decal_item`; runtime note updated.
- Known for the post-Phase-20 review: `sliding-bulkhead` (3 m tall, 2.6 m clear) and `bulkhead-wall`'s old 3 m height don't match the 2 m cell / 2.0 m wall kit; Part B scales the door or it gets resized in the review pass. Thick 0.8 m walls vs `GRID.wallThickness` 0.3 colliders: Part B (Phase 22) decides whether to widen colliders (gameplay-neutral check needed) or keep them thin.

**Phase 15 (characters) — scripts only, not built yet (`complete_library.py`):**
- `operator()` (operator-amber / crew-teal / crew-ivory): wider padded jacket + shoulder pads, belt pouches, rubber knee pads with plate + straps, `glove()` padded dark gloves + gauntlets, toe-capped boots, 0.46 x 0.28 x 0.6 m pack with side canisters/bands/warning plate, chest radio (grille, amber PTT, antenna, lead). Limb joints widened to match; bone names unchanged.
- `warden`: `warden_head()` 0.74 x 0.46 x 0.4 m ivory box, steel brow, 0.6 m red slit, chin vent, hatch (head bone now 1.92→2.42). `warden_hand()` adds bones `fingers.L/R`, `fingertips.L/R`, `thumb.L/R` (three claws + thumb). Old `hand()` removed.
- Clips: `CLIPS` table (name, loop, drive). Loops = 48 frames / 2 s, phase 0 at t=0 matching `sin(walkPhase)`; one-shots = 24 frames / 1 s. Operator: idle, walk, run, crouch (crouched walk loop), hide-enter (one-shot: turn 180°, back 0.35 m, settle), repair, hide, hold-breath, rescue, caught, sit-exhausted. Warden: idle, walk, scan (head sweep), chase, grab (one-shot: reach open → clamp), stunned (renamed from patrol/search/capture — no game code used the names). Manifest `clip_meta` + runtime note give the walkPhase → time mapping.
- Bug fixed: hips bob/crouch wrote `location.z`, which on an up-pointing bone is world forward, not up; now `location.y`. Head yaw likewise moved to `rotation_euler[1]`.
- Tints: `tag_tints()` → manifest `tint_slots` {suit, trim} (operator: suit cloth / cloth-black; warden: petrol / ivory) and `extras.tint_slot` on meshes.
- For review: finger curl sign (+X assumed = close) and arm reach sign follow the old repair clip; check grab/hide-enter visually. Operator triangle count vs 6000 budget unverified (single-chamfer on small parts to help).

**Phase 16 (Sector 1 plant props) — scripts only, not built yet:**
- `pipe-valve`: now inline on the pipe-straight axis (`PIPE_Z` .42, `PIPE_RAD` .28, flange r .37) with saddles, bulge, bolted bonnet, yoke; stem runs through the hub so the red handwheel sits on it (was floating 5 cm above). `valve-wheel` pivot/`turn` clip kept.
- `lamp_beacon()` rewritten: 0.26 m caged beacon (base, collar, red lens + dome, 4 cage bars, hoop, cap); `p` = base bottom. `warning-beacon` base at z 0. Capsule beacon now sits on the roof (z 2.74, was floating).
- `containment-capsule`: two steel feed pipes down the back with clamps/feet, hazard stripes on sill + lower frame, `C-1` label → `code-c-1` decal.
- `scrap-bundle`: 4 stacked plates (steel/rust), 3 ribbed rebar lengths, two amber tie straps with buckles.
- `turbine-generator` (build_assets.py): bolted shaft coupling (2 half-flanges r .36, 8 bolts, output shaft), amber guard on struts, cooling pipe run stator top → along -X → down to a floor saddle, with flanges + clamps.
- `locker-interior-frame`: worn -Y face (assumed viewer side, where the rivets are): stiffener ribs, latch bar, soot scuffs, rust streaks under the slits, dent seam, scratched `code-07`. Slits left clear.
- `core-kill-switch`: shared `number_plate(p, item, size)` (steel plate, 4 screws, decal with `extras.decal_slot = "number"`); root `decal_item` code-01 + `decal_variants` code-01..04 (exported to the manifest). Separate `number-plate` asset.
- NEW: `pipe-tee`, `pipe-riser` (3 m, wall clamps), `pipe-bracket` (pipe centre (0,-.5,0)), `junction-box` (E1 decal, conduits), `floor-drain-grate`, `coat-hook-workwear` (tint slot suit).
- For review: `scene_recipes.py` places four kill switches but every instance shows `code-01` until the runtime (or `put()`) sets the variant. Locker interior viewer side assumed -Y.

**Phase 20 (Title / sector map / overseer + UI kit) — done, full build 86/86 exported (bpy 5.0.1):**
- FIX `overseer-housing` (dark monolith, `danger-red` slit — was an undefined `vision-red` material), `chimney` (1.5 m, red/ivory bands), `operator-plinth` (square block, top z 0.42). NEW `sea-rock`, `cliff-stack`, `facility-tower-block`, `forklift`, `pallet`.
- `scene_recipes.py`: `title-station` (01: two decks, tower block, outlet pipes + waterfalls, monolith, stacks), `sector-{plant,cold-storage,foundry,core}` on sea-rock islands + composed `sector-map` (03), `loadout-stage` operator at plinth top, `overseer-map` storage rooms get pallets/crates/forklifts, a frost silo and outlet waterfalls (11). Warden clip `search` → `scan` (the only clip name that exists).
- `build_ui.py`: 51 icons; `tokens.json` `lucideIcons` maps every current `lucide-react` import in `game/` to its V4 icon for the Part B swap.
- For review: 35 of 86 assets are over their triangle budget (e.g. turbine-generator 37.9k vs 2k, characters ~16k vs 6k). Pre-existing (budgets were never enforced in earlier phases); decimation/LOD pass needed before Part B wiring. The redundant `v0-project.zip` (and its LFS `.gitattributes`) were removed from the repo.

**Phase 20b (Triangle budget pass) — DONE (86/86 within budget, all reviewed):** turbine-generator rebuilt at hero budget 9624 -> 5998 / 6000 and re-checked on the contact sheet (solid, no shards). Next: Part B.
History: Local parallel build (`build_fast.sh`, Blender 5.2.2) exported 86/86, 0 over budget, 94k tris total (was 35 over). Contact sheet (three.js, game camera) reviewed for all 86: 85 read cleanly. `turbine-generator` was collapsed 37.9k -> 1.8k and shattered its stator shells, so it now has a per-asset hero budget of 6000 (`ASSET_BUDGET`, also written to `manifest.json` `asset_budgets`); rebuild only it with `--only turbine-generator` and re-check before Part B.
Original task: decimate (Blender Decimate modifier / fewer bevel segments + cylinder verts) each asset below to its budget in `complete_library.py`/`build_assets.py`, re-run `complete_library.py` (bpy 5.0.1, ~20 min), confirm 0 OVER BUDGET lines, then Part B.
- Script changes: `build_assets.py` bevels capped at 1 segment and skipped under 4 mm / on cylinders r < 5 cm; `circle_verts(r)` caps cylinder/cone/rod/tube sides by radius (6 / 8 / 12 / 16 / 24); rod default 8; text `resolution_u` 2. `complete_library.py`: ellipsoids ≤16 segments, torus rings 12–24 x 4, cloth segments 10 x 6. Safety net `enforce_budget()` at export: collapse-decimates the heaviest source parts (Decimate moved before the Armature modifier) until each asset is ≤95% of its budget; decals and `Marking` text are never decimated. Logs `DECIMATED id before -> after`. Ids, pivots, materials, rigs, anchors unchanged.
- To do after the user's local build: tick the list below from `/tmp/build.log`, check `renders/` for decimation artefacts (characters, turbine, scrap-bundle are the most reduced).
  - [x] turbine-generator 37856 -> 5998 / 6000 (hero budget; 2000 shattered it)
  - [x] control-console 10776 -> 1928 / 2000
  - [x] locker-bank 8784 -> 1840 / 2000
  - [x] supply-crate 3196 -> 892 / 2000
  - [x] pipe-elbow 4576 -> 1232 / 2000
  - [x] pipe-straight 6052 -> 1188 / 2000
  - [x] operator-amber 16244 -> 4896 / 6000
  - [x] crew-teal 16244 -> 4896 / 6000
  - [x] crew-ivory 16244 -> 4896 / 6000
  - [x] warden 15408 -> 3768 / 6000
  - [x] weaver 13028 -> 4932 / 6000
  - [x] containment-capsule 5164 -> 1536 / 4000
  - [x] locker-interior-frame 2762 -> 642 / 2000
  - [x] wall-microphone 3224 -> 600 / 1500
  - [x] rotary-control 3464 -> 624 / 1500
  - [x] scrap-bundle 8676 -> 1412 / 1500
  - [x] operator-plinth 2636 -> 956 / 2000
  - [x] ladder 2380 -> 356 / 2000
  - [x] stairs 3840 -> 944 / 2000
  - [x] grated-bridge 6584 -> 1832 / 2000
  - [x] pipe-valve 9532 -> 2044 / 4000
  - [x] pipe-tee 9092 -> 1900 / 4000
  - [x] pipe-riser 4308 -> 1044 / 4000
  - [x] coat-hook-workwear 2616 -> 900 / 2000
  - [x] warning-beacon 2952 -> 516 / 1500
  - [x] coolant-tank 6138 -> 2074 / 4000
  - [x] refrigeration-unit 4708 -> 1092 / 4000
  - [x] frost-silo 4482 -> 2090 / 4000
  - [x] chimney 4902 -> 3046 / 4000
  - [x] foundry-crucible 4120 -> 1704 / 4000
  - [x] sea-rock 4308 -> 1812 / 2000
  - [x] cliff-stack 3532 -> 1516 / 2000
  - [x] forklift 2618 -> 1338 / 1500
  - [x] core-spindle 9132 -> 3764 / 4000
  - [x] tall-smokestack 4754 -> 1762 / 4000
  - [ ] LIBRARY FULL 86 exported / 86 assets | over budget: 35 ['turbine-generator', 'co

**Phase 17 (Water + Cold Storage) — scripts only, not built yet (`complete_library.py`, `effects/v4-effects.js`):**
- Materials: `water` now matte (metallic 0, rough .9; was .2/.27 glossy), new flat `fall-water` and `foam-splash`. `EFFECTS` dict (material name → runtime shader spec, V4 token colors) exported as manifest top-level `effects`; assets list the effect materials they use in `effects`.
- Helpers: `_uv_mesh` (from_pydata + per-vertex UVs), `grid_plane`, `sweep` (elliptical section along a YZ path, u around / v down the path, normals recalculated), `annulus` (flat ring or open frustum, v inner→outer), `frost_drips`.
- `water-tile`: 8 m 16×16 grid at z 0 (was an 8 cm box at -.06; scene recipes place it by origin so levels are unchanged). Spec: world-xz ripples so tiles line up, UV scroll, opaque, no reflections, optional contact-foam line from pier AABBs.
- `waterfall`: lip at (0,0,2) along -Y, ballistic path (1.2 m/s) landing at (0,-.766,0): body sweep 12 sides, 2 foam streaks, foam lip, splash crown frustum + 3 splash rings. Manifest `fall_lip_blender` / `fall_landing_blender`. `v4-effects.js`: `createWaterMaterial` (world-space, deep/mid/crest), new `createFallMaterial({foam})` (v scroll), `createSplashMaterial(center)` (pulse about the landing).
- NEW `outlet-pipe` (machinery): wall face y 0, origin on the water line; 0.45 m pipe at z 2.38 out to y -.95, bolted wall + mouth flanges, dark opening, clamp band + strut, amber paint band, rust run, `code-s2`. `waterfall_anchor_blender` [0,-.95,0] = where to put the waterfall origin so its lip meets the mouth bottom.
- NEW `frost-silo` (machinery, r 1.0, ~5.2 m): see AUDIT. Reviewed coolant-tank (frost crown/drips, torus seams → bands, `code-c1` decal replaces the COOLANT text mesh — no COOLANT word in the decal atlas), refrigeration-unit (frost top, frosted back lines, decals, torus rims dropped), cold-storage-door (jamb hazard stripes, gasket, keeper, frosted threshold, `code-02` on the leaf).
- For review: frost-silo is the heaviest (~3.7k est. vs 4k budget). Splash center for the shader is hard-coded [0,.766] (glTF xz) — read it from `fall_landing_blender` in Part B. `effects/v4-effects.js` still exports `createSparks` (sparks are banned by section 2) — don't use it in Part B. `scene_recipes.py` doesn't place outlet-pipe/frost-silo yet (Phase 20 recipes).

**Phase 12 (Ship) — done (edited via GitLab, no local build):**
- `capacitor.config.ts` (appId `com.hideogroup.shutdown`, webDir `out`, ink background). Deps added: `@capacitor/android`, `@capacitor/haptics`, dev `@capacitor/cli` (all ^8). **The lockfile was not regenerated**: CI uses `pnpm install --no-frozen-lockfile`; run `pnpm install` locally and commit `pnpm-lock.yaml`.
- `scripts/prepare-android.mjs` (`pnpm android:prepare`): `cap add android` if missing, `sensorLandscape` on the main activity, RECORD_AUDIO / MODIFY_AUDIO_SETTINGS / VIBRATE permissions, adaptive vector icon from `resources/android/`, `cap sync android`. `android/` is gitignored and regenerated each build.
- CI: `.gitlab-ci.yml` at the GitLab repo root (`APP_DIR: shutdown-kit/game`, temurin 21 + Node 22 + cmdline-tools, runs on MRs / default branch / manual) and `game/.github/workflows/android.yml` for the public GitHub repo. Both run `pnpm typecheck` first (needed because `next.config.mjs` has `ignoreBuildErrors: true`), then build, prepare, `gradlew assembleDebug`, upload the APK artifact. Optional secret `REVENUECAT_ANDROID_KEY`.
- `LICENSE` (MIT, "2026 hideo-group"; change the holder if needed), `README.md`, `public/icon.svg` replaced with the SHUTDOWN mark (concrete head, red slit). `package.json` renamed to `shutdown` 1.0.0 with `typecheck`, `android:prepare`, `android:open`, `android:apk` scripts. `tsconfig` excludes `out`, `android`, `ios`.

**Phase 11 (Juice) — done (edited via GitLab, no local build; run `npx tsc --noEmit` first):**
- `lib/game/juice.ts` — feedback layer. `stepJuice(state, source, dt)` runs right after `stepSession` / `stepCoreSession` and diffs a `JuiceSource` (`gridJuiceSource` / `coreJuiceSource`) against the last frame: status change (caught / fell = caught SFX + heavy haptic + full shake; lockdown = buzz; escaped = chime), Second Wind used, progress up (repair chime), `shift.count` up (shake + medium haptic; `shift.ts` still plays the slam), gates powered, new noise events (`repair-fail` = buzz + shake, `door` outside a shift = door slam). Footsteps fire every half walk cycle (`walkPhase / PI`), hunter servo ticks the same way, volume by distance (`JUICE.servoRange`). Danger 0..1 from the nearest active hunter (`heartbeatRange`→`heartbeatNear`, +`chaseBoost` while chasing), smoothed; drives the heartbeat interval, the drone and the proximity frame. `juiceLive` (danger / trauma / pulse) is shared with the rig and the HTML frame. `endJuice()` on loop unmount stops the drone.
- `lib/game/audio.ts` — all synthesized Web Audio (no sample files): master gain, cached noise buffer, `burst()` filtered noise hits. SFX: shiftWarning, wallSlam (now with slide grind), footstep (walk/run/crouch), servo, repair, failBuzz, doorSlam, heartbeat, caught, secondWind, gatesPowered, escape. `drone.update(level)` = 2 detuned saws + sub sine through a lowpass with a slow LFO, louder/brighter with danger; honors `settings.sound` live.
- `lib/game/haptics.ts` — `haptic('light'|'medium'|'heavy')`, honors `settings.haptics`, light taps rate-limited. Native: `registerPlugin('Haptics')` from `@capacitor/core` (no new npm dep yet). Web: `navigator.vibrate`.
- `components/game/game-rig.tsx` — screen shake (trauma² × `JUICE.shake.maxOffset`, applied after placement so it never drifts). Used by grid sectors and the Core.
- `components/shell/danger-vignette.tsx` — proximity frame, mounted in `page.tsx` during nights.
- All tunables in `config.ts` `JUICE`.

**Phase 10 (Foundry content) — done:**
- `lib/game/level/sector3.ts` — THE FOUNDRY layout (furnace channel via 2 dynamic walls, 8 generator sites, 2 gates, 4 cameras); `level` set on `foundry` in `campaign.ts` so it's no longer sealed.
- THE WEAVER: `HUNTER_PROFILES.weaver` in `config.ts` (wide/short sight 130°/6.5, hearing ×1.35, chase 4.6); `hunter.ts` uses per-hunter profile; `components/game/weaver-body.tsx` (six-legged primitive body), `hunter-view.tsx` picks body by kind, `vision-cone.tsx` uses profile.
- Foundry perks in `perks.ts` (gated by `entitlements.foundry`, `usablePerks` filters them without the pass): GHOST (cameras can't log you 5s after a hack), DECOY (`lib/game/decoy.ts` + `components/game/decoy-view.tsx`, 2 throws/night, pulsing noise; DECOY touch button), OVERRIDE (one free shift reversal/night, "HACK FREE" label). Not applied in the Core.
- Daily Night: `lib/game/daily.ts` (mulberry32 seed from date → sector/modifier/spawn/trials, night-3 difficulty); store `daily` (non-persisted) + `dailyBest` (persisted); DAILY node + detail panel on the sector map; HUD/results labels.
- Loadout PERKS tab shows Foundry perks with lock/paywall; SKINS tab from Phase 9 kept.
- Verified: `tsc --noEmit` clean; headless sims of Sector 3 route safety + idle-catch; browser check of sector map (daily node, panel widths fixed for 844x390), loadout buying/equipping Ghost/Decoy/Override, deploy into Foundry.
- **Phase 10 close-out (code review, no browser):** Weaver gait fixed: legs were lifting during the back-sweep (moonwalk); now they swing forward while lifted and sweep back while planted (tripod: L-front/L-back/R-mid vs R-front/R-back/L-mid). Legs narrowed (knee x 0.40, foot x 0.58, was 0.50/0.82) so the frame no longer clips corridor walls. Confirmed the cone uses `profile.visionRange`/`halfFov` and hearing uses `profile.hearing` (`vision-cone.tsx`, `hunter.ts`). The final visual check is on the P10 playtest line. A temporary `window.__v0s` debug hook was removed from `game-scene.tsx` earlier.

- P10 Playtest: Sector 3 unlocks after buying Foundry Pass; Weaver looks/moves right (tripod gait, feet lift while stepping forward, legs don't clip corridor walls; tune `KNEE`/`FOOT` in `weaver-body.tsx`), hears you from farther, sees wide but short. GHOST: hack then walk past a camera within 5s = not logged. DECOY: throw lands ≤6 away, pulses 3×, hunter investigates. OVERRIDE: first shift reversal each night costs no charge. DAILY: same sector/modifier all day, best score saved, needs Foundry Pass.

**Next step (user, ship tasks, still open):** 1) Let the GitLab `android-apk` pipeline run on the Phase 12 MR; fix anything `pnpm typecheck` or Gradle reports (Phases 10–12 were written without a local build). 2) `pnpm install` locally and commit the updated `pnpm-lock.yaml`. 3) RevenueCat dashboard: Test Store, products, entitlements, then set `REVENUECAT_ANDROID_KEY` in CI. 4) Run the Playtest checklist on the web preview and the APK. 5) Push `game/` to a public GitHub repo, capture a 1179×2556 screenshot, record the demo video (section 12), submit on Devpost.

Earlier: Phase 9 (RevenueCat) logic-tested headlessly (`/tmp/p9/test.mts`, 12 checks: mock init/prices, empty restore, Foundry `pass` state without entitlement, purchase → `open` + still sealed (no layout until Phase 10), restore persists across adapter instances, skins fall back to free defaults without entitlement and apply with it, bad skin save sanitized). `tsc --noEmit` clean, `pnpm build` static export OK.

Phase 8 complete. Phase 8 (The Core finale) logic-tested headlessly (`/tmp/p8/test.mts`, 18 checks): Core line style (no `!`), hunter polar navigation 200/200 random band→band targets reached (rim, 3 rings, via spokes), idle player caught 30/30 (median 24s), Second Wind on catch stuns the hunter, second hunter joins on switch 1 or at 50s, rings accelerate per switch, switch 4 → ending (queue cleared, "Four." → "Shutdown confirmed. Your shift is over."), rings spin down to a stop, `escaped` after 6.5s, result 4/4 + scrap, purge warnings at 60/30 then lockdown, failed switch = purge −8s + noise the hunter investigates, hunter falls with a dropped segment and respawns on the rim after 9s, no NaN positions over 20 × 120s. `tsc --noEmit` clean, `pnpm build` static export OK.

Phase 7 (Screens + progression) logic-tested headlessly (`/tmp/p7/test.mts`, 26 checks: sector gating, first-deploy → calibration, caught = no progress + partial scrap, retry, 3 nights → sector cleared → sector map with Sector 2 selected, Foundry = PASS / Core = LOCKED, perk buy/equip/max 3/swap, save partialize + corrupt-save sanitizing, reset, scrap maths). Sector 2 route safety: 300 random spawns, 0 isolated (fixed a crate that sealed the SE room); 60 × 120s sims of S1 + S2 Blackout, 0 route failures. `tsc --noEmit` clean, `pnpm build` static export OK.

Phase 6 (OVERSEER director) was logic-tested headlessly (`/tmp/p6/test.ts`, 20 runs per habit): line bank style (no `!`, sentence case), subtitle priority/queue/cooldowns, night-start line, still → "Please remain where you are." → hunter sent (20/20), locker repeat line, gas after 4 entries + eviction + gassed locker unenterable + expiry, locker-first search (20/20), corridor sealed (20/20), rush locks generator doors (20/20), loud → patrol bias, response rate bounded over a 180s run.

**Verification rule (overrides PROMPT.md "verify in the browser preview"):** do NOT use agent-browser or screenshots. Verify logic headlessly (`npx tsc --noEmit`, tsx scripts in `/tmp`). The user playtests everything at the END of the build, not per phase. Do not ask them to test each phase; instead append what needs checking to the **Playtest checklist** below.

**Playtest checklist (user runs this at the end; add to it every phase):**
- P1 Movement: joystick + WASD feel, RUN speed, collision on walls/props, camera follow, player x-ray when behind walls.
- P2 Hunter: patrol route, vision cone reads clearly, noise → turns/investigates, chase + catch, search then back to patrol. Tuning `HUNTER.*`, `NOISE.walk/crouch/run`, `PLAYER.autoCrouchDistance`.
- P3 Objectives: USE on generator opens trial; needle / wires / hold all winnable, fail makes hunter come; HUD count updates; 5 repaired → gates power + 60s final chase; escape → ESCAPED screen; caught → Second Wind once, then NIGHT FAILED; RETRY works. Hacks: door lock, wall reverse, camera blind 10s; charges decrement.
- P4 Shifts: at ~25s, then every 45s: tracks blink red + klaxon (tap once first to unlock audio), then wall/door moves. Standing in a slot during the warning = that piece stays. HACK on a blinking piece cancels it. Never trapped. Is 45s right? (`SHIFT.*`)
- P5 Mic: first PLAY opens calibration. USE MIC → permission prompt (may be blocked inside the v0 preview iframe; test on the deployed URL / phone) → 3s silent countdown → meter reacts to your voice, crosses DETECTED when talking. PLAY WITHOUT MIC works. In game HUD shows MIC meter; talking loudly makes the hunter turn/investigate. Threshold feel: `MIC.threshold`, `MIC.fullScale`, `NOISE.mic`.
- P5 Locker: HIDE lights up in front of a locker (F on keyboard). View switches to the slit first-person view with HIDDEN tag; EXIT LOCKER works. Make noise near the hunter, hide; when it comes to check: HOLD YOUR BREATH. Mic on: stay silent 4s → "CLEAR"; speak → "THERE YOU ARE." and caught. Mic off: hold HOLD/Space to keep the needle in the moving zone. Does the slit view frame the hunter well? (`LOCKER.camera`, slit paths in `locker-view.tsx`). Fallback difficulty: `LOCKER.fallback`.
- P6 OVERSEER: subtitle "OVERSEER: ..." top center, system notice (terse caps) under it; neither overlaps the generator counter or MENU at 844x390. Night-start line. Stand still ~12s → "Please remain where you are." then the hunter comes. Hide in the same locker twice → "Locker one. Again?"; 4 locker entries → red floor plates at nearby lockers, HIDE unavailable there, forced out after 3s if inside. Walk through the same door/wall slot 4 times → it gets telegraphed + closed when you're 5+ away. Repair 2 generators quickly → doors near remaining generators lock. Run a lot / talk → "I will be listening near there." and the hunter patrols that area. Is the line rate too chatty or too quiet? (`SUBTITLE.*`, `DIRECTOR.*`)

- P7 Screens: Title PLAY → Sector map, PERKS → Loadout, SETTINGS. Sector map: select nodes, detail panel (NIGHTS x/3, HUNTER, MODIFIER), ENTER → Loadout; Sector 2 locked until Sector 1 cleared; Foundry shows PASS, Core LOCKED/OFFLINE. Loadout: rotating operator on the left fits the 38% column at 844x390 (tune `VIEW_HEIGHT` / the 0.19 factor in `loadout-diorama.tsx`); tap perk → detail row → BUY / EQUIP / UNEQUIP; max 3; DEPLOY (first time → mic calibration; BACK returns to Loadout). HUD shows sector/night/modifier + SECOND WIND READY. Results: ESCAPED / CAUGHT / LOCKDOWN, stats, scrap breakdown, route map; NEXT NIGHT / RETRY / LOADOUT / MENU; night 3 → "SECTOR MAP" + CLEARED tag. Reload the page: scrap, perks, progress, settings persist. Settings: mic toggle on → calibration → SAVE returns to Settings; sound off silences the klaxon; RESET SAVE needs confirm. Sector 2 night 3 = Blackout (dim light, no vision cone, hunter only visible within 6). Sector 1 night 3 = Overtime (faster shifts). Scrap pacing (`PROGRESSION.scrap`, perk costs in `perks.ts`).

- P9 Paywall: tap locked SECTOR 3 → paywall with MOCK STORE label; UNLOCK → PROCESSING → FOUNDRY PASS // OWNED → CONTINUE; Sector 3 shows OPEN (sealed until P10). Clear Sector 1 the first time → paywall once over the sector map. Loadout SKINS tab: locked skins open the Skin Pack paywall; after buying, pick HAZMAT / NIGHT SHIFT / PORCELAIN and see them in Loadout + in game. RESTORE PURCHASES after reload restores. Layout at 844x390 (right column fits without scrolling?). On device: real Test Store purchase + restore.
- P8 Core: clear Sector 2 → Core node shows OPEN → ENTER // THE CORE → Loadout → DEPLOY. Arena: rim, 3 rotating rings, 4 static spokes, central pillar with red slit. Rings carry you. Segments blink red ~2.2s then drop; standing on one = fall = LOST (Second Wind catches the edge once). 4 orange kill-switch terminals on the rings; SWITCH opens a trial; success = KILL SWITCH n/4 + rings speed up; fail = PURGE −8s + noise. HUD shows CORE + PURGE bar. One hunter at start on the rim, second at switch 1 (or 50s). Hunters follow rings/spokes, see you with the red cone (blocked by the pillar), hear running and failed switches, can fall with dropped segments (lure them) and come back after 9s. Switch 4: "Four." → rings spin down, all slits go dark, hunters freeze, "Shutdown confirmed. Your shift is over." → Results "SHUTDOWN" + FACILITY 07 // OFFLINE. Tuning: `CORE.*` (purge 240s, drops), `CORE_HUNTER.*` (chase 4.5 vs player run 5.6). Is 240s right? Are hunters too sticky on the rings?

- P11 Juice: tap once to unlock audio. Drone audible in nights and the Core, swells near the hunter; Settings sound off silences everything including the drone. Footsteps (walk quiet, run louder, crouch near the hunter barely audible), hunter servo ticks louder as it approaches. Hunter within ~12: heartbeat speeds up, flat dark frame closes in and pulses, thin red rule appears when close / chasing. Shake on catch, Second Wind, shift slam, failed repair. Chimes on repair, gates powered, escape. On an Android phone (web): vibration on repair fail, catch, shifts; Settings haptics off stops it. Is the drone too loud on phone speakers? Is the frame too heavy at 844x390? Tuning: `JUICE.*`.

**(Done — was Phase 10 plan):** Foundry content: Sector 3 layout (`lib/game/level/sector3.ts`, set `level` on the `foundry` def in `campaign.ts` so `isSealed` turns false), THE WEAVER (six-legged hunter view + tuning), 3 Foundry perks (Ghost, Decoy, Override; gated by `entitlements.foundry`), Daily Night (seeded night, Foundry entitlement).

**Phase 9 summary:** `lib/purchases/`. `types.ts` = `ProductId` (`foundry_pass`, `skin_pack`), `EntitlementId` (`foundry`, `skins`), `LIST_PRICES`, `PurchaseCancelled`, `PurchasesAdapter` (init / purchase / restore, each returns the full entitlement set). `index.ts` `createPurchasesAdapter` = RevenueCat on `Capacitor.getPlatform() === 'android'` with `NEXT_PUBLIC_REVENUECAT_ANDROID_KEY` set, else the mock. `revenuecat.ts` = dynamic-imported `@revenuecat/purchases-capacitor` (configure, getProducts NON_SUBSCRIPTION, purchaseStoreProduct, restorePurchases, `entitlements.active`). `mock.ts` = localStorage flags (`shutdown-mock-store`), 700ms fake latency; paywall shows "WEB PREVIEW // MOCK STORE // NO CHARGE". `store.ts` = zustand `usePurchases` (entitlements, prices, busy, message, `paywall` reason, persisted `sector1PaywallShown`), `hasFoundry()` for non-React callers (`lib/game/store.ts`). Entitlements are never persisted by the app; they come from the adapter on every launch. Paywall (`components/shell/paywall.tsx`, screen 10): image left (`public/images/foundry-pass.png`), offer right, UNLOCK headline product + secondary product, RESTORE PURCHASES always visible, NOT NOW / CONTINUE, Escape closes. Rendered over menu screens only. Triggers: locked Sector 3 node/ENTER (sector-map), first Sector 1 clear once (results-screen → shown over the sector map), Loadout SKINS tab (locked skin or UNLOCK). Skins: `lib/game/skins.ts` (suits OPERATOR/HAZMAT/NIGHT SHIFT, hunters WARDEN/PORCELAIN, palette colors only, never concrete/danger), selection saved in the game save (`skins`), applied via `useSkinColors()` in player, hunter, Core hunter and loadout diorama only while `skins` is active.

**RevenueCat setup (needed on device, not in the preview):** create a RevenueCat project + Test Store, products `foundry_pass` and `skin_pack` (non-consumable), entitlements `foundry` and `skins` attached to them, then set `NEXT_PUBLIC_REVENUECAT_ANDROID_KEY` (public SDK key) at build time for the Capacitor build (Phase 12 GitHub Actions secret). Never commit the key. The user has not supplied keys yet.

**Phase 8 summary:** `lib/game/core/`. `arena.ts` = ring/segment types, polar helpers (`wrap`, `angleDiff`, `segCenter`, `ringMid`, `bandOf`, `bandRadius`), `spokeAt`, `surfaceAt(arena, x, z)` (rim / spoke / ring seg / null for void or dropped), `nearestSpokePoint`, pillar raycast (`pillarHit`, `clearOfPillar`). `hunters.ts` = `CoreHunter` + `updateCoreHunter` (patrol / investigate / chase / search / stunned, same `HunterMode` strings). Grid A* doesn't fit rotating rings, so `navPoint` plans in polar terms: same band → arc waypoint along it; different band → arc to the best spoke, then radial along it (`alignedSpoke` includes the rim junction). A dropped segment ahead reverses the arc direction for `blockedTime`. Sight = range + FOV + pillar LOS; hearing = one per-frame `noise` (running, failed switch). `session.ts` = `CoreSession` (`hunters[2]`, `subtitles`, `ending`, `spotted`, `purgeWarned`), `stepCoreSession`: resolve trial → use → move → rotate rings (carries player and hunters) → drops → fall → hunters (second unit, falls/respawns, catch + Second Wind) → purge. `beginEnding` restores dropped segments, freezes hunters (`stunned`), clears the subtitle queue; rings spin down over `CORE.spinDown`; status `escaped` at `CORE.endingTime`. Tunables moved to `config.ts` (`CORE`, `CORE_HUNTER`); `core/session.ts` re-exports `CORE`. View: `components/game/core-scene.tsx` (extruded ring segments, spokes, rim, pillar; `CoreHunterView` reuses the exported `HunterBody` + `FanCone` with a pillar `cast`; per-scene slit materials turn ink at `CORE.slitOff`). Results: `SHUTDOWN` ending copy + `FACILITY 07 // OFFLINE` tag. Campaign: the Core is sector `core` (access `finale`, open once `cold` is cleared, single night played as night 3); `GameCanvas` mounts `CoreScene` when `sector === 'core'`. HUD/touch controls switch to CORE/PURGE and SWITCH when `purge !== null`.

**Phase 7 summary:** `lib/game/campaign.ts` = sector defs (code, name, hunter, final-night modifier, access `free`/`pass`/`finale`, `requires`, level), `sectorState` (cleared/open/locked/pass/offline), `isPlayable`, `nextNightFor`, `nightModifier` (modifier on night 3 only), `defaultSector`. `lib/game/perks.ts` = 6 free perks with scrap costs (Soft Step owned at start). `lib/game/results.ts` = `computeScrap` (generators, escape, stealth minus spots, breath held, ×1.5 on the final night; failure keeps 50% of generator scrap) + `computeResult` (stats + player path in cells + level rows). `store.ts` = zustand `persist` (key `shutdown-save`, localStorage, `skipHydration`, rehydrated in `page.tsx`), `partialize` to `SaveData` (scrap, owned, equipped, progress, calibrationSeen, settings), `merge` sanitizes bad saves. Actions: `deploy`, `openCalibration/finishCalibration/cancelCalibration` (`calibrateReturn` game|settings), `recordNight` (called once by `GameLoop` when the session ends), `nextNight`, `retryNight`, `buyPerk`, `toggleEquip`, `updateSettings`, `resetSave`. Session stats: `spotted` (chase starts), `breathHeld` (seconds inside locker checks), `path` (sampled route). Perks applied in `GameScene` via `toPerkSet`. Blackout: `MODIFIERS.blackout` (key light ×0.3, cone hidden, hunter visible within 6). Screens: `sector-map.tsx` (03), `loadout.tsx` + canvas `loadout-diorama.tsx` (04), `results-screen.tsx` (09, SVG top-down route map), `settings-screen.tsx`, title updated, HUD label. `page.tsx` routes menus by `screen`; in game, Results replaces HUD once `result` is set.

**Phase 6 summary:** `lib/game/overseer/`. `lines.ts` = line bank keyed by event (`LINES`), `LINE_PRIORITY` (0 ambient dropped when busy / 1 normal queued / 2 urgent interrupts), `numberWord` ("four"), `fillLine` `{n}` templates. `subtitles.ts` = `say(s, key, vars)` with per-key cooldowns (`SUBTITLE.cooldowns`), no-repeat variant pick, bounded priority queue, length-based duration; `updateSubtitles`. `director.ts` = per-night `DirectorState`, run at the end of `stepSession`. Observes by diffing session state (hunter mode transitions → spotted/lost lines + locker-first check, locker entries, repairs, door/wall-slot passes, stillness, mic/run/repair-fail loudness, gas). Every `DIRECTOR.tickInterval` after `warmup`, fires at most one response per `responseGap`, in order: still (line, then `alertHunter` after 2.5s) → gas (lockers within `gasRadius` of the favourite get `lockerGas` timers; `findLocker` skips them; hidden player evicted with a cough noise) → corridor (`triggerTargetedShift` on the most-used door/wall slot) → rush (lock up to 2 open doors near unrepaired generators) → loud (`biasPatrol` hunter around the last loud spot). Locker-first runs outside the global gap: when the hunter enters SEARCH and the favourite locker (≥2 uses) is within range, it investigates that locker (which starts a locker check if you're in it). Notices vs subtitles: `notify()` stays for terse system status (`ROUTE CLOSED`, `DOOR 03 // LOCKED 10S`); all OVERSEER voice goes through `say()`.

**Phase 5 summary:** `lib/game/mic.ts` (getUserMedia with EC/NS/AGC off, AnalyserNode, RMS, calibration = 90th percentile of 3s silence + margin, `meterFill` sqrt scale). Session gets `mic` sampler only if enabled and calibrated; `updateMic` smooths it and emits `'mic'` noise at the player above `MIC.threshold`, radius scaled up to `NOISE.mic` (muffled in a locker). `lib/game/hide.ts`: enter/exit locker (player snaps to the stand spot in front, mesh hidden, hunter can't see or catch), locker check starts when an investigating/searching/chasing hunter comes within `LOCKER.searchDistance` (8s cooldown after each). During a check the hunter walks to `checkStand` and stares (`holdHunter`), `updateHunter` is skipped. Survive `MIC.lockerHoldSeconds`; fail = found → `onCaught` (Second Wind applies). If the hunter sees you enter, its focus becomes the locker. Mic-off fallback: needle rises while held, falls when released, zone swings sinusoidally; net `grace` seconds out of zone = found. Slit view: drei `PerspectiveCamera makeDefault` mounted while hidden (iso rig pauses), SVG evenodd mask with two slanted slits.

**Phase 4 summary:** `lib/game/shift.ts`. Every `SHIFT.interval` (first at `SHIFT.firstDelay`) the sim plans 1–2 dynamic wall toggles plus a 50% chance of locking one open door (`SHIFT.doorLockTime`), preferring pieces near the player. Each piece is tried and kept only if (a) no body is within `planMargin` of the closing box and (b) `routeSafe` still finds an A* route from the player's cell to an unrepaired generator (or a gate once powered). Then 1.5s telegraph: floor tracks blink danger red (walls have permanent orange tracks; doors get tracks shown only while warned), a synth klaxon plays, and the notice reads "FACILITY SHIFT // STAND CLEAR". On execute each piece is re-checked (crush + route) and skipped if unsafe; the move emits `NOISE.wallSlide`, invalidates the hunter path and shows "THAT ROUTE IS CLOSED NOW.". A 1s safety net (`restoreRoute`) opens the nearest raised wall / locked door if repairs, hacks or expiring locks ever isolate the player. `triggerShift(s)` is exported for the Phase 6 director. HACK: on a telegraphed piece = cancel it; on a shift-locked door = override open; on a wall = toggle (raising refused if it would cut the route).

**Known issues / TODOs:**
- The mic stream can't survive a reload: if `micEnabled` is saved but `micReady()` is false, DEPLOY routes through calibration again (by design).
- RevenueCat real flow is untested (needs a device build + key). Web preview always uses the mock.
- Core: no hiding (no lockers), no hacks, no mic noise in the arena (mic-driven noise only exists in grid sectors). Hunters don't avoid blinking segments on purpose, so they can be lured onto them. The Core's director is scripted lines only (no habit tracking).
- The `offline` sector state label exists in `sector-map.tsx` but `sectorState` no longer returns it (the Core is `locked` until Sector 2 is cleared).
- Launcher icon is an adaptive vector (API 26+); API 24–25 devices show Capacitor's default PNG icon. iOS Safari has no vibrate.
- `public/apple-icon.png` and the `icon-*-32x32.png` / placeholder images are still template assets; replace or delete before submission.
- Core: no failed-switch buzz (the Core has no noise bus); segment drops don't shake.
- MENU during a night abandons it with no result or scrap.
- Director habits still reset per night (not carried across the 3 nights).
- Mic permission may be denied inside the v0 preview iframe; the screen falls back to "MICROPHONE UNAVAILABLE" + PLAY WITHOUT MIC.
- Director habits are per night (section 6 says per-run). Phase 7 could carry `lockerUses` across the 3 nights of a sector for stronger "it remembers" moments.
- "Gasses a locker room" is implemented as: nearby lockers unusable for 20s + forced exit, shown as flat red floor plates. No gas visuals (particles are banned).
- HUD shows a `DEV // HUNTER <MODE>` line only in development (`NODE_ENV !== 'production'`). Remove or keep dev-only.
- Grid sectors: hunter spawns at the walkable cell farthest from the player spawn; one hunter only (`session.hunter`). The Core has its own two-hunter array (`CoreSession.hunters`) with separate AI in `core/hunters.ts`.
- Vision/LOS is blocked by every collider, including crates, generators and lockers (low props hide the player). Intentional for stealth; revisit if it feels off.
- Orientation lock via `screen.orientation.lock` only works in fullscreen on Android Chrome; iOS relies on the portrait gate. Capacitor locks natively in Phase 12.
- Headless browser (agent-browser) throttles rAF, so the sim clock runs slowly there; verify movement manually or by reading state.

**Deviations from the doc:**
- Phase 12: `android/` is generated in CI by `scripts/prepare-android.mjs` instead of committed (the Gradle wrapper jar can't be authored through the GitLab API, and regeneration keeps it reproducible). A GitLab CI job was added alongside the GitHub Actions workflow because the working repo is on GitLab.
- Phase 11: all SFX and the ambient loop are synthesized with Web Audio instead of CC0 files (zero assets, zero licensing, tiny build). The "vignette" is a flat hard-edged ink frame + 1px danger rule instead of a radial gradient, to keep the no-gradient rule.
- Phase 8: Core hunters use polar band navigation (arc along rim/rings, cross on spokes) instead of grid A*, since the rings rotate. The second hunter arrives at the first switch (or 50s) for escalation instead of both at start. Falling with a segment is a separate fail reason (`fell`, results title LOST). The ending is in-engine (rings stop, slits go dark) followed by a `SHUTDOWN` results screen, not a separate cutscene screen.
- Phase 7: Sector 1's final night uses an **Overtime** modifier (shifts every 30s) since the doc only names Blackout for Sector 2. Blackout = dimmed key light, no floor vision cone, hunter hidden beyond 6 units (flat, no post FX).
- Phase 7: Title drops the mockup's CREW item (roadmap). Sector map uses flat bordered nodes in a diagonal chain instead of the mockup's 3D building renders; Results map is a flat top-down plan (not iso) with the orange route. Loadout perk "Tough Skin" / "Steady Aim" in mockup 04 map to the doc's perks (Steady etc.); icons are lucide line icons.
- Hard shadows use R3F `shadows="basic"` (BasicShadowMap) from the single directional light.
- `CAMERA.offset` y is 1.15 (slightly steeper than true iso) to read like the mockups.
- Walls are thin (0.3) segments along cell centers, not full-cell blocks: each `#` cell emits "arms" toward wall neighbours, with graphite posts only at corners/ends/junctions. Matches the mockup's thin architectural walls.
- `GRID.wallHeight` lowered to 2.0 for iso readability. The player also gets an x-ray silhouette (flat signal orange at 35% opacity, `depthFunc: GreaterDepth`) when walls hide it. No glow, so it stays within the art rules.
- Sim state lives in a `GameSession` object created in `GameScene` and passed as props (not a module singleton), so HMR can't desync it.
- Hunter AI details: hearing = noise event radius reaches the hunter (`dist <= radius`); quiet noises → SUSPICIOUS (turn and wait `suspiciousHold`), loud (`>= NOISE.loudRadius`) → INVESTIGATE directly. Sight at range fills `alert` over `suspiciousTime` (faster when closer); under `instantChaseDistance` = instant CHASE. No sixth sense: crouch-walking (auto within `autoCrouchDistance`) behind the hunter is quiet enough to sneak.
- The vision cone is a 28-ray fan clipped against colliders (visual only). Gameplay sight uses a single LOS segment to the player's center.
- The eye slit uses an unlit `MeshBasicMaterial` in danger red so it reads at iso zoom. It's flat, not bloom, so it stays within the art rules.

**Level format (`lib/game/level/`):** ASCII rows, one char per 2-unit cell: `#` wall, `D` door, `=` dynamic wall raised, `-` dynamic wall lowered, `E` exit gate, `L` locker, `G` generator site, `c` crate, `P` spawn, `.` floor, space = void. Cell (cx,cz) center is world (cx*2, 0, cz*2). Door/dynamic/gate axis is inferred from wall neighbours. Props snug against, and face away from, the first adjacent wall (N,S,W,E).

**File map:**
- `app/layout.tsx` — fonts (V4: Bebas Neue, Share Tech Mono via `next/font/local`), metadata, viewport (no zoom, viewport-fit cover).
- `lib/game/assets.ts` + `v4-manifest.json` — V4 GLB registry, shared atlas materials, tints. `components/game/v4-model.tsx` (GLB with primitive fallback), `v4-lights.tsx` (amber key / indigo fill). `scripts/sync-v4-assets.mjs` — kit → `public/`.
- `app/globals.css` — palette tokens (`ink graphite concrete bone signal danger`), `font-display`/`font-mono`, `safe-area`, `tracking-label`, zero radius.
- `app/page.tsx` — client shell: `OrientationGate` > canvas + overlay chosen by `screen` (title / game).
- `lib/game/config.ts` — all tunables + `PALETTE`.
- `lib/game/store.ts` — zustand store (screen, settings).
- `lib/game/materials.ts` — cached flat `MeshLambertMaterial` per palette key, `xrayMaterial`, shared `UNIT_BOX`.
- `lib/game/fullscreen.ts` — fullscreen + landscape lock helpers.
- `lib/game/input.ts` — mutable input state (joystick, keys, run) + `bindKeyboard` (WASD/arrows, Shift).
- `lib/game/player.ts` — player sim: camera-relative movement, accel, facing, walk phase, collision.
- `lib/game/session.ts` — `createSession(def)` / `stepSession(session, dt)`; the per-night sim root. Owns player, hunter, noise bus, `status` (`playing`/`caught`), footstep noise emission, auto-crouch.
- `lib/game/noise.ts` — noise event bus (`emitNoise`, `pruneNoise`, lifetime `NOISE.lifetime`).
- `lib/game/hunter.ts` — hunter state + `updateHunter` state machine, `hunterCaught`, `viewAngle`.
- `lib/game/level/pathfinding.ts` — `isWalkable` (live door/dynamic state) + 8-way `findPath` A* (no corner cutting).
- `lib/game/level/raycast.ts` — `collidersInRange`, `rayDistance` (slab test), `segmentClear`, `corridorClear` (radius-aware, used for path smoothing).
- `components/game/hunter-view.tsx` — primitive robot + procedural walk, head yaw scan. `vision-cone.tsx` — wall-clipped red floor fan, opacity by mode.
- `lib/game/shift.ts` — shifting map: plan / telegraph / execute, `routeSafe`, `restoreRoute` safety net, `triggerShift`, `cancelPending`, `bodyInBox`.
- `lib/game/objectives.ts` — night setup (5 of 7 generators, random spawn), trials assignment, USE context, hacks, doors, security cameras, gates + final chase.
- `lib/game/mic.ts` — mic capture, RMS, calibration, `meterFill`. `lib/game/hide.ts` — lockers: find/enter/exit, locker check (mic + needle fallback). `lib/game/live.ts` — read-only `live.session` for per-frame HTML meters.
- `components/shell/mic-calibration.tsx` — screen 02. `mic-meter.tsx` — rAF bar meter (calibration, HUD, locker). `locker-view.tsx` — screen 06 slit mask, breath panel, exit. `components/game/locker-camera.tsx` — first-person perspective camera while hidden.
- `lib/game/overseer/lines.ts` — OVERSEER line bank + priorities. `subtitles.ts` — `say()` queue. `director.ts` — adaptive director (habits → responses). `components/shell/game-hud.tsx` `Subtitle` renders it (also in the locker view). `objective-views.tsx` `LockerGas` — red plates at gassed lockers. `shift.ts` `triggerTargetedShift` — director-chosen closures.
- `lib/game/notice.ts` — `notify()` HUD notice. `lib/game/audio.ts` — synthesized SFX + ambient drone. `lib/game/juice.ts` — feedback layer (SFX triggers, heartbeat, shake, haptics). `lib/game/haptics.ts` — Capacitor / vibrate haptics. `components/shell/danger-vignette.tsx` — proximity frame. `lib/game/actions.ts` — one-frame UI → sim actions (use, hack, repair result).
- `components/shell/repair-trial.tsx` — needle / wires / hold trials. `components/game/objective-views.tsx` — generator lights, security cameras.
- `lib/game/level/types.ts` — level/module types. `build.ts` �� ASCII → `LevelData` (arms, posts, modules, colliders, per-cell buckets). `collision.ts` — `collidersNear`, `resolveCircle`. `parts.ts` — primitive part lists for locker/generator/crate + `composeParts`. `sector1.ts` — Sector 1 layout.
- `components/game/game-canvas.tsx` — R3F `<Canvas orthographic>`; title diorama or `GameScene`.
- `components/game/scene-rig.tsx` — title camera + lights.
- `components/game/game-scene.tsx` — creates session, runs `GameLoop` (useFrame), mounts rig/level/player.
- `components/game/game-rig.tsx` — follow camera (zoom = height / `gameViewHeight`) + key light and shadow frustum that follow.
- `components/game/level/level-view.tsx` — instanced floor tiles, walls, caps, posts, props; `module-views.tsx` — door, dynamic wall, gate. `instanced-boxes.tsx` — one draw call per material group.
- `components/game/player-view.tsx` — faceless mannequin + x-ray pass, procedural walk cycle.
- `components/game/foundation-diorama.tsx` �� primitive room used as title backdrop.
- `components/shell/orientation-gate.tsx` — CSS `portrait:` rotate screen.
- `components/shell/title-overlay.tsx` — title (01): PLAY / PERKS / SETTINGS.
- `lib/game/campaign.ts` — sectors, access, nights, modifiers. `perks.ts` — perk defs. `results.ts` — scrap + night result. `level/sector2.ts` — Cold Storage.
- `components/shell/sector-map.tsx` (03), `loadout.tsx` (04), `results-screen.tsx` (09), `settings-screen.tsx`, `styles.ts` (shared button classes, `formatClock`). `components/game/loadout-diorama.tsx` — operator on plinth for the Loadout canvas.
- `components/shell/game-hud.tsx` — generators counter, sector label, MENU, fullscreen.
- `components/shell/touch-controls.tsx` — joystick, HIDE / RUN (hold) / HACK buttons, keyboard binding.
- `components/shell/fullscreen-button.tsx` — shared toggle.
- `lib/game/core/arena.ts` — Core geometry + surface queries. `core/hunters.ts` — Core hunter AI + polar nav. `core/session.ts` — Core sim, mirror, result. `components/game/core-scene.tsx` — Core arena, rings, terminals, hunters, falling player.
- `lib/purchases/` — purchases adapter (types, mock, revenuecat, zustand store). `components/shell/paywall.tsx` — screen 10. `lib/game/skins.ts` + `use-skin-colors.ts` — cosmetic skins. Loadout has PERKS / SKINS tabs.
- `lib/game/level/sector3.ts` — The Foundry layout. `lib/game/daily.ts` — seeded Daily Night. `lib/game/decoy.ts` + `components/game/decoy-view.tsx` — Decoy perk. `components/game/weaver-body.tsx` — THE WEAVER six-legged body (picked in `hunter-view.tsx` by `profile.kind`).
- `capacitor.config.ts` — Android shell. `scripts/prepare-android.mjs` — generate/patch/sync `android/`. `resources/android/` — launcher icon sources. `.github/workflows/android.yml` — GitHub APK build (GitLab: repo-root `.gitlab-ci.yml`). `README.md`, `LICENSE`.
- `shutdown-kit/concepts/v4/` — V4 mockups (look reference). `concepts/v3/` — old flat mockups (layout only).
- `shutdown-kit/assets/v4/` — V4 asset kit: `models/*.glb`, `source/build_assets.py` + `.blend`, `textures/`, `ui/` (tokens, fonts, icons, panels), `effects/`, `scenes/`, `manifest.json`, `AUDIT.md` (status of every asset), `contact-sheet.html` (all GLBs in one grid), `preview.html` (orbit viewer).

**Run notes:**
- `pnpm install && pnpm dev`. On resume, if a template `node_modules` already exists, `pnpm install` may say "Already up to date" without installing three/R3F. Run `pnpm install --frozen-lockfile` and confirm `node_modules/@react-three` exists. `pnpm build` produces a static export in `out/` (`output: 'export'`, `trailingSlash: true`).
- Stack: Next 16, React 19, three 0.186, @react-three/fiber 9, drei 10, zustand 5, Tailwind 4, Capacitor 8.
- Android: Node 22, JDK 21, Android SDK. `pnpm build && pnpm android:prepare && (cd android && ./gradlew assembleDebug)`. APK at `android/app/build/outputs/apk/debug/app-debug.apk`. RevenueCat key via `NEXT_PUBLIC_REVENUECAT_ANDROID_KEY` at build time.
- GitLab repo (`hideo-group/hideo-project`) stores the kit extracted under `shutdown-kit/`. For local dev, follow PROMPT.md setup: copy `shutdown-kit/game/*` to the project root, then `pnpm install --frozen-lockfile && pnpm dev`. Run `npx tsc --noEmit` after pulling the Phase 10 close-out (edited without a local build).


---

## 17. V4 art pass — phases 13–27

**Goal:** make the game look like `concepts/v4/` using the Blender GLB kit in `assets/v4/`, without breaking gameplay. Asset-by-asset status (OK / FIX / NEW) is in `assets/v4/AUDIT.md`; this section says *when* each one is done.

**Order: all assets first, integration later.**
- **Part A (13–20) = asset authoring only.** Blender script, GLBs, atlases, rigs/clips, decals, UI kit. No changes to `game/` code. Every asset is finished and reviewed on the contact sheet before any integration starts.
- **Part B (21–27) = engine integration + ship.** Loader, materials, lights, replacing primitives in views. Done after Part A (the user may do some of it).

**Rules for every phase**
- One phase per turn. Stop, report, commit + push, wait for "next".
- Part A per asset: **author** (edit `source/build_assets.py`, export GLB) → **review** (`contact-sheet.html` next to the matching concept, at the game camera angle) → **log** (tick below + `AUDIT.md` status → OK).
- Part B per asset: **integrate** (replace the primitive in code) → **log**. Keep the primitive as fallback until the GLB is checked in engine. The game must run after every phase.
- Gameplay code (`lib/game/*`) does not change for art. Only views (`components/game/*`), materials, loader and lights. Colliders stay from the level grid, not from meshes.
- Budgets: ≤150 draw calls per scene, props ≤1.5k tris, characters ≤6k tris, hero machines ≤4k tris. GLBs reference the shared atlas; no embedded duplicate textures.
- Verification: Part A = per phase, scripts only (`python -m py_compile`), no Blender runs. One full build + manifest tri-count check + contact-sheet review (agent-browser OK for the contact sheet only) after Phase 20, fixing all assets in one pass. Part B = the agent runs `npx tsc --noEmit` + `pnpm build` and checks the affected screens in agent-browser itself (static `out/` via the port-3000 rewrite, see `PROMPT.md`); the user only playtests on the device at the end. Add what to check to the Playtest checklist.
- Blender: not installed in the v0 sandbox. Try `pip install bpy==5.0.1` (needs Python 3.11) once; if that fails, write the script changes and ask the user to run `blender --background --python assets/v4/source/build_assets.py` locally, then commit the exported GLBs.

## Part A — Assets

### Phase 13 — Asset pipeline + shared atlas
- [x] `build_assets.py`: build one asset or a group (`-- --only <id>` / `--group <name>`), so later phases re-export only what changed.
- [x] Shared materials by name (petrol, teal, ivory, amber, indigo, danger, concrete, dark, emissive-*) all sampling ONE atlas; GLBs reference `textures/painted-enamel-atlas.png` externally (no embedded copy). Fallback: `assets/v4/source/pack.mjs` strips embedded images with `@gltf-transform/cli` (~165 MB → a few MB).
- [x] Decal/stencil atlas `textures/decals-atlas.png` (SECTOR B, TURBINE HALL A, B-1, C1, G-02, 01–07, room names, OVERSEER slogans) + hazard-stripe strip; UV layout documented in `manifest.json`.
- [x] `contact-sheet.html`: add a game-camera view (ortho iso ~45°, amber key + indigo fill) and show the matching concept next to each asset; `manifest.json` lists tris + budget per asset.

### Phase 14 — Environment shell assets (screen 05)
- [x] FIX walkway-floor → worn grey concrete tiles, amber edge lines, hazard dashes, drain grate variant. (+ `floor-cell`, `floor-cell-edge`, `floor-cell-drain` 2 m grid cells)
- [x] FIX bulkhead-wall + wall-corner → thick (~0.8 m) concrete block walls with seams and top cap; add wall-end, wall-T and wall-cross pieces for the grid. (+ `wall-post`, `wall-straight`)
- [x] FIX foundation-pier → dark concrete base block that sits in water.
- [x] sliding-bulkhead: hazard stripes on frame edges + "B-1" stencil. Decal quad meshes (wall stencil, floor stencil, hazard edge strip) using the decal atlas.

### Phase 15 — Characters + rigs + clips
  - [x] FIX operator-amber (and crew-teal / crew-ivory) → bulkier suit, knee pads, dark gloves/boots, bigger backpack, chest radio.
  - [x] FIX warden → larger ivory box head, wide red slit, articulated hands (locker close-up 06).
  - [x] Armatures + clips in the GLB: operator idle / walk / run / crouch / hide-enter; warden idle / walk / scan / chase / grab. Walk/run clips loop on a known cycle so Part B can drive them from `walkPhase`.
  - [x] Skin-tintable material slots (suit, trim) named for recolor.

### Phase 16 — Plant props (Sector 1)
- [x] FIX pipe-valve (floating handwheel), containment-capsule (floating beacon; add pipes + stripes), warning-beacon (smaller, lens + cage), scrap-bundle (tied plates/rebar).
- [x] FIX turbine-generator minor (bigger coupling flange + pipe run), locker-interior-frame worn inner door, core-kill-switch number plates 1–4 (shared plate mesh).
- [x] NEW pipe-tee, vertical riser, pipe bracket, junction box, floor drain grate, coat hook + hanging workwear. (ids: `pipe-tee`, `pipe-riser`, `pipe-bracket`, `junction-box`, `floor-drain-grate`, `coat-hook-workwear`, + shared `number-plate`)

### Phase 17 — Water + Cold Storage assets (Sector 2)
- [x] FIX water-tile → mesh + shader spec (dark water, ripple normal/UV scroll, no reflections); FIX waterfall → volume, foam, splash ring.
- [x] NEW outlet-pipe (outfall feeding the waterfall).
- [x] NEW frost-silo. Review coolant-tank, refrigeration-unit, cold-storage-door against 03/09.

### Phase 18 — Foundry assets (Sector 3)
- [x] FIX weaver → chunky armored "W-01": box torso, thick 3-joint hydraulic legs, hazard stripes, box head with red slit. Leg bones/pivots named to match the tripod gait in `weaver-body.tsx` (KNEE/FOOT).
- [x] FIX foundry-crucible → hanging ladle on gantry hook. FIX molten-stream → width, orange core glow, splash.
- [x] NEW tall-smokestack. overhead-gantry + hazard stripes and "F-03" label.

### Phase 19 — Core assets (screen 08)
- [x] FIX core-ring-inner/middle/outer → amber edge lines, ring numbers 01/02/03, railing posts; export as per-segment pieces matching the `arena.ts` segment count.
- [x] NEW core-radial-bridge (spokes), core-shaft-wall (lamp rows), core-support-pillar. (+ `core-rim-segment`)
- [x] FIX core-spindle → tall modular column, red sensor band, "CORE" stencil.

### Phase 20 — Menu world + UI kit (screens 01, 02, 03, 04, 09, 10)
- [x] FIX overseer-housing → monumental monolith with red slit. FIX chimney → ~1.5 m, taller, red/ivory bands. FIX operator-plinth → square concrete block, "OPERATOR 07", hazard edge.
- [x] NEW sea-rock / cliff stacks, facility-tower-block, forklift + pallet.
- [x] Scene recipes (`source/scene_recipes.py`) for the title diorama and the 3D sector map islands, exported as JSON instance layouts (`scenes/*.json`) over the GLBs.
- [x] UI kit complete: panels, buttons, icons (every icon the HUD/screens need), joystick, meter, checked against 01–11. **Part A done → all AUDIT rows OK.**

## Part B — Integration + ship (after all assets)

### Phase 21 — Engine pipeline + V4 look
- [x] Copy packed GLBs + atlases into `game/public/models/v4` and `game/public/textures/v4`.
- [x] `lib/game/assets.ts`: GLB registry (id → path), `useGLTF.preload`, shared atlas + material factory (`MeshStandardMaterial`, roughness 0.9, metalness 0) by material name.
- [x] V4 palette in `config.ts` `PALETTE` + `globals.css`; fonts Bebas Neue + Share Tech Mono. Lights: amber key, indigo fill/ambient, hard shadows kept.

### Phase 22 — Integrate environment + Plant
- [x] Thick wall rendering from the grid (update deviation note in section 16), floor, pier, decals, doors, bulkheads, lamps, rails.
- [x] Machines + props: generator, lockers, crates, console, Sector 1 dressing (off the walkable grid or on wall cells).

### Phase 23 — Integrate characters
- [x] player-view, hunter-view, loadout diorama, locker view; clips driven by `walkPhase` + hunter mode; skins via material tint.

### Phase 24 — Integrate Sectors 2 + 3
- [x] Water shader, waterfall, outlet pipe, Cold Storage props; Foundry props, Weaver GLB with existing gait.

### Phase 25 — Integrate the Core
- [ ] Ring segments, bridges, shaft wall, pillars, spindle, kill switches, retracting segment for drops.

### Phase 26 — Menus + UI re-skin
- [ ] Title diorama and 3D sector map from the kit, Loadout on the new plinth; all HTML screens + HUD + touch controls on `assets/v4/ui`.

### Phase 27 — Performance + ship
- [ ] KTX2 atlas, meshopt GLBs, instancing check, draw calls ≤150 on each scene, APK size check.
- [ ] Rebuild APK, new screenshots (1179×2556), demo video (section 12), Devpost.

**Order if time runs short:** Part A 13 → 14 → 15 → 16 → 19 → 17 → 18 → 20, then Part B 21 → 22 → 23 → 25 → 24 → 26 → 27 (Plant + Core are the demo; Foundry is paid/cuttable).
