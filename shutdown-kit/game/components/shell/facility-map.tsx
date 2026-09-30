'use client'

import { useEffect, useState } from 'react'
import { PALETTE } from '@/lib/game/config'
import { live } from '@/lib/game/live'
import { generatorAvailable, MISSIONS } from '@/lib/game/missions'

/** A schematic, not radar: hunters are deliberately absent. */
export function FacilityMap() {
  const [, refresh] = useState(0)
  useEffect(() => { const t = setInterval(() => refresh(n => n + 1), 250); return () => clearInterval(t) }, [])
  const s = live.session
  if (!s) return null
  const { level: l, player: p } = s
  const active = l.generators.filter((_, i) => generatorAvailable(s, i))
  const target = (s.gatesPowered ? l.gates : active).reduce<typeof l.generators[number] | typeof l.gates[number] | null>((best, g) => !best || Math.hypot(g.x - p.x, g.z - p.z) < Math.hypot(best.x - p.x, best.z - p.z) ? g : best, null)
  return <div className="pointer-events-none absolute right-4 top-16 w-32 border border-concrete/60 bg-ink/90 p-2 md:right-6 md:top-20 md:w-44">
    <p className="mb-1 text-[8px] tracking-label text-bone/70">FACILITY / LIVE PLAN</p>
    <svg viewBox={`-1 -1 ${l.width + 2} ${l.height + 2}`} className="w-full" role="img" aria-label="Facility map: orange machines, square exits, white operator">
      {l.floorCells.filter(c => l.cells[c.cz * l.width + c.cx] !== 'wall').map(c => <rect key={`${c.cx}:${c.cz}`} x={c.cx - 0.48} y={c.cz - 0.48} width=".96" height=".96" fill={PALETTE.graphite} />)}
      {l.dynamicWalls.map(w => <rect key={`w${w.id}`} x={w.cx - 0.45} y={w.cz - 0.45} width=".9" height=".9" fill={w.telegraph ? PALETTE.danger : w.raised ? PALETTE.concrete : PALETTE.graphite} />)}
      {l.doors.filter(d => !d.open).map(d => <rect key={`d${d.id}`} x={d.cx - 0.4} y={d.cz - 0.4} width=".8" height=".8" fill={PALETTE.danger} />)}
      {l.generators.map((g, i) => <circle key={i} cx={g.cx} cy={g.cz} r={generatorAvailable(s, i) ? .65 : .35} fill={s.generators[i].repaired ? PALETTE.bone : generatorAvailable(s, i) ? PALETTE.signal : PALETTE.concrete} />)}
      {l.gates.map(g => <rect key={`g${g.id}`} x={g.cx - .65} y={g.cz - .65} width="1.3" height="1.3" stroke={s.gatesPowered ? PALETTE.signal : PALETTE.bone} strokeWidth=".3" fill="none" />)}
      <circle cx={p.x / l.cellSize} cy={p.z / l.cellSize} r=".6" fill={PALETTE.bone} stroke={PALETTE.ink} strokeWidth=".25" />
    </svg>
    <p className="mt-1 text-[8px] text-signal">{s.gatesPowered ? 'EXIT' : MISSIONS[s.mission].verb} {target ? `${Math.ceil(Math.hypot(target.x - p.x, target.z - p.z))}M` : ''}</p>
    <p className={`mt-1 text-[8px] ${s.shift.telegraph > 0 ? 'text-danger' : 'text-bone/60'}`}>{s.shift.telegraph > 0 ? 'SHIFT INCOMING' : `NEXT SHIFT / ${Math.ceil(s.shift.timer)}S`}</p>
  </div>
}
