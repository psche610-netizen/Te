'use client'

import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { type Group, type InstancedMesh, Matrix4, type Mesh, Vector3 } from 'three'
import { assetUrl, clipNodeOffset, type PartFilter, useAssetParts } from '@/lib/game/assets'
import { GRID, SHIFT } from '@/lib/game/config'
import { DOOR_JAMB } from '@/lib/game/level/build'
import type { Axis, DoorModule, DynamicWallModule, GateModule } from '@/lib/game/level/types'
import { flatMaterial, slitMaterial, UNIT_BOX } from '@/lib/game/materials'
import { V4Model } from '../v4-model'
import { InstancedParts, type Placement, placementMatrix } from './instanced-asset'
import { type DoorKit, WALL_FACE } from './v4-layout'

const CS = GRID.cellSize
const H = GRID.wallHeight
const STRIPE_Z = GRID.wallThickness / 2 + 0.01
const TRACK_Z = GRID.wallThickness / 2 + 0.08

type BoxProps = {
  p: [number, number, number]
  s: [number, number, number]
  m: ReturnType<typeof flatMaterial>
  shadow?: boolean
}

function B({ p, s, m, shadow = true }: BoxProps) {
  return (
    <mesh
      geometry={UNIT_BOX}
      material={m}
      position={p}
      scale={s}
      castShadow={shadow}
      receiveShadow={shadow}
    />
  )
}

/** Modules are modelled along local x; rotate for walls running along z. */
const axisRot = (axis: Axis) => (axis === 'x' ? 0 : Math.PI / 2)

const BLINK_HZ = 6
const blinkOn = (t: number) => Math.floor(t * BLINK_HZ * 2) % 2 === 0

/** Two floor tracks either side of a module; blink danger red while a shift is telegraphed. */
function FloorTracks({ module, alwaysVisible }: { module: { telegraph: boolean }; alwaysVisible: boolean }) {
  const refs = useRef<(Mesh | null)[]>([])
  const signal = flatMaterial('signal', true)

  useFrame(({ clock }) => {
    const warn = module.telegraph
    const mat = warn && blinkOn(clock.elapsedTime) ? slitMaterial : signal
    for (const m of refs.current) {
      if (!m) continue
      m.visible = alwaysVisible || warn
      m.material = mat
    }
  })

  return (
    <>
      {[TRACK_Z, -TRACK_Z].map((z, i) => (
        <mesh
          key={z}
          ref={(m) => {
            refs.current[i] = m
          }}
          geometry={UNIT_BOX}
          material={signal}
          position={[0, 0.016, z]}
          scale={[CS, 0.01, 0.05]}
          visible={alwaysVisible}
        />
      ))}
    </>
  )
}

export function DoorView({ door }: { door: DoorModule }) {
  const panel = useRef<Mesh>(null)
  const graphite = flatMaterial('graphite')
  const signal = flatMaterial('signal', true)
  const DH = GRID.doorHeight
  const jambX = CS / 2 - DOOR_JAMB.along / 2

  const lights = useRef<(Mesh | null)[]>([])

  useFrame((_, dt) => {
    for (const l of lights.current) if (l) l.material = door.locked ? slitMaterial : signal
    const m = panel.current
    if (!m) return
    const target = door.open ? CS * 0.82 : 0
    m.position.x += (target - m.position.x) * (1 - Math.exp(-12 * dt))
  })

  return (
    <group position={[door.x, 0, door.z]} rotation-y={axisRot(door.axis)}>
      <B p={[-jambX, (H + 0.06) / 2, 0]} s={[DOOR_JAMB.along, H + 0.06, DOOR_JAMB.across]} m={graphite} />
      <B p={[jambX, (H + 0.06) / 2, 0]} s={[DOOR_JAMB.along, H + 0.06, DOOR_JAMB.across]} m={graphite} />
      <B p={[0, DH + (H - DH) / 2, 0]} s={[CS - 0.1, H - DH, 0.34]} m={graphite} />
      <FloorTracks module={door} alwaysVisible={false} />
      {[0.18, -0.18].map((z, i) => (
        <mesh
          key={z}
          ref={(l) => {
            lights.current[i] = l
          }}
          geometry={UNIT_BOX}
          material={signal}
          position={[0, DH + 0.12, z]}
          scale={[0.4, 0.05, 0.02]}
        />
      ))}
      <mesh
        ref={panel}
        geometry={UNIT_BOX}
        material={graphite}
        position={[door.open ? CS * 0.82 : 0, DH / 2, 0]}
        scale={[CS - DOOR_JAMB.along * 2, DH, 0.12]}
        castShadow
      />
    </group>
  )
}

const DOOR_LAMP_Z = WALL_FACE + 0.02
const _leaf = new Matrix4()
const _slide = new Vector3()

/** Door status lights + telegraph tracks, shared by every door (primitive, they swap material live). */
function DoorSignals({ door, lampY, lampZ }: { door: DoorModule; lampY: number; lampZ: number }) {
  const lights = useRef<(Mesh | null)[]>([])
  const signal = flatMaterial('signal', true)
  useFrame(() => {
    for (const l of lights.current) if (l) l.material = door.locked ? slitMaterial : signal
  })
  return (
    <group position={[door.x, 0, door.z]} rotation-y={axisRot(door.axis)}>
      <FloorTracks module={door} alwaysVisible={false} />
      {[lampZ, -lampZ].map((z, i) => (
        <mesh
          key={z}
          ref={(l) => {
            lights.current[i] = l
          }}
          geometry={UNIT_BOX}
          material={signal}
          position={[0, lampY, z]}
          scale={[0.4, 0.05, 0.02]}
        />
      ))}
    </group>
  )
}

/**
 * All doors as the V4 sliding bulkhead: frames are one static instance set, leaves another set whose
 * matrices slide along the GLB `open` clip offset. Scaled to the 2 m cell (see `DOOR_SCALE`).
 */
export function V4Doors({ doors, kit }: { doors: DoorModule[]; kit: DoorKit }) {
  const filters = useMemo<[PartFilter, PartFilter]>(
    () => [
      { key: 'frame', node: kit.leaf, exclude: true },
      { key: 'leaf', node: kit.leaf },
    ],
    [kit.leaf],
  )
  const frame = useAssetParts(kit.asset, filters[0])
  const leaf = useAssetParts(kit.asset, filters[1])
  const { animations } = useGLTF(assetUrl(kit.asset))
  const slide = useMemo(() => clipNodeOffset(animations, 'open', kit.leaf), [animations, kit.leaf])
  const leafMeshes = useRef<(InstancedMesh | null)[]>([])
  const openness = useRef<number[]>([])

  const placements = useMemo<Placement[]>(
    () =>
      doors.map((d) => ({
        x: d.x,
        y: 0,
        z: d.z,
        rotY: axisRot(d.axis),
        sx: kit.scale[0],
        sy: kit.scale[1],
        sz: kit.scale[2],
        local: kit.local,
      })),
    [doors, kit],
  )

  useFrame((_, dt) => {
    const k = 1 - Math.exp(-12 * dt)
    let moved = false
    doors.forEach((d, i) => {
      const prev = openness.current[i] ?? (d.open ? 1 : 0)
      const next = prev + ((d.open ? 1 : 0) - prev) * k
      if (openness.current[i] !== undefined && Math.abs(next - prev) < 1e-4) return
      openness.current[i] = next
      moved = true
      placementMatrix(placements[i], _leaf, _slide.copy(slide).multiplyScalar(next))
      for (const m of leafMeshes.current) m?.setMatrixAt(i, _leaf)
    })
    if (moved) for (const m of leafMeshes.current) if (m) m.instanceMatrix.needsUpdate = true
  })

  return (
    <>
      <InstancedParts parts={frame} placements={placements} />
      <InstancedParts parts={leaf} placements={placements} meshes={leafMeshes} />
      {doors.map((d) => (
        <DoorSignals key={d.id} door={d} lampY={H - 0.1} lampZ={DOOR_LAMP_Z} />
      ))}
    </>
  )
}

export function DynamicWallView({ wall }: { wall: DynamicWallModule }) {
  const panel = useRef<Group>(null)
  const bone = flatMaterial('bone')
  const graphite = flatMaterial('graphite')
  const signal = flatMaterial('signal', true)
  const lowered = -(H + 0.1)

  useFrame((_, dt) => {
    const g = panel.current
    if (!g) return
    const target = wall.raised ? 0 : lowered
    g.position.y += (target - g.position.y) * (1 - Math.exp((-4.6 / SHIFT.moveDuration) * dt))
    g.visible = g.position.y > lowered + 0.02
  })

  return (
    <group position={[wall.x, 0, wall.z]} rotation-y={axisRot(wall.axis)}>
      <B p={[0, 0.03, 0]} s={[CS, 0.02, GRID.wallThickness + 0.1]} m={graphite} shadow={false} />
      <FloorTracks module={wall} alwaysVisible />
      <group ref={panel} position-y={wall.raised ? 0 : lowered} visible={wall.raised}>
        <V4Model asset="wall-straight" fallback={<B p={[0, H / 2, 0]} s={[CS, H, GRID.wallThickness]} m={bone} />} />
        {[-1, 1].map((side) => (
          <group key={side}>
            <B p={[-CS / 2 + 0.12, H * 0.55, side * STRIPE_Z]} s={[0.06, H * 0.6, 0.02]} m={signal} shadow={false} />
            <B p={[CS / 2 - 0.12, H * 0.55, side * STRIPE_Z]} s={[0.06, H * 0.6, 0.02]} m={signal} shadow={false} />
          </group>
        ))}
      </group>
    </group>
  )
}

export function GateView({ gate }: { gate: GateModule }) {
  const panel = useRef<Group>(null)
  const lights = useRef<(Mesh | null)[]>([])
  const graphite = flatMaterial('graphite')
  const concrete = flatMaterial('concrete')
  const ink = flatMaterial('ink')
  const signal = flatMaterial('signal', true)
  const GH = H + 0.8
  const inner = CS - 0.8
  const shutter = GH - 0.4

  useFrame((_, dt) => {
    const g = panel.current
    if (g) {
      const target = gate.open ? shutter - 0.05 : gate.progress * 0.5
      g.position.y += (target - g.position.y) * (1 - Math.exp(-5 * dt))
    }
    for (const m of lights.current) if (m) m.material = gate.powered ? signal : concrete
  })

  return (
    <group position={[gate.x, 0, gate.z]} rotation-y={axisRot(gate.axis)}>
      <B p={[-(CS / 2 - 0.2), GH / 2, 0]} s={[0.4, GH, 0.7]} m={graphite} />
      <B p={[CS / 2 - 0.2, GH / 2, 0]} s={[0.4, GH, 0.7]} m={graphite} />
      <B p={[0, GH - 0.2, 0]} s={[CS, 0.4, 0.7]} m={graphite} />
      <group ref={panel}>
        <B p={[0, shutter / 2, 0]} s={[inner, shutter, 0.2]} m={concrete} />
        {[0.55, 1.1, 1.65, 2.2].map((y) => (
          <B key={y} p={[0, y, 0]} s={[inner, 0.03, 0.22]} m={ink} shadow={false} />
        ))}
      </group>
      {[0.36, -0.36].map((z, i) => (
        <mesh
          key={z}
          ref={(m) => {
            lights.current[i] = m
          }}
          geometry={UNIT_BOX}
          material={concrete}
          position={[0, GH - 0.2, z]}
          scale={[CS * 0.7, 0.1, 0.02]}
        />
      ))}
    </group>
  )
}
