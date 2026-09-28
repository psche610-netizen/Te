export type PerkId =
  | 'softStep'
  | 'quickHands'
  | 'secondWind'
  | 'awareness'
  | 'steady'
  | 'deepPockets'
  | 'ghost'
  | 'decoy'
  | 'override'

export interface PerkDef {
  id: PerkId
  name: string
  effect: string
  cost: number
  /** Needs the Foundry Pass (`foundry` entitlement) to buy or equip. */
  foundry?: boolean
}

/** 6 free perks + 3 Foundry perks (section 8). Bought once with scrap, then equipped up to 3 at a time. */
export const PERKS: readonly PerkDef[] = [
  { id: 'softStep', name: 'SOFT STEP', effect: 'Walking noise -30%', cost: 0 },
  { id: 'quickHands', name: 'QUICK HANDS', effect: 'Repair speed +20%', cost: 120 },
  { id: 'secondWind', name: 'SECOND WIND', effect: 'Escape one catch per night', cost: 220 },
  { id: 'awareness', name: 'AWARENESS', effect: 'Hunter outline through walls when close', cost: 180 },
  { id: 'steady', name: 'STEADY', effect: 'Wider repair zones', cost: 120 },
  { id: 'deepPockets', name: 'DEEP POCKETS', effect: '+1 hack charge', cost: 160 },
  { id: 'ghost', name: 'GHOST', effect: 'Hidden from cameras for 5s after hacking', cost: 180, foundry: true },
  { id: 'decoy', name: 'DECOY', effect: 'Throwable noise maker, 2 per night', cost: 200, foundry: true },
  { id: 'override', name: 'OVERRIDE', effect: 'One free map-shift reversal per night', cost: 220, foundry: true },
]

export const PERK_IDS = PERKS.map((p) => p.id)

export const STARTER_PERKS: PerkId[] = ['softStep']

export function perkDef(id: PerkId) {
  return PERKS.find((p) => p.id === id)!
}

/** Perks usable right now: Foundry perks drop out without the pass. */
export function usablePerks(ids: readonly PerkId[], foundry: boolean) {
  return ids.filter((id) => foundry || !perkDef(id).foundry)
}

export type PerkSet = Record<PerkId, boolean>

export function toPerkSet(equipped: readonly PerkId[]): PerkSet {
  return Object.fromEntries(PERK_IDS.map((id) => [id, equipped.includes(id)])) as PerkSet
}
