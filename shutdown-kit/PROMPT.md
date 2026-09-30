## READ FIRST: where things are and who runs what

**Status:** Phases 0–24 are DONE. All 86 V4 assets are within budget and have been reviewed; the engine pipeline, V4 look, environment and characters are in (`SHUTDOWN.md` section 17). **Next: Phase 25.** (After Phase 22, rerun the props Blender build for the `pivot_part` fix.)

**In the v0 chat:** the user starts each chat with `git clone https://github.com/psche610-netizen/Te`, so the repo is at `./Te/` in the project root (paths below are relative to `Te/`). `GITHUB_PAT` is set in the project Vars. Push with `git push https://x-access-token:$GITHUB_PAT@github.com/psche610-netizen/Te.git HEAD:main`, and never print or commit the token. If `$GITHUB_PAT` is empty in the shell, read it from `.env.development.local` in the project root.

**On the user's laptop:** Fedora, RTX 4060 Mobile 8 GB. The user's clone is `~/Downloads/Te`.
- Blender: `~/Downloads/blender-5.2.2-linux-x64/blender` (use this one). `~/Downloads/blender-4.5.14-linux-x64/blender` is a fallback only.
- The asset build is CPU-only (geometry + GLB export, no rendering), so the GPU does not help.

**Who runs what.** Blender asset builds run on the user's laptop only (CPU-heavy). **Everything for the game (Part B) the agent verifies itself in the sandbox**, then commits and pushes; do not ask the user to typecheck, run the game or send screenshots:
```bash
cd Te/shutdown-kit/game && pnpm install --prefer-offline && npx tsc --noEmit && pnpm build   # static export → out/
cd Te/shutdown-kit/game/out && python3 -m http.server 3210 --bind 0.0.0.0                     # background task
```
The browser can only reach port 3000 (the root stub app), so temporarily add to the root `next.config.mjs`:
`async rewrites() { return { beforeFiles: [{ source: '/:path*', destination: 'http://localhost:3210/:path*' }] } }`,
then `agent-browser open --webgpu http://localhost:3000/`, set viewport 898x624 (landscape), click through menu → sector → loadout → PLAY WITHOUT MIC → BEGIN NIGHT, screenshot + `agent-browser errors`. Afterwards remove the rewrite and stop the server (never commit the root config change). `next start` does not work (static export).

User commands (only needed for asset builds, or if the user wants to play locally):
```bash
# get the agent's latest push
cd ~/Downloads/Te && git pull

# optional: play the game locally (open http://localhost:3000 in landscape)
cd ~/Downloads/Te/shutdown-kit/game && pnpm install && pnpm dev

# Rebuild ALL assets (about 10 min, 6 parallel Blenders); prints EXPORTED count (expect 86) + OVER BUDGET (expect none)
cd ~/Downloads/Te/shutdown-kit/assets/v4 && ./build_fast.sh

# Rebuild ONE or a few assets (fast)
cd ~/Downloads/Te/shutdown-kit/assets/v4 && ~/Downloads/blender-5.2.2-linux-x64/blender -b --factory-startup --python-exit-code 1 -P source/complete_library.py -- --only <asset-id>[,<asset-id>] 2>&1 | grep -E "EXPORTED|DECIMATED|Error"

# push local build results back
cd ~/Downloads/Te && git add -A && git commit -m "<phase>: local build" && git push
```
If `pnpm` is missing: `sudo dnf install nodejs && sudo npm i -g pnpm` (or `sudo corepack enable`; plain `corepack enable` fails with EACCES on Fedora).
If a build fails, the user pastes `tail -40 /tmp/v4-build/<category>.log` (or the command output). The agent fixes the script and pushes, and the user pulls and reruns.
Asset visual checks: the agent may copy `assets/v4/{contact-sheet.html,manifest.json,models,textures}` to `public/v4check/` and `concepts/v4` to `public/concepts/v4`, open `http://localhost:3000/v4check/contact-sheet.html?only=<id>&view=free` with `agent-browser open --webgpu`, and delete both copies afterwards (never commit them).

Build SHUTDOWN, a landscape mobile stealth-horror game. This prompt is self-contained and works for a fresh chat or a resume. Use the same prompt every time.

Repo: `github.com/psche610-netizen/Te`. Everything lives in `shutdown-kit/`.

## Setup (do this first)
1. The code is in `shutdown-kit/game/` (Next.js app; the repo-root `package.json` is an empty stub). The agent installs, typechecks, builds and browser-checks it in the sandbox (see READ FIRST).
2. Read `shutdown-kit/SHUTDOWN.md` fully. It is the source of truth. Section 15 is locked. **Section 2 (V4 art rules) and section 17 (V4 phases 13–27: Part A = all assets first, Part B = integration later) are the current work.** Section 16 is the progress log.
3. Look at every image in `shutdown-kit/concepts/v4/` (look reference) and read `shutdown-kit/assets/v4/AUDIT.md` (status of every 3D asset) and `assets/v4/README.md` (pipeline) before editing.
4. Continue from the first unchecked phase in section 17 (or the exact point section 16 says was in progress).

## Ground rules
- **Self-contained.** No backend, databases, auth, or Marketplace integrations. Local save file only.
- **Small phases.** Exactly one phase per turn, then stop. At the end of each phase:
  - Part A (assets): `python -m py_compile` on the changed scripts only. Part B (integration): the agent runs `npx tsc --noEmit` + `pnpm build` and checks the game in agent-browser itself (see READ FIRST). Fix all errors before ticking the phase,
  - tick the boxes in `SHUTDOWN.md` section 17 (and 11 if relevant), update section 16 and `assets/v4/AUDIT.md`,
  - reply with a short report: what was built, what was checked, known issues, next phase, what the user should look at,
  - commit and push to GitHub (auth with `process.env.GITHUB_PAT`, e.g. `git push https://x-access-token:$GITHUB_PAT@github.com/psche610-netizen/Te.git HEAD:main`; never print or commit the token), then wait for "next".
- **The agent checks the game in agent-browser itself** (static `out/` build via the port-3000 rewrite, see READ FIRST). Keep it to one pass per phase: the affected screens + `agent-browser errors`. agent-browser is also fine for asset checks (`assets/v4/contact-sheet.html`).
- **Part A = write the Python scripts only, verify once at the end.** In Phases 13–20, author/edit `assets/v4/source/*.py` (Blender + texture scripts) and check them with `python -m py_compile` only. Do NOT run Blender builds, export GLBs, render contact sheets or review per phase. Asset builds always run on the user's laptop (`build_fast.sh` or `--only`, see READ FIRST). Afterwards the agent pulls, checks `manifest.json` tri counts (per-asset overrides in `ASSET_BUDGET`, e.g. `turbine-generator` 6000) and the contact sheet.
- **V4 art rules (section 2) are hard constraints.** Painted low-poly from one shared atlas, V4 palette tokens, orthographic iso camera, amber key + cool shadows, red only for enemy/danger, stencils + hazard stripes, Bebas Neue + Share Tech Mono. Banned: bloom haze, lens flare, decorative particles, glossy/chrome, faces, emoji, UI gradients.
- **Assets first.** Phases 13–20 (Part A) only author assets in `assets/v4/` (Blender script, GLBs, atlases, rigs, decals, UI kit) — no `game/` code changes. Integration, logic and backend come after, in Part B (21–27), which the user may do.
- **Models:** Blender-authored GLBs from `assets/v4/source/build_assets.py`. Author → review against the concept → log. In Part B: integrate, keeping the code primitive as fallback until the GLB replaces it. No embedded duplicate textures in the shipped build.
- **Gameplay logic is done.** Part B changes views, materials, loader and lights only, not `lib/game/*` rules. Colliders come from the level grid.
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

**Part A — assets (do these first, all in `assets/v4/`):**
13. **Asset pipeline:** per-asset build flags, shared named materials on ONE external atlas (no embedded copies), decal/stencil atlas, game-camera contact sheet + tri budgets.
14. **Environment shell assets:** floor, thick walls (+ end/T/cross), pier, bulkhead stripes, decal quads.
15. **Characters:** operator, crew, warden, rigs + clips, tintable skin slots.
16. **Plant props:** valve, capsule, beacon, scrap fixes; pipes, boxes, grates, coat hook, kill-switch plates.
17. **Water + Cold Storage assets:** water, waterfall, outlet pipe, frost silo.
18. **Foundry assets:** Weaver rebuild + leg pivots, ladle, molten stream, smokestack, gantry stripes.
19. **Core assets:** ring segments, radial bridges, shaft wall, pillars, spindle.
20. **Menu world + UI kit:** monolith, chimney, plinth, rocks, tower block, forklift; title/sector-map scene recipes; complete UI kit. All AUDIT rows OK.

**Part B — integration + ship (later; user may do):**
21. **Engine pipeline:** copy packed assets into `game/public`, GLB loader + atlas material, V4 palette/fonts/lights.
22. **Environment + Plant in game.** 23. **Characters in game.** 24. **Sectors 2 + 3 in game.** 25. **Core in game.** 26. **Menus + UI re-skin.** 27. **Performance + ship** (KTX2/meshopt, draw calls, APK, screenshots, video, Devpost).

Details and checkboxes: `SHUTDOWN.md` section 17. If something conflicts with reality (an API, performance, missing Blender), pick the simplest option that keeps the V4 rules and mechanics intact, note it in the report and section 16.

Do the setup steps now, then start the next unchecked phase.
