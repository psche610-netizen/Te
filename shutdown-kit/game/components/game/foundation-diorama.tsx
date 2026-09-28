'use client'

import { useMemo } from 'react'
import { composeParts, GENERATOR_BODY_PARTS, GENERATOR_LIGHT_PARTS, LOCKER_PARTS, CRATE_PARTS, type MatId } from '@/lib/game/level/parts'
import type { Box, PropModule } from '@/lib/game/level/types'
import { flatMaterial } from '@/lib/game/materials'
import type { PaletteKey } from '@/lib/game/config'
import { InstancedBoxes } from './level/instanced-boxes'

/** Two-storey industrial cutaway, built from the same assets as the playable facility. */
export function FoundationDiorama() {
  const groups = useMemo(() => {
    const out = new Map<MatId, Box[]>()
    const box = (mat: MatId, x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
      if (!out.has(mat)) out.set(mat, [])
      out.get(mat)!.push({ x, y, z, sx, sy, sz })
    }
    const prop = (x: number, z: number): PropModule => ({ id: 0, cx: 0, cz: 0, x, z, rotY: 0 })
    // Upper L-shaped platform and exposed lower service floor.
    box('graphite', 0, -0.28, -1.9, 13, 0.56, 5)
    box('graphite', 4.5, -0.28, 2.5, 4, 0.56, 4)
    box('bone', 0, 0.015, -1.9, 12.8, 0.05, 4.8)
    box('bone', 4.5, 0.015, 2.5, 3.8, 0.05, 4)
    box('graphite', 0, -3, 2.6, 13, 0.5, 4.4)
    box('concrete', 0, -2.72, 2.6, 12.8, 0.05, 4.2)
    box('concrete', 0, 1.45, -4.4, 13, 2.9, 0.3)
    box('concrete', -6.4, 1.45, -1.9, 0.3, 2.9, 5)
    box('concrete', 6.4, -1.4, 2.6, 0.3, 2.5, 4.4)
    for (const x of [-6.2, -2.5, 2.5, 6.2]) {
      box('graphite', x, -1.4, 0.35, 0.3, 2.8, 0.4)
      box('graphite', x, 1.45, -4.18, 0.26, 2.9, 0.28)
    }
    // Lower service gallery: visible back wall, doors and utility ducting.
    box('concrete', -2, -1.4, 0.65, 8.5, 2.65, 0.24)
    for (const x of [-4.5, -0.5]) {
      box('graphite', x, -1.65, 0.85, 1.35, 2.15, 0.2)
      box('ink', x, -1.65, 0.98, 1.05, 1.95, 0.08)
      box('bone', x + 0.28, -1.25, 1.03, 0.05, 0.4, 0.02)
    }
    for (const y of [-0.45, -0.7]) box('graphite', -2, y, 0.82, 8.4, 0.09, 0.12)
    box('graphite', -2.2, -2.15, 1.05, 1.1, 1.1, 0.45)
    for (let y = -2.5; y < -1.65; y += 0.14) box('concrete', -2.2, y, 1.29, 0.85, 0.04, 0.03)
    // Monolithic OVERSEER housing.
    box('graphite', 2.4, 3.6, -6, 8.2, 7.2, 1.3)
    box('signal:e', 2.4, 5.2, -5.33, 6.2, 0.1, 0.03)
    // Wall conduit, cable clips and inset doors.
    for (const y of [2.05, 2.3]) {
      box('graphite', -0.7, y, -4.17, 10.8, 0.09, 0.1)
      box('graphite', 4.7, y / 2, -4.17, 0.09, y, 0.1)
    }
    for (const x of [-5.4, -3.2, -1, 1.2, 3.4]) box('ink', x, 2.18, -4.08, 0.06, 0.5, 0.06)
    for (const y of [-2.7, 0]) {
      box('graphite', 0.5, y + 1.1, -3.95, 1.7, 2.2, 0.3)
      box('ink', 0.5, y + 1, -3.76, 1.35, 2, 0.1)
      box('bone', 0.9, y + 1.3, -3.69, 0.045, 0.48, 0.025)
    }
    composeParts([-4.8, -3.6, -2.4].map(x => prop(x, -3.7)), LOCKER_PARTS, out)
    composeParts([prop(3.3, -2.1)], GENERATOR_BODY_PARTS, out)
    composeParts([prop(3.3, -2.1)], GENERATOR_LIGHT_PARTS, out)
    composeParts([prop(-5.3, -1.4), prop(5.3, 3.1)], CRATE_PARTS, out)
    // Guardrails trace the open edge; a ladder connects the two levels.
    for (const y of [0.55, 1.05]) {
      box('graphite', -2, y, 0.45, 8.6, 0.055, 0.055)
      box('graphite', 2.25, y, 2.2, 0.055, 0.055, 3.5)
    }
    for (let x = -6.2; x < 2.4; x += 1.4) box('graphite', x, 0.55, 0.45, 0.055, 1.1, 0.055)
    for (const z of [1.8, 3.8]) box('graphite', 2.25, 0.55, z, 0.055, 1.1, 0.055)
    for (const x of [4.3, 5.05]) box('graphite', x, -1.3, 4.65, 0.06, 3.4, 0.06)
    for (let y = -2.6; y < 0.5; y += 0.32) box('concrete', 4.67, y, 4.65, 0.8, 0.04, 0.06)
    for (let x = -5.8; x < 2; x += 0.48) box('graphite', x, 0.06, 0.15, 0.23, 0.02, 0.17)
    return [...out.entries()]
  }, [])
  return <group>{groups.map(([id, boxes]) => <InstancedBoxes key={id} boxes={boxes} material={flatMaterial(id.split(':')[0] as PaletteKey, id.endsWith(':e'))} />)}</group>
}
