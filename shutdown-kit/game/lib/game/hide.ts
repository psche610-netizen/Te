import { LOCKER, MIC } from './config'
import { beginLockerCheck, holdHunter, hunterGiveUp, type HunterMode } from './hunter'
import { readBreath } from './input'
import type { LevelData } from './level/types'
import { emitNoise } from './noise'
import { notify } from './notice'
import { numberWord } from './overseer/lines'
import { say } from './overseer/subtitles'
import type { GameSession } from './session'

export interface LockerCheck {
  time: number
  /** Net seconds spent too loud (mic) or out of the zone (fallback). */
  over: number
  needle: number
  zone: number
  phase: number
  dir: number
}

export interface HideState {
  lockerId: number
  check: LockerCheck | null
}

const CHECKING_MODES: ReadonlySet<HunterMode> = new Set<HunterMode>(['investigate', 'search', 'chase'])

export function lockerPoint(level: LevelData, id: number, offset: number) {
  const l = level.lockers[id]
  return { x: l.x + Math.sin(l.rotY) * offset, z: l.z + Math.cos(l.rotY) * offset }
}

export const lockerLabel = (id: number) => `LOCKER ${String(id + 1).padStart(2, '0')}`
/** Spoken locker number for OVERSEER lines: "four". */
export const lockerWord = (id: number) => numberWord(id + 1)

export function findLocker(s: GameSession): number | null {
  let best: number | null = null
  let bestD: number = LOCKER.interactDistance
  for (const l of s.level.lockers) {
    if (s.lockerGas[l.id] > 0) continue
    const spot = lockerPoint(s.level, l.id, LOCKER.standOffset)
    const d = Math.hypot(s.player.x - spot.x, s.player.z - spot.z)
    if (d < bestD) {
      bestD = d
      best = l.id
    }
  }
  return best
}

export function enterLocker(s: GameSession, id: number) {
  const p = s.player
  const l = s.level.lockers[id]
  const spot = lockerPoint(s.level, id, LOCKER.standOffset)
  p.x = spot.x
  p.z = spot.z
  p.vx = 0
  p.vz = 0
  p.speed = 0
  p.running = false
  p.facing = l.rotY
  s.openingGate = null
  s.hide = { lockerId: id, check: null }
  emitNoise(s.noise, 'door', l.x, l.z, LOCKER.doorNoise, s.time)
  // It watched you get in.
  if (s.hunter.canSee) s.hunter.focus = { ...spot }
}

/** Leave the locker. Not allowed while the hunter is checking it. */
export function exitLocker(s: GameSession) {
  if (!s.hide || s.hide.check) return false
  const l = s.level.lockers[s.hide.lockerId]
  s.hide = null
  emitNoise(s.noise, 'door', l.x, l.z, LOCKER.doorNoise, s.time)
  return true
}

function startCheck(s: GameSession, hide: HideState) {
  hide.check = { time: 0, over: 0, needle: 0.5, zone: 0.5, phase: 0, dir: Math.random() < 0.5 ? -1 : 1 }
  beginLockerCheck(s.hunter)
  notify(s, `${lockerLabel(hide.lockerId)} // INSPECTION`)
  say(s, 'lockerInspect', { n: lockerWord(hide.lockerId) })
}

function stepFallback(c: LockerCheck, night: number, dt: number) {
  const fb = LOCKER.fallback
  c.phase += dt * (fb.zoneSpeed + (night - 1) * fb.zoneSpeedPerNight)
  c.zone = 0.5 + Math.sin(c.phase) * fb.zoneSwing * c.dir
  c.needle = Math.min(1, Math.max(0, c.needle + (readBreath() ? fb.rise : -fb.fall) * dt))
  const inZone = Math.abs(c.needle - c.zone) <= fb.zoneWidth / 2
  c.over = inZone ? Math.max(0, c.over - dt) : c.over + dt
  return c.over > fb.grace
}

/**
 * Locker checks. `micLevel` is null when the mic is off (timing fallback).
 * Returns 'found' when the player gives themselves away, 'clear' when the hunter gives up.
 */
export function updateHide(s: GameSession, dt: number, micLevel: number | null): 'found' | 'clear' | null {
  const hide = s.hide
  if (!hide) return null
  const h = s.hunter

  if (!hide.check) {
    const spot = lockerPoint(s.level, hide.lockerId, LOCKER.standOffset)
    const near = Math.hypot(h.x - spot.x, h.z - spot.z) < LOCKER.searchDistance
    if (s.lockerCooldown <= 0 && near && CHECKING_MODES.has(h.mode)) startCheck(s, hide)
    if (!hide.check) return null
  }

  const c = hide.check!
  c.time += dt
  let found: boolean
  if (micLevel !== null) {
    c.over = micLevel > MIC.threshold ? c.over + dt : Math.max(0, c.over - dt * 0.5)
    found = c.over > MIC.lockerGrace
  } else {
    found = stepFallback(c, s.night, dt)
  }

  const locker = s.level.lockers[hide.lockerId]
  holdHunter(h, s.level, s.noise, lockerPoint(s.level, hide.lockerId, LOCKER.checkStand), locker, dt)

  if (found) {
    s.hide = null
    s.lockerCooldown = LOCKER.cooldown
    emitNoise(s.noise, 'mic', locker.x, locker.z, LOCKER.foundNoise, s.time)
    notify(s, `${lockerLabel(hide.lockerId)} // FOUND`)
    say(s, 'lockerFound')
    return 'found'
  }
  if (c.time >= MIC.lockerHoldSeconds) {
    hide.check = null
    s.lockerCooldown = LOCKER.cooldown
    hunterGiveUp(h)
    notify(s, `${lockerLabel(hide.lockerId)} // CLEAR`)
    say(s, 'lockerClear', { n: lockerWord(hide.lockerId) })
    return 'clear'
  }
  return null
}
