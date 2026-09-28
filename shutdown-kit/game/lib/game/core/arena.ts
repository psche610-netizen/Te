import { CORE } from '../config'

export type SegState = 'up' | 'warn' | 'down'

export interface Segment {
  state: SegState
  /** Seconds in the current state. */
  t: number
  /** Just rose back from `down` (render eases it in). */
  returned: boolean
}

export interface Ring {
  angle: number
  segs: Segment[]
}

export interface Arena {
  rings: Ring[]
}

export interface Point {
  x: number
  z: number
}

export type Surface = { kind: 'rim' } | { kind: 'spoke' } | { kind: 'ring'; ring: number; seg: number } | null

/** Walkable band by radius: the rim, a ring index, or null (gap / pillar / void). */
export type Band = 'rim' | number | null

export const TAU = Math.PI * 2
export const SEG_ARC = TAU / CORE.segments

export const wrap = (a: number) => ((a % TAU) + TAU) % TAU

export function angleDiff(a: number, b: number) {
  const d = wrap(a - b)
  return d > Math.PI ? d - TAU : d
}

export function segCenter(seg: number) {
  return (seg + 0.5) * SEG_ARC
}

export function ringMid(ring: number) {
  const r = CORE.rings[ring]
  return (r.inner + r.outer) / 2
}

export function bandOf(r: number): Band {
  if (r >= CORE.rim.inner && r <= CORE.rim.outer) return 'rim'
  for (let i = 0; i < CORE.rings.length; i++) {
    if (r >= CORE.rings[i].inner && r <= CORE.rings[i].outer) return i
  }
  return null
}

export function bandRadius(band: Exclude<Band, null>) {
  return band === 'rim' ? (CORE.rim.inner + CORE.rim.outer) / 2 : ringMid(band)
}

/** Spoke angle the point stands on (with `margin` inside the edge), or null. */
export function spokeAt(x: number, z: number, margin = 0): number | null {
  const r = Math.hypot(x, z)
  if (r < CORE.pillarRadius || r > CORE.rim.inner + 0.3) return null
  const a = Math.atan2(z, x)
  for (const sa of CORE.spokeAngles) {
    const d = angleDiff(a, sa)
    if (Math.abs(d) < Math.PI / 2 && Math.abs(r * Math.sin(d)) <= CORE.spokeHalfWidth - margin) return sa
  }
  return null
}

/** What stands at (x, z). Spokes and the rim are static; rings rotate and can have dropped segments. */
export function surfaceAt(arena: Arena, x: number, z: number): Surface {
  const r = Math.hypot(x, z)
  if (r >= CORE.rim.inner && r <= CORE.rim.outer) return { kind: 'rim' }
  if (r < CORE.pillarRadius || r > CORE.rim.outer) return null
  if (spokeAt(x, z) !== null) return { kind: 'spoke' }
  const a = Math.atan2(z, x)
  for (let i = 0; i < CORE.rings.length; i++) {
    const def = CORE.rings[i]
    if (r < def.inner || r > def.outer) continue
    const seg = Math.floor(wrap(a - arena.rings[i].angle) / SEG_ARC) % CORE.segments
    return arena.rings[i].segs[seg].state === 'down' ? null : { kind: 'ring', ring: i, seg }
  }
  return null
}

export function nearestSpokePoint(x: number, z: number): Point {
  const r = Math.min(Math.max(Math.hypot(x, z), CORE.pillarRadius + 0.6), CORE.rim.inner)
  const a = Math.atan2(z, x)
  const sa = CORE.spokeAngles.reduce((best, cur) => (Math.abs(angleDiff(a, cur)) < Math.abs(angleDiff(a, best)) ? cur : best))
  return { x: r * Math.cos(sa), z: r * Math.sin(sa) }
}

/** True if the segment a→b does not pass through the central pillar. */
export function clearOfPillar(ax: number, az: number, bx: number, bz: number) {
  return pillarHit(ax, az, bx - ax, bz - az, Math.hypot(bx - ax, bz - az)) === null
}

/** Distance along (dx, dz) from (x, z) to the pillar, within `range`, or null. Direction need not be unit. */
export function pillarHit(x: number, z: number, dx: number, dz: number, range: number) {
  const len = Math.hypot(dx, dz) || 1
  const b = (x * dx + z * dz) / len
  const c = x * x + z * z - CORE.pillarRadius * CORE.pillarRadius
  const disc = b * b - c
  if (disc < 0) return null
  const t = -b - Math.sqrt(disc)
  return t >= 0 && t <= range ? t : null
}
