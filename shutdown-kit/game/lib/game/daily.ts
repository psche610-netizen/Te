import type { Modifier, SectorId } from './campaign'

export type Rng = () => number

/** Small deterministic PRNG (mulberry32). Same seed = same sequence on every device. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hash(text: string) {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return h >>> 0
}

/** Local calendar day, `YYYY-MM-DD`. */
export function dayKey(date: Date = new Date()) {
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${m}-${d}`
}

export interface DailySpec {
  date: string
  seed: number
  sector: Extract<SectorId, 'plant' | 'cold' | 'foundry'>
  modifier: Modifier
}

const DAILY_SECTORS = ['plant', 'cold', 'foundry'] as const
const DAILY_MODIFIERS: Modifier[] = ['none', 'overtime', 'blackout']

/**
 * Daily Night (Foundry Pass): one seeded night per day. The seed fixes the sector,
 * the modifier, generator sites, spawn and repair trials. Played at night-3 difficulty.
 */
export function dailySpec(date: Date = new Date()): DailySpec {
  const key = dayKey(date)
  const seed = hash(`shutdown-daily-${key}`)
  const rng = seededRng(seed)
  return {
    date: key,
    seed,
    sector: DAILY_SECTORS[Math.floor(rng() * DAILY_SECTORS.length)],
    modifier: DAILY_MODIFIERS[Math.floor(rng() * DAILY_MODIFIERS.length)],
  }
}
