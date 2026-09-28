'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useLayoutEffect, useRef } from 'react'
import { type DirectionalLight, type OrthographicCamera, Vector3 } from 'three'
import { CAMERA, JUICE, LIGHT, MODIFIERS, PALETTE } from '@/lib/game/config'
import { juiceLive } from '@/lib/game/juice'
import type { PlayerState } from '@/lib/game/player'

const offsetDir = new Vector3(...CAMERA.offset).normalize()
const SHADOW_EXTENT = 16

/** Iso ortho camera that eases after the player; the key light and its shadow frustum follow along. */
export function GameRig({ player: p, blackout = false }: { player: PlayerState; blackout?: boolean }) {
  const lightScale = blackout ? MODIFIERS.blackout.lightScale : 1
  const camera = useThree((s) => s.camera)
  const height = useThree((s) => s.size.height)
  const light = useRef<DirectionalLight>(null)
  const focus = useRef<Vector3 | null>(null)

  const place = (f: Vector3) => {
    camera.position.copy(f).addScaledVector(offsetDir, CAMERA.distance)
    camera.lookAt(f)
    const l = light.current
    if (l) {
      l.position.set(f.x + LIGHT.keyDirection[0], LIGHT.keyDirection[1], f.z + LIGHT.keyDirection[2])
      l.target.position.set(f.x, 0, f.z)
      l.target.updateMatrixWorld()
    }
  }

  useLayoutEffect(() => {
    focus.current = new Vector3(p.x, 0, p.z)
    place(focus.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useLayoutEffect(() => {
    if (!(camera as OrthographicCamera).isOrthographicCamera) return
    camera.zoom = height / CAMERA.gameViewHeight
    camera.updateProjectionMatrix()
  }, [camera, height])

  useFrame((_, dt) => {
    const f = focus.current
    // The locker view swaps in its own perspective camera.
    if (!f || !(camera as OrthographicCamera).isOrthographicCamera) return
    const k = 1 - Math.exp(-CAMERA.followLerp * dt)
    f.x += (p.x - f.x) * k
    f.z += (p.z - f.z) * k
    place(f)
    // Screen shake: offset only, recomputed from the eased focus every frame so it never drifts.
    const trauma = juiceLive.trauma
    if (trauma > 0) {
      const amp = trauma * trauma * JUICE.shake.maxOffset
      camera.position.x += (Math.random() * 2 - 1) * amp
      camera.position.y += (Math.random() * 2 - 1) * amp * 0.5
      camera.position.z += (Math.random() * 2 - 1) * amp
    }
  })

  return (
    <>
      <color attach="background" args={[PALETTE.ink]} />
      <ambientLight intensity={LIGHT.ambientIntensity * lightScale} />
      <directionalLight
        ref={light}
        intensity={LIGHT.keyIntensity * lightScale}
        castShadow
        shadow-mapSize={[LIGHT.shadowMapSize, LIGHT.shadowMapSize]}
        shadow-camera-left={-SHADOW_EXTENT}
        shadow-camera-right={SHADOW_EXTENT}
        shadow-camera-top={SHADOW_EXTENT}
        shadow-camera-bottom={-SHADOW_EXTENT}
        shadow-camera-far={60}
        shadow-bias={-0.0005}
      />
    </>
  )
}
