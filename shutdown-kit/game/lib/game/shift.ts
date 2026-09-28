import { generatorAvailable } from './missions'
import { sfx } from './audio'
import { HUNTER, NOISE, PLAYER, SHIFT } from './config'
import { worldToCell } from './level/collision'
import { findPath } from './level/pathfinding'
import type { AABB } from './level/types'
import { emitNoise } from './noise'
import { notify } from './notice'
import { say } from './overseer/subtitles'
import type { GameSession } from './session'

export type ShiftPiece = { kind: 'wall' | 'door'; id: number }

export interface ShiftState {
  /** Seconds until the next scheduled shift. */
  timer: number
  /** Pieces telegraphed and about to move. */
  pending: ShiftPiece[]
  /** Seconds left in the telegraph; 0 = idle. */
  telegraph: number
  safetyTimer: number
  count: number
  /** Seconds between scheduled shifts (the Overtime modifier shortens it). */
  interval: number
}

export type DoorLockSource = 'hack' | 'shift' | null

type Rng = () => number

export function createShiftState(interval: number = SHIFT.interval, firstDelay: number = SHIFT.firstDelay): ShiftState {
  return { timer: firstDelay, pending: [], telegraph: 0, safetyTimer: 0, count: 0, interval }
}

function overlapsCircle(b: AABB, x: number, z: number, r: number) {
  const px = Math.max(b.minX, Math.min(x, b.maxX))
  const pz = Math.max(b.minZ, Math.min(z, b.maxZ))
  return (x - px) ** 2 + (z - pz) ** 2 < r * r
}

/** Player or hunter touching the box (with a safety margin). */
export function bodyInBox(s: GameSession, b: AABB, margin = 0.05) {
  return (
    overlapsCircle(b, s.player.x, s.player.z, PLAYER.radius + margin) ||
    overlapsCircle(b, s.hunter.x, s.hunter.z, HUNTER.radius + margin)
  )
}

/**
 * Route-safety guarantee: the player can reach at least one unrepaired generator,
 * or, once every generator is repaired, at least one exit gate.
 */
export function routeSafe(s: GameSession) {
  const { level, player } = s
  const start = { cx: worldToCell(level, player.x), cz: worldToCell(level, player.z) }
  const goals = s.gatesPowered
    ? level.gates.map((g) => ({ cx: g.cx, cz: g.cz }))
    : level.generators.filter((_, i) => generatorAvailable(s, i)).map((g) => ({ cx: g.cx, cz: g.cz }))
  if (!goals.length) return true
  return goals.some((g) => findPath(level, start, g) !== null)
}

/** The box a piece would start blocking, or null if the move only opens space. */
function closingBox(s: GameSession, p: ShiftPiece): AABB | null {
  if (p.kind === 'wall') {
    const w = s.level.dynamicWalls[p.id]
    return w.raised ? null : w.aabb
  }
  return s.level.doors[p.id].panelAabb
}

function apply(s: GameSession, p: ShiftPiece) {
  if (p.kind === 'wall') {
    const w = s.level.dynamicWalls[p.id]
    w.raised = !w.raised
  } else {
    const d = s.level.doors[p.id]
    d.open = false
    d.locked = true
    s.doorTimers[d.id] = SHIFT.doorLockTime
    s.doorLockSource[d.id] = 'shift'
  }
}

function revert(s: GameSession, p: ShiftPiece) {
  if (p.kind === 'wall') {
    const w = s.level.dynamicWalls[p.id]
    w.raised = !w.raised
  } else {
    const d = s.level.doors[p.id]
    d.open = true
    d.locked = false
    s.doorTimers[d.id] = 0
    s.doorLockSource[d.id] = null
  }
}

/** Try the piece; keep it only if nobody is in the way and a route survives. */
function tryApply(s: GameSession, p: ShiftPiece, margin: number) {
  const box = closingBox(s, p)
  if (box && bodyInBox(s, box, margin)) return false
  apply(s, p)
  if (routeSafe(s)) return true
  revert(s, p)
  return false
}

function setTelegraph(s: GameSession, p: ShiftPiece, on: boolean) {
  if (p.kind === 'wall') s.level.dynamicWalls[p.id].telegraph = on
  else s.level.doors[p.id].telegraph = on
}

function pieceXZ(s: GameSession, p: ShiftPiece) {
  return p.kind === 'wall' ? s.level.dynamicWalls[p.id] : s.level.doors[p.id]
}

/** Pick pieces near the player that pass the safety check. Leaves the level unchanged. */
export function planShift(s: GameSession, rng: Rng = Math.random): ShiftPiece[] {
  const { player, level } = s
  const score = (x: number, z: number) => Math.hypot(x - player.x, z - player.z) + rng() * SHIFT.randomSpread
  const walls = level.dynamicWalls
    .filter((w) => !w.telegraph)
    .map((w) => ({ piece: { kind: 'wall', id: w.id } as ShiftPiece, score: score(w.x, w.z) }))
  const doors = level.doors
    .filter((d) => d.open && !d.locked && !d.telegraph)
    .map((d) => ({ piece: { kind: 'door', id: d.id } as ShiftPiece, score: score(d.x, d.z) }))
  const byScore = (a: { score: number }, b: { score: number }) => a.score - b.score

  const wallCount = SHIFT.wallsMin + Math.floor(rng() * (SHIFT.wallsMax - SHIFT.wallsMin + 1))
  const doorCount = rng() < SHIFT.doorChance ? 1 : 0
  const chosen: ShiftPiece[] = []
  const take = (list: { piece: ShiftPiece; score: number }[], max: number) => {
    let n = 0
    for (const { piece } of list.sort(byScore)) {
      if (n >= max) break
      if (tryApply(s, piece, SHIFT.planMargin)) {
        chosen.push(piece)
        n++
      }
    }
  }
  take(walls, wallCount)
  take(doors, doorCount)
  for (let i = chosen.length - 1; i >= 0; i--) revert(s, chosen[i])
  return chosen
}

function startTelegraph(s: GameSession, pieces: ShiftPiece[]) {
  s.shift.pending = pieces
  s.shift.telegraph = SHIFT.telegraph
  for (const p of pieces) setTelegraph(s, p, true)
  sfx.shiftWarning()
  notify(s, 'FACILITY SHIFT // STAND CLEAR')
}

/** Start a telegraphed shift now (scheduled timer). Returns false if nothing can move. */
export function triggerShift(s: GameSession, rng: Rng = Math.random) {
  if (s.shift.telegraph > 0) return false
  const pieces = planShift(s, rng)
  if (!pieces.length) return false
  startTelegraph(s, pieces)
  say(s, 'shiftWarn')
  return true
}

/**
 * Director shift: close these specific pieces (raise lowered walls, lock open doors).
 * Same crush + route-safety rules as a scheduled shift. Returns the pieces that will move.
 */
export function triggerTargetedShift(s: GameSession, pieces: ShiftPiece[]): ShiftPiece[] {
  if (s.shift.telegraph > 0) return []
  const chosen: ShiftPiece[] = []
  for (const p of pieces) {
    if (p.kind === 'wall') {
      const w = s.level.dynamicWalls[p.id]
      if (w.raised || w.telegraph) continue
    } else {
      const d = s.level.doors[p.id]
      if (!d.open || d.locked || d.telegraph) continue
    }
    if (tryApply(s, p, SHIFT.planMargin)) chosen.push(p)
  }
  for (let i = chosen.length - 1; i >= 0; i--) revert(s, chosen[i])
  if (!chosen.length) return chosen
  startTelegraph(s, chosen)
  s.shift.timer = Math.max(s.shift.timer, SHIFT.retryDelay * 2)
  return chosen
}

/** Hack: cancel a telegraphed piece before it moves. */
export function cancelPending(s: GameSession, kind: ShiftPiece['kind'], id: number) {
  const i = s.shift.pending.findIndex((p) => p.kind === kind && p.id === id)
  if (i < 0) return false
  setTelegraph(s, s.shift.pending[i], false)
  s.shift.pending.splice(i, 1)
  if (!s.shift.pending.length) s.shift.telegraph = 0
  return true
}

function executeShift(s: GameSession) {
  const moved: ShiftPiece[] = []
  let closed = false
  for (const p of s.shift.pending) {
    setTelegraph(s, p, false)
    const closing = closingBox(s, p) !== null
    if (!tryApply(s, p, SHIFT.executeMargin)) continue
    moved.push(p)
    if (closing) closed = true
    const { x, z } = pieceXZ(s, p)
    emitNoise(s.noise, 'door', x, z, NOISE.wallSlide, s.time)
  }
  s.shift.pending = []
  s.shift.telegraph = 0
  if (!moved.length) return
  s.shift.count++
  s.hunter.path = []
  s.hunter.pathIndex = 0
  s.hunter.repathTimer = 0
  sfx.wallSlam()
  notify(s, closed ? 'ROUTE CLOSED' : 'ROUTE UPDATED')
  say(s, closed ? 'routeClosed' : 'routeOpened')
}

/**
 * Safety net for state changes outside a shift (repairs, hacks, expiring locks):
 * if no route exists, open the nearest piece that restores one. Opening never crushes.
 */
function restoreRoute(s: GameSession) {
  if (routeSafe(s)) return
  restoreRouteNow(s)
  say(s, 'routeRestored')
}

function restoreRouteNow(s: GameSession) {
  const { level, player } = s
  const d = (x: number, z: number) => Math.hypot(x - player.x, z - player.z)
  const walls = level.dynamicWalls.filter((w) => w.raised).sort((a, b) => d(a.x, a.z) - d(b.x, b.z))
  const doors = level.doors.filter((door) => door.locked).sort((a, b) => d(a.x, a.z) - d(b.x, b.z))

  const openDoor = (id: number) => {
    const door = level.doors[id]
    door.open = true
    door.locked = false
    s.doorTimers[id] = 0
    s.doorLockSource[id] = null
  }

  for (const w of walls) {
    w.raised = false
    if (routeSafe(s)) return notify(s, 'ROUTE RESTORED')
    w.raised = true
  }
  for (const door of doors) {
    const src = s.doorLockSource[door.id]
    const timer = s.doorTimers[door.id]
    openDoor(door.id)
    if (routeSafe(s)) return notify(s, 'ROUTE RESTORED')
    door.open = false
    door.locked = true
    s.doorTimers[door.id] = timer
    s.doorLockSource[door.id] = src
  }
  for (const w of walls) w.raised = false
  for (const door of doors) openDoor(door.id)
  notify(s, 'ROUTE RESTORED')
}

export function updateShift(s: GameSession, dt: number) {
  const sh = s.shift
  if (sh.telegraph > 0) {
    sh.telegraph -= dt
    if (sh.telegraph <= 0) executeShift(s)
  } else if ((sh.timer -= dt) <= 0) {
    sh.timer = sh.interval
    if (!triggerShift(s)) sh.timer = SHIFT.retryDelay
  }

  if ((sh.safetyTimer -= dt) <= 0) {
    sh.safetyTimer = SHIFT.safetyInterval
    if (sh.telegraph <= 0) restoreRoute(s)
  }
}
