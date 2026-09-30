import type { AssetId } from '@/lib/game/assets'
import { GRID } from '@/lib/game/config'
import type { CellKind, LevelData } from '@/lib/game/level/types'
import type { Placement } from './instanced-asset'

/**
 * Kit dressing for a grid level: which GLB goes where. Pure view data; colliders stay in `build.ts`.
 * Directions: 0 = +X (E), 1 = -Z (N), 2 = -X (W), 3 = +Z (S). rotY = k·π/2 turns direction d into d+k.
 */

const DIRS: [number, number][] = [
  [1, 0],
  [0, -1],
  [-1, 0],
  [0, 1],
]
const QUARTER = Math.PI / 2
/** Yaw that points a model's +Z front along direction d. */
const FACE: number[] = [QUARTER, Math.PI, -QUARTER, 0]

/** Half thickness of the V4 wall kit (0.88 m body). */
export const WALL_FACE = 0.44
const WALL_TOP = 2.1

export const GENERATOR_SCALE = 0.38
/** Turbine bounds are z -1.17..1.78 (GLB units); centre it on the generator site. */
const GENERATOR_LOCAL: [number, number, number] = [0, 0, -0.3]

export const DOOR_SCALE: [number, number, number] = [0.553, 0.665, 1.3]
/** The bulkhead frame is x -1.70..1.92 (GLB units); centre it in the door cell. */
export const DOOR_LOCAL: [number, number, number] = [-0.11, 0, 0]

type DecalAsset = 'decal-wall-stencil' | 'decal-floor-stencil' | 'decal-hazard-edge'

export type DecalGroup = { asset: DecalAsset; from: string; to: string; placements: Placement[] }

export type LevelLayout = {
  models: [AssetId, Placement[]][]
  decals: DecalGroup[]
}

const DECAL_BAKED: Record<DecalAsset, string> = {
  'decal-wall-stencil': 'code-b-1',
  'decal-floor-stencil': 'code-g-02',
  'decal-hazard-edge': 'hazard-strip',
}

const WALL_LABELS: Record<string, { item: string; w: number; h: number }[]> = {
  default: [
    { item: 'turbine', w: 1.6, h: 0.4 },
    { item: 'code-b-1', w: 0.7, h: 0.7 },
    { item: 'slogan-listening', w: 1.8, h: 0.225 },
    { item: 'hall', w: 1.6, h: 0.4 },
    { item: 'code-a1', w: 0.7, h: 0.7 },
    { item: 'authorized-only', w: 1.6, h: 0.4 },
  ],
  'sector-2': [
    { item: 'cold-storage', w: 1.6, h: 0.4 },
    { item: 'code-c1', w: 0.7, h: 0.7 },
    { item: 'slogan-shift', w: 1.8, h: 0.225 },
    { item: 'code-s2', w: 0.7, h: 0.7 },
  ],
  'sector-3': [
    { item: 'foundry', w: 1.6, h: 0.4 },
    { item: 'code-f-03', w: 0.7, h: 0.7 },
    { item: 'slogan-listening', w: 1.8, h: 0.225 },
    { item: 'code-w-01', w: 0.7, h: 0.7 },
  ],
}

/** Stable per-cell pseudo random, so the dressing never changes between renders. */
function cellHash(cx: number, cz: number) {
  let h = Math.imul(cx + 101, 73856093) ^ Math.imul(cz + 37, 19349663)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return (h ^ (h >>> 16)) >>> 0
}

const WALL_LIKE = new Set<CellKind>(['wall', 'door', 'dynamic', 'gate'])

export function layoutLevel(level: LevelData): LevelLayout {
  const cs = level.cellSize
  const { width, height } = level
  const kind = (cx: number, cz: number): CellKind =>
    cx < 0 || cz < 0 || cx >= width || cz >= height ? 'void' : level.cells[cz * width + cx]
  const inLevel = (cx: number, cz: number) => kind(cx, cz) !== 'void'
  const net = (cx: number, cz: number) => WALL_LIKE.has(kind(cx, cz))
  const walkable = (cx: number, cz: number) => {
    const k = kind(cx, cz)
    return k === 'floor' || k === 'prop'
  }

  const models = new Map<AssetId, Placement[]>()
  const put = (id: AssetId, p: Placement) => {
    let list = models.get(id)
    if (!list) models.set(id, (list = []))
    list.push(p)
  }
  const decals = new Map<string, DecalGroup>()
  const decal = (asset: DecalAsset, to: string, p: Placement) => {
    const key = `${asset}:${to}`
    let g = decals.get(key)
    if (!g) decals.set(key, (g = { asset, from: DECAL_BAKED[asset], to, placements: [] }))
    g.placements.push(p)
  }

  // Floor: one 2 m cell per grid cell. Edge cells (amber line + hazard dashes) face door thresholds.
  for (const { cx, cz } of level.floorCells) {
    const p = { x: cx * cs, y: 0, z: cz * cs }
    const k = kind(cx, cz)
    const doorDir = DIRS.findIndex(([dx, dz]) => kind(cx + dx, cz + dz) === 'door' || kind(cx + dx, cz + dz) === 'gate')
    if (walkable(cx, cz) && doorDir >= 0) put('floor-cell-edge', { ...p, rotY: FACE[doorDir] })
    else if (k === 'floor' && cellHash(cx, cz) % 9 === 0) put('floor-cell-drain', { ...p, rotY: (cellHash(cz, cx) % 4) * QUARTER })
    else put('floor-cell', p)
  }

  // Thick wall kit, chosen by which neighbours are part of the wall network.
  const labels = WALL_LABELS[level.id] ?? WALL_LABELS.default
  let labelIndex = 0
  for (let cz = 0; cz < height; cz++) {
    for (let cx = 0; cx < width; cx++) {
      if (kind(cx, cz) !== 'wall') continue
      const arms = DIRS.map(([dx, dz]) => net(cx + dx, cz + dz))
      const count = arms.filter(Boolean).length
      const p = { x: cx * cs, y: 0, z: cz * cs }
      let straight = false
      if (count === 0) put('wall-post', p)
      else if (count === 1) put('wall-end', { ...p, rotY: arms.indexOf(true) * QUARTER })
      else if (count === 2 && arms[0] === arms[2]) {
        straight = true
        put('wall-straight', { ...p, rotY: arms[0] ? 0 : QUARTER })
      } else if (count === 2) {
        const a = [0, 1, 2, 3].find((d) => arms[d] && arms[(d + 1) % 4])!
        put('wall-corner', { ...p, rotY: a * QUARTER })
      } else if (count === 3) put('wall-t', { ...p, rotY: ((arms.indexOf(false) + 1) % 4) * QUARTER })
      else put('wall-cross', p)

      // Pipe runs on top of the far outer walls (N and W: the camera looks from +X +Z).
      if (straight && (cz === 0 || cx === 0)) {
        put('pipe-straight', { ...p, y: WALL_TOP, rotY: cz === 0 ? 0 : QUARTER })
      }
      if (!straight) continue

      // Face dressing on straight runs: lamps, junction boxes, stencils, only toward walkable cells.
      for (let d = 0; d < 4; d++) {
        const [dx, dz] = DIRS[d]
        if (!walkable(cx + dx, cz + dz)) continue
        const h = cellHash(cx * 4 + d, cz)
        const face = { x: p.x + dx * WALL_FACE, z: p.z + dz * WALL_FACE, rotY: FACE[d] }
        if (h % 5 === 0) put('wall-lamp', { ...face, y: 1.2 })
        else if (h % 7 === 1) put('junction-box', { ...face, y: 1.0 })
        else if (h % 6 === 2) {
          const l = labels[labelIndex++ % labels.length]
          const out = 0.006
          decal('decal-wall-stencil', l.item, {
            x: face.x + dx * out,
            z: face.z + dz * out,
            y: 0.75,
            rotY: face.rotY,
            sx: l.w,
            sy: l.h,
          })
        }
      }
    }
  }

  // Outer ledge: one ring of edge cells outside the building, guardrails on the rim, piers below.
  for (let cz = -1; cz <= height; cz++) {
    for (let cx = -1; cx <= width; cx++) {
      if (inLevel(cx, cz)) continue
      let touches = false
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) touches ||= inLevel(cx + dx, cz + dz)
      if (!touches) continue
      const p = { x: cx * cs, y: 0, z: cz * cs }
      const inward = DIRS.findIndex(([dx, dz]) => inLevel(cx + dx, cz + dz))
      if (inward >= 0) put('floor-cell-edge', { ...p, rotY: FACE[(inward + 2) % 4] })
      else put('floor-cell', p)
      for (let d = 0; d < 4; d++) {
        const [dx, dz] = DIRS[d]
        const nx = cx + dx
        const nz = cz + dz
        const ring = !inLevel(nx, nz) && [-1, 0, 1].some((a) => [-1, 0, 1].some((b) => inLevel(nx + a, nz + b)))
        if (inLevel(nx, nz) || ring) continue
        put('guardrail', {
          x: p.x + dx * (cs / 2 - 0.12),
          y: 0.03,
          z: p.z + dz * (cs / 2 - 0.12),
          rotY: d % 2 === 0 ? QUARTER : 0,
          sx: 0.5,
        })
      }
      if ((cx + cz) % 2 === 0) put('foundation-pier', { ...p, y: -0.3 })
    }
  }

  // Props on their collider sites.
  for (const l of level.lockers) put('locker-single', { x: l.x, y: 0, z: l.z, rotY: l.rotY })
  level.generators.forEach((g, i) => {
    const s = GENERATOR_SCALE
    put('turbine-generator', { x: g.x, y: 0, z: g.z, rotY: g.rotY, sx: s, sy: s, sz: s, local: GENERATOR_LOCAL })
    const fx = Math.sin(g.rotY)
    const fz = Math.cos(g.rotY)
    decal('decal-floor-stencil', `code-g-0${Math.min(8, i + 1)}`, {
      x: g.x + fx * 1.05,
      y: 0.036,
      z: g.z + fz * 1.05,
      rotY: g.rotY,
      sx: 0.7,
      sz: 0.7,
    })
  })
  for (const c of level.crates) put('supply-crate', { x: c.x, y: 0, z: c.z, rotY: (cellHash(c.cx, c.cz) % 4) * QUARTER })

  // Dynamic wall tracks: KEEP CLEAR stencils on both sides.
  for (const w of level.dynamicWalls) {
    const along = w.axis === 'x' ? 0 : QUARTER
    for (const side of [-1, 1]) {
      const off = (WALL_FACE + 0.45) * side
      decal('decal-floor-stencil', 'keep-clear', {
        x: w.x + (w.axis === 'z' ? off : 0),
        y: 0.036,
        z: w.z + (w.axis === 'x' ? off : 0),
        rotY: along + (side < 0 ? Math.PI : 0),
        sx: 1.4,
        sz: 0.35,
      })
    }
  }

  // Exit gates: hazard strips on the floor both sides, beacon on the header.
  for (const g of level.gates) {
    const rotY = g.axis === 'x' ? 0 : QUARTER
    for (const side of [-1, 1]) {
      const off = 0.5 * side
      decal('decal-hazard-edge', 'hazard-strip', {
        x: g.x + (g.axis === 'z' ? off : 0),
        y: 0.036,
        z: g.z + (g.axis === 'x' ? off : 0),
        rotY,
      })
    }
    put('warning-beacon', { x: g.x, y: GRID.wallHeight + 0.8, z: g.z })
  }

  return { models: [...models.entries()], decals: [...decals.values()] }
}

/** Every asset the grid level can use, for preloading. */
export const LEVEL_ASSETS: AssetId[] = [
  'floor-cell',
  'floor-cell-edge',
  'floor-cell-drain',
  'wall-post',
  'wall-end',
  'wall-straight',
  'wall-corner',
  'wall-t',
  'wall-cross',
  'pipe-straight',
  'wall-lamp',
  'junction-box',
  'guardrail',
  'foundation-pier',
  'locker-single',
  'turbine-generator',
  'supply-crate',
  'warning-beacon',
  'sliding-bulkhead',
  'decal-wall-stencil',
  'decal-floor-stencil',
  'decal-hazard-edge',
]
