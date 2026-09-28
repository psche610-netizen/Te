# V4 asset audit

Compared every GLB in `models/` (rendered via `contact-sheet.html`) against `concepts/v4/01–11`.

**Big picture:** the game uses **none** of these GLBs yet — everything in-game is still code primitives. Each GLB embeds its own 2 MB atlas (~140 MB total); runtime needs one shared texture.

Legend: OK = usable as is · FIX = exists, needs rework · NEW = missing

## A. Characters

| Asset | Status | Notes vs concept |
|---|---|---|
| operator-amber | FIX | Helmet good. Suit too thin; needs bulkier folds, dark knee pads, dark gloves/boots, bigger backpack + chest radio (04, 09). |
| crew-teal / crew-ivory | FIX | Same body fixes as operator (07). |
| warden | FIX | Head should be a larger ivory box with wide red slit; articulated hands needed for locker close-up (06). Limbs OK. |
| weaver | FIX | Far too thin/spidery. Concept (10) is chunky: armored box torso "W-01", thick 3-joint hydraulic legs, hazard stripes, box head with red slit. |

## B. Plant / Sector 1 environment (05, 07, 01)

| Asset | Status | Notes |
|---|---|---|
| turbine-generator | OK | Minor: bigger coupling flange + pipe run into wall. |
| control-console | OK | |
| locker-bank, locker-single | OK | |
| locker-interior-frame | OK | Needs worn inner-door texture for 06. |
| supply-crate | OK | |
| pipe-straight, pipe-elbow | OK | |
| pipe-valve | FIX | Handwheel floats detached above the body (bug). |
| sliding-bulkhead | OK | Add hazard stripes on frame edges (05 "B-1"). |
| service-door | OK | |
| wall-lamp | OK | |
| guardrail | OK | |
| ladder, stairs, grated-bridge, overhead-duct, electrical-cabinet | OK | |
| walkway-floor | FIX | Black/ivory checkerboard is wrong. Needs worn grey concrete tiles, amber edge lines + hazard dashes, drain grates. |
| bulkhead-wall | FIX | Thin panel. Concept walls are thick (~0.8 m) concrete block walls with block seams, top cap, stencil signage. |
| wall-corner | FIX | Same as bulkhead-wall. |
| foundation-pier | FIX | Reads as a green crate. Should be dark stone/concrete base block that sits in the water. |
| warning-beacon | FIX | Oversized flat red cylinder; needs lens + cage, smaller. |
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
| core-kill-switch | OK | Add big number plate 1–4. |

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
| scrap-bundle | FIX – unreadable blob; make tied plate/rebar bundle. |
| hand-radio, battery-pack, breathing-canister, repair-tool | OK |
| containment-capsule | FIX – red beacon floats detached (bug); needs pipes + hazard stripes (07). |
| **pipe-tee / vertical riser / pipe bracket** | NEW |
| **junction-box / small wall box** | NEW |
| **floor-drain-grate** | NEW |
| **hanging workwear / coat hook** | NEW (04) |
| **stencil decal sheet** | NEW – SECTOR B, TURBINE HALL A, B-1, C1, G-02, 01–07, room names, slogans. |
| **hazard-stripe decals** | NEW |

## H. Effects

| Asset | Status |
|---|---|
| vision-cone | OK |
| water-tile | FIX – needs dark water shader + ripples. |
| waterfall | FIX – 3 thin ribbons; needs volume, foam, splash ring. |

## I. UI (`ui/`)

Fonts, icons (30), panels, buttons, joystick, meter, tokens — present. Not yet wired into the game.

## Suggested order (few at a time)

1. Floor + thick walls + pier + decals (fixes the whole look of 05).
2. Operator + Warden fixes; first GLB integration in-game (shared atlas).
3. Bug fixes: pipe-valve, capsule beacon, beacon, scrap.
4. Water, waterfall, outlet pipe.
5. Weaver rebuild + ladle + molten stream (Foundry).
6. Core: radial bridges, shaft wall, pillars, spindle.
7. Title/map: monolith, rocks, tower block, chimney, silo, plinth.
