type LockableOrientation = ScreenOrientation & {
  lock?: (orientation: 'landscape') => Promise<void>
}

export function isFullscreen() {
  return typeof document !== 'undefined' && !!document.fullscreenElement
}

/** Requests fullscreen and a landscape lock. Both fail silently where unsupported (iOS Safari, iframes). */
export async function enterFullscreenLandscape() {
  if (typeof document === 'undefined') return
  try {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' })
    }
  } catch {}
  try {
    await (screen.orientation as LockableOrientation | undefined)?.lock?.('landscape')
  } catch {}
}

export async function exitFullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen()
  } catch {}
}
