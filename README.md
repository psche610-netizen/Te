# Te — SHUTDOWN (start here)

Landscape mobile stealth-horror game for RevenueCat Shipaton 2026. Gameplay is complete (Phases 0–12). **Current work: V4 art pass, Phases 13–27 — Part A (13–20) builds all assets first, Part B (21–27) integrates them later.**

## For the next agent / LLM — read in this order
1. `shutdown-kit/PROMPT.md` — how to work (one phase per turn, rules, handoff).
2. `shutdown-kit/SHUTDOWN.md` — design doc. §2 = V4 art rules, §16 = progress log, **§17 = V4 phase plan with checkboxes**.
3. `shutdown-kit/assets/v4/AUDIT.md` — every 3D asset: OK / FIX / NEW, mapped to phases.
4. `shutdown-kit/concepts/v4/*.png` — target look (11 screens).

## Layout
```
package.json                 empty stub (run the game from shutdown-kit/game)
shutdown-kit/
  PROMPT.md  SHUTDOWN.md     working prompt + design doc
  concepts/v4/               target look (v3 = old flat look, layout only)
  assets/v4/                 Blender GLB kit, atlas, UI kit, AUDIT.md, contact-sheet.html
  game/                      Next.js 16 + R3F + Capacitor app (the game)
```

## Run
`cd shutdown-kit/game && pnpm install && pnpm dev`. Type check: `npx tsc --noEmit`.

## Status
- Game code: done (v3 flat primitives look).
- V4 assets: 56 GLBs exist (~33 OK, ~22 need fixes, ~20 missing). None integrated in the game yet.
- Next: **Phase 13** (asset pipeline: per-asset builds, one shared external atlas, decal atlas, game-camera contact sheet).
