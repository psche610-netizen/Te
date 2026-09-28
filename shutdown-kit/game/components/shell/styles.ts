export const BTN_PRIMARY =
  'pointer-events-auto flex h-11 items-center justify-center border border-signal bg-signal px-6 font-display text-xl tracking-wide text-ink transition-colors hover:border-bone hover:bg-bone disabled:cursor-not-allowed disabled:border-graphite disabled:bg-graphite disabled:text-concrete focus-visible:outline-1 focus-visible:outline-bone md:h-14 md:text-2xl'

export const BTN_SECONDARY =
  'pointer-events-auto flex h-11 items-center justify-center border border-bone px-6 font-display text-xl tracking-wide text-bone transition-colors hover:bg-bone hover:text-ink focus-visible:outline-1 focus-visible:outline-bone md:h-14 md:text-2xl'

export const BTN_GHOST =
  'pointer-events-auto text-xs tracking-label text-concrete transition-colors hover:text-bone focus-visible:outline-1 focus-visible:outline-bone'

export function formatClock(sec: number) {
  const s = Math.max(0, Math.floor(sec))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
