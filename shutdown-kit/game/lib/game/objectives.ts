import { generatorAvailable } from './missions'
import { GATE, HACK, NOISE, OBJECTIVES, PERK_EFFECTS, REPAIR, SECURITY_CAMERA } from './config'
import { alertHunter } from './hunter'
import { segmentClear } from './level/raycast'
import type { LevelDef } from './level/types'
import { emitNoise } from './noise'
import { notify } from './notice'
import { numberWord } from './overseer/lines'
import { say } from './overseer/subtitles'
import type { GameSession, HackTarget, TrialKind } from './session'
import { bodyInBox, cancelPending, routeSafe } from './shift'

export { notify }

type Rng = () => number

function shuffle<T>(list: T[], rng: Rng) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[list[i], list[j]] = [list[j], list[i]]
  }
  return list
}

/** Per-night randomisation: keep N generator sites, pick a spawn away from them. */
export function setupNight(def: LevelDef, rng: Rng = Math.random, count: number = OBJECTIVES.generatorsPerNight): LevelDef {
  const grid = def.rows.map((r) => r.split(''))
  const at = (x: number, z: number) => grid[z]?.[x] ?? ' '
  const sites: [number, number][] = []
  let fallback: [number, number] | null = null
  grid.forEach((row, z) =>
    row.forEach((ch, x) => {
      if (ch === 'G') sites.push([x, z])
      if (ch === 'P') {
        fallback = [x, z]
        row[x] = '.'
      }
    }),
  )
  shuffle(sites, rng)
  const keep = sites.slice(0, count)
  for (const [x, z] of sites.slice(keep.length)) grid[z][x] = '.'

  const candidates: [number, number][] = []
  grid.forEach((row, z) =>
    row.forEach((ch, x) => {
      if (ch !== '.') return
      for (let dz = -1; dz <= 1; dz++)
        for (let dx = -1; dx <= 1; dx++) {
          const n = at(x + dx, z + dz)
          if (n === ' ' || n === 'E') return
        }
      const gap = Math.min(...keep.map(([gx, gz]) => Math.max(Math.abs(gx - x), Math.abs(gz - z))))
      if (gap >= OBJECTIVES.spawnGeneratorGap) candidates.push([x, z])
    }),
  )
  const spawn = candidates.length ? candidates[Math.floor(rng() * candidates.length)] : fallback
  if (spawn) grid[spawn[1]][spawn[0]] = 'P'
  return { ...def, rows: grid.map((r) => r.join('')) }
}

/** Every trial kind appears before any repeats. */
export function assignTrials(count: number, rng: Rng = Math.random): TrialKind[] {
  const out: TrialKind[] = []
  while (out.length < count) out.push(...shuffle<TrialKind>(['needle', 'wires', 'hold'], rng))
  return out.slice(0, count)
}

const dist = (ax: number, az: number, bx: number, bz: number) => Math.hypot(ax - bx, az - bz)

/** Nearest USE target: an unrepaired generator, or a powered gate once all are repaired. */
export function findContext(s: GameSession): GameSession['context'] {
  const { player: p, level } = s
  let best: GameSession['context'] = null
  let bestD = Infinity
  level.generators.forEach((g, i) => {
    if (!generatorAvailable(s, i)) return
    const d = dist(p.x, p.z, g.x, g.z)
    if (d < REPAIR.interactDistance && d < bestD) {
      bestD = d
      best = { kind: 'repair', id: i }
    }
  })
  if (best || !s.gatesPowered) return best
  for (const g of level.gates) {
    if (g.open || s.openingGate === g.id) continue
    const d = dist(p.x, p.z, g.x, g.z)
    if (d < GATE.interactDistance && d < bestD) {
      bestD = d
      best = { kind: 'gate', id: g.id }
    }
  }
  return best
}

/** A map-shift reversal: any dynamic wall, a telegraphed door, or a door a shift locked. */
function isReversal(s: GameSession, t: HackTarget) {
  if (t.kind === 'wall') return true
  if (t.kind !== 'door') return false
  return s.doorLockSource[t.id] === 'shift' || s.shift.pending.some((p) => p.kind === 'door' && p.id === t.id)
}

/** Override perk: the first reversal of the night costs no charge. */
export function isFreeHack(s: GameSession, t: HackTarget) {
  return s.overrideReady && isReversal(s, t)
}

export function findHackTarget(s: GameSession): HackTarget | null {
  const charged = s.hackCharges > 0
  if (!charged && !s.overrideReady) return null
  const { player: p, level } = s
  let best: HackTarget | null = null
  let bestD = Infinity
  const consider = (target: HackTarget, d: number, range: number) => {
    if (d < range && d < bestD) {
      bestD = d
      best = target
    }
  }
  for (const d of level.doors) {
    if (d.locked && s.doorLockSource[d.id] !== 'shift') continue
    const t: HackTarget = { kind: 'door', id: d.id }
    if (charged || isFreeHack(s, t)) consider(t, dist(p.x, p.z, d.x, d.z), HACK.range)
  }
  for (const w of level.dynamicWalls) consider({ kind: 'wall', id: w.id }, dist(p.x, p.z, w.x, w.z), HACK.range)
  if (!charged) return best
  for (const c of level.cameras) {
    if (c.blindTimer > 0) continue
    const d = dist(p.x, p.z, c.x, c.z)
    if (d < HACK.cameraRange && d < bestD && segmentClear(level, p.x, p.z, c.x, c.z)) consider({ kind: 'camera', id: c.id }, d, HACK.cameraRange)
  }
  return best
}

export function performHack(s: GameSession, target: HackTarget) {
  const { level } = s
  const free = isFreeHack(s, target)
  if (target.kind === 'door') {
    const d = level.doors[target.id]
    const label = `DOOR ${String(d.id + 1).padStart(2, '0')}`
    if (cancelPending(s, 'door', d.id)) {
      notify(s, `${label} // SHIFT CANCELLED`)
    } else if (d.locked) {
      d.locked = false
      d.open = true
      s.doorTimers[d.id] = 0
      s.doorLockSource[d.id] = null
      notify(s, `${label} // OVERRIDE // OPEN`)
      say(s, 'hackDoor')
    } else {
      if (bodyInBox(s, d.panelAabb)) return notify(s, 'DOORWAY OBSTRUCTED')
      d.open = false
      d.locked = true
      s.doorTimers[d.id] = HACK.doorLockTime
      s.doorLockSource[d.id] = 'hack'
      emitNoise(s.noise, 'door', d.x, d.z, NOISE.doorSlam, s.time)
      notify(s, `${label} // LOCKED ${HACK.doorLockTime}S`)
    }
  } else if (target.kind === 'wall') {
    const w = level.dynamicWalls[target.id]
    if (cancelPending(s, 'wall', w.id)) {
      notify(s, 'SHIFT CANCELLED')
    } else {
      if (!w.raised && bodyInBox(s, w.aabb)) return notify(s, 'SHIFT OBSTRUCTED')
      w.raised = !w.raised
      if (w.raised && !routeSafe(s)) {
        w.raised = false
        return notify(s, 'SHIFT REFUSED // ROUTE REQUIRED')
      }
      emitNoise(s.noise, 'door', w.x, w.z, NOISE.doorSlam, s.time)
      notify(s, w.raised ? 'SHIFT REVERSED // WALL UP' : 'SHIFT REVERSED // WALL DOWN')
      say(s, 'hackWall')
    }
  } else {
    const c = level.cameras[target.id]
    c.blindTimer = OBJECTIVES.cameraBlindTime
    c.seenTime = 0
    notify(s, `CAMERA ${String(c.id + 1).padStart(2, '0')} // BLIND ${OBJECTIVES.cameraBlindTime}S`)
    say(s, 'hackCamera', { n: numberWord(c.id + 1) })
  }
  if (free) {
    s.overrideReady = false
    notify(s, `${s.notice?.text ?? 'SHIFT REVERSED'} // OVERRIDE`)
    say(s, 'override')
  } else {
    s.hackCharges--
  }
  if (s.perks.ghost) s.ghostTimer = PERK_EFFECTS.ghostTime
  emitNoise(s.noise, 'hack', s.player.x, s.player.z, NOISE.hackUse, s.time)
}

export function updateDoors(s: GameSession, dt: number) {
  for (const d of s.level.doors) {
    if (!d.locked) continue
    s.doorTimers[d.id] -= dt
    if (s.doorTimers[d.id] <= 0) {
      d.locked = false
      d.open = true
      s.doorLockSource[d.id] = null
    }
  }
}

const HALF_CAM_FOV = ((SECURITY_CAMERA.fovDeg / 2) * Math.PI) / 180
const SWEEP = (SECURITY_CAMERA.sweepDeg * Math.PI) / 180

function wrap(a: number) {
  while (a > Math.PI) a -= Math.PI * 2
  while (a < -Math.PI) a += Math.PI * 2
  return a
}

export function updateCameras(s: GameSession, dt: number) {
  const { player: p, level } = s
  for (const c of level.cameras) {
    c.cooldown = Math.max(0, c.cooldown - dt)
    if (c.blindTimer > 0) {
      c.blindTimer -= dt
      c.seenTime = 0
      continue
    }
    c.angle = c.baseAngle + Math.sin(s.time * SECURITY_CAMERA.sweepSpeed + c.id * 2.1) * SWEEP
    const dx = p.x - c.x
    const dz = p.z - c.z
    const d = Math.hypot(dx, dz)
    const sees =
      s.ghostTimer <= 0 &&
      d < SECURITY_CAMERA.range &&
      Math.abs(wrap(Math.atan2(dx, dz) - c.angle)) < HALF_CAM_FOV &&
      segmentClear(level, c.x, c.z, p.x, p.z)
    c.seenTime = sees ? c.seenTime + dt : Math.max(0, c.seenTime - dt)
    if (sees && c.seenTime >= SECURITY_CAMERA.detectTime && c.cooldown <= 0) {
      c.cooldown = SECURITY_CAMERA.cooldown
      alertHunter(s.hunter, p)
      notify(s, `CAMERA ${String(c.id + 1).padStart(2, '0')} // SUBJECT LOGGED`)
      say(s, 'cameraLogged', { n: numberWord(c.id + 1) })
    }
  }
}

export function powerGates(s: GameSession) {
  s.gatesPowered = true
  for (const g of s.level.gates) g.powered = true
  s.finalChase = OBJECTIVES.finalChaseTime
  s.revealTimer = 0
  notify(s, 'GATES POWERED // LOCKDOWN IN 60S')
  say(s, 'gatesPowered')
}

/** Final chase timer, periodic tip-offs, gate opening and escape. */
export function updateEndgame(s: GameSession, dt: number) {
  if (!s.gatesPowered) return
  const { player: p } = s

  const before = s.finalChase
  s.finalChase = Math.max(0, s.finalChase - dt)
  if (before > 10 && s.finalChase <= 10) say(s, 'lockdownSoon')
  s.revealTimer -= dt
  if (s.revealTimer <= 0) {
    s.revealTimer = OBJECTIVES.finalRevealInterval
    if (s.hunter.mode !== 'chase') alertHunter(s.hunter, p)
  }

  if (s.openingGate !== null) {
    const g = s.level.gates[s.openingGate]
    if (dist(p.x, p.z, g.x, g.z) > GATE.stayDistance) {
      s.openingGate = null
    } else {
      const before = Math.floor(g.progress * GATE.openTime / GATE.noiseInterval)
      g.progress = Math.min(1, g.progress + dt / GATE.openTime)
      if (Math.floor(g.progress * GATE.openTime / GATE.noiseInterval) !== before)
        emitNoise(s.noise, 'door', g.x, g.z, NOISE.doorSlam, s.time)
      if (g.progress >= 1) {
        g.open = true
        s.openingGate = null
        notify(s, 'GATE OPEN')
      }
    }
  }

  for (const g of s.level.gates) {
    if (g.open && dist(p.x, p.z, g.x, g.z) < GATE.escapeDistance) {
      s.status = 'escaped'
      return
    }
  }
  if (s.finalChase <= 0) {
    s.status = 'failed'
    s.failReason = 'lockdown'
  }
}
