import { GRID } from '../config'
import type { AABB, Axis, Box, CellKind, LevelData, LevelDef, PropModule, WallSide } from './types'

const NETWORK = new Set(['#', 'D', '=', '-', 'E'])

export const PROP_SIZE = {
  locker: { w: 1.1, d: 0.7, h: 2.0 },
  generator: { w: 1.8, d: 1.4 },
  crate: { w: 1.24, d: 1.24 },
} as const

export const DOOR_JAMB = { along: 0.3, across: 0.5 } as const
export const GATE_PILLAR = 0.4

const SIDE_DIR: Record<WallSide, [number, number]> = { N: [0, -1], S: [0, 1], W: [-1, 0], E: [1, 0] }

function boxToAabb(b: Box): AABB {
  const swap = b.rotY !== undefined && Math.abs(Math.sin(b.rotY)) > 0.5
  const hx = (swap ? b.sz : b.sx) / 2
  const hz = (swap ? b.sx : b.sz) / 2
  return { minX: b.x - hx, maxX: b.x + hx, minZ: b.z - hz, maxZ: b.z + hz }
}

function spanAabb(x: number, z: number, axis: Axis, along: number, across: number): AABB {
  const hx = (axis === 'x' ? along : across) / 2
  const hz = (axis === 'x' ? across : along) / 2
  return { minX: x - hx, maxX: x + hx, minZ: z - hz, maxZ: z + hz }
}

export function buildLevel(def: LevelDef): LevelData {
  const { rows } = def
  const height = rows.length
  const width = Math.max(...rows.map((r) => r.length))
  const cs = GRID.cellSize
  const H = GRID.wallHeight
  const T = GRID.wallThickness
  const PT = GRID.postThickness

  const at = (cx: number, cz: number) =>
    cz < 0 || cz >= height || cx < 0 || cx >= width ? ' ' : (rows[cz][cx] ?? ' ')
  const net = (cx: number, cz: number) => NETWORK.has(at(cx, cz))
  const axisOf = (cx: number, cz: number): Axis =>
    net(cx - 1, cz) || net(cx + 1, cz) ? 'x' : 'z'

  const level: LevelData = {
    id: def.id,
    name: def.name,
    width,
    height,
    cellSize: cs,
    cells: new Array<CellKind>(width * height).fill('void'),
    wallArms: [],
    wallPosts: [],
    floorCells: [],
    doors: [],
    dynamicWalls: [],
    gates: [],
    lockers: [],
    generators: [],
    crates: [],
    cameras: [],
    spawn: { x: 0, z: 0 },
    staticColliders: [],
    buckets: Array.from({ length: width * height }, () => []),
  }

  const collide = (aabb: AABB) => level.staticColliders.push(aabb)

  /** Face away from the first adjacent wall (N, S, W, E) and snug against it. */
  const placeProp = (cx: number, cz: number, depth: number, snug: boolean): PropModule => {
    const wx = cx * cs
    const wz = cz * cs
    const dirs: [number, number, number][] = [
      [0, -1, 0],
      [0, 1, Math.PI],
      [-1, 0, Math.PI / 2],
      [1, 0, -Math.PI / 2],
    ]
    for (const [dx, dz, rotY] of dirs) {
      if (net(cx + dx, cz + dz)) {
        const inset = snug ? cs / 2 - T / 2 - depth / 2 - 0.02 : 0
        return { id: 0, cx, cz, x: wx + dx * inset, z: wz + dz * inset, rotY }
      }
    }
    return { id: 0, cx, cz, x: wx, z: wz, rotY: 0 }
  }

  for (let cz = 0; cz < height; cz++) {
    for (let cx = 0; cx < width; cx++) {
      const ch = at(cx, cz)
      const i = cz * width + cx
      const wx = cx * cs
      const wz = cz * cs
      if (ch !== ' ') level.floorCells.push({ cx, cz })

      switch (ch) {
        case '#': {
          level.cells[i] = 'wall'
          const n = net(cx, cz - 1)
          const s = net(cx, cz + 1)
          const w = net(cx - 1, cz)
          const e = net(cx + 1, cz)
          const arms: Box[] = []
          if (w) arms.push({ x: wx - cs / 4, y: H / 2, z: wz, sx: cs / 2, sy: H, sz: T })
          if (e) arms.push({ x: wx + cs / 4, y: H / 2, z: wz, sx: cs / 2, sy: H, sz: T })
          if (n) arms.push({ x: wx, y: H / 2, z: wz - cs / 4, sx: T, sy: H, sz: cs / 2 })
          if (s) arms.push({ x: wx, y: H / 2, z: wz + cs / 4, sx: T, sy: H, sz: cs / 2 })
          for (const a of arms) {
            level.wallArms.push(a)
            collide(boxToAabb(a))
          }
          const straight = (w && e && !n && !s) || (n && s && !w && !e)
          if (!straight) {
            const post = { x: wx, y: (H + 0.06) / 2, z: wz, sx: PT, sy: H + 0.06, sz: PT }
            level.wallPosts.push(post)
            collide(boxToAabb(post))
          }
          break
        }
        case 'D': {
          level.cells[i] = 'door'
          const axis = axisOf(cx, cz)
          const off = cs / 2 - DOOR_JAMB.along / 2
          for (const sign of [-1, 1]) {
            const jx = axis === 'x' ? wx + sign * off : wx
            const jz = axis === 'z' ? wz + sign * off : wz
            collide(spanAabb(jx, jz, axis, DOOR_JAMB.along, DOOR_JAMB.across))
          }
          level.doors.push({
            id: level.doors.length,
            cx,
            cz,
            x: wx,
            z: wz,
            axis,
            open: true,
            locked: false,
            panelAabb: spanAabb(wx, wz, axis, cs, 0.2),
            telegraph: false,
          })
          break
        }
        case '=':
        case '-': {
          level.cells[i] = 'dynamic'
          const axis = axisOf(cx, cz)
          level.dynamicWalls.push({
            id: level.dynamicWalls.length,
            cx,
            cz,
            x: wx,
            z: wz,
            axis,
            raised: ch === '=',
            aabb: spanAabb(wx, wz, axis, cs, T),
            telegraph: false,
          })
          break
        }
        case 'E': {
          level.cells[i] = 'gate'
          const axis = axisOf(cx, cz)
          const pillar = cs / 2 - GATE_PILLAR / 2
          for (const sign of [-1, 1]) {
            const px = axis === 'x' ? wx + sign * pillar : wx
            const pz = axis === 'z' ? wz + sign * pillar : wz
            collide(spanAabb(px, pz, axis, GATE_PILLAR, 0.7))
          }
          level.gates.push({
            id: level.gates.length,
            cx,
            cz,
            x: wx,
            z: wz,
            axis,
            powered: false,
            open: false,
            progress: 0,
            aabb: spanAabb(wx, wz, axis, cs, 0.7),
          })
          break
        }
        case 'L': {
          level.cells[i] = 'prop'
          const { w, d, h } = PROP_SIZE.locker
          const p = placeProp(cx, cz, d, true)
          p.id = level.lockers.length
          level.lockers.push(p)
          collide(boxToAabb({ x: p.x, y: 0, z: p.z, sx: w, sy: h, sz: d, rotY: p.rotY }))
          break
        }
        case 'G': {
          level.cells[i] = 'prop'
          const { w, d } = PROP_SIZE.generator
          const p = placeProp(cx, cz, d, false)
          p.id = level.generators.length
          level.generators.push(p)
          collide(boxToAabb({ x: p.x, y: 0, z: p.z, sx: w, sy: 1, sz: d, rotY: p.rotY }))
          break
        }
        case 'c': {
          level.cells[i] = 'prop'
          const { w, d } = PROP_SIZE.crate
          const p = { id: level.crates.length, cx, cz, x: wx, z: wz, rotY: 0 }
          level.crates.push(p)
          collide(boxToAabb({ x: wx, y: 0, z: wz, sx: w, sy: 1, sz: d }))
          break
        }
        case 'P':
          level.cells[i] = 'floor'
          level.spawn = { x: wx, z: wz }
          break
        case ' ':
          break
        default:
          level.cells[i] = 'floor'
      }
    }
  }

  for (const cam of def.cameras ?? []) {
    const [dx, dz] = SIDE_DIR[cam.wall]
    const inset = T / 2 + 0.12
    const baseAngle = Math.atan2(-dx, -dz)
    level.cameras.push({
      id: level.cameras.length,
      cx: cam.cx,
      cz: cam.cz,
      x: (cam.cx + dx) * cs - dx * inset,
      z: (cam.cz + dz) * cs - dz * inset,
      baseAngle,
      angle: baseAngle,
      blindTimer: 0,
      seenTime: 0,
      cooldown: 0,
    })
  }

  const toCell = (v: number) => Math.floor((v + cs / 2) / cs)
  level.staticColliders.forEach((c, idx) => {
    const x0 = Math.max(0, toCell(c.minX))
    const x1 = Math.min(width - 1, toCell(c.maxX))
    const z0 = Math.max(0, toCell(c.minZ))
    const z1 = Math.min(height - 1, toCell(c.maxZ))
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) level.buckets[z * width + x].push(idx)
  })

  return level
}
