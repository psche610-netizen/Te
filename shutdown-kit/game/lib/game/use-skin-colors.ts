import { useShallow } from 'zustand/react/shallow'
import { usePurchases } from '@/lib/purchases/store'
import { activeSkinColors } from './skins'
import { useGameStore } from './store'

/** Palette keys for the player's jumpsuit and the hunter shell, respecting the `skins` entitlement. */
export function useSkinColors() {
  const entitled = usePurchases((s) => s.entitlements.skins)
  const choice = useGameStore(useShallow((s) => s.skins))
  return activeSkinColors(choice, entitled)
}
