'use client'

import { type RefObject, useLayoutEffect, useRef } from 'react'
import { type InstancedMesh, Matrix4, Quaternion, Vector3 } from 'three'
import { type AssetId, type AssetPart, type PartFilter, remapDecal, useAssetParts } from '@/lib/game/assets'

/** One instance: world position, yaw, per-axis scale, and a pre-scale offset in GLB space. */
export type Placement = {
  x: number
  y: number
  z: number
  rotY?: number
  sx?: number
  sy?: number
  sz?: number
  local?: [number, number, number]
}

const _q = new Quaternion()
const _p = new Vector3()
const _s = new Vector3()
const Y = new Vector3(0, 1, 0)

/** T(pos) · R(rotY) · S(scale) · T(local) */
export function placementMatrix(p: Placement, out: Matrix4, extra?: Vector3) {
  const sx = p.sx ?? 1
  const sy = p.sy ?? 1
  const sz = p.sz ?? 1
  const r = p.rotY ?? 0
  const lx = ((p.local?.[0] ?? 0) + (extra?.x ?? 0)) * sx
  const ly = ((p.local?.[1] ?? 0) + (extra?.y ?? 0)) * sy
  const lz = ((p.local?.[2] ?? 0) + (extra?.z ?? 0)) * sz
  const c = Math.cos(r)
  const s = Math.sin(r)
  _p.set(p.x + lx * c + lz * s, p.y + ly, p.z - lx * s + lz * c)
  _q.setFromAxisAngle(Y, r)
  _s.set(sx, sy, sz)
  return out.compose(_p, _q, _s)
}

type PartsProps = {
  parts: AssetPart[]
  placements: Placement[]
  castShadow?: boolean
  /** Filled with one InstancedMesh per part, for views that move instances every frame. */
  meshes?: RefObject<(InstancedMesh | null)[]>
}

const _m = new Matrix4()

export function InstancedParts({ parts, placements, castShadow = true, meshes }: PartsProps) {
  const local = useRef<(InstancedMesh | null)[]>([])
  const refs = meshes ?? local

  useLayoutEffect(() => {
    for (const mesh of refs.current ?? []) {
      if (!mesh) continue
      placements.forEach((p, i) => mesh.setMatrixAt(i, placementMatrix(p, _m)))
      mesh.instanceMatrix.needsUpdate = true
      mesh.computeBoundingSphere()
    }
  }, [placements, parts, refs])

  if (placements.length === 0) return null
  return (
    <>
      {parts.map((part, i) => (
        <instancedMesh
          key={`${part.geometry.uuid}:${placements.length}`}
          ref={(m) => {
            if (refs.current) refs.current[i] = m
          }}
          args={[part.geometry, part.material, placements.length]}
          castShadow={castShadow && !part.decal}
          receiveShadow={!part.decal}
        />
      ))}
    </>
  )
}

type AssetProps = Omit<PartsProps, 'parts'> & {
  asset: AssetId
  filter?: PartFilter
  /** Decal assets: swap the baked atlas item (`decal_item`) for this one. */
  decal?: { from: string; to: string }
}

/** Many copies of one kit asset: one draw call per material. Suspends while the GLB loads. */
export function InstancedAsset({ asset, filter, decal, ...rest }: AssetProps) {
  const parts = useAssetParts(asset, filter)
  return <InstancedParts parts={decal ? remapDecal(parts, decal.from, decal.to) : parts} {...rest} />
}
