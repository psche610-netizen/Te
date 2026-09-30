'use client'

import type { Ref } from 'react'
import type { DirectionalLight } from 'three'
import { LIGHT, PALETTE } from '@/lib/game/config'

type Vec3 = [number, number, number]

/**
 * V4 lighting (section 2): warm amber key with the one hard shadow, cool indigo fill from the
 * opposite side, indigo ambient. Shared by every scene rig.
 */
export function V4Lights({
  keyRef,
  scale = 1,
  shadowExtent = 14,
  shadowMapSize = LIGHT.shadowMapSize,
  keyPosition = LIGHT.keyDirection as unknown as Vec3,
}: {
  keyRef?: Ref<DirectionalLight>
  scale?: number
  shadowExtent?: number
  shadowMapSize?: number
  keyPosition?: Vec3
}) {
  return (
    <>
      <color attach="background" args={[PALETTE.ink]} />
      <ambientLight color={LIGHT.ambientColor} intensity={LIGHT.ambientIntensity * scale} />
      <directionalLight
        ref={keyRef}
        color={LIGHT.keyColor}
        position={keyPosition}
        intensity={LIGHT.keyIntensity * scale}
        castShadow
        shadow-mapSize={[shadowMapSize, shadowMapSize]}
        shadow-camera-left={-shadowExtent}
        shadow-camera-right={shadowExtent}
        shadow-camera-top={shadowExtent}
        shadow-camera-bottom={-shadowExtent}
        shadow-camera-far={60}
        shadow-bias={-0.0005}
      />
      <directionalLight
        color={LIGHT.fillColor}
        position={LIGHT.fillDirection as unknown as Vec3}
        intensity={LIGHT.fillIntensity * scale}
      />
    </>
  )
}
