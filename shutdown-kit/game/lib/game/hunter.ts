import { DIRECTOR, HUNTER, HUNTER_PROFILES, NOISE } from './config'
import { collidersNear, resolveCircle, worldToCell } from './level/collision'
import { findPath, isWalkable, type Cell } from './level/pathfinding'
import { corridorClear, segmentClear } from './level/raycast'
import type { AABB, LevelData } from './level/types'
import type { NoiseBus, NoiseEvent } from './noise'

export type HunterKind = keyof typeof HUNTER_PROFILES

export interface HunterProfile {
  kind: HunterKind
  patrolSpeed: number
  investigateSpeed: number
  chaseSpeed: number
  visionRange: number
  /** Half the vision cone, radians. */
  halfFov: number
  hearing: number
  stepRate: number
}

export function hunterProfile(kind: HunterKind = 'warden'): HunterProfile {
  const p = HUNTER_PROFILES[kind]
  return { kind, ...p, halfFov: ((p.visionAngleDeg / 2) * Math.PI) / 180 }
}

export type HunterMode = 'patrol' | 'suspicious' | 'investigate' | 'chase' | 'search' | 'stunned'

interface Point {
  x: number
  z: number
}

export interface HunterState {
  profile: HunterProfile
  x: number
  z: number
  facing: number
  /** Head yaw relative to the body. The vision cone follows the head. */
  headYaw: number
  speed: number
  walkPhase: number
  mode: HunterMode
  modeTime: number
  path: Point[]
  pathIndex: number
  repathTimer: number
  pauseTimer: number
  /** 0..1 build-up while SUSPICIOUS. */
  alert: number
  /** Point of interest: last seen / heard position. */
  focus: Point
  /** Seconds since the last stimulus (sight or sound). */
  quietTime: number
  searchCenter: Point
  lastHeardId: number
  canSee: boolean
  stuckTimer: number
  stuckRef: Point
  stunTime: number
  /** OVERSEER director: patrol near this point while `patrolBiasTime` > 0. */
  patrolBias: Point | null
  patrolBiasTime: number
}

export interface HunterContext {
  level: LevelData
  player: Point
  noise: NoiseBus
  /** Player is inside a locker: cannot be seen or caught. */
  hidden?: boolean
}

const nearby: AABB[] = []

const cellOf = (level: LevelData, x: number, z: number): Cell => ({
  cx: worldToCell(level, x),
  cz: worldToCell(level, z),
})
const center = (level: LevelData, c: Cell): Point => ({ x: c.cx * level.cellSize, z: c.cz * level.cellSize })

function wrapAngle(a: number) {
  while (a > Math.PI) a -= Math.PI * 2
  while (a < -Math.PI) a += Math.PI * 2
  return a
}

export function createHunter(level: LevelData, avoid: Point, profile: HunterProfile = hunterProfile()): HunterState {
  let best: Point = { x: avoid.x, z: avoid.z }
  let bestD = -1
  const from = cellOf(level, avoid.x, avoid.z)
  for (const c of level.floorCells) {
    if (!isWalkable(level, c.cx, c.cz)) continue
    const d = Math.hypot(c.cx - from.cx, c.cz - from.cz)
    if (d > bestD) {
      bestD = d
      best = center(level, c)
    }
  }
  return {
    profile,
    x: best.x,
    z: best.z,
    facing: Math.atan2(avoid.x - best.x, avoid.z - best.z),
    headYaw: 0,
    speed: 0,
    walkPhase: 0,
    mode: 'patrol',
    modeTime: 0,
    path: [],
    pathIndex: 0,
    repathTimer: 0,
    pauseTimer: HUNTER.patrolPause,
    alert: 0,
    focus: { ...best },
    quietTime: 0,
    searchCenter: { ...best },
    lastHeardId: 0,
    canSee: false,
    stuckTimer: 0,
    stuckRef: { ...best },
    stunTime: 0,
    patrolBias: null,
    patrolBiasTime: 0,
  }
}

/** Director: patrol around `point` for `seconds`. */
export function biasPatrol(h: HunterState, point: Point, seconds: number) {
  h.patrolBias = { x: point.x, z: point.z }
  h.patrolBiasTime = seconds
}

/** Freeze the hunter, then it searches where it stands. */
export function stunHunter(h: HunterState, seconds: number) {
  setMode(h, 'stunned')
  h.stunTime = seconds
  h.speed = 0
}

/** External tip-off (camera, OVERSEER): go and look at `point`. */
export function alertHunter(h: HunterState, point: Point) {
  if (h.mode === 'stunned') return
  h.focus = { x: point.x, z: point.z }
  if (h.mode === 'chase') {
    h.path = []
    return
  }
  setMode(h, 'investigate')
}

/** World-space direction the hunter is looking. */
export function viewAngle(h: HunterState) {
  return h.facing + h.headYaw
}

function canSeePlayer(h: HunterState, ctx: HunterContext) {
  if (ctx.hidden) return false
  const dx = ctx.player.x - h.x
  const dz = ctx.player.z - h.z
  const dist = Math.hypot(dx, dz)
  if (dist > h.profile.visionRange) return false
  if (dist > 0.5 && Math.abs(wrapAngle(Math.atan2(dx, dz) - viewAngle(h))) > h.profile.halfFov) return false
  return segmentClear(ctx.level, h.x, h.z, ctx.player.x, ctx.player.z)
}

/** Newest unheard noise event that reaches the hunter. */
function listen(h: HunterState, bus: NoiseBus): NoiseEvent | null {
  let heard: NoiseEvent | null = null
  let maxId = h.lastHeardId
  for (const e of bus.events) {
    if (e.id <= h.lastHeardId) continue
    if (e.id > maxId) maxId = e.id
    if (Math.hypot(e.x - h.x, e.z - h.z) <= e.radius * h.profile.hearing) heard = e
  }
  h.lastHeardId = maxId
  return heard
}

function setMode(h: HunterState, mode: HunterMode) {
  h.mode = mode
  h.modeTime = 0
  h.quietTime = 0
  h.path = []
  h.pathIndex = 0
  h.repathTimer = 0
  h.pauseTimer = 0
  if (mode !== 'suspicious') h.alert = mode === 'chase' ? 1 : 0
}

/** Plan a path to a world point. The final waypoint is the exact point. */
function goTo(h: HunterState, level: LevelData, target: Point) {
  const cells = findPath(level, cellOf(level, h.x, h.z), cellOf(level, target.x, target.z))
  h.pathIndex = 0
  if (!cells) {
    h.path = []
    return false
  }
  h.path = cells.map((c) => center(level, c))
  if (h.path.length) h.path[h.path.length - 1] = { x: target.x, z: target.z }
  else h.path.push({ x: target.x, z: target.z })
  return true
}

function randomReachable(level: LevelData, h: HunterState, around: Point | null, minD: number, maxD: number) {
  const origin = around ?? h
  for (let tries = 0; tries < 14; tries++) {
    const c = level.floorCells[Math.floor(Math.random() * level.floorCells.length)]
    if (!isWalkable(level, c.cx, c.cz)) continue
    const p = center(level, c)
    const d = Math.hypot(p.x - origin.x, p.z - origin.z)
    if (d < minD || d > maxD) continue
    if (findPath(level, cellOf(level, h.x, h.z), c)) return p
  }
  return null
}

function turnToward(h: HunterState, angle: number, dt: number) {
  h.facing = wrapAngle(h.facing + wrapAngle(angle - h.facing) * (1 - Math.exp(-HUNTER.turnSpeed * dt)))
}

function scanHead(h: HunterState, dt: number, active: boolean) {
  const target = active ? Math.sin(h.modeTime * HUNTER.headScanSpeed) * HUNTER.headScanAmount : 0
  h.headYaw += (target - h.headYaw) * (1 - Math.exp(-6 * dt))
}

/** Advance along the path. Returns true once the last waypoint is reached. */
function followPath(h: HunterState, level: LevelData, speed: number, dt: number) {
  if (h.pathIndex >= h.path.length) return true
  if (h.pathIndex + 1 < h.path.length) {
    const next = h.path[h.pathIndex + 1]
    if (corridorClear(level, h.x, h.z, next.x, next.z, HUNTER.radius)) h.pathIndex++
  }
  const wp = h.path[h.pathIndex]
  const dx = wp.x - h.x
  const dz = wp.z - h.z
  const dist = Math.hypot(dx, dz)
  if (dist < HUNTER.arriveDistance) {
    h.pathIndex++
    return h.pathIndex >= h.path.length
  }
  const want = Math.atan2(dx, dz)
  turnToward(h, want, dt)
  const align = Math.max(0.25, Math.cos(wrapAngle(want - h.facing)))
  const step = Math.min(dist, speed * align * dt)
  const nx = h.x + (dx / dist) * step
  const nz = h.z + (dz / dist) * step
  collidersNear(level, nx, nz, nearby)
  const res = resolveCircle(nx, nz, HUNTER.radius, nearby)
  h.x = res.x
  h.z = res.z
  return false
}

function move(h: HunterState, level: LevelData, speed: number, dt: number) {
  const px = h.x
  const pz = h.z
  const done = followPath(h, level, speed, dt)
  const moved = Math.hypot(h.x - px, h.z - pz)
  h.speed = dt > 0 ? moved / dt : 0
  h.walkPhase += moved * h.profile.stepRate

  h.stuckTimer += dt
  if (h.stuckTimer >= 1) {
    if (!done && h.path.length && Math.hypot(h.x - h.stuckRef.x, h.z - h.stuckRef.z) < 0.25) {
      h.path = []
      h.pathIndex = 0
      h.repathTimer = 0
    }
    h.stuckTimer = 0
    h.stuckRef = { x: h.x, z: h.z }
  }
  return done
}

function react(h: HunterState, e: NoiseEvent) {
  h.focus = { x: e.x, z: e.z }
  setMode(h, e.radius >= NOISE.loudRadius ? 'investigate' : 'suspicious')
}

export function updateHunter(h: HunterState, dt: number, ctx: HunterContext, speedMultiplier = 1) {
  const { level, player } = ctx
  h.modeTime += dt
  h.quietTime += dt
  if (h.patrolBias && (h.patrolBiasTime -= dt) <= 0) h.patrolBias = null
  if (h.mode === 'stunned') {
    h.speed = 0
    h.canSee = false
    h.lastHeardId = ctx.noise.nextId - 1
    h.stunTime -= dt
    if (h.stunTime <= 0) {
      h.searchCenter = { x: h.x, z: h.z }
      setMode(h, 'search')
    }
    return
  }
  const seen = canSeePlayer(h, ctx)
  const heard = listen(h, ctx.noise)
  const dist = Math.hypot(player.x - h.x, player.z - h.z)
  h.canSee = seen
  if (seen) h.quietTime = 0
  h.speed = 0

  switch (h.mode) {
    case 'patrol': {
      if (seen) {
        h.focus = { x: player.x, z: player.z }
        setMode(h, dist < HUNTER.instantChaseDistance ? 'chase' : 'suspicious')
        break
      }
      if (heard) {
        react(h, heard)
        break
      }
      if (h.pauseTimer > 0) {
        h.pauseTimer -= dt
        scanHead(h, dt, true)
        if (h.pauseTimer <= 0) {
          const biased = h.patrolBias && randomReachable(level, h, h.patrolBias, 0, DIRECTOR.biasRadius)
          const target = biased || randomReachable(level, h, null, 6, 24)
          if (target) goTo(h, level, target)
        }
        break
      }
      scanHead(h, dt, false)
      if (!h.path.length || move(h, level, h.profile.patrolSpeed * speedMultiplier, dt)) {
        h.pauseTimer = HUNTER.patrolPause
      }
      break
    }

    case 'suspicious': {
      scanHead(h, dt, false)
      if (seen) {
        h.focus = { x: player.x, z: player.z }
        const closeness = 1 + (1 - dist / h.profile.visionRange) * 2
        h.alert += (dt / HUNTER.suspiciousTime) * closeness
        if (h.alert >= 1 || dist < HUNTER.instantChaseDistance) {
          setMode(h, 'chase')
          break
        }
      } else {
        h.alert = Math.max(0, h.alert - dt * 0.3)
        if (heard) {
          h.focus = { x: heard.x, z: heard.z }
          h.quietTime = 0
          if (heard.radius >= NOISE.loudRadius) {
            setMode(h, 'investigate')
            break
          }
        }
        if (h.quietTime > HUNTER.suspiciousHold) {
          setMode(h, 'investigate')
          break
        }
      }
      turnToward(h, Math.atan2(h.focus.x - h.x, h.focus.z - h.z), dt)
      break
    }

    case 'investigate': {
      scanHead(h, dt, false)
      if (seen) {
        h.focus = { x: player.x, z: player.z }
        setMode(h, 'chase')
        break
      }
      if (heard) {
        h.focus = { x: heard.x, z: heard.z }
        h.path = []
      }
      if (!h.path.length && !goTo(h, level, h.focus)) {
        h.searchCenter = { x: h.x, z: h.z }
        setMode(h, 'search')
        break
      }
      if (move(h, level, h.profile.investigateSpeed * speedMultiplier, dt)) {
        h.searchCenter = { ...h.focus }
        setMode(h, 'search')
      }
      break
    }

    case 'chase': {
      h.headYaw += (0 - h.headYaw) * (1 - Math.exp(-10 * dt))
      if (seen) {
        h.focus = { x: player.x, z: player.z }
        if (corridorClear(level, h.x, h.z, player.x, player.z, HUNTER.radius)) {
          h.path = [{ x: player.x, z: player.z }]
          h.pathIndex = 0
        } else if ((h.repathTimer -= dt) <= 0) {
          goTo(h, level, h.focus)
          h.repathTimer = HUNTER.repathInterval
        }
      } else {
        if (heard) {
          h.focus = { x: heard.x, z: heard.z }
          h.path = []
        }
        if (!h.path.length || (h.repathTimer -= dt) <= 0) {
          goTo(h, level, h.focus)
          h.repathTimer = HUNTER.repathInterval * 4
        }
      }
      const arrived = move(h, level, h.profile.chaseSpeed * speedMultiplier, dt)
      if (!seen && (arrived || h.quietTime > HUNTER.loseSightTime)) {
        h.searchCenter = { ...h.focus }
        setMode(h, 'search')
      }
      break
    }

    case 'search': {
      if (seen) {
        h.focus = { x: player.x, z: player.z }
        setMode(h, 'chase')
        break
      }
      if (heard) {
        react(h, heard)
        break
      }
      if (h.modeTime > HUNTER.searchTime) {
        setMode(h, 'patrol')
        h.pauseTimer = HUNTER.patrolPause
        break
      }
      scanHead(h, dt, true)
      if (h.pauseTimer > 0) {
        h.pauseTimer -= dt
        break
      }
      if (!h.path.length || move(h, level, h.profile.patrolSpeed * speedMultiplier, dt)) {
        const r = HUNTER.searchRadiusCells * level.cellSize
        const target = randomReachable(level, h, h.searchCenter, 0, r)
        if (target) goTo(h, level, target)
        h.pauseTimer = 0.6
      }
      break
    }
  }
}

export function hunterCaught(h: HunterState, player: Point, hidden = false) {
  return !hidden && h.mode === 'chase' && Math.hypot(player.x - h.x, player.z - h.z) < HUNTER.catchDistance
}

/** A locker check begins: drop the current plan. */
export function beginLockerCheck(h: HunterState) {
  setMode(h, 'search')
}

/** Locker check in progress: walk to `stand`, then stare at `look`. Ignores sight and sound. */
export function holdHunter(h: HunterState, level: LevelData, noise: NoiseBus, stand: Point, look: Point, dt: number) {
  h.modeTime += dt
  h.canSee = false
  h.lastHeardId = noise.nextId - 1
  h.headYaw += (0 - h.headYaw) * (1 - Math.exp(-8 * dt))
  h.speed = 0
  if (Math.hypot(stand.x - h.x, stand.z - h.z) > HUNTER.arriveDistance) {
    if (h.pathIndex >= h.path.length) goTo(h, level, stand)
    if (h.pathIndex < h.path.length) {
      move(h, level, h.profile.patrolSpeed, dt)
      return
    }
  }
  turnToward(h, Math.atan2(look.x - h.x, look.z - h.z), dt)
}

/** Locker check survived: back to patrol. */
export function hunterGiveUp(h: HunterState) {
  setMode(h, 'patrol')
  h.pauseTimer = HUNTER.patrolPause
}
