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
| weaver | FIX | Far too thin/spidery. Concept (10) is chunky: armored box torso "W-01", thick 3-joint hydraulic legs, hazard stripes, box head with red slit. |

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
| coolant-tank | OK | |
| refrigeration-unit | OK | |
| cold-storage-door | OK | |
| **frost-silo** | NEW | Tall domed tanks with frost caps (03, 09, 11). Larger than coolant-tank. |

## D. Foundry / Sector 3 (03, 10)

| Asset | Status | Notes |
|---|---|---|
| foundry-furnace, overhead-gantry, casting-trough | OK | Gantry needs hazard stripes + "F-03" label. |
| foundry-crucible | FIX | Concept is a **hanging ladle** on gantry hook, not a floor pot. |
| molten-stream | FIX | Thin yellow line; needs width, orange glow core, splash. |
| **tall-smokestack** | NEW | Brick/metal foundry stack (03). |

## E. Core finale (08)

| Asset | Status | Notes |
|---|---|---|
| core-ring-inner/middle/outer | FIX | Missing amber edge lines, ring numbers 01/02/03, outer railing posts. |
| **core-radial-bridge** | NEW | Short grated bridges linking rings (clearly in 08). |
| **core-shaft-wall** | NEW | Circular outer shaft wall with rows of amber lamps. |
| **core-support-pillar** | NEW | Pillars under rings into the void. |
| core-spindle | FIX | Too short/stubby; needs tall modular column, red sensor band, "CORE" stencil. |
| core-retracting-segment | OK | |
| core-kill-switch | OK (P16 script) | Shared number plate, decal variants code-01..04. |

## F. Title / Sector map / Overseer (01, 03, 11)

| Asset | Status | Notes |
|---|---|---|
| overseer-housing | FIX | Small cabinet. Needs a monumental dark monolith with red slit (01, 03 Core island). |
| chimney | FIX | Too thin (0.7 m). Needs ~1.5 m dia, taller, red/ivory bands (03 plant). |
| operator-plinth | FIX | Round disc; concept is a square worn concrete block with "OPERATOR 07" stencil + hazard edge (04). |
| **sea-rock / cliff stacks** | NEW | Dark rock spires + island bases (01, 03). |
| **facility-tower-block** | NEW | Big multi-storey concrete block with slogan stencils (01). |
| **outlet-pipe** | NEW | Large wall outfall pipe that feeds a waterfall (01, 05, 07). |
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
| water-tile | FIX – needs dark water shader + ripples. |
| waterfall | FIX – 3 thin ribbons; needs volume, foam, splash ring. |

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
