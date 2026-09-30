'use client'

import { useFrame } from '@react-three/fiber'
import { useCallback, useMemo, useRef } from 'react'
import { MeshBasicMaterial, type Group, type Mesh } from 'three'
import { generatorAvailable } from '@/lib/game/missions'
import { LOCKER, PALETTE, SECURITY_CAMERA, V4 } from '@/lib/game/config'
import { lockerPoint } from '@/lib/game/hide'
import { composeParts, GENERATOR_LIGHT_PARTS, type Part } from '@/lib/game/level/parts'
import type { CameraModule, LevelData } from '@/lib/game/level/types'
import { flatMaterial, slitMaterial, UNIT_BOX } from '@/lib/game/materials'
import type { GameSession } from '@/lib/game/session'
import { FanCone, type FanState } from './fan-cone'

/** Status lights for the V4 turbine (scaled 0.38): a floor strip at the front and a lamp on top. */
const V4_GENERATOR_LIGHT_PARTS: Part[] = [
  { mat: 'signal:e', box: { x: 0, y: 0.045, z: 0.78, sx: 1.3, sy: 0.02, sz: 0.1 } },
  { mat: 'signal:e', box: { x: 0, y: 1.22, z: 0, sx: 0.22, sy: 0.1, sz: 0.22 } },
]

/** Generator status strips: signal = needs repair, blinking = in repair, bone = online. */
export function GeneratorLights({ session }: { session: GameSession }) {
  const meshes = useRef<(Mesh | null)[]>([])
  const boxes = useMemo(
    () =>
      session.level.generators.flatMap((g, gi) =>
        [...composeParts([g], V4.models ? V4_GENERATOR_LIGHT_PARTS : GENERATOR_LIGHT_PARTS).values()]
          .flat()
          .map((box) => ({ box, gi })),
      ),
    [session],
  )
  const pending = flatMaterial('signal', true)
  const online = flatMaterial('bone')

  useFrame(({ clock }) => {
    const blinkOn = Math.floor(clock.elapsedTime * 6) % 2 === 0
    boxes.forEach(({ gi }, i) => {
      const m = meshes.current[i]
      if (!m) return
      const repaired = session.generators[gi].repaired
      m.material = repaired ? online : generatorAvailable(session, gi) ? pending : flatMaterial('concrete')
      m.visible = repaired || session.repair?.generatorId !== gi || blinkOn
    })
  })

  return (
    <>
      {boxes.map(({ box }, i) => (
        <mesh
          key={i}
          ref={(m) => {
            meshes.current[i] = m
          }}
          geometry={UNIT_BOX}
          material={pending}
          position={[box.x, box.y, box.z]}
          rotation-y={box.rotY ?? 0}
          scale={[box.sx, box.sy, box.sz]}
        />
      ))}
    </>
  )
}

const gasMaterial = new MeshBasicMaterial({ color: PALETTE.danger, transparent: true, opacity: 0.3, depthWrite: false })

/** Gassed lockers (OVERSEER director): flat danger-red floor plate in front of each. */
export function LockerGas({ session }: { session: GameSession }) {
  const meshes = useRef<(Mesh | null)[]>([])
  const spots = useMemo(
    () => session.level.lockers.map((l) => ({ ...lockerPoint(session.level, l.id, LOCKER.standOffset), rotY: l.rotY })),
    [session],
  )

  useFrame(() => {
    spots.forEach((_, i) => {
      const m = meshes.current[i]
      if (m) m.visible = session.lockerGas[i] > 0
    })
  })

  return (
    <>
      {spots.map((p, i) => (
        <mesh
          key={i}
          ref={(m) => {
            meshes.current[i] = m
          }}
          visible={false}
          geometry={UNIT_BOX}
          material={gasMaterial}
          position={[p.x, 0.03, p.z]}
          rotation-y={p.rotY}
          scale={[1.5, 0.02, 1.3]}
        />
      ))}
    </>
  )
}

const HALF_CAM_FOV = ((SECURITY_CAMERA.fovDeg / 2) * Math.PI) / 180

function CameraView({ camera: c, level }: { camera: CameraModule; level: LevelData }) {
  const head = useRef<Group>(null)
  const lens = useRef<Mesh>(null)
  const graphite = flatMaterial('graphite')
  const ink = flatMaterial('ink')
  const dead = flatMaterial('concrete')
  const H = SECURITY_CAMERA.height

  const read = useCallback(
    (out: FanState) => {
      out.x = c.x
      out.z = c.z
      out.angle = c.angle
      out.opacity = c.blindTimer > 0 ? 0 : c.seenTime > 0 ? 0.28 : 0.1
    },
    [c],
  )

  useFrame(() => {
    if (head.current) head.current.rotation.y = c.angle
    if (lens.current) lens.current.material = c.blindTimer > 0 ? dead : slitMaterial
  })

  return (
    <>
      <FanCone level={level} range={SECURITY_CAMERA.range} halfFov={HALF_CAM_FOV} read={read} />
      <group position={[c.x, H, c.z]}>
        <mesh geometry={UNIT_BOX} material={ink} position={[0, 0.14, 0]} scale={[0.1, 0.28, 0.1]} castShadow />
        <group ref={head} rotation-y={c.baseAngle}>
          <mesh geometry={UNIT_BOX} material={graphite} position={[0, 0, 0.12]} scale={[0.22, 0.18, 0.36]} castShadow />
          <mesh ref={lens} geometry={UNIT_BOX} material={slitMaterial} position={[0, 0, 0.305]} scale={[0.12, 0.05, 0.012]} />
        </group>
      </group>
    </>
  )
}

export function SecurityCameras({ level }: { level: LevelData }) {
  return (
    <>
      {level.cameras.map((c) => (
        <CameraView key={c.id} camera={c} level={level} />
      ))}
    </>
  )
}
