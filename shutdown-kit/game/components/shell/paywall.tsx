'use client'

import { Check } from 'lucide-react'
import type { ProductId } from '@/lib/purchases/types'
import { usePurchases, type PaywallReason } from '@/lib/purchases/store'
import { BTN_GHOST, BTN_PRIMARY } from './styles'

type Offer = { eyebrow: string; title: string; perks: string[]; product: ProductId }

const FOUNDRY: Offer = {
  eyebrow: 'EXPANSION',
  title: 'FOUNDRY PASS',
  perks: ['SECTOR 3: THE FOUNDRY', 'NEW HUNTER: THE WEAVER', '3 FOUNDRY PERKS', 'DAILY NIGHTS'],
  product: 'foundry_pass',
}

const SKINS: Offer = {
  eyebrow: 'COSMETICS',
  title: 'SKIN PACK',
  perks: ['JUMPSUIT: HAZMAT', 'JUMPSUIT: NIGHT SHIFT', 'HUNTER: PORCELAIN', 'LOOKS ONLY // NO STAT BOOSTS'],
  product: 'skin_pack',
}

const OFFER: Record<PaywallReason, Offer> = { foundry: FOUNDRY, sector1: FOUNDRY, skins: SKINS }

const NAME: Record<ProductId, string> = { foundry_pass: 'FOUNDRY PASS', skin_pack: 'SKIN PACK' }

/** Screen 10. Layout follows mockup 10; the white mockup background is replaced by the ink palette. */
export function Paywall() {
  const reason = usePurchases((s) => s.paywall)
  const kind = usePurchases((s) => s.kind)
  const ready = usePurchases((s) => s.ready)
  const entitlements = usePurchases((s) => s.entitlements)
  const prices = usePurchases((s) => s.prices)
  const busy = usePurchases((s) => s.busy)
  const message = usePurchases((s) => s.message)
  const buy = usePurchases((s) => s.buy)
  const restore = usePurchases((s) => s.restore)
  const close = usePurchases((s) => s.closePaywall)
  if (!reason) return null

  const offer = OFFER[reason]
  const other: ProductId = offer.product === 'foundry_pass' ? 'skin_pack' : 'foundry_pass'
  const owned = (id: ProductId) => (id === 'foundry_pass' ? entitlements.foundry : entitlements.skins)
  const headlineOwned = owned(offer.product)

  const label = (id: ProductId, prefix: string) => {
    if (owned(id)) return `${NAME[id]} // OWNED`
    if (busy === id) return 'PROCESSING...'
    return `${prefix} ${prices[id]}`
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="paywall-title"
      onKeyDown={(e) => e.key === 'Escape' && !busy && close()}
      className="absolute inset-0 z-50 bg-ink safe-area animate-in fade-in duration-300"
    >
      <div className="grid h-full grid-cols-[1fr_minmax(17rem,40%)]">
        <div className="relative min-h-0 overflow-hidden">
          <img
            src="/images/foundry-pass.png"
            alt="The Foundry: an isometric industrial sector with a molten pool, stalked by THE WEAVER, a six-legged hunter"
            className="size-full object-cover"
          />
          {kind === 'mock' && (
            <p className="absolute left-3 top-3 border border-concrete bg-ink px-2 py-1 text-[10px] tracking-label text-bone md:left-6 md:top-6 md:text-xs">
              {'WEB PREVIEW // MOCK STORE // NO CHARGE'}
            </p>
          )}
        </div>

        <div className="flex min-h-0 flex-col justify-center gap-2 overflow-y-auto border-l border-concrete bg-graphite px-5 py-4 md:gap-4 md:px-10 md:py-8">
          <p className="text-[10px] tracking-label text-concrete md:text-xs">{offer.eyebrow}</p>
          <h1 id="paywall-title" className="font-display text-4xl leading-none text-bone md:text-7xl">
            {offer.title}
          </h1>
          <ul className="flex flex-col gap-1 py-1 md:gap-3 md:py-2">
            {offer.perks.map((p) => (
              <li key={p} className="flex items-center gap-3 text-xs tracking-label text-bone md:text-lg">
                <span aria-hidden="true" className="size-2.5 shrink-0 bg-signal md:size-3.5" />
                {p}
              </li>
            ))}
          </ul>

          <button
            type="button"
            autoFocus
            className={BTN_PRIMARY}
            disabled={!ready || busy !== null || headlineOwned}
            onClick={() => buy(offer.product)}
          >
            {headlineOwned && <Check className="mr-2 size-5" aria-hidden="true" />}
            {label(offer.product, 'UNLOCK')}
          </button>
          <button
            type="button"
            disabled={!ready || busy !== null || owned(other)}
            onClick={() => buy(other)}
            className="pointer-events-auto flex h-10 items-center justify-center border border-signal font-display text-lg tracking-wide text-bone transition-colors hover:bg-signal hover:text-ink disabled:cursor-not-allowed disabled:border-concrete disabled:text-concrete disabled:hover:bg-transparent focus-visible:outline-1 focus-visible:outline-bone md:h-12 md:text-xl"
          >
            {label(other, NAME[other])}
          </button>

          <p aria-live="polite" className="min-h-4 text-center text-[10px] tracking-label text-signal md:text-xs">
            {message ?? (ready ? '' : 'CONNECTING TO STORE...')}
          </p>

          <div className="flex items-center justify-around">
            <button type="button" className={BTN_GHOST} disabled={!ready || busy !== null} onClick={restore}>
              {busy === 'restore' ? 'RESTORING...' : 'RESTORE PURCHASES'}
            </button>
            <button type="button" className={BTN_GHOST} disabled={busy !== null} onClick={close}>
              {headlineOwned ? 'CONTINUE' : 'NOT NOW'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
