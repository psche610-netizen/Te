import { DIRECTOR, LOCKER, MIC } from '../config'
import { exitLocker, lockerPoint, lockerWord } from '../hide'
import { alertHunter, biasPatrol, type HunterMode } from '../hunter'
import { emitNoise } from '../noise'
import type { GameSession } from '../session'
import { triggerTargetedShift, type ShiftPiece } from '../shift'
import { say } from './subtitles'

interface Point {
  x: number
  z: number
}

export type DirectorResponse = 'still' | 'gas' | 'corridor' | 'rush' | 'loud' | 'lockerFirst'

/** Per-night habit tracking for the adaptive director (section 6). */
export interface DirectorState {
  started: boolean
  tick: number
  /** Global gap between responses. */
  gap: number
  cooldowns: Record<DirectorResponse, number>
  prevMode: HunterMode
  prevHidden: number | null
  prevRepaired: number
  prevMicLoud: boolean
  lastNoiseId: number

  stillTime: number
  pendingAlert: (Point & { t: number }) | null

  /** Door / dynamic-wall slot passes, keyed `d<id>` / `w<id>`. */
  pieceUses: Record<string, number>
  nearPiece: string | null

  loudScore: number
  loudSpot: Point | null

  lastRepairTime: number
  rushScore: number

  lockerUses: number[]
  lockerEntries: number
  /** Countdown to force a hidden player out of a gassed locker; null = not in gas. */
  gasEvict: number | null

  /** Every response fired this night (for tests / results). */
  log: DirectorResponse[]
}

export function createDirector(lockerCount: number): DirectorState {
  return {
    started: false,
    tick: DIRECTOR.tickInterval,
    gap: 0,
    cooldowns: { still: 0, gas: 0, corridor: 0, rush: 0, loud: 0, lockerFirst: 0 },
    prevMode: 'patrol',
    prevHidden: null,
    prevRepaired: 0,
    prevMicLoud: false,
    lastNoiseId: 0,
    stillTime: 0,
    pendingAlert: null,
    pieceUses: {},
    nearPiece: null,
    loudScore: 0,
    loudSpot: null,
    lastRepairTime: 0,
    rushScore: 0,
    lockerUses: Array.from({ length: lockerCount }, () => 0),
    lockerEntries: 0,
    gasEvict: null,
    log: [],
  }
}

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.z - b.z)

function fire(s: GameSession, r: DirectorResponse, cooldown: number, global = true) {
  const d = s.director
  d.cooldowns[r] = cooldown
  if (global) d.gap = DIRECTOR.responseGap
  d.log.push(r)
}

export function favouriteLocker(d: DirectorState): number | null {
  let best: number | null = null
  for (let i = 0; i < d.lockerUses.length; i++) {
    if (d.lockerUses[i] > 0 && (best === null || d.lockerUses[i] > d.lockerUses[best])) best = i
  }
  return best
}

/* ---------- observation ---------- */

function observeHunter(s: GameSession) {
  const d = s.director
  const h = s.hunter
  const prev = d.prevMode
  d.prevMode = h.mode
  if (prev === h.mode) return
  if (h.mode === 'chase' && prev !== 'stunned') say(s, 'spotted')
  else if (prev === 'chase' && h.mode === 'search') say(s, 'lost')
  if (h.mode === 'search' && !s.hide?.check) checkLockersFirst(s)
}

/** Locker campers: when the hunter starts searching, it goes to their favourite locker first. */
function checkLockersFirst(s: GameSession) {
  const d = s.director
  if (d.cooldowns.lockerFirst > 0) return
  const fav = favouriteLocker(d)
  if (fav === null || d.lockerUses[fav] < DIRECTOR.lockerHabitUses) return
  const stand = lockerPoint(s.level, fav, LOCKER.checkStand)
  const far = dist(stand, s.hunter)
  if (far > DIRECTOR.lockerFirstRange || far < LOCKER.searchDistance) return
  alertHunter(s.hunter, stand)
  d.prevMode = s.hunter.mode
  say(s, 'lockerFirst', { n: lockerWord(fav) })
  fire(s, 'lockerFirst', DIRECTOR.lockerFirstCooldown, false)
}

function observeHide(s: GameSession) {
  const d = s.director
  const id = s.hide?.lockerId ?? null
  if (id !== null && d.prevHidden === null) {
    d.lockerUses[id]++
    d.lockerEntries++
    if (d.lockerUses[id] >= 2) say(s, 'lockerRepeat', { n: lockerWord(id) })
    else say(s, 'lockerEnter')
  }
  d.prevHidden = id
}

function observeRepairs(s: GameSession) {
  const d = s.director
  if (s.repaired <= d.prevRepaired) return
  d.prevRepaired = s.repaired
  if (s.time - d.lastRepairTime < DIRECTOR.rushInterval) d.rushScore++
  d.lastRepairTime = s.time
  if (s.repaired < s.generators.length) say(s, 'generatorOnline', { n: s.repaired, total: s.generators.length })
}

function nearestPassage(s: GameSession): string | null {
  const p = s.player
  let best: string | null = null
  let bestD: number = DIRECTOR.corridorPassDistance
  for (const door of s.level.doors) {
    const dd = dist(door, p)
    if (door.open && dd < bestD) {
      bestD = dd
      best = `d${door.id}`
    }
  }
  for (const w of s.level.dynamicWalls) {
    const dw = dist(w, p)
    if (!w.raised && dw < bestD) {
      bestD = dw
      best = `w${w.id}`
    }
  }
  return best
}

function observeMovement(s: GameSession, dt: number) {
  const d = s.director
  const still = !s.hide && !s.repair && s.openingGate === null && s.player.speed < 0.3
  d.stillTime = still ? d.stillTime + dt : 0

  const key = nearestPassage(s)
  if (key && key !== d.nearPiece) d.pieceUses[key] = (d.pieceUses[key] ?? 0) + 1
  d.nearPiece = key
}

function observeLoudness(s: GameSession, dt: number) {
  const d = s.director
  const p = s.player
  const micLoud = s.micSample !== null && s.micLevel > MIC.threshold
  if (micLoud) {
    d.loudScore += DIRECTOR.loudMicRate * dt
    d.loudSpot = { x: p.x, z: p.z }
    if (!d.prevMicLoud && !s.hide?.check) say(s, 'micLoud')
  }
  d.prevMicLoud = micLoud
  if (p.running && p.speed > 0.5) {
    d.loudScore += DIRECTOR.loudRunRate * dt
    d.loudSpot = { x: p.x, z: p.z }
  }
  for (const e of s.noise.events) {
    if (e.id <= d.lastNoiseId) continue
    if (e.kind === 'repair-fail') {
      d.loudScore += DIRECTOR.loudRepairFail
      d.loudSpot = { x: e.x, z: e.z }
    }
  }
  d.lastNoiseId = s.noise.nextId - 1
  d.loudScore = Math.max(0, d.loudScore - DIRECTOR.loudDecay * dt)
}

function updateGas(s: GameSession, dt: number) {
  const d = s.director
  for (let i = 0; i < s.lockerGas.length; i++) if (s.lockerGas[i] > 0) s.lockerGas[i] = Math.max(0, s.lockerGas[i] - dt)
  const hide = s.hide
  if (!hide || s.lockerGas[hide.lockerId] <= 0 || hide.check) {
    d.gasEvict = null
    return
  }
  d.gasEvict = (d.gasEvict ?? DIRECTOR.gasEvictDelay) - dt
  if (d.gasEvict > 0) return
  d.gasEvict = null
  const l = s.level.lockers[hide.lockerId]
  if (exitLocker(s)) {
    d.prevHidden = null
    emitNoise(s.noise, 'mic', l.x, l.z, DIRECTOR.gasCoughNoise, s.time)
    say(s, 'gasEvict')
  }
}

/* ---------- responses ---------- */

function respondStill(s: GameSession) {
  const d = s.director
  if (d.stillTime < DIRECTOR.stillSeconds || d.cooldowns.still > 0 || s.hunter.mode === 'chase') return false
  say(s, 'still')
  d.pendingAlert = { x: s.player.x, z: s.player.z, t: DIRECTOR.stillAlertDelay }
  d.stillTime = 0
  fire(s, 'still', DIRECTOR.stillCooldown)
  return true
}

function respondGas(s: GameSession) {
  const d = s.director
  if (d.lockerEntries < DIRECTOR.gasEntries || d.cooldowns.gas > 0) return false
  const fav = favouriteLocker(d)
  if (fav === null) return false
  const center = s.level.lockers[fav]
  for (const l of s.level.lockers) {
    if (dist(l, center) <= DIRECTOR.gasRadius) s.lockerGas[l.id] = DIRECTOR.gasDuration
  }
  d.lockerEntries = 0
  say(s, 'gas', { n: lockerWord(fav) })
  fire(s, 'gas', DIRECTOR.gasCooldown)
  return true
}

function pieceFromKey(key: string): ShiftPiece {
  return { kind: key[0] === 'd' ? 'door' : 'wall', id: Number(key.slice(1)) }
}

function respondCorridor(s: GameSession) {
  const d = s.director
  if (d.cooldowns.corridor > 0) return false
  const keys = Object.keys(d.pieceUses)
    .filter((k) => d.pieceUses[k] >= DIRECTOR.corridorUses)
    .sort((a, b) => d.pieceUses[b] - d.pieceUses[a])
  for (const key of keys) {
    const piece = pieceFromKey(key)
    const at = piece.kind === 'door' ? s.level.doors[piece.id] : s.level.dynamicWalls[piece.id]
    if (dist(at, s.player) < DIRECTOR.corridorMinDistance) continue
    if (triggerTargetedShift(s, [piece]).length) {
      d.pieceUses[key] = 0
      say(s, 'corridorSealed')
      fire(s, 'corridor', DIRECTOR.corridorCooldown)
      return true
    }
    d.pieceUses[key] = DIRECTOR.corridorUses - 1
  }
  return false
}

function respondRush(s: GameSession) {
  const d = s.director
  if (d.rushScore < DIRECTOR.rushCount || d.cooldowns.rush > 0 || s.gatesPowered) return false
  const pending = s.level.generators.filter((_, i) => !s.generators[i].repaired)
  const candidates = s.level.doors
    .filter((door) => door.open && !door.locked && dist(door, s.player) >= DIRECTOR.corridorMinDistance)
    .map((door) => ({ door, gd: Math.min(...pending.map((g) => dist(g, door))) }))
    .filter((c) => c.gd <= DIRECTOR.rushDoorRange)
    .sort((a, b) => a.gd - b.gd)
    .slice(0, DIRECTOR.rushDoors)
  if (!candidates.length) return false
  const moved = triggerTargetedShift(
    s,
    candidates.map((c) => ({ kind: 'door', id: c.door.id })),
  )
  if (!moved.length) return false
  d.rushScore--
  say(s, 'rushLock')
  fire(s, 'rush', DIRECTOR.rushCooldown)
  return true
}

function respondLoud(s: GameSession) {
  const d = s.director
  if (d.loudScore < DIRECTOR.loudThreshold || !d.loudSpot || d.cooldowns.loud > 0) return false
  biasPatrol(s.hunter, d.loudSpot, DIRECTOR.biasDuration)
  d.loudScore = 0
  say(s, 'loudBias')
  fire(s, 'loud', DIRECTOR.loudCooldown)
  return true
}

const RESPONSES = [respondStill, respondGas, respondCorridor, respondRush, respondLoud]

export function updateDirector(s: GameSession, dt: number) {
  const d = s.director
  if (!d.started) {
    d.started = true
    say(s, s.openingLine)
  }
  d.gap = Math.max(0, d.gap - dt)
  for (const k in d.cooldowns) {
    const key = k as DirectorResponse
    d.cooldowns[key] = Math.max(0, d.cooldowns[key] - dt)
  }

  observeHunter(s)
  observeHide(s)
  observeRepairs(s)
  observeMovement(s, dt)
  observeLoudness(s, dt)
  updateGas(s, dt)

  if (d.pendingAlert && (d.pendingAlert.t -= dt) <= 0) {
    alertHunter(s.hunter, d.pendingAlert)
    d.prevMode = s.hunter.mode
    d.pendingAlert = null
  }

  if ((d.tick -= dt) > 0) return
  d.tick = DIRECTOR.tickInterval
  if (s.time < DIRECTOR.warmup || d.gap > 0) return
  for (const respond of RESPONSES) if (respond(s)) break
}
