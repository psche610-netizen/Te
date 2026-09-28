'use client'

import { useMemo } from 'react'
import { GRID, type PaletteKey } from '@/lib/game/config'
import {
  composeParts,
  CRATE_PARTS,
  GENERATOR_BODY_PARTS,
  LOCKER_PARTS,
  type MatId,
} from '@/lib/game/level/parts'
import type { Box, LevelData } from '@/lib/game/level/types'
import { flatMaterial, UNIT_BOX } from '@/lib/game/materials'
import { InstancedBoxes } from './instanced-boxes'
import { DoorView, DynamicWallView, GateView } from './module-views'

const TILE_INSET = 0.012
const TILE_HEIGHT = 0.06

function matFor(id: MatId) {
  const [key, e] = id.split(':') as [PaletteKey, string | undefined]
  return flatMaterial(key, e === 'e')
}

export function LevelView({ level }: { level: LevelData }) {
  const cs = level.cellSize

  const { tiles, caps, props } = useMemo(() => {
    const tiles: Box[] = level.floorCells.flatMap(({ cx, cz }) => [0, 1, 2, 3].map(i => ({
      x: cx * cs + (i % 2 ? 1 : -1) * cs / 4,
      y: -TILE_HEIGHT / 2,
      z: cz * cs + (i < 2 ? -1 : 1) * cs / 4,
      sx: cs / 2 - TILE_INSET,
      sy: TILE_HEIGHT,
      sz: cs / 2 - TILE_INSET,
    })))
    const caps: Box[] = level.wallArms.map((a) => ({
      ...a,
      y: GRID.wallHeight + 0.015,
      sy: 0.03,
      sx: a.sx === GRID.wallThickness ? a.sx + 0.02 : a.sx,
      sz: a.sz === GRID.wallThickness ? a.sz + 0.02 : a.sz,
    }))
    const props = composeParts(level.lockers, LOCKER_PARTS)
    composeParts(level.generators, GENERATOR_BODY_PARTS, props)
    composeParts(level.crates, CRATE_PARTS, props)
    if (level.id === 'sector-2') {
      const cabinets = level.crates.map(c => ({ ...c, y: 1.25, sx: 1.18, sy: 2.5, sz: 1.18 }))
      props.set('bone', [...(props.get('bone') ?? []), ...cabinets])
      const seams = level.crates.flatMap(c => [0.8, 1.65, 2.45].map(y => ({ x: c.x, y, z: c.z, sx: 1.2, sy: 0.04, sz: 1.2 })))
      props.set('ink', [...(props.get('ink') ?? []), ...seams])
    }
    if (level.id === 'sector-3') {
      const cages = level.crates.flatMap(c => [-0.48, 0.48].flatMap(x => [-0.48, 0.48].map(z => ({ x: c.x + x, y: 1.15, z: c.z + z, sx: 0.12, sy: 2.3, sz: 0.12 }))))
      props.set('concrete', [...(props.get('concrete') ?? []), ...cages])
      const cores = level.crates.map(c => ({ x: c.x, y: 1.4, z: c.z, sx: 0.65, sy: 0.7, sz: 0.65 }))
      props.set('signal', [...(props.get('signal') ?? []), ...cores])
    }
    const trim: Box[] = []
    for (const a of level.wallArms) {
      trim.push({ ...a, y: 0.16, sy: 0.3, sx: a.sx + 0.035, sz: a.sz + 0.035 })
      trim.push({ ...a, y: GRID.wallHeight * 0.72, sy: 0.06, sx: a.sx + 0.07, sz: a.sz + 0.07 })
    }
    const panels: Box[] = []
    const vents: Box[] = []
    level.wallArms.forEach((a, i) => {
      if (i % 7 !== 0) return
      const alongX = a.sx > a.sz
      panels.push({ x: a.x, y: 0.9, z: a.z, sx: alongX ? 0.65 : 0.44, sy: 1.05, sz: alongX ? 0.44 : 0.65 })
      for (const y of [0.6, 0.72, 0.84, 1.22]) vents.push({ x: a.x, y, z: a.z, sx: alongX ? 0.48 : 0.455, sy: 0.035, sz: alongX ? 0.455 : 0.48 })
    })
    props.set('graphite', [...(props.get('graphite') ?? []), ...trim, ...panels])
    props.set('concrete', [...(props.get('concrete') ?? []), ...vents])
    return { tiles, caps, props: [...props.entries()] }
  }, [level, cs])

  const slabW = level.width * cs + 0.6
  const slabD = level.height * cs + 0.6

  return (
    <group>
      <mesh
        geometry={UNIT_BOX}
        material={flatMaterial('graphite')}
        position={[((level.width - 1) * cs) / 2, -0.3, ((level.height - 1) * cs) / 2]}
        scale={[slabW, 0.5, slabD]}
        receiveShadow
      />
      <InstancedBoxes boxes={tiles} material={flatMaterial('concrete')} castShadow={false} />
      <InstancedBoxes boxes={level.wallArms} material={flatMaterial('bone')} />
      <InstancedBoxes boxes={caps} material={flatMaterial('bone')} castShadow={false} />
      <InstancedBoxes boxes={level.wallPosts} material={flatMaterial('graphite')} />
      {props.map(([id, boxes]) => (
        <InstancedBoxes
          key={id}
          boxes={boxes}
          material={matFor(id)}
          castShadow={!id.endsWith(':e') && id !== 'ink'}
        />
      ))}
      {level.doors.map((d) => (
        <DoorView key={`d${d.id}`} door={d} />
      ))}
      {level.dynamicWalls.map((w) => (
        <DynamicWallView key={`w${w.id}`} wall={w} />
      ))}
      {level.gates.map((g) => (
        <GateView key={`g${g.id}`} gate={g} />
      ))}
    </group>
  )
}
