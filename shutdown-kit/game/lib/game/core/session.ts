import { actions, clearActions } from '../actions'
import { CORE, CORE_HUNTER, NOISE, PLAYER, PROGRESSION } from '../config'
import { readInput } from '../input'
import { assignTrials } from '../objectives'
import { createSubtitles, say, updateSubtitles, type SubtitleState } from '../overseer/subtitles'
import { createPlayer, type PlayerState } from '../player'
import { computeScrap, type NightOutcome, type NightResult } from '../results'
import type { FailReason, NightMirror, NightStatus, Notice, RepairState, SessionPerks, TrialKind } from '../session'
import {
  angleDiff,
  nearestSpokePoint,
  ringMid,
  segCenter,
  surfaceAt,
  wrap,
  type Point,
  type Ring,
  type SegState,
} from './arena'
import {
  activateHunter,
  coreHunterCaught,
  createCoreHunter,
  rimSpawn,
  stunCoreHunter,
  updateCoreHunter,
  type CoreHunter,
  type HunterWorld,
} from './hunters'

export { CORE }
export { ringMid, segCenter, surfaceAt } from './arena'
export type { Ring, Segment, SegState, Surface } from './arena'

export interface Terminal {
  ring: number
  seg: number
  trial: TrialKind
  done: boolean
}

export interface CoreSession {
  kind: 'core'
  night: number
  player: PlayerState
  rings: Ring[]
  terminals: Terminal[]
  hunters: CoreHunter[]
  time: number
  status: NightStatus
  failReason: FailReason | null
  activated: number
  repair: RepairState | null
  /** Terminal the player can use right now. */
  near: number | null
  purge: number
  purgeWarned: number
  dropTimer: number
  /** Seconds since the player fell, or -1. */
  fall: number
  /** Seconds since the last switch was thrown, or -1. The ending plays while >= 0. */
  ending: number
  secondWind: boolean
  perks: SessionPerks
  notice: Notice | null
  noticeTimer: number
  subtitles: SubtitleState
  /** Loud event heard by hunters this frame. */
  noise: HunterWorld['noise']
  spotted: number
  path: [number, number][]
  pathTimer: number
  reported: boolean
  rng: () => number
}

export interface CoreOptions {
  night?: number
  secondWind?: boolean
  perks?: Partial<SessionPerks>
  rng?: () => number
}

let noticeId = 0

export function terminalPos(s: CoreSession, id: number): Point {
  const t = s.terminals[id]
  const a = s.rings[t.ring].angle + segCenter(t.seg)
  const r = ringMid(t.ring)
  return { x: r * Math.cos(a), z: r * Math.sin(a) }
}

function notify(s: CoreSession, text: string) {
  s.notice = { text, id: ++noticeId }
  s.noticeTimer = 2.6
}

export function createCoreSession(opts: CoreOptions = {}): CoreSession {
  const rng = opts.rng ?? Math.random
  clearActions()
  const trials = assignTrials(CORE.terminals.length, rng)
  const { r, angle } = CORE.spawn
  const player = createPlayer({ x: r * Math.cos(angle), z: r * Math.sin(angle) })
  player.facing = Math.atan2(-player.x, -player.z)
  const s: CoreSession = {
    kind: 'core',
    night: opts.night ?? PROGRESSION.nightsPerSector,
    player,
    rings: CORE.rings.map((_, i) => ({
      angle: i * 0.4,
      segs: Array.from({ length: CORE.segments }, () => ({ state: 'up' as SegState, t: 0, returned: false })),
    })),
    terminals: CORE.terminals.map((t, i) => ({ ...t, trial: trials[i], done: false })),
    hunters: [
      createCoreHunter(0, rimSpawn(player, rng), true),
      createCoreHunter(1, { x: 0, z: 0 }, false),
    ],
    time: 0,
    status: 'playing',
    failReason: null,
    activated: 0,
    repair: null,
    near: null,
    purge: CORE.purge,
    purgeWarned: 0,
    dropTimer: CORE.dropInterval,
    fall: -1,
    ending: -1,
    secondWind: opts.secondWind ?? false,
    perks: { softStep: false, quickHands: false, steady: false, awareness: false, ...opts.perks, ghost: false },
    notice: null,
    noticeTimer: 0,
    subtitles: createSubtitles(),
    noise: null,
    spotted: 0,
    path: [[player.x, player.z]],
    pathTimer: 0,
    reported: false,
    rng,
  }
  notify(s, 'THE CORE // KILL ALL 4 SWITCHES')
  say(s, 'coreStart', {}, rng)
  return s
}

function blockedByTerminal(s: CoreSession, x: number, z: number) {
  const min = CORE.terminalRadius + PLAYER.radius
  for (let i = 0; i < s.terminals.length; i++) {
    const t = terminalPos(s, i)
    if (Math.hypot(x - t.x, z - t.z) < min) return true
  }
  return false
}

const canStand = (s: CoreSession, x: number, z: number) => surfaceAt(s, x, z) !== null && !blockedByTerminal(s, x, z)

const INV_SQRT2 = Math.SQRT1_2
const RIGHT = { x: INV_SQRT2, z: -INV_SQRT2 }
const UP = { x: -INV_SQRT2, z: -INV_SQRT2 }

function lerpAngle(a: number, b: number, t: number) {
  return a + angleDiff(b, a) * t
}

function movePlayer(s: CoreSession, dt: number) {
  const p = s.player
  const move = s.repair ? { x: 0, y: 0, run: false } : readInput()
  let mag = Math.min(1, Math.hypot(move.x, move.y))
  if (mag < PLAYER.joystickDeadzone) mag = 0
  const len = Math.hypot(move.x, move.y) || 1
  const dirX = mag ? (move.x * RIGHT.x + move.y * UP.x) / len : 0
  const dirZ = mag ? (move.x * RIGHT.z + move.y * UP.z) / len : 0
  p.running = move.run && mag > 0.2
  p.crouching = false
  const target = p.running ? PLAYER.runSpeed : PLAYER.walkSpeed * mag
  const k = 1 - Math.exp(-PLAYER.acceleration * dt)
  p.vx += (dirX * target - p.vx) * k
  p.vz += (dirZ * target - p.vz) * k

  const px = p.x
  const pz = p.z
  const nx = p.x + p.vx * dt
  const nz = p.z + p.vz * dt
  // Walkable edges act as walls; the only way off a platform is a segment dropping under you.
  if (canStand(s, nx, nz)) {
    p.x = nx
    p.z = nz
  } else if (canStand(s, nx, p.z)) {
    p.x = nx
    p.vz = 0
  } else if (canStand(s, p.x, nz)) {
    p.z = nz
    p.vx = 0
  } else {
    p.vx = 0
    p.vz = 0
  }
  const moved = Math.hypot(p.x - px, p.z - pz)
  p.speed = dt > 0 ? moved / dt : 0
  p.walkPhase += moved * PLAYER.stepRate
  if (mag > 0) p.facing = lerpAngle(p.facing, Math.atan2(dirX, dirZ), 1 - Math.exp(-PLAYER.turnSpeed * dt))
}

/** Ring speed multiplier: faster per switch, spinning down to a stop during the ending. */
function ringScale(s: CoreSession) {
  const scale = 1 + CORE.speedPerSwitch * s.activated
  return s.ending >= 0 ? scale * Math.max(0, 1 - s.ending / CORE.spinDown) : scale
}

/** Rotate rings and carry anything standing on them. */
function rotateRings(s: CoreSession, dt: number) {
  const bodies: Point[] = [s.player, ...s.hunters.filter((h) => h.active)]
  const under = bodies.map((b) => surfaceAt(s, b.x, b.z))
  const scale = ringScale(s)
  s.rings.forEach((ring, i) => {
    const w = CORE.rings[i].speed * scale
    ring.angle = wrap(ring.angle + w * dt)
    const c = Math.cos(w * dt)
    const sn = Math.sin(w * dt)
    bodies.forEach((b, k) => {
      const u = under[k]
      if (u?.kind !== 'ring' || u.ring !== i) return
      const x = b.x * c - b.z * sn
      b.z = b.x * sn + b.z * c
      b.x = x
    })
  })
}

function protectedSeg(s: CoreSession, ring: number, seg: number) {
  if (s.terminals.some((t) => t.ring === ring && t.seg === seg)) return true
  if (s.repair) {
    const under = surfaceAt(s, s.player.x, s.player.z)
    if (under?.kind === 'ring' && under.ring === ring && under.seg === seg) return true
  }
  return false
}

function updateDrops(s: CoreSession, dt: number) {
  let dropped = 0
  for (const ring of s.rings) {
    for (const seg of ring.segs) {
      seg.t += dt
      if (seg.state === 'warn' && seg.t >= CORE.warnTime) {
        seg.state = 'down'
        seg.t = 0
      } else if (seg.state === 'down' && seg.t >= CORE.downTime) {
        seg.state = 'up'
        seg.t = 0
        seg.returned = true
      }
      if (seg.state !== 'up') dropped++
    }
  }
  s.dropTimer -= dt
  if (s.dropTimer > 0) return
  s.dropTimer = Math.max(CORE.dropIntervalMin, CORE.dropInterval - CORE.dropIntervalPerSwitch * s.activated)
  if (dropped >= CORE.maxDropped) return
  const choices: [number, number][] = []
  s.rings.forEach((ring, i) =>
    ring.segs.forEach((seg, j) => {
      if (seg.state === 'up' && !protectedSeg(s, i, j)) choices.push([i, j])
    }),
  )
  if (!choices.length) return
  // Bias toward the ring the player is on so drops stay a threat.
  const under = surfaceAt(s, s.player.x, s.player.z)
  const onRing = under?.kind === 'ring' ? choices.filter(([i]) => i === under.ring) : []
  const pool = onRing.length && s.rng() < 0.6 ? onRing : choices
  const [i, j] = pool[Math.floor(s.rng() * pool.length)]
  const seg = s.rings[i].segs[j]
  seg.state = 'warn'
  seg.t = 0
  seg.returned = false
}

function checkFall(s: CoreSession) {
  const p = s.player
  if (surfaceAt(s, p.x, p.z)) return
  s.repair = null
  if (s.secondWind) {
    s.secondWind = false
    const safe = nearestSpokePoint(p.x, p.z)
    p.x = safe.x
    p.z = safe.z
    p.vx = 0
    p.vz = 0
    notify(s, 'SECOND WIND // CAUGHT THE EDGE')
    say(s, 'secondWind', {}, s.rng)
    return
  }
  s.status = 'failed'
  s.failReason = 'fell'
  s.fall = 0
}

function beginEnding(s: CoreSession) {
  s.ending = 0
  s.repair = null
  for (const ring of s.rings) {
    for (const seg of ring.segs) {
      if (seg.state === 'up') continue
      seg.state = 'up'
      seg.t = 0
      seg.returned = true
    }
  }
  for (const h of s.hunters) if (h.active) stunCoreHunter(h, Infinity)
  notify(s, 'CORE OFFLINE // SHUTDOWN CONFIRMED')
  s.subtitles.queue.length = 0
  say(s, 'coreSwitch4', {}, s.rng)
  say(s, 'coreShutdown', {}, s.rng)
}

function resolveRepair(s: CoreSession) {
  const result = actions.repairResult
  if (!s.repair || !result) return
  const id = s.repair.generatorId
  s.repair = null
  if (result === 'success') {
    s.terminals[id].done = true
    s.activated++
    if (s.activated >= s.terminals.length) {
      beginEnding(s)
      return
    }
    notify(s, `KILL SWITCH ${s.activated}/${s.terminals.length} // RINGS ACCELERATING`)
    say(s, s.activated === 1 ? 'coreSwitch1' : s.activated === 2 ? 'coreSwitch2' : 'coreSwitch3', {}, s.rng)
  } else if (result === 'fail') {
    s.purge = Math.max(0, s.purge - CORE.failPenalty)
    s.noise = { x: s.player.x, z: s.player.z, radius: NOISE.repairFail }
    notify(s, `SWITCH REJECTED // PURGE -${CORE.failPenalty}s`)
    say(s, 'coreReject', {}, s.rng)
  }
}

function findNear(s: CoreSession): number | null {
  if (s.repair) return null
  let best: number | null = null
  let bestD: number = CORE.useDistance
  s.terminals.forEach((t, i) => {
    if (t.done) return
    const pos = terminalPos(s, i)
    const d = Math.hypot(s.player.x - pos.x, s.player.z - pos.z)
    if (d < bestD) {
      bestD = d
      best = i
    }
  })
  return best
}

function startUse(s: CoreSession) {
  if (s.near === null) return
  const id = s.near
  const pos = terminalPos(s, id)
  s.repair = {
    generatorId: id,
    trial: s.terminals[id].trial,
    night: PROGRESSION.nightsPerSector,
    quick: s.perks.quickHands,
    steady: s.perks.steady,
  }
  s.player.facing = Math.atan2(pos.x - s.player.x, pos.z - s.player.z)
  s.player.vx = 0
  s.player.vz = 0
  s.near = null
}

function updateHunters(s: CoreSession, dt: number) {
  const second = s.hunters[1]
  if (!second.active && second.fall < 0 && (s.activated >= 1 || s.time >= CORE_HUNTER.secondDelay)) {
    activateHunter(second, rimSpawn(s.player, s.rng))
    notify(s, 'SECOND UNIT DEPLOYED')
    say(s, 'coreSecondUnit', {}, s.rng)
  }

  const p = s.player
  if (!s.noise && p.running && p.speed > 0.5) {
    const radius = s.perks.softStep ? NOISE.run * NOISE.softStepMultiplier : NOISE.run
    s.noise = { x: p.x, z: p.z, radius }
  }
  const world: HunterWorld = { rings: s.rings, player: p, noise: s.noise, hidden: false, rng: s.rng }
  const scale = 1 + CORE_HUNTER.speedPerSwitch * s.activated

  for (const h of s.hunters) {
    if (!h.active) {
      if (h.fall >= 0) {
        h.fall += dt
        if ((h.respawn -= dt) <= 0) activateHunter(h, rimSpawn(p, s.rng))
      }
      continue
    }
    if (updateCoreHunter(h, world, dt, scale)) {
      s.spotted++
      say(s, 'spotted', {}, s.rng)
    }
    if (!surfaceAt(s, h.x, h.z)) {
      h.active = false
      h.fall = 0
      h.respawn = CORE_HUNTER.respawnTime
      h.speed = 0
      notify(s, `UNIT ${String(h.id + 1).padStart(2, '0')} LOST`)
      say(s, 'coreUnitLost', {}, s.rng)
      continue
    }
    if (coreHunterCaught(h, p)) {
      s.repair = null
      if (s.secondWind) {
        s.secondWind = false
        stunCoreHunter(h, CORE_HUNTER.secondWindStun)
        notify(s, 'SECOND WIND // BROKE FREE')
        say(s, 'secondWind', {}, s.rng)
      } else {
        s.status = 'failed'
        s.failReason = 'caught'
        return
      }
    }
  }
}

function updatePurge(s: CoreSession, dt: number) {
  s.purge = Math.max(0, s.purge - dt)
  const next = CORE.purgeWarnings[s.purgeWarned]
  if (next !== undefined && s.purge <= next) {
    s.purgeWarned++
    say(s, next === 60 ? 'corePurge60' : 'corePurge30', {}, s.rng)
  }
  if (s.purge <= 0) {
    s.status = 'failed'
    s.failReason = 'lockdown'
    s.repair = null
  }
}

function samplePath(s: CoreSession, dt: number) {
  if ((s.pathTimer -= dt) > 0 || s.path.length >= PROGRESSION.pathMaxPoints) return
  s.pathTimer = CORE.pathSampleInterval
  s.path.push([s.player.x, s.player.z])
}

const MAX_DT = 1 / 30

export function stepCoreSession(s: CoreSession, rawDt: number) {
  const dt = Math.min(rawDt, MAX_DT)
  if (s.noticeTimer > 0 && (s.noticeTimer -= dt) <= 0) s.notice = null
  updateSubtitles(s.subtitles, dt)
  if (s.status !== 'playing') {
    s.player.speed = 0
    if (s.fall >= 0) s.fall += dt
    for (const h of s.hunters) if (h.fall >= 0) h.fall += dt
    clearActions()
    return
  }
  s.time += dt

  if (s.ending >= 0) {
    s.ending += dt
    movePlayer(s, dt)
    rotateRings(s, dt)
    samplePath(s, dt)
    if (s.ending >= CORE.endingTime) s.status = 'escaped'
    return clearActions()
  }

  s.noise = null
  resolveRepair(s)
  if (s.ending >= 0) return clearActions()

  if (actions.use && !s.repair) startUse(s)
  movePlayer(s, dt)
  rotateRings(s, dt)
  updateDrops(s, dt)
  checkFall(s)
  if (s.status === 'playing') updateHunters(s, dt)
  s.near = findNear(s)
  samplePath(s, dt)
  if (s.status === 'playing') updatePurge(s, dt)
  clearActions()
}

/** Closest active hunter to the player (HUD dev line, proximity). */
function closestHunter(s: CoreSession) {
  let best: CoreHunter | null = null
  let bestD = Infinity
  for (const h of s.hunters) {
    if (!h.active) continue
    const d = Math.hypot(h.x - s.player.x, h.z - s.player.z)
    if (d < bestD) {
      bestD = d
      best = h
    }
  }
  return best
}

export function mirrorCore(s: CoreSession): NightMirror {
  return {
    nightStatus: s.status,
    failReason: s.failReason,
    hunterMode: closestHunter(s)?.mode ?? 'patrol',
    repaired: s.activated,
    totalGenerators: s.terminals.length,
    context: s.near !== null ? 'repair' : null,
    hackTarget: null,
    hackCharges: 0,
    hackFree: false,
    decoys: null,
    ghost: false,
    repair: s.repair,
    gatesPowered: false,
    finalChase: 0,
    gateProgress: null,
    notice: s.notice,
    secondWindReady: s.secondWind,
    canHide: false,
    hidden: false,
    lockerCheck: false,
    micActive: false,
    subtitle: s.subtitles.current,
    purge: Math.ceil(s.purge),
    purgeMax: CORE.purge,
  }
}

export function computeCoreResult(s: CoreSession): NightResult {
  const outcome: NightOutcome = s.status === 'escaped' ? 'escaped' : (s.failReason ?? 'lockdown')
  const breakdown = computeScrap(outcome, s.activated, s.spotted, 0, true)
  return {
    sector: 'core',
    night: s.night,
    modifier: 'none',
    outcome,
    generators: s.activated,
    totalGenerators: s.terminals.length,
    spotted: s.spotted,
    breathHeld: 0,
    scrap: breakdown.reduce((sum, l) => sum + l.amount, 0),
    breakdown,
    path: [...s.path, [s.player.x, s.player.z]],
    rows: [],
    daily: null,
    sectorCleared: false,
  }
}
