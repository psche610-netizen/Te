'use client'

import { useEffect, useLayoutEffect, useRef, type PointerEvent } from 'react'
import { LOCKER, MIC } from '@/lib/game/config'
import { actions } from '@/lib/game/actions'
import { bindKeyboard, input } from '@/lib/game/input'
import { live } from '@/lib/game/live'
import { useGameStore } from '@/lib/game/store'
import { Notice, Subtitle } from './game-hud'
import { MicMeter } from './mic-meter'

const SLIT_TOP = 'M2 24 L97.5 30 L97.5 47 L2 39.5 Z'
const SLIT_BOTTOM = 'M2.5 47.5 L97 55 L97 64 L2.5 59.5 Z'

const check = () => live.session?.hide?.check ?? null

/** rAF loop that hands the current locker check to `apply`. */
function useCheckFrame(apply: (c: NonNullable<ReturnType<typeof check>>) => void) {
  const applyRef = useRef(apply)
  useLayoutEffect(() => {
    applyRef.current = apply
  })
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const c = check()
      if (c) applyRef.current(c)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
}

function HoldProgress() {
  const bar = useRef<HTMLSpanElement>(null)
  useCheckFrame((c) => {
    if (bar.current) bar.current.style.transform = `scaleX(${Math.min(1, c.time / MIC.lockerHoldSeconds)})`
  })
  return (
    <span className="block h-0.5 w-full bg-graphite" aria-hidden="true">
      <span ref={bar} className="block h-full origin-left scale-x-0 bg-signal" />
    </span>
  )
}

function MicBreath() {
  const label = useRef<HTMLSpanElement>(null)
  const micLevel = () => live.session?.micLevel ?? 0
  useCheckFrame(() => {
    const el = label.current
    if (!el) return
    const loud = micLevel() > MIC.threshold
    el.textContent = loud ? 'TOO LOUD' : 'SILENCE'
    el.dataset.loud = loud ? '1' : '0'
  })
  return (
    <>
      <MicMeter bars={36} read={micLevel} lit="signal" className="h-8 w-full md:h-10" />
      <HoldProgress />
      <span ref={label} className="text-xs tracking-label text-signal data-[loud=1]:text-danger md:text-sm">
        SILENCE
      </span>
    </>
  )
}

function NeedleBreath() {
  const zone = useRef<HTMLSpanElement>(null)
  const needle = useRef<HTMLSpanElement>(null)
  const width = LOCKER.fallback.zoneWidth

  useCheckFrame((c) => {
    if (zone.current) zone.current.style.left = `${(c.zone - width / 2) * 100}%`
    const n = needle.current
    if (n) {
      n.style.left = `${c.needle * 100}%`
      n.dataset.out = Math.abs(c.needle - c.zone) > width / 2 ? '1' : '0'
    }
  })

  const release = () => {
    input.breathTouch = false
  }
  const press = (e: PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    input.breathTouch = true
  }

  return (
    <div className="flex w-full items-center gap-4">
      <div className="flex flex-1 flex-col gap-2">
        <div className="relative h-8 w-full border border-concrete md:h-10" aria-hidden="true">
          <span
            ref={zone}
            className="absolute inset-y-0 border-x border-signal bg-graphite"
            style={{ width: `${width * 100}%`, left: `${(0.5 - width / 2) * 100}%` }}
          />
          <span
            ref={needle}
            data-out="0"
            className="absolute inset-y-[-4px] w-0.5 -translate-x-1/2 bg-bone data-[out=1]:bg-danger"
            style={{ left: '50%' }}
          />
        </div>
        <HoldProgress />
        <span className="text-center text-xs tracking-label text-signal md:text-sm">KEEP IT IN THE ZONE</span>
      </div>
      <button
        type="button"
        aria-label="Hold breath (hold)"
        className="pointer-events-auto flex size-20 shrink-0 touch-none flex-col items-center justify-center rounded-full border border-signal text-xs tracking-label text-signal active:bg-signal active:text-ink md:size-24"
        onPointerDown={press}
        onPointerUp={release}
        onPointerCancel={release}
        onContextMenu={(e) => e.preventDefault()}
      >
        HOLD
        <span className="hidden text-[9px] md:block">{'[SPACE]'}</span>
      </button>
    </div>
  )
}

export function LockerView() {
  const checking = useGameStore((s) => s.lockerCheck)
  const micActive = useGameStore((s) => s.micActive)

  useEffect(() => {
    const unbind = bindKeyboard()
    return () => {
      unbind()
      input.breathTouch = false
    }
  }, [])

  return (
    <div className="pointer-events-none absolute inset-0 select-none">
      <svg
        className="absolute inset-0 size-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path fillRule="evenodd" fill="var(--color-ink)" d={`M-1 -1 H101 V101 H-1 Z ${SLIT_TOP} ${SLIT_BOTTOM}`} />
        <path
          d={`${SLIT_TOP} ${SLIT_BOTTOM}`}
          fill="none"
          stroke="var(--color-graphite)"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <div className="absolute inset-0 safe-area">
        <Subtitle />
        <Notice />
        <p className="absolute right-[max(1.5rem,env(safe-area-inset-right))] top-[max(1rem,env(safe-area-inset-top))] border border-concrete px-3 py-1.5 text-xs tracking-label text-concrete md:text-sm">
          HIDDEN
        </p>

        <div className="absolute inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] flex justify-center px-6">
          {checking ? (
            <div className="flex w-full max-w-xl flex-col items-center gap-2" role="status" aria-label="Hold your breath">
              <p className="font-mono text-base tracking-label text-bone md:text-xl">HOLD YOUR BREATH</p>
              {micActive ? <MicBreath /> : <NeedleBreath />}
            </div>
          ) : (
            <div className="flex w-full items-end justify-between">
              <p className="text-xs tracking-label text-concrete">{micActive ? 'STAY QUIET // IT CAN HEAR YOU' : 'STAY PUT'}</p>
              <button
                type="button"
                onClick={() => {
                  actions.hide = true
                }}
                className="pointer-events-auto h-12 border border-bone px-6 text-xs tracking-label text-bone active:bg-bone active:text-ink"
              >
                EXIT LOCKER
                <span className="ml-2 hidden text-concrete md:inline">{'[F]'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
