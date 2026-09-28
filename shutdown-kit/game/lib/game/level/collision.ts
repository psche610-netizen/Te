import type { AABB, LevelData } from './types'

let stamp = new Int32Array(0)
let stampId = 0

export function worldToCell(level: LevelData, v: number) {
  return Math.floor((v + level.cellSize / 2) / level.cellSize)
}

/** Static colliders in the 3x3 cells around (x, z), plus currently-blocking dynamic modules. */
export function collidersNear(level: LevelData, x: number, z: number, out: AABB[]) {
  out.length = 0
  if (stamp.length < level.staticColliders.length) stamp = new Int32Array(level.staticColliders.length)
  stampId++
  const cx = worldToCell(level, x)
  const cz = worldToCell(level, z)

  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      const gx = cx + dx
      const gz = cz + dz
      if (gx < 0 || gz < 0 || gx >= level.width || gz >= level.height) continue
      for (const idx of level.buckets[gz * level.width + gx]) {
        if (stamp[idx] === stampId) continue
        stamp[idx] = stampId
        out.push(level.staticColliders[idx])
      }
    }
  }

  for (const w of level.dynamicWalls) {
    if (w.raised && Math.abs(w.cx - cx) <= 1 && Math.abs(w.cz - cz) <= 1) out.push(w.aabb)
  }
  for (const d of level.doors) {
    if (!d.open && Math.abs(d.cx - cx) <= 1 && Math.abs(d.cz - cz) <= 1) out.push(d.panelAabb)
  }
  for (const g of level.gates) {
    if (!g.open && Math.abs(g.cx - cx) <= 1 && Math.abs(g.cz - cz) <= 1) out.push(g.aabb)
  }
  return out
}

const pos = { x: 0, z: 0 }

/** Push a circle out of every box. Returns a shared object; copy the values. */
export function resolveCircle(x: number, z: number, r: number, boxes: AABB[]) {
  for (let iter = 0; iter < 2; iter++) {
    for (const b of boxes) {
      const px = Math.max(b.minX, Math.min(x, b.maxX))
      const pz = Math.max(b.minZ, Math.min(z, b.maxZ))
      const dx = x - px
      const dz = z - pz
      const d2 = dx * dx + dz * dz
      if (d2 >= r * r) continue
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2)
        x += (dx / d) * (r - d)
        z += (dz / d) * (r - d)
      } else {
        const left = x - b.minX
        const right = b.maxX - x
        const top = z - b.minZ
        const bottom = b.maxZ - z
        const m = Math.min(left, right, top, bottom)
        if (m === left) x = b.minX - r
        else if (m === right) x = b.maxX + r
        else if (m === top) z = b.minZ - r
        else z = b.maxZ + r
      }
    }
  }
  pos.x = x
  pos.z = z
  return pos
}
