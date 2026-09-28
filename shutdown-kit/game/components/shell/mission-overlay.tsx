'use client'

import { useEffect, useState } from 'react'
import { live } from '@/lib/game/live'
import { clearActions } from '@/lib/game/actions'
import { sectorDef } from '@/lib/game/campaign'
import { MISSIONS, missionForNight } from '@/lib/game/missions'
import { useGameStore } from '@/lib/game/store'

export function MissionOverlay() {
  const paused = useGameStore(s => s.paused)
  const setPaused = useGameStore(s => s.setPaused)
  const sector = useGameStore(s => s.sector)
  const night = useGameStore(s => s.night)
  const [started, setStarted] = useState(() => (live.session?.time ?? 0) > 0)
  const mission = MISSIONS[missionForNight(night)]
  useEffect(() => {
    const pause = (e: KeyboardEvent) => {
      if (e.code === 'Escape' && !useGameStore.getState().repair) {
        clearActions()
        setPaused(!useGameStore.getState().paused)
        setStarted(true)
      }
    }
    const hidden = () => { if (document.hidden) setPaused(true) }
    window.addEventListener('keydown', pause)
    document.addEventListener('visibilitychange', hidden)
    return () => { window.removeEventListener('keydown', pause); document.removeEventListener('visibilitychange', hidden) }
  }, [setPaused])
  if (!paused) return null
  const resume = () => { clearActions(); setStarted(true); setPaused(false) }
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-ink/90 p-5">
      <section role="dialog" aria-modal="true" aria-labelledby="mission-title" className="w-full max-w-2xl border border-concrete bg-ink p-5 md:p-8">
        <div className="flex justify-between border-b border-concrete pb-3 text-[10px] tracking-label text-concrete">
          <span>{sectorDef(sector).name} / NIGHT {night}</span><span>{started ? 'NIGHT PAUSED' : 'OPERATOR BRIEFING'}</span>
        </div>
        <h1 id="mission-title" className="mt-4 font-display text-3xl text-bone md:text-5xl">{started ? 'STAY UNDETECTED.' : sector === 'core' ? 'KILL THE CORE' : mission.title}</h1>
        <p className="mt-3 max-w-xl text-xs leading-relaxed text-bone/80 md:text-sm">{sector === 'core' ? 'Activate four kill switches before PURGE. Cross the rotating rings. Red segments are about to fall. Two hunters are active.' : mission.brief}</p>
        <div className="my-4 grid grid-cols-3 gap-4 border-y border-concrete py-3 text-[10px] leading-relaxed text-bone/70">
          <p><span className="block text-signal">01 / MOVE</span>WASD or joystick.<br />Shift / RUN is loud.</p>
          <p><span className="block text-signal">02 / INTERACT</span>E / USE at orange machines.<br />{sector === 'core' ? 'Complete each repair trial.' : 'Q / HACK changes routes.'}</p>
          <p><span className="block text-signal">03 / SURVIVE</span>{sector === 'core' ? 'Stay off red segments.' : 'F / HIDE near lockers.'}<br />Break the hunter’s line of sight.</p>
        </div>
        <div className="flex items-center justify-between gap-4">
          <button className="px-2 py-3 text-xs text-concrete hover:text-bone" onClick={() => useGameStore.getState().setScreen('title')}>EXIT TO TITLE</button>
          <button autoFocus className="border border-signal bg-signal px-7 py-3 text-xs tracking-label text-ink hover:bg-bone" onClick={resume}>{started ? 'RESUME →' : 'BEGIN NIGHT →'}</button>
        </div>
      </section>
    </div>
  )
}
