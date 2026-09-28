'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import { MIC } from '@/lib/game/config'
import { meterFill } from '@/lib/game/mic'

interface MicMeterProps {
  bars: number
  /** Current loudness above baseline. Polled every animation frame. */
  read: () => number
  /** Lit bar color class, applied through `data-on`. */
  lit?: 'bone' | 'signal'
  /** Lit bars taper from tall (left) to short; unlit bars stay low. Matches screen 02. */
  taper?: boolean
  showThreshold?: boolean
  className?: string
}

const LIT = { bone: 'data-[on=1]:bg-bone', signal: 'data-[on=1]:bg-signal' } as const
const UNLIT_HEIGHT = 36

export function MicMeter({ bars, read, lit = 'bone', taper = false, showThreshold = false, className = '' }: MicMeterProps) {
  const refs = useRef<(HTMLSpanElement | null)[]>([])
  const readRef = useRef(read)
  useLayoutEffect(() => {
    readRef.current = read
  })

  useEffect(() => {
    let raf = 0
    let last = -1
    const tick = () => {
      const on = Math.round(meterFill(readRef.current()) * bars)
      if (on !== last) {
        last = on
        refs.current.forEach((el, i) => {
          if (!el) return
          const active = i < on
          el.dataset.on = active ? '1' : '0'
          if (taper) el.style.height = `${active ? 100 - (i / bars) * 55 : UNLIT_HEIGHT}%`
        })
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [bars, taper])

  const marker = meterFill(MIC.threshold) * 100

  return (
    <div className={`relative flex items-end gap-[3px] ${className}`} aria-hidden="true">
      {Array.from({ length: bars }, (_, i) => (
        <span
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          data-on="0"
          className={`flex-1 bg-graphite ${LIT[lit]}`}
          style={{ height: taper ? `${UNLIT_HEIGHT}%` : '100%' }}
        />
      ))}
      {showThreshold && (
        <div className="absolute inset-y-0 flex flex-col items-center" style={{ left: `${marker}%` }}>
          <span className="-translate-y-full -translate-x-1/2 absolute top-0 pb-1 text-[10px] tracking-label text-signal md:text-xs">
            DETECTED
          </span>
          <span className="h-full w-0.5 -translate-x-1/2 bg-signal" />
        </div>
      )}
    </div>
  )
}
