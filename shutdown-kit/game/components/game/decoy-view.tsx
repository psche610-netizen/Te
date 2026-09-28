'use client'

import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { DoubleSide, MeshBasicMaterial, RingGeometry, type Group, type Mesh } from 'three'
import { PALETTE, PERK_EFFECTS } from '@/lib/game/config'
import { flatMaterial, UNIT_BOX } from '@/lib/game/materials'
import type { GameSession } from '@/lib/game/session'

const SLOTS = PERK_EFFECTS.decoyCharges
const RING = new RingGeometry(0.9, 1, 40)

/** Foundry: Decoy. A small signal-orange box on the floor; each pulse sends out a flat ring. */
export function DecoyViews({ session }: { session: GameSession }) {
  const groups = useRef<(Group | null)[]>([])
  const rings = useRef<(Mesh | null)[]>([])
  const ringMat = useMemo(
    () =>
      new MeshBasicMaterial({ color: PALETTE.signal, transparent: true, opacity: 0.5, depthWrite: false, side: DoubleSide }),
    [],
  )
  useEffect(() => () => ringMat.dispose(), [ringMat])
  const body = flatMaterial('signal', true)

  useFrame(({ clock }) => {
    for (let i = 0; i < SLOTS; i++) {
      const g = groups.current[i]
      const ring = rings.current[i]
      const d = session.decoys[i]
      if (!g || !ring) continue
      g.visible = !!d
      if (!d) continue
      g.position.set(d.x, 0, d.z)
      const armed = d.age >= PERK_EFFECTS.decoyArm
      const t = armed ? 1 - d.timer / PERK_EFFECTS.decoyInterval : 0
      ring.visible = armed
      ring.scale.setScalar(0.3 + t * PERK_EFFECTS.decoyNoise * 0.5)
      g.children[0].visible = armed || Math.floor(clock.elapsedTime * 8) % 2 === 0
    }
  })

  return (
    <>
      {Array.from({ length: SLOTS }, (_, i) => (
        <group
          key={i}
          ref={(el) => {
            groups.current[i] = el
          }}
          visible={false}
        >
          <mesh geometry={UNIT_BOX} material={body} position={[0, 0.11, 0]} scale={[0.22, 0.22, 0.22]} castShadow />
          <mesh
            ref={(el) => {
              rings.current[i] = el
            }}
            geometry={RING}
            material={ringMat}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0.04, 0]}
            renderOrder={5}
          />
        </group>
      ))}
    </>
  )
}
