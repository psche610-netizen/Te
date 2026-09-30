'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useLayoutEffect, useRef, useState } from 'react'
import { Vector3, type Group } from 'three'
import { CAMERA } from '@/lib/game/config'
import { flatMaterial, UNIT_BOX } from '@/lib/game/materials'
import { createPlayer } from '@/lib/game/player'
import { useSkinColors } from '@/lib/game/use-skin-colors'
import { Mannequin } from './player-view'
import { V4Lights } from './v4-lights'

const offsetDir = new Vector3(0.4, 0.3, 1).normalize()
const UP = new Vector3(0, 1, 0)
/** World units visible vertically; the operator is ~2 tall. */
const VIEW_HEIGHT = 2.8

/** Operator on a plinth for screen 04, framed into the left third of the viewport. */
export function LoadoutDiorama() {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const turn = useRef<Group>(null)
  const [pose] = useState(() => createPlayer({ x: 0, z: 0 }))
  const { suit } = useSkinColors()

  useLayoutEffect(() => {
    const zoom = size.height / VIEW_HEIGHT
    const right = new Vector3().crossVectors(UP, offsetDir).normalize()
    const shift = (size.width * (0.5 - 0.19)) / zoom
    const target = new Vector3(0, 1, 0).addScaledVector(right, shift)
    camera.position.copy(target).addScaledVector(offsetDir, CAMERA.distance)
    camera.lookAt(target)
    camera.zoom = zoom
    camera.updateProjectionMatrix()
  }, [camera, size.width, size.height])

  useFrame((_, dt) => {
    if (turn.current) turn.current.rotation.y += dt * 0.25
  })

  return (
    <>
      <V4Lights shadowExtent={3} shadowMapSize={1024} />
      <mesh geometry={UNIT_BOX} material={flatMaterial('concrete')} position={[0, -0.1, 0]} scale={[1.25, 0.2, 1.05]} receiveShadow />
      <group ref={turn}>
        <Mannequin p={pose} material={flatMaterial(suit)} />
      </group>
    </>
  )
}
