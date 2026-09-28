'use client'

import { useThree } from '@react-three/fiber'
import { useLayoutEffect } from 'react'
import { Vector3 } from 'three'
import { CAMERA, LIGHT, PALETTE } from '@/lib/game/config'

const offsetDir = new Vector3(...CAMERA.offset).normalize()

/** Orthographic isometric camera aimed at `target`, plus the single key light and ambient. */
export function SceneRig({ target }: { target: [number, number, number] }) {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)

  useLayoutEffect(() => {
    const t = new Vector3(...target)
    camera.position.copy(t).addScaledVector(offsetDir, CAMERA.distance)
    camera.lookAt(t)
    camera.zoom = Math.min(size.width / 32, size.height / 19)
    camera.updateProjectionMatrix()
  }, [camera, size.width, size.height, target])

  return (
    <>
      <color attach="background" args={[PALETTE.ink]} />
      <ambientLight intensity={LIGHT.ambientIntensity} />
      <directionalLight
        position={LIGHT.keyDirection as unknown as [number, number, number]}
        intensity={LIGHT.keyIntensity}
        castShadow
        shadow-mapSize={[LIGHT.shadowMapSize, LIGHT.shadowMapSize]}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-bias={-0.0005}
      />
    </>
  )
}
