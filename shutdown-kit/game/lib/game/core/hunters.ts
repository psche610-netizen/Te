import { CORE, CORE_HUNTER, HUNTER } from '../config'
import type { HunterMode } from '../hunter'
import {
  angleDiff,
  bandOf,
  bandRadius,
  clearOfPillar,
  surfaceAt,
  type Arena,
  type Band,
  type Point,
} from './arena'

/**
 * Core hunters. Grid A* doesn't apply to rotating rings, so they navigate in polar terms:
 * follow the current band (rim or ring) along its arc, cross between bands on a spoke.
 */
export interface CoreHunter {
  id: number
  x: number
  z: number
  facing: number
  headYaw: number
  speed: number
  walkPhase: number
  mode: HunterMode
  modeTime: number
  active: boolean
  /** Seconds since it fell with a dropped segment, or -1. */
  fall: number
  /** Seconds until a fallen hunter is replaced. */
  respawn: number
  stunTime: number
  target: Point | null
  focus: Point
  /** Seconds since the player was last seen (CHASE). */
  quiet: number
  canSee: boolean
  /** Preferred arc direction while blocked: +1 counter-clockwise, -1 clockwise. */
  dir: 1 | -1
  blocked: number
  retarget: number
}

export interface HunterWorld extends Arena {
  player: Point & { running: boolean }
  /** Loud event this frame (failed switch, running), or null. */
  noise: (Point & { radius: number }) | null
  hidden: boolean
  rng: () => number
}

const HALF_FOV = ((HUNTER.visionAngleDeg / 2) * Math.PI) / 180

export function createCoreHunter(id: number, at: Point, active: boolean): CoreHunter {
  return {
    id,
    x: at.x,
    z: at.z,
    facing: Math.atan2(-at.x, -at.z),
    headYaw: 0,
    speed: 0,
    walkPhase: 0,
    mode: 'patrol',
    modeTime: 0,
    active,
    fall: -1,
    respawn: 0,
    stunTime: 0,
    target: null,
    focus: { ...at },
    quiet: 0,
    canSee: false,
    dir: 1,
    blocked: 0,
    retarget: 0,
  }
}

/** A rim point well away from the player. */
export function rimSpawn(player: Point, rng: () => number): Point {
  const pa = Math.atan2(player.z, player.x)
  const spread = Math.PI - CORE_HUNTER.spawnMinAngle
  const a = pa + Math.PI + (rng() * 2 - 1) * spread
  const r = bandRadius('rim')
  return { x: r * Math.cos(a), z: r * Math.sin(a) }
}

export function activateHunter(h: CoreHunter, at: Point) {
  Object.assign(h, createCoreHunter(h.id, at, true))
}

export function stunCoreHunter(h: CoreHunter, seconds: number) {
  setMode(h, 'stunned')
  h.stunTime = seconds
  h.speed = 0
}

function setMode(h: CoreHunter, mode: HunterMode) {
  h.mode = mode
  h.modeTime = 0
  h.quiet = 0
  h.target = null
  h.retarget = 0
}

export function canSee(h: CoreHunter, w: HunterWorld) {
  if (w.hidden) return false
  const dx = w.player.x - h.x
  const dz = w.player.z - h.z
  const dist = Math.hypot(dx, dz)
  if (dist > HUNTER.visionRange) return false
  const look = h.facing + h.headYaw
  if (dist > 0.5 && Math.abs(angleDiff(Math.atan2(dx, dz), look)) > HALF_FOV) return false
  return clearOfPillar(h.x, h.z, w.player.x, w.player.z)
}

function heard(h: CoreHunter, w: HunterWorld) {
  const n = w.noise
  return n && Math.hypot(n.x - h.x, n.z - h.z) <= n.radius ? n : null
}

function bestSpoke(ha: number, hr: number, ta: number, tr: number) {
  let best: number = CORE.spokeAngles[0]
  let bestCost = Infinity
  for (const sa of CORE.spokeAngles) {
    const cost = Math.abs(angleDiff(ha, sa)) * hr + Math.abs(angleDiff(ta, sa)) * tr
    if (cost < bestCost) {
      bestCost = cost
      best = sa
    }
  }
  return best
}

function arcPoint(h: CoreHunter, ha: number, ta: number, r: number): Point {
  const d = angleDiff(ta, ha)
  const sign = h.blocked > 0 ? h.dir : d >= 0 ? 1 : -1
  const step = Math.min(h.blocked > 0 ? Infinity : Math.abs(d), CORE_HUNTER.arcLookAhead / r)
  const a = ha + sign * step
  return { x: r * Math.cos(a), z: r * Math.sin(a) }
}

/** Spoke angle the hunter is lined up with (on the spoke itself, a ring over it, or the rim where it meets). */
function alignedSpoke(r: number, a: number): number | null {
  if (r < CORE.pillarRadius || r > CORE.rim.outer) return null
  for (const sa of CORE.spokeAngles) {
    const d = angleDiff(a, sa)
    if (Math.abs(d) < Math.PI / 2 && Math.abs(r * Math.sin(d)) <= CORE.spokeHalfWidth - 0.25) return sa
  }
  return null
}

/** Next waypoint toward `t`: arc along the band, or radially along a spoke to change bands. */
export function navPoint(h: CoreHunter, t: Point): Point {
  const hr = Math.hypot(h.x, h.z)
  const tr = Math.hypot(t.x, t.z)
  const ha = Math.atan2(h.z, h.x)
  const ta = Math.atan2(t.z, t.x)
  const hb = bandOf(hr)
  const tb = bandOf(tr)
  const direct = Math.hypot(t.x - h.x, t.z - h.z)
  const sameBand = hb !== null && hb === tb
  if (h.blocked <= 0 && (direct < 2.2 || (sameBand && Math.abs(angleDiff(ta, ha)) * hr < 2.5))) return t
  if (sameBand) return arcPoint(h, ha, ta, bandRadius(hb as Exclude<Band, null>))

  const onSpoke = alignedSpoke(hr, ha)
  if (onSpoke !== null) {
    const goalR = tb === null ? tr : bandRadius(tb)
    const dr = goalR - hr
    const nr = hr + Math.sign(dr) * Math.min(Math.abs(dr), CORE_HUNTER.arcLookAhead)
    return { x: nr * Math.cos(onSpoke), z: nr * Math.sin(onSpoke) }
  }
  const spoke = bestSpoke(ha, hr, ta, tr)
  if (hb === null) return { x: hr * Math.cos(spoke), z: hr * Math.sin(spoke) }
  return arcPoint(h, ha, spoke, bandRadius(hb))
}

const standable = (w: Arena, x: number, z: number) => surfaceAt(w, x, z) !== null

/** Step toward `t` along the band graph. Returns true on arrival. */
function moveToward(h: CoreHunter, w: HunterWorld, t: Point, speed: number, dt: number) {
  if (h.blocked > 0) h.blocked -= dt
  const wp = navPoint(h, t)
  const dx = wp.x - h.x
  const dz = wp.z - h.z
  const dist = Math.hypot(dx, dz)
  const px = h.x
  const pz = h.z
  if (dist > 1e-4) {
    const want = Math.atan2(dx, dz)
    h.facing += angleDiff(want, h.facing) * (1 - Math.exp(-HUNTER.turnSpeed * dt))
    const step = Math.min(dist, speed * dt)
    const nx = h.x + (dx / dist) * step
    const nz = h.z + (dz / dist) * step
    if (standable(w, nx, nz)) {
      h.x = nx
      h.z = nz
    } else if (standable(w, nx, h.z)) {
      h.x = nx
    } else if (standable(w, h.x, nz)) {
      h.z = nz
    } else if (h.blocked <= 0) {
      // A dropped segment ahead: go the other way round for a while.
      const d = angleDiff(Math.atan2(t.z, t.x), Math.atan2(h.z, h.x))
      h.dir = d >= 0 ? -1 : 1
      h.blocked = CORE_HUNTER.blockedTime
    }
  }
  const moved = Math.hypot(h.x - px, h.z - pz)
  h.speed = dt > 0 ? moved / dt : 0
  h.walkPhase += moved * HUNTER.stepRate
  return Math.hypot(t.x - h.x, t.z - h.z) < CORE_HUNTER.arriveDistance
}

function randomBandPoint(w: HunterWorld, around: number | null, spread: number): Point {
  const bands: Exclude<Band, null>[] = ['rim', 0, 1, 2]
  const band = bands[Math.floor(w.rng() * bands.length)]
  const a = around === null ? w.rng() * Math.PI * 2 : around + (w.rng() * 2 - 1) * spread
  const r = bandRadius(band)
  return { x: r * Math.cos(a), z: r * Math.sin(a) }
}

function searchPoint(h: CoreHunter, w: HunterWorld): Point {
  for (let i = 0; i < 8; i++) {
    const a = w.rng() * Math.PI * 2
    const d = w.rng() * CORE_HUNTER.searchRadius
    const p = { x: h.focus.x + Math.cos(a) * d, z: h.focus.z + Math.sin(a) * d }
    if (standable(w, p.x, p.z)) return p
  }
  return { ...h.focus }
}

function scan(h: CoreHunter, dt: number, active: boolean) {
  const target = active ? Math.sin(h.modeTime * HUNTER.headScanSpeed) * HUNTER.headScanAmount : 0
  h.headYaw += (target - h.headYaw) * (1 - Math.exp(-6 * dt))
}

/** Returns true when this hunter just started a chase. */
export function updateCoreHunter(h: CoreHunter, w: HunterWorld, dt: number, speedScale: number) {
  if (!h.active) {
    h.speed = 0
    if (h.fall >= 0) h.fall += dt
    return false
  }
  h.modeTime += dt
  if (h.mode === 'stunned') {
    h.speed = 0
    h.canSee = false
    if ((h.stunTime -= dt) <= 0) {
      h.focus = { x: h.x, z: h.z }
      setMode(h, 'search')
    }
    return false
  }

  const seen = canSee(h, w)
  const noise = heard(h, w)
  h.canSee = seen
  const player = { x: w.player.x, z: w.player.z }
  const startChase = () => {
    h.focus = player
    setMode(h, 'chase')
    return true
  }

  switch (h.mode) {
    case 'patrol': {
      if (seen) return startChase()
      if (noise) {
        h.focus = { x: noise.x, z: noise.z }
        setMode(h, 'investigate')
        break
      }
      scan(h, dt, true)
      h.retarget -= dt
      if (!h.target || h.retarget <= 0) {
        const bias = w.rng() < CORE_HUNTER.patrolPlayerBias ? Math.atan2(player.z, player.x) : null
        h.target = randomBandPoint(w, bias, Math.PI / 2)
        h.retarget = CORE_HUNTER.patrolRetarget
      }
      if (moveToward(h, w, h.target, CORE_HUNTER.patrolSpeed * speedScale, dt)) h.target = null
      break
    }
    case 'suspicious':
    case 'investigate': {
      if (seen) return startChase()
      if (noise) h.focus = { x: noise.x, z: noise.z }
      scan(h, dt, false)
      if (moveToward(h, w, h.focus, CORE_HUNTER.investigateSpeed * speedScale, dt) || h.modeTime > CORE_HUNTER.investigateTimeout) {
        setMode(h, 'search')
      }
      break
    }
    case 'chase': {
      scan(h, dt, false)
      if (seen) {
        h.focus = player
        h.quiet = 0
      } else {
        h.quiet += dt
        if (noise) h.focus = { x: noise.x, z: noise.z }
      }
      const arrived = moveToward(h, w, h.focus, CORE_HUNTER.chaseSpeed * speedScale, dt)
      if (!seen && (arrived || h.quiet > HUNTER.loseSightTime)) setMode(h, 'search')
      break
    }
    case 'search': {
      if (seen) return startChase()
      if (noise) {
        h.focus = { x: noise.x, z: noise.z }
        setMode(h, 'investigate')
        break
      }
      scan(h, dt, true)
      if (h.modeTime > HUNTER.searchTime) {
        setMode(h, 'patrol')
        break
      }
      if (!h.target) h.target = searchPoint(h, w)
      if (moveToward(h, w, h.target, CORE_HUNTER.patrolSpeed * speedScale, dt)) h.target = null
      break
    }
  }
  return false
}

export function coreHunterCaught(h: CoreHunter, player: Point) {
  return h.active && h.mode === 'chase' && Math.hypot(player.x - h.x, player.z - h.z) < HUNTER.catchDistance
}
