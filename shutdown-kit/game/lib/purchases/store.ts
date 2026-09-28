import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { createPurchasesAdapter } from './index'
import {
  LIST_PRICES,
  NO_ENTITLEMENTS,
  PurchaseCancelled,
  type Entitlements,
  type Prices,
  type ProductId,
  type PurchasesAdapter,
} from './types'

/** Why the paywall opened. Picks the headline product. */
export type PaywallReason = 'foundry' | 'sector1' | 'skins'

type PurchaseStore = {
  kind: PurchasesAdapter['kind'] | null
  ready: boolean
  entitlements: Entitlements
  prices: Prices
  busy: ProductId | 'restore' | null
  message: string | null
  paywall: PaywallReason | null
  /** The one-time "after Sector 1 clear" paywall has been shown. Persisted. */
  sector1PaywallShown: boolean
  init: () => Promise<void>
  buy: (id: ProductId) => Promise<void>
  restore: () => Promise<void>
  openPaywall: (reason: PaywallReason) => void
  closePaywall: () => void
}

let adapter: Promise<PurchasesAdapter> | null = null
const getAdapter = () => (adapter ??= createPurchasesAdapter())

const errorText = (e: unknown) => (e instanceof Error && e.message ? e.message : 'Store unavailable. Try again.')

export const usePurchases = create<PurchaseStore>()(
  persist(
    (set, get) => ({
      kind: null,
      ready: false,
      entitlements: { ...NO_ENTITLEMENTS },
      prices: { ...LIST_PRICES },
      busy: null,
      message: null,
      paywall: null,
      sector1PaywallShown: false,

      init: async () => {
        if (get().ready) return
        try {
          const a = await getAdapter()
          const { entitlements, prices } = await a.init()
          set({ kind: a.kind, ready: true, entitlements, prices })
        } catch (e) {
          adapter = null
          set({ ready: false, message: errorText(e) })
        }
      },

      buy: async (id) => {
        if (get().busy) return
        set({ busy: id, message: null })
        try {
          const entitlements = await (await getAdapter()).purchase(id)
          const unlocked = id === 'foundry_pass' ? entitlements.foundry : entitlements.skins
          set({ entitlements, message: unlocked ? (id === 'foundry_pass' ? 'FOUNDRY PASS ACTIVE' : 'SKIN PACK ACTIVE') : null })
        } catch (e) {
          set({ message: e instanceof PurchaseCancelled ? null : errorText(e) })
        } finally {
          set({ busy: null })
        }
      },

      restore: async () => {
        if (get().busy) return
        set({ busy: 'restore', message: null })
        try {
          const entitlements = await (await getAdapter()).restore()
          const any = entitlements.foundry || entitlements.skins
          set({ entitlements, message: any ? 'PURCHASES RESTORED' : 'NOTHING TO RESTORE' })
        } catch (e) {
          set({ message: errorText(e) })
        } finally {
          set({ busy: null })
        }
      },

      openPaywall: (reason) =>
        set((s) => ({
          paywall: reason,
          message: null,
          sector1PaywallShown: s.sector1PaywallShown || reason === 'sector1',
        })),

      closePaywall: () => set({ paywall: null, message: null }),
    }),
    {
      name: 'shutdown-purchases',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({ sector1PaywallShown: s.sector1PaywallShown }),
    },
  ),
)

export const hasFoundry = () => usePurchases.getState().entitlements.foundry
