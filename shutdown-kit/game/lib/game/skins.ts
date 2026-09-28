import type { PaletteKey } from './config'

/**
 * Cosmetic only. Colors stay inside the palette so the art rules hold, and never use concrete
 * (floor tiles and Core rings) or danger (threat color) so bodies always read against the floor.
 */
export type SkinDef<Id extends string> = { id: Id; name: string; color: PaletteKey; free: boolean }

export const SUITS = [
  { id: 'operator', name: 'OPERATOR', color: 'signal', free: true },
  { id: 'hazmat', name: 'HAZMAT', color: 'bone', free: false },
  { id: 'nightShift', name: 'NIGHT SHIFT', color: 'graphite', free: false },
] as const satisfies readonly SkinDef<string>[]

export const HUNTER_SKINS = [
  { id: 'warden', name: 'WARDEN', color: 'graphite', free: true },
  { id: 'porcelain', name: 'PORCELAIN', color: 'bone', free: false },
] as const satisfies readonly SkinDef<string>[]

export type SuitId = (typeof SUITS)[number]['id']
export type HunterSkinId = (typeof HUNTER_SKINS)[number]['id']
export type SkinChoice = { suit: SuitId; hunter: HunterSkinId }

export const DEFAULT_SKINS: SkinChoice = { suit: 'operator', hunter: 'warden' }

const valid = <T extends { id: string }>(list: readonly T[], id: unknown, fallback: T['id']): T['id'] =>
  list.some((s) => s.id === id) ? (id as T['id']) : fallback

export function sanitizeSkins(raw: unknown): SkinChoice {
  const r = (raw ?? {}) as Partial<Record<keyof SkinChoice, unknown>>
  return { suit: valid(SUITS, r.suit, DEFAULT_SKINS.suit), hunter: valid(HUNTER_SKINS, r.hunter, DEFAULT_SKINS.hunter) }
}

/** Selected skins apply only while the `skins` entitlement is active; otherwise the free defaults. */
export function activeSkinColors(choice: SkinChoice, entitled: boolean) {
  const pick = <T extends SkinDef<string>>(list: readonly T[], id: string) => {
    const def = list.find((s) => s.id === id) ?? list[0]
    return def.free || entitled ? def.color : list[0].color
  }
  return { suit: pick(SUITS, choice.suit), hunter: pick(HUNTER_SKINS, choice.hunter) }
}
