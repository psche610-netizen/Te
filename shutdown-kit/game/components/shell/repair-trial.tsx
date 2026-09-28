'use client'

import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react'
import { actions, type RepairResult } from '@/lib/game/actions'
import { PERK_EFFECTS, REPAIR } from '@/lib/game/config'
import type { RepairState, TrialKind } from '@/lib/game/session'
import { useGameStore } from '@/lib/game/store'

type StageProps = { night: number; stage: number; quick: boolean; steady: boolean; onPass: () => void; onFail: () => void }

const TAU = Math.PI * 2

/** rAF loop with elapsed seconds. Stops on unmount. */
function useTicker(tick: (dt: number) => void) {
  const cb = useRef(tick)
  cb.current = tick
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const loop = (now: number) => {
      if (!useGameStore.getState().paused) cb.current(Math.min(0.05, (now - last) / 1000))
      last = now
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])
}

/** Space / Enter while the trial is open. */
function useActionKey(onDown: () => void, onUp?: () => void) {
  const down = useRef(onDown)
  const up = useRef(onUp)
  down.current = onDown
  up.current = onUp
  useEffect(() => {
    const isKey = (e: KeyboardEvent) => e.code === 'Space' || e.code === 'Enter'
    const kd = (e: KeyboardEvent) => {
      if (!isKey(e) || useGameStore.getState().paused) return
      e.preventDefault()
      if (!e.repeat) down.current()
    }
    const ku = (e: KeyboardEvent) => {
      if (isKey(e) && !useGameStore.getState().paused) up.current?.()
    }
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)
    return () => {
      window.removeEventListener('keydown', kd)
      window.removeEventListener('keyup', ku)
    }
  }, [])
}

function arcPath(r: number, from: number, to: number) {
  const p = (a: number) => `${50 + Math.sin(a) * r} ${50 - Math.cos(a) * r}`
  const large = to - from > Math.PI ? 1 : 0
  return `M ${p(from)} A ${r} ${r} 0 ${large} 1 ${p(to)}`
}

function NeedleStage({ night, stage, quick, steady, onPass, onFail }: StageProps) {
  const cfg = REPAIR.needle
  const needle = useRef<SVGGElement>(null)
  const angle = useRef(0)
  const zone = useMemo(() => {
    const deg = (cfg.zoneDeg - (night - 1) * cfg.zoneShrinkPerNight) * (steady ? PERK_EFFECTS.steadyZone : 1)
    const size = (deg * Math.PI) / 180
    const start = Math.PI * 0.5 + Math.random() * Math.PI * 1.2
    return { start, end: start + size }
  }, [cfg, night, steady])
  const speed =
    (cfg.speed + (night - 1) * cfg.speedPerNight + stage * cfg.speedPerStage) *
    (quick ? PERK_EFFECTS.quickHandsMotion : 1) *
    (stage % 2 ? -1 : 1)

  useTicker((dt) => {
    angle.current = (((angle.current + speed * dt) % TAU) + TAU) % TAU
    needle.current?.setAttribute('transform', `rotate(${(angle.current * 180) / Math.PI} 50 50)`)
  })

  const stop = () => {
    const a = angle.current
    const inZone = (a >= zone.start && a <= zone.end) || (a + TAU >= zone.start && a + TAU <= zone.end)
    if (inZone) onPass()
    else onFail()
  }
  useActionKey(stop)

  return (
    <div className="flex flex-col items-center gap-3">
      <button type="button" onClick={stop} aria-label="Stop the needle" className="size-40 touch-none md:size-48">
        <svg viewBox="0 0 100 100" className="size-full" aria-hidden="true">
          <circle cx="50" cy="50" r="42" fill="none" stroke="var(--color-concrete)" strokeWidth="1" />
          <path d={arcPath(42, zone.start, zone.end)} fill="none" stroke="var(--color-signal)" strokeWidth="8" />
          <g ref={needle}>
            <line x1="50" y1="50" x2="50" y2="4" stroke="var(--color-bone)" strokeWidth="2" />
          </g>
          <circle cx="50" cy="50" r="3" fill="var(--color-bone)" />
        </svg>
      </button>
      <p className="text-[10px] tracking-label text-concrete">{'TAP / SPACE TO STOP IN THE ZONE'}</p>
    </div>
  )
}

const WIRES = [
  { name: 'BONE', className: 'bg-bone' },
  { name: 'SIGNAL', className: 'bg-signal' },
  { name: 'CONCRETE', className: 'bg-concrete' },
  { name: 'BLACK', className: 'bg-ink border border-concrete' },
] as const

function WiresStage({ night, quick, onPass, onFail }: StageProps) {
  const cfg = REPAIR.wires
  const limit = (cfg.timePerCut - (night - 1) * cfg.timeShrinkPerNight) * (quick ? PERK_EFFECTS.quickHandsTime : 1)
  const bar = useRef<HTMLSpanElement>(null)
  const elapsed = useRef(0)
  const done = useRef(false)
  const { order, target } = useMemo(() => {
    const order = [...WIRES].sort(() => Math.random() - 0.5)
    return { order, target: order[Math.floor(Math.random() * order.length)].name }
  }, [])

  const cut = (name: string) => {
    if (done.current) return
    done.current = true
    if (name === target) onPass()
    else onFail()
  }

  useTicker((dt) => {
    if (done.current) return
    elapsed.current += dt
    if (bar.current) bar.current.style.width = `${Math.max(0, 1 - elapsed.current / limit) * 100}%`
    if (elapsed.current >= limit) {
      done.current = true
      onFail()
    }
  })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const i = Number(e.key) - 1
      if (i >= 0 && i < order.length) cut(order[i].name)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <p className="text-sm tracking-label text-bone">
        {'CUT '}
        <span className="text-signal">{target}</span>
      </p>
      <div className="flex gap-4">
        {order.map((w, i) => (
          <button
            key={w.name}
            type="button"
            onClick={() => cut(w.name)}
            aria-label={`Cut ${w.name.toLowerCase()} wire`}
            className="flex flex-col items-center gap-2"
          >
            <span className={`block h-24 w-5 md:h-28 ${w.className}`} />
            <span className="hidden text-[10px] text-concrete md:block">{i + 1}</span>
          </button>
        ))}
      </div>
      <span className="h-1 w-48 bg-graphite" aria-hidden="true">
        <span ref={bar} className="block h-full w-full bg-bone" />
      </span>
    </div>
  )
}

function HoldStage({ night, quick, steady, onPass, onFail }: StageProps) {
  const paused = useGameStore(s => s.paused)
  const cfg = REPAIR.hold
  const fillTime = cfg.fillTime * (quick ? PERK_EFFECTS.quickHandsTime : 1)
  const fill = useRef(0)
  const holding = useRef(false)
  const done = useRef(false)
  const bar = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (paused) {
      holding.current = false
      fill.current = 0
      if (bar.current) bar.current.style.width = '0%'
    }
  }, [paused])

  const window_ = useMemo(() => {
    const size = (cfg.window - (night - 1) * cfg.windowShrinkPerNight) * (steady ? PERK_EFFECTS.steadyZone : 1)
    const start = 0.45 + Math.random() * (0.9 - 0.45 - size)
    return { start, end: start + size }
  }, [cfg, night, steady])

  const press = () => {
    if (!done.current) holding.current = true
  }
  const release = () => {
    if (!holding.current || done.current) return
    holding.current = false
    done.current = true
    if (fill.current >= window_.start && fill.current <= window_.end) onPass()
    else onFail()
  }

  useTicker((dt) => {
    if (done.current || !holding.current) return
    fill.current += dt / fillTime
    if (bar.current) bar.current.style.width = `${Math.min(1, fill.current) * 100}%`
    if (fill.current >= 1) {
      done.current = true
      onFail()
    }
  })
  useActionKey(press, release)

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="relative h-6 w-64 border border-concrete md:w-80" aria-hidden="true">
        <span
          className="absolute inset-y-0 bg-signal/40 outline-1 outline-signal"
          style={{ left: `${window_.start * 100}%`, width: `${(window_.end - window_.start) * 100}%` }}
        />
        <span ref={bar} className="absolute inset-y-1 left-0 w-0 bg-bone" />
      </div>
      <button
        type="button"
        aria-label="Hold, release inside the window"
        className="h-14 w-40 touch-none border border-bone text-xs tracking-label text-bone active:bg-bone active:text-ink"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          press()
        }}
        onPointerUp={release}
        onPointerCancel={release}
        onContextMenu={(e) => e.preventDefault()}
      >
        HOLD
      </button>
      <p className="text-[10px] tracking-label text-concrete">{'HOLD, RELEASE INSIDE THE WINDOW'}</p>
    </div>
  )
}

const STAGE: Record<TrialKind, ComponentType<StageProps>> = {
  needle: NeedleStage,
  wires: WiresStage,
  hold: HoldStage,
}

const TITLE: Record<TrialKind, string> = { needle: 'CALIBRATE', wires: 'REROUTE', hold: 'PRIME' }

function Trial({ repair }: { repair: RepairState }) {
  const inCore = useGameStore((s) => s.purge !== null)
  const [stage, setStage] = useState(0)
  const finished = useRef(false)
  const finish = (r: RepairResult) => {
    if (finished.current) return
    finished.current = true
    actions.repairResult = r
  }
  const pass = () => (stage + 1 >= REPAIR.stages ? finish('success') : setStage(stage + 1))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape' && !useGameStore.getState().paused) finish('abort')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const sequence: TrialKind[] = ['needle', 'wires', 'hold']
  const kind = sequence[(sequence.indexOf(repair.trial) + stage) % sequence.length]
  const Stage = STAGE[kind]

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="repair-title"
      className="pointer-events-auto absolute inset-x-0 bottom-0 flex justify-center pb-[max(1rem,env(safe-area-inset-bottom))] safe-area"
    >
      <div className="flex w-full max-w-lg flex-col gap-4 border-t border-signal bg-ink/90 px-5 pb-4 pt-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-[10px] tracking-label text-concrete">
              {`${inCore ? 'KILL SWITCH' : 'GENERATOR'} ${String(repair.generatorId + 1).padStart(2, '0')} // ${inCore ? 'OVERRIDE' : 'REPAIR'}`}
            </p>
            <h2 id="repair-title" className="font-display text-3xl uppercase leading-none text-bone">
              {TITLE[kind]}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-1.5" aria-label={`Stage ${stage + 1} of ${REPAIR.stages}`}>
              {Array.from({ length: REPAIR.stages }, (_, i) => (
                <span key={i} className={i < stage ? 'size-3 bg-signal' : 'size-3 border border-bone'} />
              ))}
            </div>
            <button
              type="button"
              onClick={() => finish('abort')}
              className="border border-concrete px-3 py-2 text-[10px] tracking-label text-concrete transition-colors hover:border-bone hover:text-bone"
            >
              {'ABORT [ESC]'}
            </button>
          </div>
        </div>
        <Stage
          key={stage}
          night={repair.night}
          stage={stage}
          quick={repair.quick}
          steady={repair.steady}
          onPass={pass}
          onFail={() => finish('fail')}
        />
      </div>
    </div>
  )
}

export function RepairTrial() {
  const repair = useGameStore((s) => s.repair)
  if (!repair) return null
  return <Trial key={`${repair.generatorId}-${repair.trial}`} repair={repair} />
}
