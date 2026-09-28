import { LIST_PRICES, NO_ENTITLEMENTS, PRODUCT_ENTITLEMENT, type Entitlements, type PurchasesAdapter } from './types'

const KEY = 'shutdown-mock-store'
const LATENCY_MS = 700

function load(): Entitlements {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Entitlements>
    return { foundry: raw.foundry === true, skins: raw.skins === true }
  } catch {
    return { ...NO_ENTITLEMENTS }
  }
}

const wait = () => new Promise((r) => setTimeout(r, LATENCY_MS))

/**
 * Web preview only. No store, no charge: "purchases" are flags in this browser's localStorage.
 * The paywall labels it as a mock so it's never mistaken for the real flow.
 */
export function createMockAdapter(): PurchasesAdapter {
  return {
    kind: 'mock',
    async init() {
      return { entitlements: load(), prices: LIST_PRICES }
    },
    async purchase(id) {
      await wait()
      const next = { ...load(), [PRODUCT_ENTITLEMENT[id]]: true }
      localStorage.setItem(KEY, JSON.stringify(next))
      return next
    },
    async restore() {
      await wait()
      return load()
    },
  }
}
