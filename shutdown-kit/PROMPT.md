Build SHUTDOWN, a landscape mobile stealth-horror game. This prompt is self-contained and works for a fresh chat or a resume. Use the same prompt every time.

Repo: `github.com/psche610-netizen/Te`. Everything lives in `shutdown-kit/`.

## Setup (do this first)
1. The code is in `shutdown-kit/game/` (Next.js app). Run `pnpm install && pnpm dev` inside `shutdown-kit/game` (the repo-root `package.json` is an empty stub), confirm it compiles.
2. Read `shutdown-kit/SHUTDOWN.md` fully. It is the source of truth. Section 15 is locked. **Section 2 (V4 art rules) and section 17 (V4 phases 13–21) are the current work.** Section 16 is the progress log.
3. Look at every image in `shutdown-kit/concepts/v4/` (look reference) and read `shutdown-kit/assets/v4/AUDIT.md` (status of every 3D asset) and `assets/v4/README.md` (pipeline) before editing.
4. Continue from the first unchecked phase in section 17 (or the exact point section 16 says was in progress).

## Ground rules
- **Self-contained.** No backend, databases, auth, or Marketplace integrations. Local save file only.
- **Small phases.** Exactly one phase per turn, then stop. At the end of each phase:
  - run `npx tsc --noEmit` in `shutdown-kit/game` (and headless tsx checks for logic),
  - tick the boxes in `SHUTDOWN.md` section 17 (and 11 if relevant), update section 16 and `assets/v4/AUDIT.md`,
  - reply with a short report: what was built, what was checked, known issues, next phase, what the user should look at,
  - commit and push to GitHub (`GITHUB_PAT`), then wait for "next".
- **Do not run the game in agent-browser.** The user runs it and sends screenshots. agent-browser is fine for lightweight asset checks (`assets/v4/contact-sheet.html`).
- **V4 art rules (section 2) are hard constraints.** Painted low-poly from one shared atlas, V4 palette tokens, orthographic iso camera, amber key + cool shadows, red only for enemy/danger, stencils + hazard stripes, Bebas Neue + Share Tech Mono. Banned: bloom haze, lens flare, decorative particles, glossy/chrome, faces, emoji, UI gradients.
- **Models:** Blender-authored GLBs from `assets/v4/source/build_assets.py`. Author → review against the concept → integrate → log. Keep the code primitive as fallback until the GLB replaces it. No embedded duplicate textures in the shipped build.
- **Gameplay logic is done.** Art phases change views, materials, loader and lights only, not `lib/game/*` rules. Colliders come from the level grid.
- **Tunables in one file** (`lib/game/config.ts`). Sim in plain TS + zustand, R3F `useFrame` for the loop, instancing, ≤150 draw calls.
- **Mobile first**, landscape, touch controls, safe areas. Mic stays optional.
- **OVERSEER voice:** dry, deadpan, corporate. No exclamation marks, no insults.
- Remove `console.log("[v0] ...")` lines before ending a phase.

## Progress log (`SHUTDOWN.md` section 16)
Keep it short and current; it is what the next chat reads. Status, next step, known issues, deviations, file map, run notes.

## HANDOFF
If I type **HANDOFF** (or the chat is getting long): get the code runnable, remove debug logs, update sections 16 + 17 + `AUDIT.md`, commit and push to GitHub, and reply with the commit hash plus: "Start a new chat, connect the repo, and paste shutdown-kit/PROMPT.md."

## Phases
0–12 are done (game complete with the v3 flat look). See section 11 and 16.

13. **Pipeline + V4 look in engine:** GLB loader + shared atlas, pack script, V4 palette/fonts/lights, first OK machines integrated.
14. **Environment shell:** floor, thick walls, pier, decals + hazard stripes, doors/bulkheads/lamps/rails.
15. **Characters + animation:** operator, warden, rigs + clips, loadout/locker views.
16. **Bug fixes + Plant props:** valve, capsule, beacon, scrap; pipes, boxes, grates, coat hook; dress Sector 1.
17. **Water + Cold Storage:** water shader, waterfall, outlet pipe, frost silo, Sector 2 props.
18. **Foundry:** Weaver rebuild, ladle, molten stream, smokestack, Sector 3 props.
19. **The Core:** rings, radial bridges, shaft wall, pillars, spindle, kill switches.
20. **Menus + UI re-skin:** monolith, rocks, tower block, chimney, plinth, forklift; 3D title/sector map; all screens on `assets/v4/ui`.
21. **Performance + ship:** KTX2/meshopt, draw calls, APK, screenshots, video, Devpost.

Details and checkboxes: `SHUTDOWN.md` section 17. If something conflicts with reality (an API, performance, missing Blender), pick the simplest option that keeps the V4 rules and mechanics intact, note it in the report and section 16.

Do the setup steps now, then start the next unchecked phase.
