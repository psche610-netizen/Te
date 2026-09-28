'use client'

import { CalendarClock, Check, Lock } from 'lucide-react'
import {
  isPlayable,
  isSealed,
  MODIFIER_LABEL,
  nextNightFor,
  SECTORS,
  sectorState,
  type SectorDef,
  type SectorState,
} from '@/lib/game/campaign'
import { PROGRESSION } from '@/lib/game/config'
import { dayKey } from '@/lib/game/daily'
import { useGameStore } from '@/lib/game/store'
import { usePurchases } from '@/lib/purchases/store'
import { BTN_GHOST, BTN_PRIMARY, BTN_SECONDARY } from './styles'

const TAG: Record<SectorState, { label: string; className: string } | null> = {
  cleared: { label: 'CLEARED', className: 'bg-signal text-ink' },
  open: null,
  locked: { label: 'LOCKED', className: 'bg-graphite text-concrete' },
  pass: { label: 'PASS', className: 'bg-graphite text-concrete' },
}

/** Diagonal stagger so the chain reads like the descending facility in mockup 03. */
const INDENT = ['ml-0', 'ml-[12%]', 'ml-[24%]', 'ml-[36%]']

function SectorNode({ def, index }: { def: SectorDef; index: number }) {
  const progress = useGameStore((s) => s.progress)
  const selected = useGameStore((s) => s.sector === def.id && !s.daily)
  const select = useGameStore((s) => s.selectSector)
  const foundry = usePurchases((s) => s.entitlements.foundry)
  const openPaywall = usePurchases((s) => s.openPaywall)
  const state = sectorState(progress, def.id, foundry)
  const tag = TAG[state]
  const dim = state === 'locked' || state === 'pass'

  return (
    <li className={`relative flex items-stretch ${INDENT[index]}`}>
      {index > 0 && <span aria-hidden="true" className="absolute -top-3 left-4 h-3 w-px bg-concrete" />}
      <button
        type="button"
        onClick={() => {
          select(def.id)
          if (state === 'pass') openPaywall('foundry')
        }}
        aria-pressed={selected}
        className={`pointer-events-auto flex min-w-44 flex-col items-start border px-3 py-1.5 text-left transition-colors focus-visible:outline-1 focus-visible:outline-bone md:min-w-56 md:px-4 md:py-2 ${
          selected ? 'border-signal' : 'border-concrete hover:border-bone'
        }`}
      >
        <span className={`text-[10px] tracking-label md:text-xs ${dim ? 'text-concrete' : 'text-bone'}`}>{def.code}</span>
        <span className={`font-display text-lg leading-tight md:text-2xl ${dim ? 'text-concrete' : 'text-bone'}`}>
          {def.name}
        </span>
      </button>
      {tag && (
        <span
          className={`flex items-center gap-1.5 self-end px-2 py-1 text-[10px] tracking-label md:text-xs ${tag.className}`}
        >
          {state === 'cleared' ? <Check className="size-3" aria-hidden="true" /> : <Lock className="size-3" aria-hidden="true" />}
          {tag.label}
        </span>
      )}
    </li>
  )
}

/** Daily Night entry (Foundry Pass). Sits under the sector chain. */
function DailyNode() {
  const selected = useGameStore((s) => s.daily !== null)
  const selectDaily = useGameStore((s) => s.selectDaily)
  const foundry = usePurchases((s) => s.entitlements.foundry)
  const openPaywall = usePurchases((s) => s.openPaywall)
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => {
        selectDaily()
        if (!foundry) openPaywall('foundry')
      }}
      className={`pointer-events-auto flex items-center gap-2 border px-3 py-1.5 text-[10px] tracking-label transition-colors focus-visible:outline-1 focus-visible:outline-bone md:text-xs ${
        selected ? 'border-signal text-bone' : 'border-concrete text-concrete hover:border-bone hover:text-bone'
      }`}
    >
      <CalendarClock className="size-3.5" aria-hidden="true" />
      {`DAILY NIGHT // ${dayKey().slice(5)}`}
      {!foundry && <Lock className="size-3" aria-hidden="true" />}
    </button>
  )
}

function DailyPanel() {
  const daily = useGameStore((s) => s.daily)!
  const best = useGameStore((s) => s.dailyBest)
  const setScreen = useGameStore((s) => s.setScreen)
  const foundry = usePurchases((s) => s.entitlements.foundry)
  const openPaywall = usePurchases((s) => s.openPaywall)
  const def = SECTORS.find((s) => s.id === daily.sector)!
  const today = best?.date === daily.date ? best : null

  const rows: [string, string][] = [
    ['DATE', daily.date],
    ['SECTOR', def.name],
    ['HUNTER', def.hunter],
    ['MODIFIER', MODIFIER_LABEL[daily.modifier]],
    ['BEST TODAY', today ? `${today.scrap} SCRAP${today.escaped ? '' : ' // FAILED'}` : '--'],
  ]

  return (
    <section aria-labelledby="sector-detail" className="flex h-full flex-col gap-3 md:gap-5">
      <div className="flex items-center justify-between border-b border-concrete pb-2 text-[10px] tracking-label text-concrete md:text-xs">
        <span>{'SYS // DAILY SHIFT'}</span>
        <span>SEEDED</span>
      </div>
      <h2 id="sector-detail" className="border-b border-concrete pb-2 font-display text-4xl leading-none text-bone md:text-6xl">
        DAILY NIGHT
      </h2>
      <dl className="flex flex-col gap-1 border-b border-concrete pb-3 md:gap-2.5 md:pb-5">
        {rows.map(([k, v]) => (
          <div key={k} className="flex text-[10px] tracking-label md:text-sm">
            <dt className="w-24 shrink-0 text-concrete md:w-32">{k}</dt>
            <dd className="text-bone">{v}</dd>
          </div>
        ))}
      </dl>
      {foundry ? (
        <button type="button" className={BTN_PRIMARY} onClick={() => setScreen('loadout')}>
          {today ? 'RETRY // DAILY' : 'ENTER // DAILY'}
        </button>
      ) : (
        <button type="button" className={BTN_SECONDARY} onClick={() => openPaywall('foundry')}>
          UNLOCK // FOUNDRY PASS
        </button>
      )}
    </section>
  )
}

function DetailPanel() {
  const daily = useGameStore((s) => s.daily !== null)
  return daily ? <DailyPanel /> : <SectorPanel />
}

function SectorPanel() {
  const progress = useGameStore((s) => s.progress)
  const id = useGameStore((s) => s.sector)
  const setScreen = useGameStore((s) => s.setScreen)
  const foundry = usePurchases((s) => s.entitlements.foundry)
  const openPaywall = usePurchases((s) => s.openPaywall)
  const def = SECTORS.find((s) => s.id === id)!
  const state = sectorState(progress, id, foundry)
  const playable = isPlayable(progress, id, foundry)
  const finale = def.access === 'finale'
  const done = Math.min(progress[id], PROGRESSION.nightsPerSector)

  const rows: [string, string][] = [
    finale ? ['KILL SWITCHES', state === 'cleared' ? '4/4' : '0/4'] : ['NIGHTS', `${done}/${PROGRESSION.nightsPerSector}`],
    ['HUNTER', def.hunter],
    ['MODIFIER', `${MODIFIER_LABEL[def.modifier]}${def.modifier !== 'none' ? ' // N3' : ''}`],
  ]

  const blocked = isSealed(progress, id, foundry)
    ? 'PASS ACTIVE // SECTOR SEALED'
    : `CLEAR ${SECTORS.find((s) => s.id === def.requires)?.code ?? ''} FIRST`

  return (
    <section aria-labelledby="sector-detail" className="flex h-full flex-col gap-3 md:gap-5">
      <div className="flex items-center justify-between border-b border-concrete pb-2 text-[10px] tracking-label text-concrete md:text-xs">
        <span>{'SYS // SECTOR SELECT'}</span>
        <span>v1.0</span>
      </div>
      <h2 id="sector-detail" className="border-b border-concrete pb-2 font-display text-5xl leading-none text-bone md:text-7xl">
        {def.code}
      </h2>
      <dl className="flex flex-col gap-1.5 border-b border-concrete pb-3 md:gap-3 md:pb-5">
        {rows.map(([k, v]) => (
          <div key={k} className="flex text-xs tracking-label md:text-base">
            <dt className="w-28 text-concrete md:w-40">{k}</dt>
            <dd className="text-bone">{v}</dd>
          </div>
        ))}
      </dl>
      {playable ? (
        <button type="button" className={BTN_PRIMARY} onClick={() => setScreen('loadout')}>
          {state === 'cleared' ? 'REPLAY' : finale ? 'ENTER // THE CORE' : `ENTER // NIGHT ${nextNightFor(progress, id)}`}
        </button>
      ) : state === 'pass' ? (
        <button type="button" className={BTN_SECONDARY} onClick={() => openPaywall('foundry')}>
          UNLOCK // FOUNDRY PASS
        </button>
      ) : (
        <p className="flex h-11 items-center justify-center border border-concrete text-xs tracking-label text-concrete md:h-14">
          {blocked}
        </p>
      )}
    </section>
  )
}

/** Screen 03. */
export function SectorMap() {
  const setScreen = useGameStore((s) => s.setScreen)

  return (
    <div className="absolute inset-0 bg-ink safe-area">
      <div className="grid h-full grid-cols-[1fr_minmax(15rem,34%)] gap-6 p-4 md:gap-10 md:p-8">
        <div className="flex min-h-0 flex-col justify-between">
          <div className="flex items-baseline gap-6">
            <h1 className="font-display text-2xl leading-none text-bone md:text-4xl">SHUTDOWN</h1>
            <button type="button" className={BTN_GHOST} onClick={() => setScreen('title')}>
              {'\u2190 BACK'}
            </button>
          </div>
          <ol aria-label="Sectors" className="flex flex-col gap-3 md:gap-5">
            {SECTORS.map((def, i) => (
              <SectorNode key={def.id} def={def} index={i} />
            ))}
          </ol>
          <div className="flex items-end justify-between gap-4">
            <DailyNode />
            <p className="text-[10px] tracking-label text-concrete">{'CONTAIN / CONTROL / SHUTDOWN'}</p>
          </div>
        </div>
        <div className="border-l border-concrete pl-6 md:pl-10">
          <DetailPanel />
        </div>
      </div>
    </div>
  )
}
