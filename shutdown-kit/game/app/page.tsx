'use client'

import dynamic from 'next/dynamic'
import { useEffect } from 'react'
import { MissionOverlay } from '@/components/shell/mission-overlay'
import { OrientationGate } from '@/components/shell/orientation-gate'
import { TitleOverlay } from '@/components/shell/title-overlay'
import { ResultsScreen } from '@/components/shell/results-screen'
import { GameHud } from '@/components/shell/game-hud'
import { LockerView } from '@/components/shell/locker-view'
import { Loadout } from '@/components/shell/loadout'
import { MicCalibration } from '@/components/shell/mic-calibration'
import { RepairTrial } from '@/components/shell/repair-trial'
import { SectorMap } from '@/components/shell/sector-map'
import { SettingsScreen } from '@/components/shell/settings-screen'
import { TouchControls } from '@/components/shell/touch-controls'
import { Paywall } from '@/components/shell/paywall'
import { DangerVignette } from '@/components/shell/danger-vignette'
import { useGameStore } from '@/lib/game/store'
import { usePurchases } from '@/lib/purchases/store'

const GameCanvas = dynamic(() => import('@/components/game/game-canvas'), { ssr: false })

function NightOverlay() {
  const paused = useGameStore((s) => s.paused)
  const runId = useGameStore((s) => s.runId)
  const repairing = useGameStore((s) => s.repair !== null)
  const hidden = useGameStore((s) => s.hidden)
  const ended = useGameStore((s) => s.result !== null)

  if (ended) return <ResultsScreen />

  return (
    <>
      <MissionOverlay key={runId} />
      {hidden ? <LockerView /> : <GameHud />}
      {!hidden && (repairing ? <div style={{ visibility: paused ? 'hidden' : 'visible' }}><RepairTrial /></div> : !paused && <TouchControls />)}
    </>
  )
}

const MENUS = {
  title: TitleOverlay,
  calibrate: MicCalibration,
  sectors: SectorMap,
  loadout: Loadout,
  settings: SettingsScreen,
} as const

export default function Page() {
  const screen = useGameStore((s) => s.screen)

  useEffect(() => {
    useGameStore.persist.rehydrate()
    usePurchases.persist.rehydrate()
    usePurchases.getState().init()
  }, [])

  const Menu = screen === 'game' ? null : MENUS[screen]

  return (
    <OrientationGate>
      <main className="fixed inset-0 overflow-hidden bg-ink">
        <GameCanvas />
        {!Menu && <DangerVignette />}
        {Menu ? <Menu /> : <NightOverlay />}
        {Menu && <Paywall />}
      </main>
    </OrientationGate>
  )
}
