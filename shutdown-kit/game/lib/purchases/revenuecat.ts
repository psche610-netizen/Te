import type { CustomerInfo, PurchasesStoreProduct } from '@revenuecat/purchases-capacitor'
import {
  LIST_PRICES,
  PurchaseCancelled,
  type EntitlementId,
  type Entitlements,
  type Prices,
  type ProductId,
  type PurchasesAdapter,
} from './types'

const PRODUCT_IDS: ProductId[] = ['foundry_pass', 'skin_pack']

const toEntitlements = (info: CustomerInfo): Entitlements => {
  const active = (id: EntitlementId) => info.entitlements.active[id]?.isActive === true
  return { foundry: active('foundry'), skins: active('skins') }
}

/**
 * RevenueCat Capacitor SDK. Only loaded on a native platform, so the web bundle never touches the plugin.
 * `apiKey` is the RevenueCat public SDK key (Test Store key for the demo build).
 */
export async function createRevenueCatAdapter(apiKey: string): Promise<PurchasesAdapter> {
  const { Purchases, PRODUCT_CATEGORY } = await import('@revenuecat/purchases-capacitor')
  const products = new Map<ProductId, PurchasesStoreProduct>()

  const loadProducts = async () => {
    const { products: list } = await Purchases.getProducts({
      productIdentifiers: PRODUCT_IDS,
      type: PRODUCT_CATEGORY.NON_SUBSCRIPTION,
    })
    for (const p of list) {
      const id = PRODUCT_IDS.find((pid) => p.identifier === pid || p.identifier.startsWith(`${pid}:`))
      if (id) products.set(id, p)
    }
  }

  return {
    kind: 'revenuecat',
    async init() {
      await Purchases.configure({ apiKey })
      const [{ customerInfo }] = await Promise.all([Purchases.getCustomerInfo(), loadProducts().catch(() => {})])
      const prices: Prices = { ...LIST_PRICES }
      for (const [id, p] of products) prices[id] = p.priceString
      return { entitlements: toEntitlements(customerInfo), prices }
    },
    async purchase(id) {
      if (!products.has(id)) await loadProducts()
      const product = products.get(id)
      if (!product) throw new Error(`Product ${id} is not available`)
      try {
        const { customerInfo } = await Purchases.purchaseStoreProduct({ product })
        return toEntitlements(customerInfo)
      } catch (e) {
        if ((e as { userCancelled?: boolean })?.userCancelled) throw new PurchaseCancelled()
        throw e
      }
    },
    async restore() {
      const { customerInfo } = await Purchases.restorePurchases()
      return toEntitlements(customerInfo)
    },
  }
}
