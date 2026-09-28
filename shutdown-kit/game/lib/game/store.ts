import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { hasFoundry } from '@/lib/purchases/store'
import { DEFAULT_SKINS, sanitizeSkins, type SkinChoice } from './skins'
import {
  defaultSector,
  EMPTY_PROGRESS,
  isCleared,
  isPlayable,
  nextNightFor,
  type Progress,
  type SectorId,
} from './campaign'
import { OBJECTIVES, PROGRESSION } from './config'
import { dailySpec, type DailySpec } from './daily'
import { PERK_IDS, perkDef, STARTER_PERKS, type PerkId } from './perks'
import type { NightResult } from './results'
import type { NightMirror } from './session'

export type Screen = 'title' | 'calibrate' | 'sectors' | 'loadout' | 'settings' | 'game'

export type Settings = {
  micEnabled: boolean
  sound: boolean
  haptics: boolean
}

/** Everything in the local save file. */
export interface SaveData {
  scrap: number
  owned: PerkId[]
  equipped: PerkId[]
  progress: Progress
  calibrationSeen: boolean
  settings: Settings
  /** Selected cosmetics. Only applied while the `skins` entitlement is active. */
  skins: SkinChoice
  /** Best Daily Night score for the day it was played. */
  dailyBest: DailyBest | null
}

export interface DailyBest {
  date: string
  scrap: number
  escaped: boolean
}

const NIGHT_DEFAULTS: NightMirror = {
  nightStatus: 'playing',
  failReason: null,
  hunterMode: 'patrol',
  repaired: 0,
  totalGenerators: OBJECTIVES.generatorsPerNight,
  context: null,
  hackTarget: null,
  hackCharges: OBJECTIVES.hackChargesBase,
  hackFree: false,
  decoys: null,
  ghost: false,
  repair: null,
  gatesPowered: false,
  finalChase: 0,
  gateProgress: null,
  notice: null,
  secondWindReady: false,
  canHide: false,
  hidden: false,
  lockerCheck: false,
  micActive: false,
  subtitle: null,
  purge: null,
  purgeMax: 0,
}

export const SAVE_DEFAULTS: SaveData = {
  scrap: PROGRESSION.startingScrap,
  owned: [...STARTER_PERKS],
  equipped: [...STARTER_PERKS],
  progress: { ...EMPTY_PROGRESS },
  calibrationSeen: false,
  settings: { micEnabled: false, sound: true, haptics: true },
  skins: { ...DEFAULT_SKINS },
  dailyBest: null,
}

type GameStore = NightMirror &
  SaveData & {
    paused: boolean
    setPaused: (paused: boolean) => void
    screen: Screen
    /** Bumped to rebuild the night session from scratch. */
    runId: number
    sector: SectorId
    night: number
    /** Set while the Daily Night is selected / being played. */
    daily: DailySpec | null
    /** Set when a night ends; the Results screen reads it. */
    result: NightResult | null
    /** Where the mic calibration screen goes when it finishes. */
    calibrateReturn: 'game' | 'settings'
    setScreen: (screen: Exclude<Screen, 'game' | 'calibrate'>) => void
    selectSector: (id: SectorId) => void
    selectDaily: () => void
    /** Start the selected sector's next night; routes through mic calibration when needed. */
    deploy: (micReady: boolean) => void
    openCalibration: (from: 'game' | 'settings') => void
    finishCalibration: (useMic: boolean) => void
    cancelCalibration: () => void
    recordNight: (result: NightResult) => void
    nextNight: () => void
    retryNight: () => void
    buyPerk: (id: PerkId) => void
    toggleEquip: (id: PerkId) => void
    updateSettings: (patch: Partial<Settings>) => void
    setSkin: (patch: Partial<SkinChoice>) => void
    resetSave: () => void
    syncNight: (patch: Partial<NightMirror>) => void
  }

/** Night the Loadout deploys into: the Daily Night always plays at final-night difficulty. */
export const deployNight = (s: Pick<GameStore, 'daily' | 'progress' | 'sector'>) =>
  s.daily ? PROGRESSION.nightsPerSector : nextNightFor(s.progress, s.sector)

const startNight = (s: GameStore, night: number): Partial<GameStore> => ({
  ...NIGHT_DEFAULTS,
  screen: 'game',
  paused: true,
  night,
  result: null,
  runId: s.runId + 1,
})

function sanitizeDailyBest(v: unknown): DailyBest | null {
  const d = v as Partial<DailyBest> | null | undefined
  if (!d || typeof d.date !== 'string' || typeof d.scrap !== 'number' || d.scrap < 0) return null
  return { date: d.date, scrap: Math.floor(d.scrap), escaped: d.escaped === true }
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...NIGHT_DEFAULTS,
      ...SAVE_DEFAULTS,
      paused: false,
      setPaused: (paused) => set({ paused }),
      screen: 'title',
      runId: 0,
      sector: 'plant',
      night: 1,
      daily: null,
      result: null,
      calibrateReturn: 'game',

      setScreen: (screen) =>
        set((s) =>
          screen === 'sectors' ? { screen, daily: null, sector: defaultSector(s.progress, hasFoundry()) } : { screen },
        ),

      selectSector: (id) => set({ sector: id, daily: null }),

      selectDaily: () => {
        const daily = dailySpec()
        set({ daily, sector: daily.sector })
      },

      deploy: (micReady) => {
        const s = get()
        if (s.daily ? !hasFoundry() : !isPlayable(s.progress, s.sector, hasFoundry())) return
        const needsMic = !s.calibrationSeen || (s.settings.micEnabled && !micReady)
        if (needsMic) set({ screen: 'calibrate', calibrateReturn: 'game' })
        else set(startNight(s, deployNight(s)))
      },

      openCalibration: (from) => set({ screen: 'calibrate', calibrateReturn: from }),

      finishCalibration: (useMic) =>
        set((s) => {
          const saved = { calibrationSeen: true, settings: { ...s.settings, micEnabled: useMic } }
          if (s.calibrateReturn === 'settings') return { ...saved, screen: 'settings' }
          return { ...saved, ...startNight(s, deployNight(s)) }
        }),

      cancelCalibration: () => set((s) => ({ screen: s.calibrateReturn === 'settings' ? 'settings' : 'loadout' })),

      recordNight: (result) =>
        set((s) => {
          if (result.daily) {
            const escaped = result.outcome === 'escaped'
            const prev = s.dailyBest?.date === result.daily ? s.dailyBest : null
            const better = !prev || (escaped && !prev.escaped) || (escaped === prev.escaped && result.scrap > prev.scrap)
            const dailyBest = better ? { date: result.daily, scrap: result.scrap, escaped } : prev
            return { scrap: s.scrap + result.scrap, dailyBest, result: { ...result, sectorCleared: false } }
          }
          const before = s.progress[result.sector]
          const escaped = result.outcome === 'escaped'
          const progress = escaped && result.night > before ? { ...s.progress, [result.sector]: result.night } : s.progress
          const sectorCleared = !isCleared(s.progress, result.sector) && isCleared(progress, result.sector)
          return { scrap: s.scrap + result.scrap, progress, result: { ...result, sectorCleared } }
        }),

      nextNight: () =>
        set((s) => {
          if (s.daily || s.night >= PROGRESSION.nightsPerSector)
            return { screen: 'sectors', result: null, daily: null, sector: defaultSector(s.progress, hasFoundry()) }
          return startNight(s, s.night + 1)
        }),

      retryNight: () => set((s) => startNight(s, s.night)),

      buyPerk: (id) =>
        set((s) => {
          const { cost, foundry } = perkDef(id)
          if (s.owned.includes(id) || s.scrap < cost || (foundry && !hasFoundry())) return {}
          const equipped = s.equipped.length < PROGRESSION.maxEquipped ? [...s.equipped, id] : s.equipped
          return { scrap: s.scrap - cost, owned: [...s.owned, id], equipped }
        }),

      toggleEquip: (id) =>
        set((s) => {
          if (!s.owned.includes(id)) return {}
          if (s.equipped.includes(id)) return { equipped: s.equipped.filter((p) => p !== id) }
          if (perkDef(id).foundry && !hasFoundry()) return {}
          if (s.equipped.length >= PROGRESSION.maxEquipped) return {}
          return { equipped: [...s.equipped, id] }
        }),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      setSkin: (patch) => set((s) => ({ skins: { ...s.skins, ...patch } })),

      resetSave: () =>
        set({
          ...SAVE_DEFAULTS,
          progress: { ...EMPTY_PROGRESS },
          skins: { ...DEFAULT_SKINS },
          sector: 'plant',
          daily: null,
          result: null,
        }),

      syncNight: (patch) => set(patch),
    }),
    {
      name: 'shutdown-save',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s): SaveData => ({
        scrap: s.scrap,
        owned: s.owned,
        equipped: s.equipped,
        progress: s.progress,
        calibrationSeen: s.calibrationSeen,
        settings: s.settings,
        skins: s.skins,
        dailyBest: s.dailyBest,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<SaveData>
        const valid = (ids: unknown) => (Array.isArray(ids) ? ids.filter((id): id is PerkId => PERK_IDS.includes(id)) : null)
        const owned = valid(p.owned) ?? current.owned
        return {
          ...current,
          scrap: typeof p.scrap === 'number' && p.scrap >= 0 ? Math.floor(p.scrap) : current.scrap,
          owned,
          equipped: (valid(p.equipped) ?? current.equipped).filter((id) => owned.includes(id)).slice(0, PROGRESSION.maxEquipped),
          progress: { ...EMPTY_PROGRESS, ...p.progress },
          calibrationSeen: p.calibrationSeen ?? current.calibrationSeen,
          settings: { ...current.settings, ...p.settings },
          skins: sanitizeSkins(p.skins),
          dailyBest: sanitizeDailyBest(p.dailyBest),
        }
      },
    },
  ),
)
