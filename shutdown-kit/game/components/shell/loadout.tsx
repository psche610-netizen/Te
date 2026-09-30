'use client'

import {
  Backpack,
  Crosshair,
  Eye,
  Footprints,
  Ghost,
  Hand,
  HeartPulse,
  Hexagon,
  Lock,
  Radio,
  RotateCcw,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { MISSIONS, missionForNight } from '@/lib/game/missions'
import { nightModifier, MODIFIER_LABEL, sectorDef } from '@/lib/game/campaign'
import { PROGRESSION, type PaletteKey } from '@/lib/game/config'
import { HUNTER_SKINS, SUITS, type SkinDef } from '@/lib/game/skins'
import { usePurchases } from '@/lib/purchases/store'
import { micReady } from '@/lib/game/mic'
import { PERKS, perkDef, type PerkId } from '@/lib/game/perks'
import { deployNight, useGameStore } from '@/lib/game/store'
import { BTN_GHOST, BTN_PRIMARY } from './styles'

const ICON: Record<PerkId, LucideIcon> = {
  softStep: Footprints,
  quickHands: Hand,
  secondWind: HeartPulse,
  awareness: Eye,
  steady: Crosshair,
  deepPockets: Backpack,
  ghost: Ghost,
  decoy: Radio,
  override: RotateCcw,
}

function EquippedSlots({ onPick }: { onPick: (id: PerkId) => void }) {
  const equipped = useGameStore((s) => s.equipped)
  return (
    <ul className="grid grid-cols-3 gap-2 md:gap-4" aria-label="Equipped perks">
      {Array.from({ length: PROGRESSION.maxEquipped }, (_, i) => {
        const id = equipped[i]
        if (!id) {
          return (
            <li
              key={`empty-${i}`}
              className="flex h-16 items-center justify-center border border-dashed border-concrete text-[10px] tracking-label text-concrete md:h-28"
            >
              EMPTY SLOT
            </li>
          )
        }
        const Icon = ICON[id]
        return (
          <li key={id}>
            <button
              type="button"
              onClick={() => onPick(id)}
              className="pointer-events-auto flex h-16 w-full flex-col items-center justify-center gap-1 border border-concrete bg-graphite text-bone transition-colors hover:border-bone focus-visible:outline-1 focus-visible:outline-bone md:h-28 md:gap-3"
            >
              <Icon className="size-6 md:size-10" strokeWidth={1.5} aria-hidden="true" />
              <span className="text-[10px] tracking-label md:text-sm">{perkDef(id).name}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function PerkGrid({ selected, onPick }: { selected: PerkId; onPick: (id: PerkId) => void }) {
  const owned = useGameStore((s) => s.owned)
  const equipped = useGameStore((s) => s.equipped)
  const foundry = usePurchases((s) => s.entitlements.foundry)
  return (
    <ul className="grid grid-cols-9 gap-1 md:gap-2" aria-label="Available perks">
      {PERKS.map((p) => {
        const Icon = ICON[p.id]
        const gated = p.foundry && !foundry
        const has = owned.includes(p.id) && !gated
        const on = equipped.includes(p.id) && !gated
        return (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => onPick(p.id)}
              aria-pressed={selected === p.id}
              className={`pointer-events-auto relative flex h-14 w-full flex-col items-center justify-center gap-1 border bg-graphite transition-colors focus-visible:outline-1 focus-visible:outline-bone md:h-24 md:gap-2 ${
                selected === p.id ? 'border-signal' : 'border-graphite hover:border-concrete'
              } ${has ? 'text-bone' : 'text-concrete'}`}
            >
              {on && <span aria-hidden="true" className="absolute right-1 top-1 size-1.5 bg-signal" />}
              {p.foundry && (
                <span aria-hidden="true" className="absolute left-1 top-1 text-[7px] tracking-label text-signal md:text-[9px]">
                  {gated ? <Lock className="size-2.5 md:size-3" /> : 'F'}
                </span>
              )}
              <Icon className="size-4 md:size-7" strokeWidth={1.5} aria-hidden="true" />
              <span className="px-0.5 text-center text-[7px] leading-tight tracking-label md:text-[10px]">
                {gated ? 'PASS' : has ? p.name : `${p.cost}`}
              </span>
              <span className="sr-only">
                {gated
                  ? '(needs Foundry Pass)'
                  : on
                    ? '(equipped)'
                    : has
                      ? '(owned)'
                      : `(costs ${p.cost} scrap)`}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function PerkDetail({ id }: { id: PerkId }) {
  const owned = useGameStore((s) => s.owned.includes(id))
  const equipped = useGameStore((s) => s.equipped)
  const scrap = useGameStore((s) => s.scrap)
  const buy = useGameStore((s) => s.buyPerk)
  const toggle = useGameStore((s) => s.toggleEquip)
  const foundry = usePurchases((s) => s.entitlements.foundry)
  const openPaywall = usePurchases((s) => s.openPaywall)
  const def = perkDef(id)
  const on = equipped.includes(id)
  const full = equipped.length >= PROGRESSION.maxEquipped

  let action: { label: string; disabled: boolean; run: () => void }
  if (def.foundry && !foundry) action = { label: 'FOUNDRY PASS', disabled: false, run: () => openPaywall('foundry') }
  else if (!owned) action = { label: `BUY // ${def.cost}`, disabled: scrap < def.cost, run: () => buy(id) }
  else if (on) action = { label: 'UNEQUIP', disabled: false, run: () => toggle(id) }
  else action = { label: full ? 'SLOTS FULL' : 'EQUIP', disabled: full, run: () => toggle(id) }

  return (
    <div className="flex items-center justify-between gap-3 border-y border-concrete py-1.5 md:py-3">
      <p className="text-[10px] tracking-label text-concrete md:text-sm" aria-live="polite">
        <span className="text-bone">{def.name}</span>
        {` // ${def.effect.toUpperCase()}`}
      </p>
      <button
        type="button"
        onClick={action.run}
        disabled={action.disabled}
        className="pointer-events-auto shrink-0 border border-bone px-3 py-1.5 text-[10px] tracking-label text-bone transition-colors hover:bg-bone hover:text-ink disabled:cursor-not-allowed disabled:border-concrete disabled:text-concrete disabled:hover:bg-transparent md:text-xs"
      >
        {action.label}
      </button>
    </div>
  )
}

const SWATCH: Record<PaletteKey, string> = {
  ink: 'bg-ink',
  graphite: 'bg-graphite',
  concrete: 'bg-concrete',
  bone: 'bg-bone',
  signal: 'bg-signal',
  danger: 'bg-danger',
  petrol: 'bg-petrol',
  teal: 'bg-teal',
  ivory: 'bg-ivory',
  amber: 'bg-amber',
  indigo: 'bg-indigo',
}

function SkinRow<Id extends string>({
  label,
  list,
  current,
  onPick,
}: {
  label: string
  list: readonly SkinDef<Id>[]
  current: Id
  onPick: (id: Id) => void
}) {
  const entitled = usePurchases((s) => s.entitlements.skins)
  const openPaywall = usePurchases((s) => s.openPaywall)
  return (
    <div className="flex flex-col gap-1 md:gap-2">
      <p className="text-[10px] tracking-label text-concrete md:text-xs">{label}</p>
      <ul className="grid grid-cols-3 gap-1.5 md:gap-3">
        {list.map((skin) => {
          const locked = !skin.free && !entitled
          const on = current === skin.id && !locked
          return (
            <li key={skin.id}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => (locked ? openPaywall('skins') : onPick(skin.id))}
                className={`pointer-events-auto flex h-12 w-full items-center gap-2 border bg-graphite px-2 transition-colors focus-visible:outline-1 focus-visible:outline-bone md:h-20 md:gap-3 md:px-4 ${
                  on ? 'border-signal' : 'border-graphite hover:border-concrete'
                } ${locked ? 'text-concrete' : 'text-bone'}`}
              >
                <span aria-hidden="true" className={`size-4 shrink-0 border border-concrete md:size-7 ${SWATCH[skin.color]}`} />
                <span className="flex-1 text-left text-[9px] leading-tight tracking-label md:text-xs">{skin.name}</span>
                {locked && <Lock className="size-3 shrink-0 md:size-4" aria-label="Skin Pack required" />}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function SkinsPanel() {
  const skins = useGameStore(useShallow((s) => s.skins))
  const setSkin = useGameStore((s) => s.setSkin)
  const entitled = usePurchases((s) => s.entitlements.skins)
  const openPaywall = usePurchases((s) => s.openPaywall)
  return (
    <>
      <SkinRow label="JUMPSUIT" list={SUITS} current={skins.suit} onPick={(suit) => setSkin({ suit })} />
      <SkinRow label="HUNTER" list={HUNTER_SKINS} current={skins.hunter} onPick={(hunter) => setSkin({ hunter })} />
      <div className="flex items-center justify-between gap-3 border-y border-concrete py-1.5 md:py-3">
        <p className="text-[10px] tracking-label text-concrete md:text-sm">
          {entitled ? 'SKIN PACK // ACTIVE' : 'SKIN PACK // COSMETIC ONLY'}
        </p>
        {!entitled && (
          <button
            type="button"
            onClick={() => openPaywall('skins')}
            className="pointer-events-auto shrink-0 border border-bone px-3 py-1.5 text-[10px] tracking-label text-bone transition-colors hover:bg-bone hover:text-ink md:text-xs"
          >
            UNLOCK
          </button>
        )}
      </div>
    </>
  )
}

/** Screen 04. The operator on the left is rendered in the canvas (`LoadoutDiorama`). */
export function Loadout() {
  const scrap = useGameStore((s) => s.scrap)
  const sector = useGameStore((s) => s.sector)
  const progress = useGameStore((s) => s.progress)
  const setScreen = useGameStore((s) => s.setScreen)
  const deploy = useGameStore((s) => s.deploy)
  const [selected, setSelected] = useState<PerkId>(() => useGameStore.getState().equipped[0] ?? 'softStep')
  const [tab, setTab] = useState<'perks' | 'skins'>('perks')

  const daily = useGameStore((s) => s.daily)
  const def = sectorDef(sector)
  const night = deployNight({ daily, progress, sector })
  const mod = daily ? daily.modifier : nightModifier(sector, night)
  const label = daily ? `DAILY // ${daily.date} // ${def.code}` : `${def.code} // NIGHT ${night}`

  return (
    <div className="pointer-events-none absolute inset-0 safe-area">
      <div className="grid h-full grid-cols-[38%_1fr]">
        <div className="flex flex-col justify-between p-4 md:p-8">
          <div className="flex items-baseline gap-6">
            <p className="font-display text-2xl leading-none text-bone md:text-4xl">SHUTDOWN</p>
            <button type="button" className={BTN_GHOST} onClick={() => setScreen('sectors')}>
              {'\u2190 SECTORS'}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-concrete" />
            <p className="text-xs tracking-label text-bone">OPERATOR 07</p>
            <span className="h-px flex-1 bg-concrete" />
          </div>
        </div>

        <div className="flex min-h-0 flex-col gap-2 border-l border-concrete bg-ink p-4 md:gap-4 md:p-8">
          <div className="flex items-end justify-between border-b border-concrete pb-1.5">
            <h1 className="font-display text-3xl leading-none text-bone md:text-6xl">LOADOUT</h1>
            <p className="text-[10px] tracking-label text-concrete md:text-xs">
              {`${label}${mod !== 'none' ? ` // ${MODIFIER_LABEL[mod]}` : ''}`}
            </p>
          </div>
          <div role="tablist" aria-label="Loadout sections" className="flex gap-4">
            {(['perks', 'skins'] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`pointer-events-auto border-b pb-0.5 text-[10px] tracking-label transition-colors focus-visible:outline-1 focus-visible:outline-bone md:text-xs ${
                  tab === t ? 'border-signal text-bone' : 'border-transparent text-concrete hover:text-bone'
                }`}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>
          {tab === 'perks' ? (
            <>
              <p className="text-[10px] tracking-label text-concrete md:text-xs">EQUIPPED PERKS</p>
              <EquippedSlots onPick={setSelected} />
              <p className="text-[10px] tracking-label text-concrete md:text-xs">AVAILABLE PERKS</p>
              <PerkGrid selected={selected} onPick={setSelected} />
              <PerkDetail id={selected} />
            </>
          ) : (
            <SkinsPanel />
          )}
          <p className="text-[9px] leading-relaxed text-bone/70 md:text-xs">{sector === 'core' ? 'FINALE / Four kill switches. Two hunters. One way out.' : `${MISSIONS[missionForNight(night)].title} / ${MISSIONS[missionForNight(night)].count} objectives`}</p>
          <div className="mt-auto flex items-center justify-end gap-4">
            <p className="flex items-center gap-2 text-bone">
              <Hexagon className="size-4 text-concrete" aria-hidden="true" />
              <span className="font-mono text-lg md:text-2xl">{scrap.toLocaleString('en-US')}</span>
              <span className="text-[10px] tracking-label text-concrete md:text-xs">SCRAP</span>
            </p>
            <span aria-hidden="true" className="h-8 w-px bg-concrete" />
            <button type="button" className={`${BTN_PRIMARY} w-40 md:w-56`} onClick={() => deploy(micReady())}>
              DEPLOY
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
