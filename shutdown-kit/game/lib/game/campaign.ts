import { PROGRESSION } from './config'
import { SECTOR_1 } from './level/sector1'
import { SECTOR_2 } from './level/sector2'
import { SECTOR_3 } from './level/sector3'
import type { HunterKind } from './hunter'
import type { LevelDef } from './level/types'

export type SectorId = 'plant' | 'cold' | 'foundry' | 'core'
export type Modifier = 'none' | 'overtime' | 'blackout'
/** free = always open once the previous sector is cleared; pass = Foundry Pass (Phase 9); finale = The Core (Phase 8). */
export type SectorAccess = 'free' | 'pass' | 'finale'

export interface SectorDef {
  id: SectorId
  code: string
  name: string
  hunter: string
  /** Sim profile for the hunter (campaign sectors only). */
  hunterKind: HunterKind
  /** Applied on the final night only. */
  modifier: Modifier
  access: SectorAccess
  /** Must be cleared before this sector opens. */
  requires: SectorId | null
  level: LevelDef | null
}

export const SECTORS: readonly SectorDef[] = [
  { id: 'plant', code: 'SECTOR 1', name: 'THE PLANT', hunter: 'THE WARDEN', hunterKind: 'warden', modifier: 'overtime', access: 'free', requires: null, level: SECTOR_1 },
  { id: 'cold', code: 'SECTOR 2', name: 'COLD STORAGE', hunter: 'THE WARDEN', hunterKind: 'warden', modifier: 'blackout', access: 'free', requires: 'plant', level: SECTOR_2 },
  { id: 'foundry', code: 'SECTOR 3', name: 'THE FOUNDRY', hunter: 'THE WEAVER', hunterKind: 'weaver', modifier: 'overtime', access: 'pass', requires: 'cold', level: SECTOR_3 },
  { id: 'core', code: 'FINALE', name: 'THE CORE', hunter: 'OVERSEER', hunterKind: 'warden', modifier: 'none', access: 'finale', requires: 'cold', level: null },
]

export const MODIFIER_LABEL: Record<Modifier, string> = { none: 'NONE', overtime: 'OVERTIME', blackout: 'BLACKOUT' }

export type Progress = Record<SectorId, number>

export const EMPTY_PROGRESS: Progress = { plant: 0, cold: 0, foundry: 0, core: 0 }

export function sectorDef(id: SectorId) {
  return SECTORS.find((s) => s.id === id)!
}

export function isCleared(progress: Progress, id: SectorId) {
  return progress[id] >= PROGRESSION.nightsPerSector
}

export type SectorState = 'cleared' | 'open' | 'locked' | 'pass'

/**
 * What the sector map shows for a sector. `foundry` = the Foundry Pass entitlement:
 * without it a pass sector shows `pass`; with it, it unlocks like a free sector.
 */
export function sectorState(progress: Progress, id: SectorId, foundry = false): SectorState {
  const def = sectorDef(id)
  if (def.access === 'pass' && !foundry) return 'pass'
  if (def.requires && !isCleared(progress, def.requires)) return 'locked'
  return isCleared(progress, id) ? 'cleared' : 'open'
}

/** Unlocked, but the sector has no layout (kept for future sectors; none are sealed in v1). */
export function isSealed(progress: Progress, id: SectorId, foundry = false) {
  const st = sectorState(progress, id, foundry)
  const def = sectorDef(id)
  return (st === 'open' || st === 'cleared') && def.level === null && def.access !== 'finale'
}

export function isPlayable(progress: Progress, id: SectorId, foundry = false) {
  const st = sectorState(progress, id, foundry)
  const def = sectorDef(id)
  return (st === 'open' || st === 'cleared') && (def.level !== null || def.access === 'finale')
}

/**
 * Next night to play: first uncleared night, or the final night again once cleared.
 * The Core is a single night played as the sector's final night.
 */
export function nextNightFor(progress: Progress, id: SectorId) {
  if (sectorDef(id).access === 'finale') return PROGRESSION.nightsPerSector
  return Math.min(progress[id] + 1, PROGRESSION.nightsPerSector)
}

export function nightModifier(id: SectorId, night: number): Modifier {
  return night === PROGRESSION.nightsPerSector ? sectorDef(id).modifier : 'none'
}

/** Sector the map highlights by default: the furthest playable one that isn't cleared. */
export function defaultSector(progress: Progress, foundry = false): SectorId {
  const open = SECTORS.filter((s) => isPlayable(progress, s.id, foundry))
  return (open.find((s) => !isCleared(progress, s.id)) ?? open[open.length - 1] ?? SECTORS[0]).id
}
