import type { LevelData } from './types'

export interface Cell {
  cx: number
  cz: number
}

/** Walkable for navigation right now. Props, walls, gates and raised/closed modules block. */
export function isWalkable(level: LevelData, cx: number, cz: number) {
  if (cx < 0 || cz < 0 || cx >= level.width || cz >= level.height) return false
  const kind = level.cells[cz * level.width + cx]
  if (kind === 'floor') return true
  if (kind === 'door') {
    const d = level.doors.find((m) => m.cx === cx && m.cz === cz)
    return !!d && d.open && !d.locked
  }
  if (kind === 'dynamic') {
    const w = level.dynamicWalls.find((m) => m.cx === cx && m.cz === cz)
    return !!w && !w.raised
  }
  return false
}

const DIRS: [number, number, number][] = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, Math.SQRT2],
  [1, -1, Math.SQRT2],
  [-1, 1, Math.SQRT2],
  [-1, -1, Math.SQRT2],
]

let gScore = new Float32Array(0)
let fScore = new Float32Array(0)
let cameFrom = new Int32Array(0)
let closed = new Uint8Array(0)
let openFlag = new Uint8Array(0)

/**
 * 8-way grid A*. Diagonals only when both orthogonal neighbours are walkable (no corner cutting).
 * Start and goal cells are always allowed so bodies standing beside props still path.
 * Returns cells from start (exclusive) to goal (inclusive), or null if unreachable.
 */
export function findPath(level: LevelData, start: Cell, goal: Cell): Cell[] | null {
  const W = level.width
  const N = W * level.height
  if (gScore.length < N) {
    gScore = new Float32Array(N)
    fScore = new Float32Array(N)
    cameFrom = new Int32Array(N)
    closed = new Uint8Array(N)
    openFlag = new Uint8Array(N)
  }
  gScore.fill(Infinity, 0, N)
  closed.fill(0, 0, N)
  openFlag.fill(0, 0, N)
  cameFrom.fill(-1, 0, N)

  const s = start.cz * W + start.cx
  const g = goal.cz * W + goal.cx
  if (s === g) return []
  const pass = (cx: number, cz: number) => {
    const i = cz * W + cx
    return i === g || i === s || isWalkable(level, cx, cz)
  }
  if (!pass(goal.cx, goal.cz)) return null

  const h = (i: number) => {
    const dx = Math.abs((i % W) - goal.cx)
    const dz = Math.abs(Math.floor(i / W) - goal.cz)
    return Math.max(dx, dz) + (Math.SQRT2 - 1) * Math.min(dx, dz)
  }

  const open: number[] = [s]
  openFlag[s] = 1
  gScore[s] = 0
  fScore[s] = h(s)

  while (open.length) {
    let bi = 0
    for (let k = 1; k < open.length; k++) if (fScore[open[k]] < fScore[open[bi]]) bi = k
    const cur = open[bi]
    open[bi] = open[open.length - 1]
    open.pop()
    openFlag[cur] = 0
    if (cur === g) break
    closed[cur] = 1

    const cx = cur % W
    const cz = Math.floor(cur / W)
    for (const [dx, dz, cost] of DIRS) {
      const nx = cx + dx
      const nz = cz + dz
      if (nx < 0 || nz < 0 || nx >= W || nz >= level.height) continue
      const ni = nz * W + nx
      if (closed[ni] || !pass(nx, nz)) continue
      if (dx !== 0 && dz !== 0 && (!isWalkable(level, cx + dx, cz) || !isWalkable(level, cx, cz + dz))) continue
      const tentative = gScore[cur] + cost
      if (tentative >= gScore[ni]) continue
      cameFrom[ni] = cur
      gScore[ni] = tentative
      fScore[ni] = tentative + h(ni)
      if (!openFlag[ni]) {
        openFlag[ni] = 1
        open.push(ni)
      }
    }
  }

  if (cameFrom[g] === -1) return null
  const path: Cell[] = []
  for (let i = g; i !== s; i = cameFrom[i]) path.push({ cx: i % W, cz: Math.floor(i / W) })
  return path.reverse()
}
