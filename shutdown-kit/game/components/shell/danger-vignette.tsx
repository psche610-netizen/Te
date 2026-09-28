'use client'

import { useEffect, useRef } from 'react'
import { JUICE } from '@/lib/game/config'
import { juiceLive } from '@/lib/game/juice'

/**
 * Hunter proximity "vignette": a flat, hard-edged ink frame that closes in and pulses with the
 * heartbeat, plus a 1px danger rule when the hunter is close. No gradients, no blur.
 */
export function DangerVignette() {
  const frame = useRef<HTMLDivElement>(null)
  const rule = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let raf = 0
    const tick = () => {
      const d = juiceLive.danger
      const V = JUICE.vignette
      const width = Math.min(window.innerWidth, window.innerHeight) * V.maxWidth * d * (1 + V.pulse * juiceLive.pulse)
      const px = `${width.toFixed(1)}px`
      if (frame.current) {
        frame.current.style.borderWidth = px
        frame.current.style.opacity = String(Math.min(1, d * 1.4) * V.opacity)
      }
      if (rule.current) {
        rule.current.style.inset = px
        rule.current.style.opacity = d > V.ruleAt ? '1' : '0'
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <div ref={frame} className="absolute inset-0 border-solid border-ink" style={{ borderWidth: 0, opacity: 0 }} />
      <div ref={rule} className="absolute border border-danger" style={{ inset: 0, opacity: 0 }} />
    </div>
  )
}
