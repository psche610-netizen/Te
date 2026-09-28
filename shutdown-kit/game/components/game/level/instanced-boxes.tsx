'use client'

import { useLayoutEffect, useRef } from 'react'
import { type InstancedMesh, type Material, Object3D } from 'three'
import { UNIT_BOX } from '@/lib/game/materials'
import type { Box } from '@/lib/game/level/types'

const dummy = new Object3D()

type Props = {
  boxes: Box[]
  material: Material
  castShadow?: boolean
  receiveShadow?: boolean
}

/** One draw call for many static boxes (unit cube, scaled per instance). */
export function InstancedBoxes({ boxes, material, castShadow = true, receiveShadow = true }: Props) {
  const ref = useRef<InstancedMesh>(null)

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    boxes.forEach((b, i) => {
      dummy.position.set(b.x, b.y, b.z)
      dummy.rotation.set(0, b.rotY ?? 0, 0)
      dummy.scale.set(b.sx, b.sy, b.sz)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [boxes])

  if (boxes.length === 0) return null
  return (
    <instancedMesh
      key={boxes.length}
      ref={ref}
      args={[UNIT_BOX, material, boxes.length]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    />
  )
}
