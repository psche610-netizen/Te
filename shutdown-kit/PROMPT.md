## NEXT CHAT: Phase 20b — local-build workflow (read first)

Blender builds run on the user's laptop, NOT in the v0 sandbox (sandbox builds take about 20 min and burn credits).
User machine: Fedora, RTX 4060 Mobile 8 GB (NVIDIA driver installed), Blender at
`~/Downloads/blender-5.2.2-linux-x64/blender` (use this one; the scripts were last built with bpy 5.0.1) and `~/Downloads/blender-4.5.14-linux-x64/blender` (fallback only).

The agent's job in the next chat:
1. Read the "Phase 20b" checklist in `SHUTDOWN.md` (35 over-budget assets).
2. Edit the modeling code in `assets/v4/source/complete_library.py` / `build_assets.py` so each asset meets its triangle budget: fewer cylinder verts and bevel segments, or a Decimate modifier applied before export. Don't change asset ids, pivots, materials or anchors.
3. Commit and push the script changes, then give the user the exact commands below. Do NOT run the Blender build in the sandbox.

User commands (the agent repeats these, adjusted if paths change):
```bash
cd ~ && rm -rf Te && git clone https://github.com/psche610-netizen/Te.git && cd Te/shutdown-kit/assets/v4
~/Downloads/blender-5.2.2-linux-x64/blender -b --python-exit-code 1 -P source/complete_library.py 2>&1 | tee /tmp/build.log
grep -c EXPORTED /tmp/build.log          # expect 86
grep -i "over budget" /tmp/build.log      # expect nothing
python3 source/scene_recipes.py && python3 source/build_ui.py
cd ~/Te && git add -A && git commit -m "Phase 20b: rebuilt assets within budget" && git push
```
Use the NVIDIA GPU for Cycles renders if a render step is slow: prefix the blender command with `__NV_PRIME_RENDER_OFFLOAD=1 __GLX_VENDOR_LIBRARY_NAME=nvidia`.
If the build fails, the user pastes the last 40 lines of `/tmp/build.log` into the chat. The agent fixes the script and pushes, and the user runs `git pull` and repeats.
After the user pushes, the agent reclones or pulls, checks `renders/` visually, ticks Phase 20b in `SHUTDOWN.md`, and moves on to Part B (wiring V4 assets into the game).

Build SHUTDOWN, a landscape mobile stealth-horror game. This prompt is self-contained and works for a fresh chat or a resume. Use the same prompt every time.

Repo: `github.com/psche610-netizen/Te`. Everything lives in `shutdown-kit/`.

## Setup (do this first)
1. The code is in `shutdown-kit/game/` (Next.js app). Run `pnpm install && pnpm dev` inside `shutdown-kit/game` (the repo-root `package.json` is an empty stub), confirm it compiles.
2. Read `shutdown-kit/SHUTDOWN.md` fully. It is the source of truth. Section 15 is locked. **Section 2 (V4 art rules) and section 17 (V4 phases 13–27: Part A = all assets first, Part B = integration later) are the current work.** Section 16 is the progress log.
3. Look at every image in `shutdown-kit/concepts/v4/` (look reference) and read `shutdown-kit/assets/v4/AUDIT.md` (status of every 3D asset) and `assets/v4/README.md` (pipeline) before editing.
4. Continue from the first unchecked phase in section 17 (or the exact point section 16 says was in progress).

## Ground rules
- **Self-contained.** No backend, databases, auth, or Marketplace integrations. Local save file only.
- **Small phases.** Exactly one phase per turn, then stop. At the end of each phase:
  - Part A (assets): `python -m py_compile` on the changed scripts only (full build + tri counts + `contact-sheet.html` review happen once after Phase 20, see below). Part B (integration): run `npx tsc --noEmit` in `shutdown-kit/game` (and headless tsx checks for logic),
  - tick the boxes in `SHUTDOWN.md` section 17 (and 11 if relevant), update section 16 and `assets/v4/AUDIT.md`,
  - reply with a short report: what was built, what was checked, known issues, next phase, what the user should look at,
  - commit and push to GitHub (auth with `process.env.GITHUB_PAT`, e.g. `git push https://x-access-token:$GITHUB_PAT@github.com/psche610-netizen/Te.git HEAD:main`; never print or commit the token), then wait for "next".
- **Do not run the game in agent-browser.** The user runs it and sends screenshots. agent-browser is fine for lightweight asset checks (`assets/v4/contact-sheet.html`).
- **Part A = write the Python scripts only, verify once at the end.** In Phases 13–20, author/edit `assets/v4/source/*.py` (Blender + texture scripts) and check them with `python -m py_compile` only. Do NOT run Blender builds, export GLBs, render contact sheets or review per phase. After Phase 20, run the full build once (`/tmp/bpyenv/bin/python` with `bpy==5.0.1`, Python 3.11 via uv, or `blender --background --python ...` locally), then check manifest tri counts + contact sheet for all assets together and fix in one pass.
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
