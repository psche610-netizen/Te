import { Capacitor } from '@capacitor/core'
import { createMockAdapter } from './mock'
import type { PurchasesAdapter } from './types'

/** RevenueCat public SDK key, injected at build time. Never hardcoded. */
const ANDROID_KEY = process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_KEY

/**
 * Real RevenueCat on an Android device with a key; the labeled mock everywhere else
 * (web preview, or a device build without a key).
 */
export async function createPurchasesAdapter(): Promise<PurchasesAdapter> {
  if (Capacitor.getPlatform() === 'android' && ANDROID_KEY) {
    const { createRevenueCatAdapter } = await import('./revenuecat')
    return createRevenueCatAdapter(ANDROID_KEY)
  }
  return createMockAdapter()
}

export * from './types'
