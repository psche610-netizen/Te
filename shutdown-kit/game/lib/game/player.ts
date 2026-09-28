import { PLAYER } from './config'
import { collidersNear, resolveCircle } from './level/collision'
import type { AABB, LevelData } from './level/types'

export interface PlayerState {
  x: number
  z: number
  vx: number
  vz: number
  facing: number
  /** Actual ground speed after collision, world units / s. */
  speed: number
  running: boolean
  /** Auto crouch-walk near the hunter: slower and quieter. */
  crouching: boolean
  walkPhase: number
}

/** Iso camera basis on the ground plane: screen right and screen up. */
const INV_SQRT2 = Math.SQRT1_2
const RIGHT = { x: INV_SQRT2, z: -INV_SQRT2 }
const UP = { x: -INV_SQRT2, z: -INV_SQRT2 }

const nearby: AABB[] = []

export function createPlayer(spawn: { x: number; z: number }): PlayerState {
  return { x: spawn.x, z: spawn.z, vx: 0, vz: 0, facing: Math.PI / 4, speed: 0, running: false, crouching: false, walkPhase: 0 }
}

function lerpAngle(a: number, b: number, t: number) {
  let d = b - a
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return a + d * t
}

export function updatePlayer(
  p: PlayerState,
  dt: number,
  move: { x: number; y: number; run: boolean },
  level: LevelData,
  crouch = false,
) {
  let mag = Math.min(1, Math.hypot(move.x, move.y))
  if (mag < PLAYER.joystickDeadzone) mag = 0
  const dirX = mag ? (move.x * RIGHT.x + move.y * UP.x) / Math.hypot(move.x, move.y) : 0
  const dirZ = mag ? (move.x * RIGHT.z + move.y * UP.z) / Math.hypot(move.x, move.y) : 0

  p.running = move.run && mag > 0.2
  p.crouching = crouch && !p.running
  const base = p.running ? PLAYER.runSpeed : p.crouching ? PLAYER.crouchSpeed : PLAYER.walkSpeed
  const target = base * (p.running ? 1 : mag)
  const k = 1 - Math.exp(-PLAYER.acceleration * dt)
  p.vx += (dirX * target - p.vx) * k
  p.vz += (dirZ * target - p.vz) * k

  const prevX = p.x
  const prevZ = p.z
  const nx = p.x + p.vx * dt
  const nz = p.z + p.vz * dt
  collidersNear(level, nx, nz, nearby)
  const res = resolveCircle(nx, nz, PLAYER.radius, nearby)
  p.x = res.x
  p.z = res.z

  const moved = Math.hypot(p.x - prevX, p.z - prevZ)
  p.speed = dt > 0 ? moved / dt : 0
  p.walkPhase += moved * PLAYER.stepRate

  if (mag > 0) {
    p.facing = lerpAngle(p.facing, Math.atan2(dirX, dirZ), 1 - Math.exp(-PLAYER.turnSpeed * dt))
  }
}
