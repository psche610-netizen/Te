'use client'

import { type ThreeElements, useFrame } from '@react-three/fiber'
import { useLayoutEffect } from 'react'
import { AnimationMixer, LoopOnce } from 'three'
import { type AssetId, tickAssetEffects, useV4Asset } from '@/lib/game/assets'
import { V4Model } from '../v4-model'
import type { SetPiece } from './v4-layout'

type GroupProps = Omit<ThreeElements['group'], 'id'>

/** A kit GLB held at the last frame of one of its clips (e.g. the ladle fully tilted). */
function PosedAsset({ asset, clip, ...props }: { asset: AssetId; clip: string } & GroupProps) {
  const { scene, animations } = useV4Asset(asset)
  useLayoutEffect(() => {
    const source = animations.find((a) => a.name === clip)
    if (!source) return
    const mixer = new AnimationMixer(scene)
    const action = mixer.clipAction(source)
    action.setLoop(LoopOnce, 1)
    action.clampWhenFinished = true
    action.play()
    mixer.setTime(source.duration)
    return () => {
      mixer.stopAllAction()
      mixer.uncacheRoot(scene)
    }
  }, [scene, animations, clip])
  return (
    <group {...props}>
      <primitive object={scene} />
    </group>
  )
}

/**
 * Ladle rig from the `foundry-floor` scene recipe (three coords = Blender (x, z, -y) relative to the
 * gantry): crucible on the gantry hook at y 3.3, tilted by its `pour` clip; its spout lip at full tilt
 * is (0, 3.3 - 1.669, 0.904), so the molten stream stands on the trough surface (y 0.333) under it,
 * stretched so its 1.25 m lip meets the spout.
 */
const HOOK_Y = 3.3
const TROUGH_TOP = 0.333
const LIP: [number, number] = [HOOK_Y - 1.669, 0.904]
const STREAM_STRETCH = (LIP[0] - TROUGH_TOP) / 1.25

function FoundryPour({ piece }: { piece: SetPiece }) {
  return (
    <group position={[piece.x, 0, piece.z]} rotation-y={piece.rotY} scale={piece.s}>
      <V4Model asset="overhead-gantry" />
      <PosedAsset asset="foundry-crucible" clip="pour" position={[0, HOOK_Y, 0]} />
      <V4Model asset="casting-trough" position={[0, 0, 0.5]} />
      <V4Model asset="molten-stream" position={[0, TROUGH_TOP, LIP[1]]} scale={[1, STREAM_STRETCH, 1]} />
    </group>
  )
}

export function SetPieces({ pieces }: { pieces: SetPiece[] }) {
  return (
    <>
      {pieces.map((p) => (
        <FoundryPour key={`${p.kind}:${p.x}:${p.z}`} piece={p} />
      ))}
    </>
  )
}

/** Drives the shared effect shaders (water, falls, molten) from the frame clock. */
export function EffectsClock() {
  useFrame(({ clock }) => tickAssetEffects(clock.elapsedTime))
  return null
}
