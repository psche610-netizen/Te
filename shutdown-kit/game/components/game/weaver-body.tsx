'use client'

import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Group, Material } from 'three'
import { HUNTER_PROFILES } from '@/lib/game/config'
import { UNIT_BOX } from '@/lib/game/materials'
import type { HunterMaterials, HunterPose } from './hunter-view'

type Seg = { p: [number, number, number]; s: [number, number, number]; r?: number }

const HIP_Y = 0.98
const ROWS = [0.3, 0.02, -0.26] as const
/** Front legs reach forward, back legs reach back. */
const SPLAY = [0.55, 0, -0.55] as const

const ABDOMEN: Seg = { p: [0, 0.98, -0.3], s: [0.62, 0.34, 0.72] }
const THORAX: Seg = { p: [0, 1.0, 0.24], s: [0.5, 0.26, 0.42] }
const HEAD: Seg = { p: [0, 0, 0], s: [0.38, 0.24, 0.22] }
const SLIT: Seg = { p: [0, 0.02, 0.116], s: [0.28, 0.035, 0.012] }

/** Segment between two points in the leg's XY plane (x = outward). */
function between(ax: number, ay: number, bx: number, by: number, thick: number): Seg {
  const dx = bx - ax
  const dy = by - ay
  return { p: [(ax + bx) / 2, (ay + by) / 2, 0], s: [thick, Math.hypot(dx, dy), thick], r: Math.atan2(-dx, dy) }
}

/** Kept narrow so the frame stays inside corridor walls (free half-width ~0.85 from a cell center). */
const KNEE = { x: 0.4, y: 0.34 }
const FOOT = { x: 0.58, y: -HIP_Y }
const legSegs = (side: number) => [
  between(0, 0, side * KNEE.x, KNEE.y, 0.075),
  between(side * KNEE.x, KNEE.y, side * FOOT.x, FOOT.y, 0.05),
]
const LEG_SEGS = { [-1]: legSegs(-1), [1]: legSegs(1) } as Record<number, Seg[]>

const LEGS = ([-1, 1] as const).flatMap((side) =>
  ROWS.map((z, row) => ({ side, z, row, phase: ((row + (side > 0 ? 1 : 0)) % 2) * Math.PI })),
)

function Box({ seg, material, shadow }: { seg: Seg; material: Material; shadow: boolean }) {
  return (
    <mesh
      geometry={UNIT_BOX}
      material={material}
      position={seg.p}
      scale={seg.s}
      rotation={[0, 0, seg.r ?? 0]}
      castShadow={shadow}
      renderOrder={shadow ? 0 : 10}
    />
  )
}

/** THE WEAVER: low six-legged frame, one red slit. Tripod gait. */
export function WeaverBody({
  hunter: h,
  materials,
  shadow,
  visible,
}: {
  hunter: HunterPose
  materials: HunterMaterials
  shadow: boolean
  visible?: () => boolean
}) {
  const root = useRef<Group>(null)
  const body = useRef<Group>(null)
  const head = useRef<Group>(null)
  const legs = useRef<(Group | null)[]>([])
  const { shell, frame, slit } = materials

  useFrame(() => {
    if (!root.current) return
    root.current.visible = visible ? visible() : true
    if (!root.current.visible) return
    root.current.position.set(h.x, 0, h.z)
    root.current.rotation.y = h.facing

    const amount = Math.min(1, h.speed / HUNTER_PROFILES.weaver.patrolSpeed)
    const chasing = h.mode === 'chase'
    LEGS.forEach((leg, i) => {
      const g = legs.current[i]
      if (!g) return
      const t = h.walkPhase + leg.phase
      // Swing forward while the foot is lifted (sin > 0), sweep back while planted.
      const swing = -Math.cos(t) * (chasing ? 0.45 : 0.32) * amount
      g.rotation.y = -leg.side * (SPLAY[leg.row] + swing)
      g.position.y = HIP_Y + Math.max(0, Math.sin(t)) * 0.12 * amount
    })
    if (body.current) {
      body.current.position.y = (chasing ? -0.08 : 0) + Math.abs(Math.sin(h.walkPhase * 2)) * 0.025 * amount
      body.current.rotation.x = chasing ? 0.08 : 0
    }
    if (head.current) head.current.rotation.y = h.headYaw
  })

  return (
    <group ref={root}>
      <group ref={body}>
        <Box seg={ABDOMEN} material={shell} shadow={shadow} />
        <Box seg={THORAX} material={frame} shadow={shadow} />
        <group ref={head} position={[0, 1.06, 0.52]}>
          <Box seg={HEAD} material={shell} shadow={shadow} />
          <Box seg={SLIT} material={slit} shadow={false} />
        </group>
      </group>
      {LEGS.map((leg, i) => (
        <group
          key={`${leg.side}:${leg.row}`}
          ref={(el) => {
            legs.current[i] = el
          }}
          position={[leg.side * 0.24, HIP_Y, leg.z]}
        >
          {LEG_SEGS[leg.side].map((seg, j) => (
            <Box key={j} seg={seg} material={frame} shadow={shadow} />
          ))}
        </group>
      ))}
    </group>
  )
}
