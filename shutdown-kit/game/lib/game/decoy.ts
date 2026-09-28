import { PERK_EFFECTS } from './config'
import { segmentClear } from './level/raycast'
import { emitNoise } from './noise'
import { notify } from './notice'
import { say } from './overseer/subtitles'
import type { GameSession } from './session'

export interface Decoy {
  x: number
  z: number
  /** Seconds until the next pulse. */
  timer: number
  pulsesLeft: number
  /** Seconds since it landed, for the view. */
  age: number
}

const STEP = 0.25
const WALL_GAP = 0.35

/** Where a decoy thrown from the player lands: straight ahead, stopped short of the first wall. */
export function decoyLanding(s: GameSession) {
  const { player: p, level } = s
  const dx = Math.sin(p.facing)
  const dz = Math.cos(p.facing)
  let reach = 0
  for (let d = STEP; d <= PERK_EFFECTS.decoyRange; d += STEP) {
    if (!segmentClear(level, p.x, p.z, p.x + dx * d, p.z + dz * d)) break
    reach = d
  }
  reach = Math.max(0, reach - WALL_GAP)
  return { x: p.x + dx * reach, z: p.z + dz * reach }
}

/** Foundry: Decoy. Returns false when out of throws. */
export function throwDecoy(s: GameSession) {
  if (s.decoyCharges <= 0) return false
  const { x, z } = decoyLanding(s)
  s.decoyCharges--
  s.decoys.push({ x, z, timer: PERK_EFFECTS.decoyArm, pulsesLeft: PERK_EFFECTS.decoyPulses, age: 0 })
  notify(s, `DECOY OUT // ${s.decoyCharges} LEFT`)
  return true
}

export function updateDecoys(s: GameSession, dt: number) {
  for (let i = s.decoys.length - 1; i >= 0; i--) {
    const d = s.decoys[i]
    d.age += dt
    if ((d.timer -= dt) > 0) continue
    emitNoise(s.noise, 'decoy', d.x, d.z, PERK_EFFECTS.decoyNoise, s.time)
    if (d.pulsesLeft === PERK_EFFECTS.decoyPulses) say(s, 'decoy')
    d.pulsesLeft--
    d.timer = PERK_EFFECTS.decoyInterval
    if (d.pulsesLeft <= 0) s.decoys.splice(i, 1)
  }
}
