'use client'

import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { BufferAttribute, BufferGeometry, MeshBasicMaterial, type Mesh } from 'three'
import { PALETTE } from '@/lib/game/config'
import { collidersInRange, rayDistance } from '@/lib/game/level/raycast'
import type { AABB, LevelData } from '@/lib/game/level/types'

const RAYS = 28
const Y = 0.02

export interface FanState {
  x: number
  z: number
  angle: number
  opacity: number
}

const boxes: AABB[] = []

/** Ray length from (x, z) along unit (dx, dz), clipped to `range`. */
export type FanCast = (x: number, z: number, dx: number, dz: number, range: number) => number

/**
 * Flat red fan on the floor, clipped by blockers with one ray per segment. Hidden at opacity 0.
 * Clips against the level's colliders, or a custom `cast` (the Core has no grid level).
 */
export function FanCone({
  level,
  cast,
  range,
  halfFov,
  read,
}: {
  level?: LevelData
  cast?: FanCast
  range: number
  halfFov: number
  read: (out: FanState) => void
}) {
  const mesh = useRef<Mesh>(null)
  const state = useMemo<FanState>(() => ({ x: 0, z: 0, angle: 0, opacity: 0 }), [])
  const { geometry, material } = useMemo(() => {
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array((RAYS + 2) * 3), 3))
    const index: number[] = []
    for (let i = 1; i <= RAYS; i++) index.push(0, i, i + 1)
    g.setIndex(index)
    const m = new MeshBasicMaterial({
      color: PALETTE.danger,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    })
    return { geometry: g, material: m }
  }, [])

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  useFrame(() => {
    read(state)
    if (!mesh.current) return
    mesh.current.visible = state.opacity > 0
    if (state.opacity <= 0) return
    material.opacity = state.opacity
    const pos = geometry.getAttribute('position') as BufferAttribute
    const arr = pos.array as Float32Array
    arr[0] = state.x
    arr[1] = Y
    arr[2] = state.z
    if (level) collidersInRange(level, state.x, state.z, range, boxes)
    for (let i = 0; i <= RAYS; i++) {
      const a = state.angle - halfFov + (i / RAYS) * halfFov * 2
      const dx = Math.sin(a)
      const dz = Math.cos(a)
      const d = cast
        ? cast(state.x, state.z, dx, dz, range)
        : level
          ? rayDistance(state.x, state.z, dx, dz, range, boxes)
          : range
      const o = (i + 1) * 3
      arr[o] = state.x + dx * d
      arr[o + 1] = Y
      arr[o + 2] = state.z + dz * d
    }
    pos.needsUpdate = true
  })

  return <mesh ref={mesh} geometry={geometry} material={material} frustumCulled={false} renderOrder={1} />
}
