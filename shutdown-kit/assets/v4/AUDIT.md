# V4 asset audit

Compared every GLB in `models/` (rendered via `contact-sheet.html`) against `concepts/v4/01–11`.

**Big picture:** the game uses **none** of these GLBs yet — everything in-game is still code primitives. Each GLB embeds its own 2 MB atlas (~140 MB total); runtime needs one shared texture.

Legend: OK = usable as is · FIX = exists, needs rework · NEW = missing

## A. Characters

| Asset | Status | Notes vs concept |
|---|---|---|
| operator-amber | OK (P15 script) | Bulkier suit + shoulder pads, rubber knee pads, dark gloves/gauntlets, toe-capped boots, larger pack with canisters, chest radio. Clips incl. hide-enter; tint slots suit/trim. |
| crew-teal / crew-ivory | OK (P15 script) | Same body as operator (shared `operator()` builder). |
| warden | OK (P15 script) | Larger ivory box head, brow, full-width red slit, chin vent; articulated three-claw hands (fingers/fingertips/thumb bones). Clips idle/walk/scan/chase/grab/stunned. |
| weaver | OK (P18 script) | Chunky petrol box hull + skirt, thorax, dorsal pack/reservoirs, `code-w-01` + hazard decals; ivory box head with red slit; thick armored hydraulic legs (hip motor → thigh → shin → foot). Rest pose = `weaver-body.tsx` (HIP_Y/SPLAY/KNEE/FOOT); bones `hip{row}.{L|R}` (yaw/lift) + `leg/shin/foot` (flex); manifest `gait`. Clips idle/scuttle/chase/scan/strike/stunned on the tripod gait. |

## B. Plant / Sector 1 environment (05, 07, 01)

| Asset | Status | Notes |
|---|---|---|
| turbine-generator | OK (P16 script) | Bolted shaft coupling + guard, cooling pipe run to floor saddle. |
| control-console | OK | |
| locker-bank, locker-single | OK | |
| locker-interior-frame | OK (P16 script) | Worn inner face: ribs, latch, scuffs, rust streaks, dent, scratched 07. |
| supply-crate | OK | |
| pipe-straight, pipe-elbow | OK | |
| pipe-valve | OK (P16 script) | Inline on pipe axis; bonnet/yoke/stem through hub, red handwheel attached. |
| sliding-bulkhead | OK (P14 script) | Hazard stripes on uprights/header/leaf, B-1 + KEEP CLEAR decals. Height (3 m) vs 2 m wall kit to check in review. |
| service-door | OK | |
| wall-lamp | OK | |
| guardrail | OK | |
| ladder, stairs, grated-bridge, overhead-duct, electrical-cabinet | OK | |
| walkway-floor | OK (P14 script) | Worn concrete 1 m tiles, amber edge lines, hazard dashes. New grid cells: floor-cell, floor-cell-edge, floor-cell-drain. |
| bulkhead-wall | OK (P14 script) | 4 m thick (0.8 m) block wall, cap, seams, conduit, TURBINE / HALL / A decals. |
| wall-corner | OK (P14 script) | Rebuilt as grid kit piece. New: wall-post, wall-end, wall-straight, wall-t, wall-cross (2 m cell, 2.0 m tall). |
| foundation-pier | OK (P14 script) | Dark concrete block, coping, pilasters, pour seams, waterline stain at z=-1. |
| decal-wall-stencil, decal-floor-stencil, decal-hazard-edge | OK (P14 script) | Decal quads on `decals-atlas.png`; runtime sets the UV rect from `decal_item` / decals-layout. |
| warning-beacon | OK (P16 script) | 0.26 m caged beacon, red lens + dome. |
| wall-microphone, rotary-control | OK | Matches 02. |

## C. Cold Storage / Sector 2 (03, 09)

| Asset | Status | Notes |
|---|---|---|
| coolant-tank | OK (P17 script) | Reviewed vs 03/09: frost crown + drips, torus seams → cheap bands, COOLANT text mesh → `code-c1` decal, frosted service pipe. |
| refrigeration-unit | OK (P17 script) | Frosted top, frosted coolant lines at the back, COLD STORAGE + hazard kick strip as decals; torus fan rims dropped (tris). |
| cold-storage-door | OK (P17 script) | Vertical hazard stripes on the jambs, rubber gasket, latch keeper, frosted threshold, `code-02` decal on the moving leaf. |
| **frost-silo** | OK (P17 script) | r 1.0 × 5.2 m: plinth, skirt + amber band, petrol shell, frost-crowned dome + drips, cage ladder, frosted outlet, `code-02`. |

## D. Foundry / Sector 3 (03, 10)

| Asset | Status | Notes |
|---|---|---|
| foundry-furnace, casting-trough | OK | |
| overhead-gantry | OK (P18 script) | Vertical hazard decals on columns, knee braces, `code-f-03` + hazard rail on the crossbeam, shorter cables, striped hook block + hook. `anchors.hook` (0,0,3.3). |
| foundry-crucible | OK (P18 script) | Hanging ladle, origin = bail eye (hangs at gantry `anchors.hook`): bail yoke with hazard arms, tapered banded drum + ribs, -Y spout, `molten-core` melt, tilt gear. `pour` clip tilts 1.05 rad; `anchors.pour_lip`. |
| molten-stream | OK (P18 script) | Ballistic pour 1.25 m lip → surface: `molten-core` ribbon inside a translucent `molten-glow` sheath, glow pool, splash crown, 10 ico droplets. `anchors.lip/landing`; shader `createMoltenMaterial` in `effects/v4-effects.js`. |
| **tall-smokestack** | OK (P18 script) | ~9 m tapered rust stack on concrete plinth, flare, steel bands, soot crown + ember rim, flue inlet, amber cage ladder, red top lamp, `code-f-03`. |

## E. Core finale (08)

| Asset | Status | Notes |
|---|---|---|
| core-ring-inner/middle/outer | OK (P19 script) | Now ONE 30° segment each (12 per ring = `CORE.segments`), radii from `config.ts` CORE (4.2–6.6 / 7.6–10 / 11–13.4), top z 0, 0.6 deep, seam 0.012 rad. Concrete slab + petrol girder, amber edge lines, hazard strips at both drop edges, ivory `code-ring-01/02/03`, fascia stanchions + rail below deck (nothing above z .006 so spokes pass over). |
| **core-radial-bridge** | OK (P19 script) | Static spoke along +X, r 3.2 → 14.7, 1.8 m wide, grated deck z .012–.08, amber edges, hazard ends; deep trusses only over the 4 ring gaps. |
| **core-shaft-wall** | OK (P19 script) | 30° panel, inner face r 17.6, z −12 → 3.5, pilaster, pour seams, 4 rows × 3 amber lamps. |
| **core-support-pillar** | OK (P19 script) | 1.5 m concrete column under the rim (top −0.6 → −12.8), capital/footing, steel bands, hazard stripe, amber marker, conduit. Placed like the game's 10 rim columns (r 16.2, offset .2). |
| **core-rim-segment** | NEW → OK (P19 script) | Static rim segment (14.4–17.2), void-edge amber line + hazard strips, wall-side kerb. |
| core-spindle | OK (P19 script) | Pillar-scale (r 3.2 plinth, r 2.5 column): 5 stacked 2.2 m modules to ~13 m, ivory bands, red sensor band at z 6 (the game slit height), `code-core` stencils, conduits, crown lamp, void shaft below deck. |
| core-retracting-segment | OK (P19 script) | Rebuilt as a ring-03 segment + red gap lamps; `retract` clip drops 1.8 m. |
| core-kill-switch | OK (P16 script) | Shared number plate, decal variants code-01..04. |

## F. Title / Sector map / Overseer (01, 03, 11)

| Asset | Status | Notes |
|---|---|---|
| overseer-housing | FIX | Small cabinet. Needs a monumental dark monolith with red slit (01, 03 Core island). |
| chimney | FIX | Too thin (0.7 m). Needs ~1.5 m dia, taller, red/ivory bands (03 plant). |
| operator-plinth | FIX | Round disc; concept is a square worn concrete block with "OPERATOR 07" stencil + hazard edge (04). |
| **sea-rock / cliff stacks** | NEW | Dark rock spires + island bases (01, 03). |
| **facility-tower-block** | NEW | Big multi-storey concrete block with slogan stencils (01). |
| **outlet-pipe** | OK (P17 script) | 0.45 m wall outfall, wall + mouth flanges, clamp strut, rust run, `code-s2`; `waterfall_anchor` in the manifest. |
| **forklift / pallet** | NEW | Seen in 11 storage rooms. |

## G. Props & decals (all gameplay screens)

| Asset | Status |
|---|---|
| scrap-bundle | OK (P16 script) – stacked plates, ribbed rebar, two tie straps. |
| hand-radio, battery-pack, breathing-canister, repair-tool | OK |
| containment-capsule | OK (P16 script) – beacon seated, feed pipes, hazard stripes, C-1 decal. |
| pipe-tee / pipe-riser / pipe-bracket | OK (P16 script) |
| junction-box | OK (P16 script) |
| floor-drain-grate | OK (P16 script) |
| coat-hook-workwear | OK (P16 script) |
| stencil decal sheet | OK – `textures/decals-atlas.png` (P13) + decal quads (P14). |
| hazard-stripe decals | OK – `hazard-strip` item + `decal-hazard-edge` quad (P14). |

## H. Effects

| Asset | Status |
|---|---|
| vision-cone | OK |
| water-tile | OK (P17 script) – 8 m 16×16 grid at z 0, matte; shader spec in `manifest.json` `effects.water` (world-xz ripples, UV scroll, no reflections), reference in `effects/v4-effects.js`. |
| waterfall | OK (P17 script) – elliptical body sweep (`fall-water`), 2 foam streaks + lip (`foam`), splash crown + 3 rings (`foam-splash`); scroll/pulse specs in `effects`. |

## I. UI (`ui/`)

Fonts, icons (30), panels, buttons, joystick, meter, tokens — present. Not yet wired into the game.

## Phase mapping

Work order and checkboxes live in `../../SHUTDOWN.md` section 17. **All assets are authored first (Part A, 13–20); integration into the game comes after (Part B, 21–27).** Section → authoring phase:

| Audit section | Phase |
|---|---|
| Pipeline, shared external atlas, decal atlas, contact sheet | 13 |
| B environment shell (floor, walls, pier) + G decals/stripes | 14 |
| A characters (operator, crew, warden) + rigs | 15 |
| B/G bug fixes + new props | 16 |
| C Cold Storage + H water/waterfall + outlet pipe | 17 |
| D Foundry + A weaver | 18 |
| E Core | 19 |
| F title / map / overseer + I UI | 20 |
| Integration of everything above | 21–27 |

When an asset is fixed or created, change its status here to OK and tick section 17.
