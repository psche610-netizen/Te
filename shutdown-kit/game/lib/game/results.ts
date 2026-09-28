import type { Modifier, SectorId } from './campaign'
import { GRID, PROGRESSION } from './config'
import type { GameSession } from './session'

export type NightOutcome = 'escaped' | 'caught' | 'lockdown' | 'fell'

export interface ScrapLine {
  label: string
  amount: number
}

export interface NightResult {
  sector: SectorId
  night: number
  modifier: Modifier
  outcome: NightOutcome
  generators: number
  totalGenerators: number
  spotted: number
  /** Whole seconds. */
  breathHeld: number
  scrap: number
  breakdown: ScrapLine[]
  /** Player route in grid cells (x, z), for the Results map. */
  path: [number, number][]
  /** Level rows the night was played on. */
  rows: string[]
  /** Daily Night date (`YYYY-MM-DD`), or null for campaign nights. */
  daily: string | null
  /** True when this night cleared the sector for the first time. Filled in by the store. */
  sectorCleared: boolean
}

export function computeScrap(
  outcome: NightOutcome,
  generators: number,
  spotted: number,
  breathHeld: number,
  finalNight: boolean,
): ScrapLine[] {
  const cfg = PROGRESSION.scrap
  if (outcome !== 'escaped') {
    return [{ label: 'GENERATORS', amount: Math.floor(generators * cfg.perGenerator * cfg.failRate) }]
  }
  const lines: ScrapLine[] = [
    { label: 'GENERATORS', amount: generators * cfg.perGenerator },
    { label: 'ESCAPE', amount: cfg.escape },
    { label: 'STEALTH', amount: Math.max(0, cfg.stealthMax - spotted * cfg.stealthPerSpot) },
    { label: 'BREATH HELD', amount: Math.floor(breathHeld) * cfg.breathPerSecond },
  ]
  if (finalNight) {
    const base = lines.reduce((sum, l) => sum + l.amount, 0)
    lines.push({ label: 'FINAL NIGHT', amount: Math.round(base * (cfg.finalNightMultiplier - 1)) })
  }
  return lines.filter((l) => l.amount > 0)
}

export function computeResult(
  s: GameSession,
  sector: SectorId,
  night: number,
  rows: string[],
  daily: string | null = null,
): NightResult {
  const outcome: NightOutcome = s.status === 'escaped' ? 'escaped' : (s.failReason ?? 'caught')
  const breathHeld = Math.floor(s.stats.breathHeld)
  const breakdown = computeScrap(
    outcome,
    s.repaired,
    s.stats.spotted,
    breathHeld,
    night === PROGRESSION.nightsPerSector,
  )
  const cell = GRID.cellSize
  const path = [...s.stats.path, [s.player.x, s.player.z] as [number, number]].map(
    ([x, z]) => [x / cell, z / cell] as [number, number],
  )
  return {
    sector,
    night,
    modifier: s.modifier,
    outcome,
    generators: s.repaired,
    totalGenerators: s.generators.length,
    spotted: s.stats.spotted,
    breathHeld,
    scrap: breakdown.reduce((sum, l) => sum + l.amount, 0),
    breakdown,
    path,
    rows,
    daily,
    sectorCleared: false,
  }
}
