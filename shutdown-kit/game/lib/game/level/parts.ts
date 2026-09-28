import type { PaletteKey } from '../config'
import type { Box, PropModule } from './types'

export type MatId = PaletteKey | `${PaletteKey}:e`

export interface Part {
  mat: MatId
  box: Box
}

/** Local space, model faces +z, origin on the floor at the prop center. */
export const LOCKER_PARTS: Part[] = [
  { mat: 'graphite', box: { x: 0, y: 1.0, z: 0, sx: 1.1, sy: 2.0, sz: 0.7 } },
  { mat: 'ink', box: { x: 0, y: 1.0, z: 0.352, sx: 0.03, sy: 1.86, sz: 0.01 } },
  { mat: 'ink', box: { x: -0.27, y: 1.62, z: 0.352, sx: 0.38, sy: 0.06, sz: 0.01 } },
  { mat: 'ink', box: { x: 0.27, y: 1.62, z: 0.352, sx: 0.38, sy: 0.06, sz: 0.01 } },
]

export const GENERATOR_BODY_PARTS: Part[] = [
  { mat: 'concrete', box: { x: 0, y: 0.12, z: 0, sx: 1.8, sy: 0.24, sz: 1.4 } },
  { mat: 'graphite', box: { x: 0, y: 0.8, z: -0.1, sx: 1.5, sy: 1.12, sz: 1.0 } },
  { mat: 'graphite', box: { x: -0.35, y: 1.52, z: -0.2, sx: 0.56, sy: 0.32, sz: 0.56 } },
  { mat: 'graphite', box: { x: 0.5, y: 0.72, z: 0.5, sx: 0.42, sy: 0.96, sz: 0.3 } },
]

/** Status strips. Rendered per generator so they can change with repair state. */
export const GENERATOR_LIGHT_PARTS: Part[] = [
  { mat: 'signal:e', box: { x: 0, y: 1.1, z: 0.41, sx: 1.1, sy: 0.1, sz: 0.02 } },
  { mat: 'signal:e', box: { x: 0.5, y: 0.98, z: 0.66, sx: 0.3, sy: 0.2, sz: 0.02 } },
]

export const CRATE_PARTS: Part[] = [
  { mat: 'graphite', box: { x: 0, y: 0.5, z: 0, sx: 1.2, sy: 1.0, sz: 1.2 } },
  { mat: 'concrete', box: { x: 0, y: 0.5, z: 0, sx: 1.24, sy: 0.12, sz: 1.24 } },
  { mat: 'concrete', box: { x: 0, y: 1.01, z: 0, sx: 0.96, sy: 0.04, sz: 0.96 } },
]

// Mechanical detail stays instanced: adding ribs and fittings costs no extra draw calls.
for (const side of [-1, 1]) {
  LOCKER_PARTS.push({ mat: 'concrete', box: { x: side * 0.27, y: 1.02, z: 0.36, sx: 0.48, sy: 1.84, sz: 0.04 } })
  LOCKER_PARTS.push({ mat: 'bone', box: { x: side * 0.09, y: 0.94, z: 0.4, sx: 0.035, sy: 0.2, sz: 0.025 } })
  for (const y of [0.28, 0.36, 0.44, 1.52, 1.6, 1.68])
    LOCKER_PARTS.push({ mat: 'ink', box: { x: side * 0.27, y, z: 0.385, sx: 0.32, sy: 0.035, sz: 0.015 } })
  GENERATOR_BODY_PARTS.push({ mat: 'concrete', box: { x: side * 0.7, y: 0.87, z: 0.25, sx: 0.14, sy: 1.28, sz: 0.18 } })
  GENERATOR_BODY_PARTS.push({ mat: 'ink', box: { x: side * 0.62, y: 0.15, z: 0, sx: 0.25, sy: 0.3, sz: 1.42 } })
  CRATE_PARTS.push({ mat: 'ink', box: { x: side * 0.5, y: 0.51, z: 0, sx: 0.1, sy: 1.04, sz: 1.26 } })
}
for (let i = 0; i < 7; i++) {
  GENERATOR_BODY_PARTS.push({ mat: 'concrete', box: { x: -0.55 + i * 0.17, y: 1.38, z: -0.12, sx: 0.065, sy: 0.05, sz: 0.75 } })
}
GENERATOR_BODY_PARTS.push(
  { mat: 'ink', box: { x: 0, y: 0.75, z: 0.415, sx: 0.8, sy: 0.44, sz: 0.035 } },
  { mat: 'signal', box: { x: -0.5, y: 0.8, z: 0.44, sx: 0.1, sy: 0.58, sz: 0.035 } },
)

/** Place local parts on every prop and group the resulting world boxes by material. */
export function composeParts(props: PropModule[], parts: Part[], into = new Map<MatId, Box[]>()) {
  for (const p of props) {
    const c = Math.cos(p.rotY)
    const s = Math.sin(p.rotY)
    for (const { mat, box } of parts) {
      let list = into.get(mat)
      if (!list) into.set(mat, (list = []))
      list.push({
        x: p.x + box.x * c + box.z * s,
        y: box.y,
        z: p.z - box.x * s + box.z * c,
        sx: box.sx,
        sy: box.sy,
        sz: box.sz,
        rotY: p.rotY,
      })
    }
  }
  return into
}
