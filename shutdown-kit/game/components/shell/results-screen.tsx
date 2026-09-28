'use client'

import { useMemo } from 'react'
import { MODIFIER_LABEL, sectorDef } from '@/lib/game/campaign'
import { PALETTE, PROGRESSION } from '@/lib/game/config'
import { CORE } from '@/lib/game/core/session'
import type { NightResult } from '@/lib/game/results'
import { useGameStore } from '@/lib/game/store'
import { usePurchases } from '@/lib/purchases/store'
import { BTN_GHOST, BTN_PRIMARY, BTN_SECONDARY, formatClock } from './styles'

const COPY = {
  escaped: { title: 'ESCAPED', line: 'Noted. I will remember this route.', tone: 'text-bone' },
  caught: { title: 'CAUGHT', line: 'Your shift has been extended.', tone: 'text-danger' },
  fell: { title: 'LOST', line: 'The floor was never yours.', tone: 'text-danger' },
  lockdown: { title: 'LOCKDOWN', line: 'The gates are closed. You were supposed to leave.', tone: 'text-danger' },
} as const

/** The Core cleared: the facility is off. */
const ENDING = { title: 'SHUTDOWN', line: 'Facility 07 is offline. Nobody is listening now.', tone: 'text-signal' } as const

const WALLS = new Set(['#', 'D', '=', '-', 'E'])

/** The Core seen from above: rim, rings, spokes and the route (world units). */
function CoreRouteMap({ path }: { path: [number, number][] }) {
  const size = CORE.rim.outer + 1
  const rings = [...CORE.rings, CORE.rim]
  const points = path.map(([x, z]) => `${x},${z}`).join(' ')
  const end = path[path.length - 1]
  return (
    <svg viewBox={`${-size} ${-size} ${size * 2} ${size * 2}`} className="h-full w-full" role="img" aria-label={`Core plan with your route, ${path.length} points`}>
      {rings.map((r) => (
        <circle key={r.inner} r={(r.inner + r.outer) / 2} fill="none" stroke={PALETTE.graphite} strokeWidth={r.outer - r.inner} />
      ))}
      {CORE.spokeAngles.map((a) => (
        <line
          key={a}
          x1={CORE.pillarRadius * Math.cos(a)}
          y1={CORE.pillarRadius * Math.sin(a)}
          x2={CORE.rim.inner * Math.cos(a)}
          y2={CORE.rim.inner * Math.sin(a)}
          stroke={PALETTE.concrete}
          strokeWidth={CORE.spokeHalfWidth * 2}
        />
      ))}
      <circle r={CORE.pillarRadius} fill={PALETTE.concrete} />
      {path.length > 1 && (
        <polyline points={points} fill="none" stroke={PALETTE.signal} strokeWidth={0.45} strokeLinejoin="round" strokeLinecap="round" />
      )}
      {end && <circle cx={end[0]} cy={end[1]} r={0.8} fill={PALETTE.bone} />}
    </svg>
  )
}

/** Top-down floor plan with the route the player took (mockup 09, right column). */
function RouteMap({ result }: { result: NightResult }) {
  if (result.sector === 'core') return <CoreRouteMap path={result.path} />
  return <GridRouteMap result={result} />
}

function GridRouteMap({ result }: { result: NightResult }) {
  const { rows, path } = result
  const w = Math.max(...rows.map((r) => r.length))
  const h = rows.length

  const cells = useMemo(() => {
    const out: { x: number; y: number; wall: boolean }[] = []
    rows.forEach((row, y) =>
      [...row].forEach((ch, x) => {
        if (ch !== ' ') out.push({ x, y, wall: WALLS.has(ch) })
      }),
    )
    return out
  }, [rows])

  const points = path.map(([x, z]) => `${x + 0.5},${z + 0.5}`).join(' ')
  const start = path[0]
  const end = path[path.length - 1]

  return (
    <svg
      viewBox={`-0.5 -0.5 ${w + 1} ${h + 1}`}
      className="h-full w-full"
      role="img"
      aria-label={`Floor plan with your route, ${path.length} points`}
    >
      {cells.map((c) => (
        <rect
          key={`${c.x}-${c.y}`}
          x={c.x}
          y={c.y}
          width={1}
          height={1}
          fill={c.wall ? PALETTE.concrete : PALETTE.graphite}
          stroke={PALETTE.ink}
          strokeWidth={0.06}
        />
      ))}
      {path.length > 1 && (
        <polyline
          points={points}
          fill="none"
          stroke={PALETTE.signal}
          strokeWidth={0.22}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}
      {start && <circle cx={start[0] + 0.5} cy={start[1] + 0.5} r={0.4} fill={PALETTE.signal} />}
      {end && (
        <rect
          x={end[0] + 0.1}
          y={end[1] + 0.1}
          width={0.8}
          height={0.8}
          fill={result.outcome === 'escaped' ? PALETTE.bone : PALETTE.danger}
        />
      )}
    </svg>
  )
}

/** Screen 09. Shown over the finished night. */
export function ResultsScreen() {
  const result = useGameStore((s) => s.result)
  const nextNight = useGameStore((s) => s.nextNight)
  const retryNight = useGameStore((s) => s.retryNight)
  const setScreen = useGameStore((s) => s.setScreen)
  if (!result) return null

  const def = sectorDef(result.sector)
  const escaped = result.outcome === 'escaped'
  const ending = escaped && result.sector === 'core'
  const copy = ending ? ENDING : COPY[result.outcome]
  const finalNight = result.night >= PROGRESSION.nightsPerSector

  /** First Sector 1 clear shows the Foundry Pass paywall once, over the sector map. */
  const advance = () => {
    nextNight()
    const p = usePurchases.getState()
    if (result.sectorCleared && result.sector === 'plant' && !p.sector1PaywallShown && !p.entitlements.foundry) {
      p.openPaywall('sector1')
    }
  }

  const stats: [string, string][] = [
    [result.sector === 'core' ? 'KILL SWITCHES' : 'GENERATORS', `${result.generators}/${result.totalGenerators}`],
    ['TIMES SPOTTED', String(result.spotted)],
    ['BREATH HELD', formatClock(result.breathHeld)],
  ]

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="results-title"
      className="absolute inset-0 bg-ink safe-area animate-in fade-in duration-500"
    >
      <div className="flex h-full flex-col p-4 md:p-8">
        <div className="grid min-h-0 flex-1 grid-cols-[1.1fr_1fr_1fr] border-b border-concrete">
          <div className="flex flex-col gap-2 pr-4 md:pr-8">
            <h1
              id="results-title"
              className={`font-display text-6xl leading-[0.85] md:text-9xl ${copy.tone}`}
            >
              {copy.title}
            </h1>
            <p className="text-sm tracking-label text-bone md:text-xl">{result.daily ? `DAILY // ${result.daily} / ${def.code}` : `NIGHT ${result.night} / ${def.code}`}</p>
            {result.modifier !== 'none' && (
              <p className="text-[10px] tracking-label text-concrete md:text-xs">{`MODIFIER // ${MODIFIER_LABEL[result.modifier]}`}</p>
            )}
            <p className="mt-auto pb-3 font-mono text-xs leading-relaxed text-bone md:pb-6 md:text-sm">
              <span className="text-concrete">{ending ? 'SYSTEM: ' : 'OVERSEER: '}</span>
              {result.sectorCleared && !ending ? 'Sector offline. I have others.' : copy.line}
            </p>
          </div>

          <dl className="flex flex-col justify-center border-l border-concrete px-4 md:px-8">
            {stats.map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between border-b border-concrete py-1.5 md:py-4">
                <dt className="text-xs tracking-label text-bone md:text-base">{k}</dt>
                <dd className="font-mono text-base text-bone md:text-2xl">{v}</dd>
              </div>
            ))}
            <div className="flex items-baseline justify-between border-t border-bone pt-2 md:pt-4">
              <dt className="font-display text-2xl text-signal md:text-4xl">SCRAP</dt>
              <dd className="font-display text-2xl text-signal md:text-4xl">{`+${result.scrap}`}</dd>
            </div>
            <p className="pt-1 text-[9px] tracking-label text-concrete md:text-[11px]">
              {result.breakdown.map((l) => `${l.label} ${l.amount}`).join(' // ')}
            </p>
          </dl>

          <div className="flex min-h-0 flex-col gap-2 border-l border-concrete pb-3 pl-4 md:pl-8">
            <div>
              <p className="text-[10px] tracking-label text-bone md:text-xs">{def.code}</p>
              <p className="text-[10px] tracking-label text-concrete md:text-xs">{def.name}</p>
            </div>
            <div className="min-h-0 flex-1">
              <RouteMap result={result} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-3 md:pt-6">
          <div className="flex items-center gap-4">
            <button type="button" className={BTN_GHOST} onClick={() => setScreen('title')}>
              MENU
            </button>
            {(result.sectorCleared || ending) && (
              <p className="bg-signal px-2 py-1 text-[10px] tracking-label text-ink md:text-xs">
                {ending ? 'FACILITY 07 // OFFLINE' : `${def.code} CLEARED`}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            {escaped ? (
              <button type="button" autoFocus className={`${BTN_PRIMARY} w-40 md:w-60`} onClick={advance}>
                {finalNight ? 'SECTOR MAP' : 'NEXT NIGHT'}
              </button>
            ) : (
              <button type="button" autoFocus className={`${BTN_PRIMARY} w-40 md:w-60`} onClick={retryNight}>
                RETRY NIGHT
              </button>
            )}
            <button type="button" className={`${BTN_SECONDARY} w-32 md:w-52`} onClick={() => setScreen('loadout')}>
              LOADOUT
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
