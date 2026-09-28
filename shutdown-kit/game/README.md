# SHUTDOWN

> The building is hunting you. And it can hear you.

A landscape, single-player stealth-horror game for mobile. You are trapped inside Facility 07, run by an AI called **OVERSEER**. The facility rebuilds itself around you, hunts you with machines, learns your habits and listens through your real microphone. Shut it down sector by sector, then kill the Core.

Built for the RevenueCat Shipaton 2026 (Next Gen category).

## What makes it different

- **The map rearranges live.** Walls slide and doors lock on a timer and in response to you. Every shift is telegraphed for 1.5s and a pathfinding check guarantees a route to an unrepaired generator. It never traps or crushes you.
- **Your real voice is noise.** The mic is calibrated to your room, then anything above the baseline becomes a noise event the hunter can hear. Hide in a locker and physically hold your breath. The mic is optional: with it off, a timing mini-game replaces breath.
- **It learns.** An adaptive director tracks your habits (favourite locker, same corridor, rushing generators, being loud, standing still) and counters them.
- **It talks back.** Dry, deadpan, corporate subtitles. "That route is closed now." "Locker four. Again?"

## Mission progression

Each sector has three different operations:

1. **Cut the Feed** — restore 3 generators in any order; each repair disables cameras for 12 seconds.
2. **Break the Circuit** — connect 3 relays in sequence; only the active relay is orange. Each connection grants a hack charge (up to 4) and brings the next shift forward.
3. **Trigger the Collapse** — overload 4 generators; repairs emit noise and shorten the shift interval, alongside the sector's Overtime or Blackout modifier.

Every machine cycles through calibration, wiring, and pressure trials. Complete the objectives, open an exit, and escape within 60 seconds. The live facility plan marks active objectives, locked doors, shifting walls, exits, and your position. It never reveals hunters.

A briefing pauses the world before deployment. PAUSE / Escape freezes simulation and repair timers; hiding the browser tab also pauses. Progress and purchase entitlements retain the existing save format.

The title uses a two-level 3D cutaway, built from the same instanced industrial parts as gameplay. Cold Storage has refrigeration cabinets; Foundry has caged orange machinery. Landscape layouts account for height as well as width.

## Content

- Sector 1 **The Plant** and Sector 2 **Cold Storage** (Blackout modifier), 3 nights each
- **The Core** finale: rotating rings, dropping segments, 4 kill switches, a PURGE timer, two hunters
- **Foundry Pass** (paid): Sector 3 **The Foundry**, the six-legged hunter **THE WEAVER**, 3 Foundry perks (Ghost, Decoy, Override) and a seeded **Daily Night**
- **Skin Pack** (paid): cosmetic suits and hunter shells
- 6 free perks bought with scrap (earned only, never sold)

## Controls

- Touch: left joystick to move, **RUN** (hold), **HIDE**, **HACK**, **USE**, **DECOY** (with the perk)
- Keyboard (dev fallback): WASD / arrows, Shift run, E use, Q hack, F hide, Space hold (locker fallback), Escape pause / abort trial

## Tech decisions

| Layer | Choice | Why |
|---|---|---|
| Shell | Next.js static export + Capacitor | One codebase for the web preview and the Android APK |
| 3D | Three.js via React Three Fiber + drei | Declarative scene, `useFrame` loop |
| Models | Primitives built in code | No asset pipeline, strict flat low-poly look |
| Sim | Plain TS modules + zustand mirror | Game logic stays out of React render; the store only gets a small per-frame diff for the HUD |
| Rendering | Instanced walls/floors, one directional light + ambient, flat Lambert materials | Under 150 draw calls, 60fps on mid-range Android |
| AI | Grid A* + 5-state hunter machine; polar navigation in the Core | Rings rotate, so the Core can't use a static grid |
| Audio in | Web Audio `AnalyserNode` RMS, calibrated baseline | Works in the WebView with Capacitor's mic permission handling |
| Audio out | Fully synthesized Web Audio SFX + drone | Zero audio assets, zero licensing |
| Haptics | `@capacitor/haptics`, `navigator.vibrate` on the web | Optional, toggle in Settings |
| Purchases | RevenueCat Capacitor SDK behind an adapter | Real SDK on device, clearly labeled mock in the web preview |
| Save | localStorage, single-player save file | No backend |

All tunables (speeds, noise radii, hunter timings, shift interval, mic threshold, juice) live in `lib/game/config.ts`.

### Art rules

Flat-shaded low-poly, orthographic isometric camera, a 6-color palette (`#0E0F12` `#1C1F24` `#5A5F66` `#EDEAE3` `#FF5A1F` `#E5383B`), red only for enemies or danger. No bloom, particles, gradients, glow, emoji or faces. Anton for titles, JetBrains Mono for labels, Swiss grid UI with 1px rules and sharp corners.

## RevenueCat setup

The app expects:

| Product | Type | Entitlement |
|---|---|---|
| `foundry_pass` | Non-consumable | `foundry` |
| `skin_pack` | Non-consumable | `skins` |

1. Create a RevenueCat project and add a **Test Store** app (no Play Console account needed).
2. Create the two products above and attach each to its entitlement.
3. Copy the project's **public** Android SDK key.
4. Provide it at build time as `NEXT_PUBLIC_REVENUECAT_ANDROID_KEY`. In CI, add it as a secret / masked variable named `REVENUECAT_ANDROID_KEY`. Never commit it.

Without a key (and always in the web preview) the app uses a mock store labeled **WEB PREVIEW // MOCK STORE // NO CHARGE**.

**For judges:** install the debug APK, tap the locked Sector 3 (or the Loadout SKINS tab) and complete the purchase. Test Store purchases are simulated and need no card. Sector 3, THE WEAVER, the Foundry perks and Daily Night unlock immediately. **RESTORE PURCHASES** is on every paywall.

## How to build

Requirements: Node 22, pnpm (via `corepack enable`), and for Android: JDK 21 + the Android SDK.

```bash
pnpm install
pnpm dev            # web preview at http://localhost:3000 (landscape viewport, e.g. 844x390)
pnpm test           # 108 seeded simulation regression runs
pnpm typecheck
pnpm build          # static export in out/
```

Android debug APK:

```bash
pnpm build
pnpm android:prepare                  # cap add android (first time), landscape lock, permissions, icon, cap sync
cd android && ./gradlew assembleDebug # android/app/build/outputs/apk/debug/app-debug.apk
```

`android/` is generated by `scripts/prepare-android.mjs` and not committed. Use `pnpm android:open` to open it in Android Studio.

### CI

- **GitHub Actions:** `.github/workflows/android.yml` builds the debug APK on pushes to `main`, PRs and manual runs, and uploads it as the `shutdown-debug-apk` artifact.
- **GitLab CI:** the parent repo's `.gitlab-ci.yml` runs the same steps and keeps the APK as a job artifact for 30 days.

## Project structure

- `app/` Next.js shell (layout, fonts, palette tokens, page router by screen)
- `components/game/` R3F scenes: level, player, hunters, Core arena, camera rig
- `components/shell/` HTML overlay screens: title, sector map, loadout, HUD, locker, results, paywall, settings
- `lib/game/` simulation: level grid, pathfinding, hunter AI, noise, shifts, mic, lockers, objectives, OVERSEER director, juice, save store
- `lib/purchases/` purchases adapter (RevenueCat / mock)
- `resources/android/` launcher icon sources copied into the generated Android project

## Roadmap

AI crew bots, online co-op (4 survivors vs the facility) with proximity voice the hunter can hear, Overseer Mode (one player is the building), iOS release, daily leaderboards.

## License

MIT. See `LICENSE`.
