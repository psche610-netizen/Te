'use client'

import { useFrame } from '@react-three/fiber'
import { useEffect, useState } from 'react'
import { nightModifier, sectorDef } from '@/lib/game/campaign'
import { OBJECTIVES, PERK_EFFECTS } from '@/lib/game/config'
import { live } from '@/lib/game/live'
import { createJuice, endJuice, gridJuiceSource, stepJuice } from '@/lib/game/juice'
import { micLoudness, micReady } from '@/lib/game/mic'
import { seededRng } from '@/lib/game/daily'
import { toPerkSet, usablePerks } from '@/lib/game/perks'
import { usePurchases } from '@/lib/purchases/store'
import { computeResult } from '@/lib/game/results'
import { createSession, mirrorSession, stepSession, type GameSession, type NightMirror } from '@/lib/game/session'
import { useGameStore } from '@/lib/game/store'
import { GameRig } from './game-rig'
import { HunterView } from './hunter-view'
import { LevelView } from './level/level-view'
import { LockerCamera } from './locker-camera'
import { DecoyViews } from './decoy-view'
import { GeneratorLights, LockerGas, SecurityCameras } from './objective-views'
import { PlayerView } from './player-view'

function setupRows(s: GameSession) {
  const original = sectorDef(useGameStore.getState().sector).level!.rows
  return original.map((row, z) => [...row].map((ch, x) => ch === 'G' && !s.level.generators.some(g => g.cx === x && g.cz === z) ? '.' : ch).join(''))
}

function GameLoop({ session, rows, daily }: { session: GameSession; rows: string[]; daily: string | null }) {
  const [juice] = useState(createJuice)
  useEffect(() => () => endJuice(), [])
  useFrame((_, dt) => {
    if (!useGameStore.getState().paused) {
      stepSession(session, dt)
      stepJuice(juice, gridJuiceSource(session), dt)
    }
    const store = useGameStore.getState()
    const snap = mirrorSession(session)
    const patch: Record<string, unknown> = {}
    let changed = false
    for (const key of Object.keys(snap) as (keyof NightMirror)[]) {
      if (store[key] !== snap[key]) {
        patch[key] = snap[key]
        changed = true
      }
    }
    if (changed) store.syncNight(patch as Partial<NightMirror>)
    if (session.status !== 'playing' && !session.reported) {
      session.reported = true
      store.recordNight(computeResult(session, store.sector, store.night, rows, daily))
    }
  })
  return null
}

export function GameScene() {
  const [{ session, rows, daily }] = useState(() => {
    const { equipped, settings, sector, night, daily } = useGameStore.getState()
    const def = sectorDef(sector)
    const level = def.level!
    const perks = toPerkSet(usablePerks(equipped, usePurchases.getState().entitlements.foundry))
    const session = createSession(level, {
      night,
      modifier: daily ? daily.modifier : nightModifier(sector, night),
      secondWind: perks.secondWind,
      hackCharges: OBJECTIVES.hackChargesBase + (perks.deepPockets ? PERK_EFFECTS.deepPocketsCharges : 0),
      perks,
      decoys: perks.decoy ? PERK_EFFECTS.decoyCharges : 0,
      override: perks.override,
      hunter: def.hunterKind,
      rng: daily ? seededRng(daily.seed) : undefined,
      openingLine: daily ? 'dailyStart' : def.hunterKind === 'weaver' ? 'weaverStart' : 'nightStart',
      mic: settings.micEnabled && micReady() ? micLoudness : null,
    })
    return { session, rows: setupRows(session), daily: daily?.date ?? null }
  })

  useEffect(() => {
    live.session = session
    return () => {
      if (live.session === session) live.session = null
    }
  }, [session])

  const blackout = session.modifier === 'blackout'

  return (
    <>
      <GameLoop session={session} rows={rows} daily={daily} />
      <GameRig player={session.player} blackout={blackout} />
      <LockerCamera session={session} />
      <LevelView level={session.level} />
      <GeneratorLights session={session} />
      <SecurityCameras level={session.level} />
      <LockerGas session={session} />
      <DecoyViews session={session} />
      <PlayerView player={session.player} isHidden={() => session.hide !== null} />
      <HunterView
        hunter={session.hunter}
        level={session.level}
        player={session.player}
        blackout={blackout}
        awareness={session.perks.awareness}
      />
    </>
  )
}
