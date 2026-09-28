Build SHUTDOWN, a landscape mobile stealth-horror game, from the attached `shutdown-kit.zip`. This prompt is self-contained and works for both a fresh start and a resumed handoff. Use the same prompt every time.

## Setup (do this first)
1. Unzip `shutdown-kit.zip` into the project root. Do not look for, import, or connect any existing project, repo, or integration.
2. Move `shutdown-kit/PROMPT.md` to `/PROMPT.md`, `shutdown-kit/SHUTDOWN.md` to `/SHUTDOWN.md`, and `shutdown-kit/concepts/v3/*` to `/public/concepts/v3/`.
3. **Fresh start or resume?**
   - If `shutdown-kit/game/` does **not** exist: this is a fresh start. Begin at Phase 0.
   - If `shutdown-kit/game/` **exists**: this is a resume. Copy everything inside it into the project root, overwriting the default template files. Run `pnpm install`, start the dev server, and confirm the game loads in the preview. Then read section 16 (Progress log) in `SHUTDOWN.md` and continue from the first phase that is not complete, or from the exact point the log says was in progress.
4. Delete the leftover `shutdown-kit/` folder and the zip.
5. Read `SHUTDOWN.md` fully and look at every image in `public/concepts/v3/` before writing any code. The doc is the source of truth. Section 15 is locked; do not re-open those decisions. On a resume, also skim the existing code structure before editing.
6. If section 16 does not exist yet, add it to `SHUTDOWN.md` (see "Progress log" below).

## Ground rules
- **Self-contained.** No backend, databases, auth, or Marketplace integrations. Save data is a local single-player save file, as the doc says.
- **Work in small phases, not one go.** Do exactly one phase per turn, then stop. At the end of each phase:
  - verify it in the browser preview (screenshot, landscape viewport, e.g. 844x390),
  - tick the matching boxes in `SHUTDOWN.md` section 11 and update section 16,
  - reply with a short report: what was built, what you checked, known issues, what the next phase is,
  - then wait for me to say "next".
- **Anti-slop art rules (section 2) are hard constraints.** Flat-shaded low-poly (`flatShading`, `MeshLambertMaterial` or `MeshStandardMaterial` with roughness 1 and metalness 0), orthographic isometric camera, the 6-color palette only, red only for enemy or danger, one directional light plus ambient, no bloom, no decorative particles, no gradients, no glow, no emoji, no faces. Anton for titles, JetBrains Mono for labels. Swiss grid UI, 1px rules, sharp corners.
  - Match the mockups for layout and feel. Use `07-crew.png` and `10-paywall.png` for layout only, not style. Crew (07) and Overseer Mode (11) are roadmap; do not build them.
- **Models from primitives in code.** No external 3D assets.
- **Tunables in one file** (`lib/game/config.ts`): speeds, noise radii, hunter timings, shift interval, mic threshold.
- **Keep game logic out of React render.** Put simulation in plain TS modules and a small store (zustand), with R3F `useFrame` for the loop. Use instanced meshes for walls and floors. Target under 150 draw calls.
- **Mobile first.** Landscape, touch joystick plus HIDE / RUN / HACK buttons, safe areas. Keyboard (WASD, Shift, E, F) is fine as a dev fallback.
- **Mic must be optional.** The game must be fully playable with the mic off.
- **OVERSEER voice:** dry, deadpan, corporate. No exclamation marks, no insults.
- Remove any `console.log("[v0] ...")` debug lines before ending a phase.

## Progress log (`SHUTDOWN.md` section 16)
Keep this short and current. It is what the next chat reads to continue. Include:
- **Status:** last completed phase, and current phase with "done" and "remaining" sub-bullets if it is partial.
- **Next step:** the exact next thing to do.
- **Known issues / TODOs.**
- **Deviations from the doc,** and why.
- **File map:** key folders and files, one line each.
- **Run notes:** anything needed to start the project (commands, gotchas).

## HANDOFF (when I say "HANDOFF", or when the chat is getting long)
If I type **HANDOFF**, do this immediately, even mid-phase. If the conversation is getting long (earlier messages are being truncated or summarized), finish the current phase, then tell me: "Context is getting long. Say HANDOFF to package progress."

1. Get the code to a runnable state. If you are mid-phase, do not leave broken imports. Stub or comment out unfinished parts and note them in the log.
2. Remove `console.log("[v0] ...")` lines.
3. Update `SHUTDOWN.md`: tick the section 11 boxes, and fill in section 16 so a fresh chat can continue with no other context.
4. Build the zip with Bash. It must contain this layout, with a single top-level folder:
   ```
   shutdown-kit/
     PROMPT.md          (this file, unchanged)
     SHUTDOWN.md        (updated)
     concepts/v3/*.png  (all mockups)
     game/              (full project source)
   ```
   Commands:
   ```bash
   rm -rf /tmp/sk && mkdir -p /tmp/sk/shutdown-kit/concepts/v3 /tmp/sk/shutdown-kit/game
   cp PROMPT.md SHUTDOWN.md /tmp/sk/shutdown-kit/
   cp public/concepts/v3/*.png /tmp/sk/shutdown-kit/concepts/v3/
   tar --exclude=./node_modules --exclude=./.next --exclude=./out --exclude=./dist \
       --exclude=./.git --exclude=./.vercel --exclude=./.turbo --exclude='./.env*' \
       --exclude=./android/app/build --exclude=./android/.gradle --exclude=./ios/App/Pods \
       --exclude=./public/concepts --exclude='./*.zip' --exclude=./PROMPT.md --exclude=./SHUTDOWN.md \
       -cf - . | tar -xf - -C /tmp/sk/shutdown-kit/game
   rm -f shutdown-kit.zip
   (cd /tmp/sk && zip -rq "$OLDPWD/shutdown-kit.zip" shutdown-kit) \
     || (cd /tmp/sk && python3 -m zipfile -c "$OLDPWD/shutdown-kit.zip" shutdown-kit)
   unzip -l shutdown-kit.zip | tail -n 5 && du -h shutdown-kit.zip
   ```
5. Verify the zip: it must contain `shutdown-kit/PROMPT.md`, `SHUTDOWN.md`, all 11 PNGs, `game/package.json` and the lockfile. It must not contain `node_modules`, `.next`, or `.env` files. It should be only a few MB.
6. Reply with: the zip path (`/shutdown-kit.zip` in the project root), its size, the Progress log summary, and this line: "Start a new chat, attach shutdown-kit.zip, and paste PROMPT.md."

## Phases
0. **Setup + foundation:** Next.js with static export, R3F + drei, Tailwind, zustand; fonts and palette tokens; `config.ts`; landscape and fullscreen handling; a "rotate your device" screen in portrait; add section 16 to `SHUTDOWN.md`.
1. **Level + movement:** grid module system (floor, wall, dynamic wall, door, locker, generator, gate), Sector 1 layout, orthographic isometric follow camera, player (faceless orange mannequin), joystick, run, collision.
2. **Hunter AI:** primitive hunter with one red slit, grid A*, vision cone on the floor with line of sight, noise event system, full state machine (patrol / suspicious / investigate / chase / search), catch on contact.
3. **Objectives:** generators with the 3 repair trials (needle, wires, hold), fail = noise burst, exit gates, 60s final chase, caught leads to a Second Wind check then night failed, hacking (door lock, shift reverse, camera blind).
4. **Shifting map:** dynamic walls and doors, 1.5s telegraph (floor track plus sound cue), route-safety check so a route to an unrepaired generator always exists, never crush or trap the player.
5. **Mic + locker:** mic calibration screen (02), Web Audio `AnalyserNode` feeding into noise events, locker slit view with breath meter (06), mic-off timing fallback.
6. **OVERSEER director:** habit tracking and responses (section 6 table), subtitle system with a line bank.
7. **Screens + progression:** Title (01), Sector map (03), Loadout (04), HUD (05), Results (09), Settings; scrap, the 6 free perks, local save, 3 nights per sector, Sector 2 with the Blackout modifier.
8. **The Core finale (08):** rotating rings, dropping segments, 4 kill-switch terminals, PURGE timer, two hunters, ending.
9. **RevenueCat:** paywall (10), `foundry_pass` and `skin_pack`, `foundry` and `skins` entitlements, restore. Build a `purchases` adapter: RevenueCat Capacitor SDK on device, and a clearly labeled mock in the web preview. Gate Sector 3 and skins behind the entitlements. Ask me for keys when needed; never hardcode secrets.
10. **Foundry content:** Sector 3 layout, THE WEAVER (six-legged hunter), 3 Foundry perks, Daily Night.
11. **Juice:** SFX (Web Audio synthesized or CC0), ambient drone, heartbeat plus vignette on hunter proximity, screen shake, haptics hooks.
12. **Ship:** Capacitor Android config, GitHub Actions APK workflow, MIT LICENSE, README (pitch, tech decisions, RevenueCat setup, how to build), app icon.

If something in the doc conflicts with reality (an API, performance), pick the simplest option that keeps the art rules and mechanics intact, note it in your phase report and section 16, and update `SHUTDOWN.md`.

Do the setup steps now, then start the correct phase (Phase 0 on a fresh start, or the next phase from the Progress log on a resume).
