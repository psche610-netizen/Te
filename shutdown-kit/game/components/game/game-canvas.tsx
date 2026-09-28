'use client'

import { Canvas } from '@react-three/fiber'
import { PERF } from '@/lib/game/config'
import { useGameStore } from '@/lib/game/store'
import { SceneRig } from './scene-rig'
import { FoundationDiorama } from './foundation-diorama'
import { CoreScene } from './core-scene'
import { GameScene } from './game-scene'
import { LoadoutDiorama } from './loadout-diorama'

const TITLE_TARGET: [number, number, number] = [-3.5, 1.3, 3.5]

export default function GameCanvas() {
  const screen = useGameStore((s) => s.screen)
  const runId = useGameStore((s) => s.runId)
  const sector = useGameStore((s) => s.sector)

  return (
    <Canvas
      orthographic
      shadows="basic"
      dpr={[1, PERF.maxDpr]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ near: 0.1, far: 200 }}
      className="!absolute inset-0"
    >
      {screen === 'game' ? (
        sector === 'core' ? (
          <CoreScene key={runId} />
        ) : (
          <GameScene key={runId} />
        )
      ) : screen === 'loadout' ? (
        <LoadoutDiorama />
      ) : screen === 'title' ? (
        <>
          <SceneRig target={TITLE_TARGET} />
          <FoundationDiorama />
        </>
      ) : null}
    </Canvas>
  )
}
