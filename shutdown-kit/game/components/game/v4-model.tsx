'use client'

import type { ThreeElements } from '@react-three/fiber'
import { Component, type ReactNode, Suspense } from 'react'
import { V4 } from '@/lib/game/config'
import { type AssetId, useV4Asset } from '@/lib/game/assets'

type GroupProps = ThreeElements['group']

/** Falls back to the primitive if the GLB fails to load (missing file, bad network). */
class AssetBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

function Model({ id, ...props }: { id: AssetId } & GroupProps) {
  const { scene } = useV4Asset(id)
  return (
    <group {...props}>
      <primitive object={scene} />
    </group>
  )
}

/**
 * A kit GLB with the shared V4 materials. The code primitive in `fallback` renders while loading,
 * on load errors, and whenever `V4.models` is off, so every view keeps working during Part B.
 */
export function V4Model({ id, fallback = null, ...props }: { id: AssetId; fallback?: ReactNode } & GroupProps) {
  if (!V4.models) return <>{fallback}</>
  return (
    <AssetBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <Model id={id} {...props} />
      </Suspense>
    </AssetBoundary>
  )
}
