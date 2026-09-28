export type ProductId = 'foundry_pass' | 'skin_pack'
export type EntitlementId = 'foundry' | 'skins'

export type Entitlements = Record<EntitlementId, boolean>
export type Prices = Record<ProductId, string>

export const NO_ENTITLEMENTS: Entitlements = { foundry: false, skins: false }

/** Fallback labels until the store returns localized prices. */
export const LIST_PRICES: Prices = { foundry_pass: '$2.99', skin_pack: '$0.99' }

export const PRODUCT_ENTITLEMENT: Record<ProductId, EntitlementId> = {
  foundry_pass: 'foundry',
  skin_pack: 'skins',
}

/** The player backed out of the store sheet. Not an error worth showing. */
export class PurchaseCancelled extends Error {
  constructor() {
    super('Purchase cancelled')
  }
}

/**
 * One interface for the real RevenueCat SDK (Capacitor, on device) and the labeled mock (web preview).
 * Every call returns the full current entitlement set, so callers never merge partial state.
 */
export interface PurchasesAdapter {
  kind: 'revenuecat' | 'mock'
  init(): Promise<{ entitlements: Entitlements; prices: Prices }>
  purchase(id: ProductId): Promise<Entitlements>
  restore(): Promise<Entitlements>
}
