import { worldToCell } from './collision'
import type { AABB, LevelData } from './types'

let stamp = new Int32Array(0)
let stampId = 0

/** Every blocker (static, raised dynamic walls, closed doors) touching the square around (x, z). */
export function collidersInRange(level: LevelData, x: number, z: number, range: number, out: AABB[]) {
  out.length = 0
  if (stamp.length < level.staticColliders.length) stamp = new Int32Array(level.staticColliders.length)
  stampId++
  const x0 = Math.max(0, worldToCell(level, x - range))
  const x1 = Math.min(level.width - 1, worldToCell(level, x + range))
  const z0 = Math.max(0, worldToCell(level, z - range))
  const z1 = Math.min(level.height - 1, worldToCell(level, z + range))
  for (let gz = z0; gz <= z1; gz++) {
    for (let gx = x0; gx <= x1; gx++) {
      for (const idx of level.buckets[gz * level.width + gx]) {
        if (stamp[idx] === stampId) continue
        stamp[idx] = stampId
        out.push(level.staticColliders[idx])
      }
    }
  }
  const inRange = (cx: number, cz: number) => cx >= x0 && cx <= x1 && cz >= z0 && cz <= z1
  for (const w of level.dynamicWalls) if (w.raised && inRange(w.cx, w.cz)) out.push(w.aabb)
  for (const d of level.doors) if (!d.open && inRange(d.cx, d.cz)) out.push(d.panelAabb)
  for (const g of level.gates) if (!g.open && inRange(g.cx, g.cz)) out.push(g.aabb)
  return out
}

/** Distance along a normalized ray to the first box, capped at maxDist. Boxes containing the origin are ignored. */
export function rayDistance(ox: number, oz: number, dx: number, dz: number, maxDist: number, boxes: AABB[]) {
  let best = maxDist
  const ix = dx !== 0 ? 1 / dx : Infinity
  const iz = dz !== 0 ? 1 / dz : Infinity
  for (const b of boxes) {
    let tmin: number
    let tmax: number
    if (dx !== 0) {
      const t1 = (b.minX - ox) * ix
      const t2 = (b.maxX - ox) * ix
      tmin = Math.min(t1, t2)
      tmax = Math.max(t1, t2)
    } else {
      if (ox < b.minX || ox > b.maxX) continue
      tmin = -Infinity
      tmax = Infinity
    }
    if (dz !== 0) {
      const t1 = (b.minZ - oz) * iz
      const t2 = (b.maxZ - oz) * iz
      tmin = Math.max(tmin, Math.min(t1, t2))
      tmax = Math.min(tmax, Math.max(t1, t2))
    } else if (oz < b.minZ || oz > b.maxZ) continue
    if (tmax < tmin || tmax < 0 || tmin < 0) continue
    if (tmin < best) best = tmin
  }
  return best
}

const scratch: AABB[] = []

/** True if nothing blocks the straight segment a→b. */
export function segmentClear(level: LevelData, ax: number, az: number, bx: number, bz: number) {
  const dx = bx - ax
  const dz = bz - az
  const len = Math.hypot(dx, dz)
  if (len < 1e-4) return true
  collidersInRange(level, (ax + bx) / 2, (az + bz) / 2, len / 2 + 0.5, scratch)
  return rayDistance(ax, az, dx / len, dz / len, len, scratch) >= len
}

/** Segment clear for a body of radius r (center line plus two offset lines). */
export function corridorClear(level: LevelData, ax: number, az: number, bx: number, bz: number, r: number) {
  const dx = bx - ax
  const dz = bz - az
  const len = Math.hypot(dx, dz)
  if (len < 1e-4) return true
  const nx = (-dz / len) * r
  const nz = (dx / len) * r
  return (
    segmentClear(level, ax, az, bx, bz) &&
    segmentClear(level, ax + nx, az + nz, bx + nx, bz + nz) &&
    segmentClear(level, ax - nx, az - nz, bx - nx, bz - nz)
  )
}
