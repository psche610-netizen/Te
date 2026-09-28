'use client'

import { useEffect, useRef, type PointerEvent } from 'react'
import { MISSIONS, missionForNight } from '@/lib/game/missions'
import { actions } from '@/lib/game/actions'
import { bindKeyboard, input } from '@/lib/game/input'
import type { HackKind } from '@/lib/game/session'
import { useGameStore } from '@/lib/game/store'

const MAX_RADIUS = 48

function Joystick() {
  const base = useRef<HTMLDivElement>(null)
  const knob = useRef<HTMLDivElement>(null)
  const pointerId = useRef<number | null>(null)

  const update = (e: PointerEvent) => {
    const rect = base.current!.getBoundingClientRect()
    let dx = e.clientX - (rect.left + rect.width / 2)
    let dy = e.clientY - (rect.top + rect.height / 2)
    const len = Math.hypot(dx, dy)
    if (len > MAX_RADIUS) {
      dx = (dx / len) * MAX_RADIUS
      dy = (dy / len) * MAX_RADIUS
    }
    input.joyX = dx / MAX_RADIUS
    input.joyY = -dy / MAX_RADIUS
    knob.current!.style.transform = `translate(${dx}px, ${dy}px)`
  }

  const release = () => {
    pointerId.current = null
    input.joyX = 0
    input.joyY = 0
    if (knob.current) knob.current.style.transform = 'translate(0px, 0px)'
  }

  useEffect(() => release, [])

  return (
    <div
      ref={base}
      role="application"
      aria-label="Movement joystick"
      className="pointer-events-auto flex size-32 touch-none items-center justify-center rounded-full border border-concrete md:size-36"
      onPointerDown={(e) => {
        pointerId.current = e.pointerId
        e.currentTarget.setPointerCapture(e.pointerId)
        update(e)
      }}
      onPointerMove={(e) => {
        if (pointerId.current === e.pointerId) update(e)
      }}
      onPointerUp={release}
      onPointerCancel={release}
    >
      <div ref={knob} className="size-12 rounded-full bg-concrete" />
    </div>
  )
}

const ROUND = 'flex size-16 flex-col items-center justify-center rounded-full border text-xs tracking-label md:size-20'

const HACK_LABEL: Record<HackKind, string> = { door: 'DOOR', wall: 'WALL', camera: 'CAM' }

function UseButton() {
  const night = useGameStore((s) => s.night)
  const context = useGameStore((s) => s.context)
  const inCore = useGameStore((s) => s.purge !== null)
  const gateProgress = useGameStore((s) => s.gateProgress)

  if (gateProgress !== null) {
    return (
      <div className="flex h-12 w-48 flex-col justify-center gap-1.5 border border-signal px-3" role="status">
        <span className="text-[10px] tracking-label text-signal">{`OPENING GATE ${Math.round(gateProgress * 100)}%`}</span>
        <span className="h-1 w-full bg-graphite">
          <span className="block h-full bg-signal" style={{ width: `${gateProgress * 100}%` }} />
        </span>
      </div>
    )
  }
  if (!context) return null
  return (
    <button
      type="button"
      onClick={() => {
        actions.use = true
      }}
      className="pointer-events-auto h-12 w-48 border border-signal bg-signal text-xs tracking-label text-ink active:bg-bone active:border-bone"
    >
      {context === 'repair' ? (inCore ? 'SWITCH' : MISSIONS[missionForNight(night)].verb) : 'OPEN GATE'}
      <span className="ml-2 hidden text-ink/60 md:inline">{'[E]'}</span>
    </button>
  )
}

function HideButton() {
  const canHide = useGameStore((s) => s.canHide)
  return (
    <button
      type="button"
      disabled={!canHide}
      aria-label={canHide ? 'Hide in locker' : 'Hide, no locker nearby'}
      onClick={() => {
        actions.hide = true
      }}
      className={`${ROUND} ${
        canHide ? 'pointer-events-auto border-signal text-signal active:bg-signal active:text-ink' : 'border-concrete text-concrete'
      }`}
    >
      HIDE
    </button>
  )
}

function HackButton() {
  const target = useGameStore((s) => s.hackTarget)
  const charges = useGameStore((s) => s.hackCharges)
  const free = useGameStore((s) => s.hackFree)
  const ready = target !== null && (charges > 0 || free)

  return (
    <button
      type="button"
      disabled={!ready}
      aria-label={
        ready
          ? `Hack ${HACK_LABEL[target!].toLowerCase()}, ${free ? 'free override' : `${charges} charges left`}`
          : `Hack, ${charges} charges left`
      }
      onClick={() => {
        actions.hack = true
      }}
      className={`${ROUND} ${
        ready
          ? 'pointer-events-auto border-signal text-signal active:bg-signal active:text-ink'
          : 'border-concrete text-concrete'
      }`}
    >
      <span>HACK</span>
      <span className="text-[9px]">{ready ? `${HACK_LABEL[target!]} ${free ? 'FREE' : charges}` : `x${charges}`}</span>
    </button>
  )
}

/** Foundry: Decoy. Only shown with the perk equipped. */
function DecoyButton() {
  const decoys = useGameStore((s) => s.decoys)
  const busy = useGameStore((s) => s.hidden || s.repair !== null)
  if (decoys === null) return null
  const ready = decoys > 0 && !busy
  return (
    <button
      type="button"
      disabled={!ready}
      aria-label={`Throw decoy, ${decoys} left`}
      onClick={() => {
        actions.decoy = true
      }}
      className={`${ROUND} ${
        ready ? 'pointer-events-auto border-signal text-signal active:bg-signal active:text-ink' : 'border-concrete text-concrete'
      }`}
    >
      <span>DECOY</span>
      <span className="text-[9px]">{`x${decoys}`}</span>
    </button>
  )
}

export function TouchControls() {
  useEffect(() => {
    const unbind = bindKeyboard()
    return () => {
      unbind()
      input.runTouch = false
      input.joyX = 0
      input.joyY = 0
    }
  }, [])

  const runOff = () => {
    input.runTouch = false
  }

  return (
    <div className="pointer-events-none absolute inset-0 select-none safe-area">
      <div className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-[max(1.5rem,env(safe-area-inset-left))]">
        <Joystick />
      </div>

      <div className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-[max(1.5rem,env(safe-area-inset-right))] flex flex-col items-end gap-3">
        <UseButton />
        <div className="flex gap-3 md:gap-4">
          <HideButton />
          <button
            type="button"
            aria-label="Run (hold)"
            className={`${ROUND} pointer-events-auto touch-none border-bone text-bone active:bg-bone active:text-ink`}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId)
              input.runTouch = true
            }}
            onPointerUp={runOff}
            onPointerCancel={runOff}
            onContextMenu={(e) => e.preventDefault()}
          >
            RUN
          </button>
          <HackButton />
          <DecoyButton />
        </div>
      </div>

      <p className="absolute bottom-2 left-1/2 hidden -translate-x-1/2 text-[10px] tracking-label text-concrete md:block">
        {'WASD MOVE // SHIFT RUN // E USE // F HIDE // Q HACK // G DECOY'}
      </p>
    </div>
  )
}
