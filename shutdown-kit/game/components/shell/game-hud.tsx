'use client'

import { FacilityMap } from './facility-map'
import { MISSIONS, missionForNight } from '@/lib/game/missions'
import { MODIFIER_LABEL, nightModifier, sectorDef } from '@/lib/game/campaign'
import { live } from '@/lib/game/live'
import { useGameStore } from '@/lib/game/store'
import { FullscreenButton } from './fullscreen-button'
import { MicMeter } from './mic-meter'

const SHOW_DEBUG = false

function formatTime(sec: number) {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
}

function ObjectiveStatus() {
  const night = useGameStore((s) => s.night)
  const repaired = useGameStore((s) => s.repaired)
  const total = useGameStore((s) => s.totalGenerators)
  const gatesPowered = useGameStore((s) => s.gatesPowered)
  const finalChase = useGameStore((s) => s.finalChase)
  const purge = useGameStore((s) => s.purge)
  const purgeMax = useGameStore((s) => s.purgeMax)

  if (purge !== null) {
    const low = purge <= 30
    return (
      <div className="flex flex-col gap-1.5" role="timer" aria-live="off">
        <p className="font-display text-3xl leading-none tracking-wide text-bone">
          {'CORE '}
          <span className="text-danger">{repaired}</span>
          {`/${total}`}
        </p>
        <div className="flex items-center gap-2">
          <div
            className="h-2 w-28 bg-graphite md:w-40"
            role="progressbar"
            aria-label="Purge timer"
            aria-valuemin={0}
            aria-valuemax={purgeMax}
            aria-valuenow={purge}
          >
            <div className="h-full bg-danger transition-[width] duration-1000 ease-linear" style={{ width: `${(purge / purgeMax) * 100}%` }} />
          </div>
          <span className={`text-xs tracking-label ${low ? 'text-danger' : 'text-bone'}`}>{`PURGE ${formatTime(purge)}`}</span>
        </div>
      </div>
    )
  }

  if (gatesPowered) {
    return (
      <div className="flex flex-col gap-1" role="timer" aria-live="off">
        <p className="text-sm tracking-label text-signal md:text-base">{'GATES POWERED // ESCAPE'}</p>
        <p className={`font-display text-4xl leading-none ${finalChase <= 10 ? 'text-danger' : 'text-bone'}`}>
          {formatTime(finalChase)}
        </p>
      </div>
    )
  }

  return (
    <>
      <p className="text-sm tracking-label text-bone md:text-base">{`${MISSIONS[missionForNight(night)].verb} ${repaired}/${total}`}</p>
      <div className="flex gap-1.5" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={i < repaired ? 'size-4 bg-signal' : 'size-4 border border-bone'} />
        ))}
      </div>
    </>
  )
}

const readMic = () => live.session?.micLevel ?? 0

function HudMic() {
  const micActive = useGameStore((s) => s.micActive)
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] tracking-label text-concrete">{micActive ? 'MIC' : 'MIC OFF'}</span>
      {micActive && <MicMeter bars={12} read={readMic} showThreshold={false} className="h-3 w-20" />}
    </div>
  )
}

/** OVERSEER subtitle, top center (screen 05). */
export function Subtitle() {
  const subtitle = useGameStore((s) => s.subtitle)
  return (
    <p
      aria-live="assertive"
      className="pointer-events-none absolute inset-x-0 top-[max(1rem,env(safe-area-inset-top))] mx-auto max-w-[46%] text-center font-mono text-xs leading-relaxed text-bone md:top-6 md:text-sm"
    >
      {subtitle && (
        <span key={subtitle.id} className="bg-ink/70 px-2 py-1 [box-decoration-break:clone]">
          <span className="text-concrete">{'OVERSEER: '}</span>
          {subtitle.text}
        </span>
      )}
    </p>
  )
}

/** Terse system status line under the subtitle. */
export function Notice() {
  const notice = useGameStore((s) => s.notice)
  return (
    <p
      aria-live="polite"
      className="pointer-events-none absolute inset-x-0 top-[max(4rem,calc(env(safe-area-inset-top)+3rem))] mx-auto max-w-[46%] text-center text-[10px] tracking-label text-concrete md:top-16 md:text-xs"
    >
      {notice && <span key={notice.id} className="bg-ink/70 px-2 py-0.5">{notice.text}</span>}
    </p>
  )
}

function DevPanel() {
  const hunterMode = useGameStore((s) => s.hunterMode)
  return <p className="text-[10px] tracking-label text-concrete">{`DEV // HUNTER ${hunterMode.toUpperCase()}`}</p>
}

function NightLabel() {
  const sector = useGameStore((s) => s.sector)
  const night = useGameStore((s) => s.night)
  const daily = useGameStore((s) => s.daily)
  const secondWindReady = useGameStore((s) => s.secondWindReady)
  const ghost = useGameStore((s) => s.ghost)
  const def = sectorDef(sector)
  const mod = daily ? daily.modifier : nightModifier(sector, night)
  const title = daily
    ? `DAILY // ${daily.date} // ${def.name}`
    : def.access === 'finale'
      ? `${def.code} // ${def.name}`
      : `${def.code} // ${def.name} // NIGHT ${night}`
  const status = [mod !== 'none' && MODIFIER_LABEL[mod], secondWindReady && 'SECOND WIND READY', ghost && 'GHOST // CAMERAS BLIND']
    .filter(Boolean)
    .join(' // ')
  return (
    <div className="mt-1 flex flex-col gap-0.5 text-[10px] tracking-label text-concrete">
      <p>{title}</p>
      {status && <p className="text-bone">{status}</p>}
    </div>
  )
}

export function GameHud() {
  const setPaused = useGameStore((s) => s.setPaused)

  return (
    <div className="pointer-events-none absolute inset-0 safe-area">
      <FacilityMap />
      <Subtitle />
      <Notice />
      <div className="flex items-start justify-between p-4 md:p-6">
        <div className="flex flex-col gap-2 border-l-2 border-signal bg-ink/90 px-3 py-2">
          <ObjectiveStatus />
          <NightLabel />
          <HudMic />
          {SHOW_DEBUG && <DevPanel />}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPaused(true)}
            className="pointer-events-auto border border-concrete px-3 py-2 text-xs tracking-label text-bone transition-colors hover:border-bone focus-visible:outline-1"
          >
            PAUSE
          </button>
          <FullscreenButton />
        </div>
      </div>
    </div>
  )
}
