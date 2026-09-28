'use client'

import { useGameStore, type Screen } from '@/lib/game/store'
import { FullscreenButton } from './fullscreen-button'

const MENU: { label: string; screen: Exclude<Screen, 'game' | 'calibrate'> }[] = [
  { label: 'PLAY', screen: 'sectors' },
  { label: 'PERKS', screen: 'loadout' },
  { label: 'SETTINGS', screen: 'settings' },
]

/** Screen 01. */
export function TitleOverlay() {
  const setScreen = useGameStore((s) => s.setScreen)
  const scrap = useGameStore((s) => s.scrap)

  return (
    <div className="pointer-events-none absolute inset-0 safe-area">
      <div className="flex h-full flex-col justify-between p-6 md:p-10 lg:p-12">
        <div className="flex w-fit max-w-[43%] flex-col gap-2 pt-[5vh]">
          <p className="text-xs tracking-label text-concrete">FACILITY 07</p>
          <h1 className="font-display text-[clamp(3.5rem,8.5vw,10rem)] leading-[0.95] tracking-[-0.035em] text-bone">SHUTDOWN</h1>
          <p className="mt-2 max-w-64 text-[10px] leading-relaxed text-bone/60 md:text-xs">THE BUILDING IS HUNTING YOU.<br />AND IT CAN HEAR YOU.</p>
          <div className="mt-3 h-px w-full bg-concrete" />
          <nav aria-label="Main menu" className="mt-4 flex flex-col items-start gap-3">
            {MENU.map((item, i) => (
              <button
                key={item.label}
                type="button"
                onClick={() => setScreen(item.screen)}
                className={`pointer-events-auto text-base tracking-label transition-colors hover:text-signal focus-visible:outline-1 md:text-lg ${
                  i === 0 ? 'text-signal' : 'text-bone'
                }`}
              >
                {i === 0 ? `${item.label} \u2192` : item.label}
              </button>
            ))}
          </nav>
        </div>
        <p className="text-xs tracking-label text-concrete">{`FACILITY 07 // SCRAP ${scrap}`}</p>
      </div>

      <div className="absolute right-[max(1.5rem,env(safe-area-inset-right))] top-[max(1.5rem,env(safe-area-inset-top))]">
        <FullscreenButton />
      </div>
    </div>
  )
}
