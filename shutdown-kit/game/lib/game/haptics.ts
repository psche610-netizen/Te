import { Capacitor, registerPlugin } from '@capacitor/core'
import { JUICE } from './config'
import { useGameStore } from './store'

export type HapticKind = 'light' | 'medium' | 'heavy'

type ImpactStyle = 'LIGHT' | 'MEDIUM' | 'HEAVY'

interface HapticsPlugin {
  impact(options: { style: ImpactStyle }): Promise<void>
}

/**
 * Native bridge to the `@capacitor/haptics` plugin (installed natively by `cap sync`).
 * Registered by name so the web bundle doesn't need the plugin's JS.
 */
const NativeHaptics = registerPlugin<HapticsPlugin>('Haptics')

const WEB_MS: Record<HapticKind, number> = { light: 12, medium: 25, heavy: 60 }
const STYLE: Record<HapticKind, ImpactStyle> = { light: 'LIGHT', medium: 'MEDIUM', heavy: 'HEAVY' }

let lastLight = 0

/** Haptic tap. Honors `settings.haptics`. Light taps are rate-limited. */
export function haptic(kind: HapticKind) {
  if (typeof window === 'undefined') return
  if (!useGameStore.getState().settings.haptics) return
  if (kind === 'light') {
    const now = performance.now()
    if (now - lastLight < JUICE.hapticGap * 1000) return
    lastLight = now
  }
  if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Haptics')) {
    NativeHaptics.impact({ style: STYLE[kind] }).catch(() => {})
    return
  }
  try {
    navigator.vibrate?.(WEB_MS[kind])
  } catch {
    // Some browsers throw when vibrate is blocked; haptics are optional.
  }
}
