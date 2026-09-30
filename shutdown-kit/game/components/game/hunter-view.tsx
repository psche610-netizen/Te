'use client'

import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import type { Group, Material } from 'three'
import { HUNTER, MODIFIERS, PERK_EFFECTS } from '@/lib/game/config'
import type { HunterState } from '@/lib/game/hunter'
import type { LevelData } from '@/lib/game/level/types'
import { flatMaterial, slitMaterial, UNIT_BOX, xrayDangerMaterial } from '@/lib/game/materials'
import type { PlayerState } from '@/lib/game/player'
import { useSkinColors } from '@/lib/game/use-skin-colors'
import { WardenModel } from './v4-character'
import { V4Only } from './v4-model'
import { VisionCone } from './vision-cone'
import { WeaverBody } from './weaver-body'

type Part = { p: [number, number, number]; s: [number, number, number] }

const HIP_Y = 1.25
const SHOULDER_Y = 1.94
const NECK_Y = 2.04

const PELVIS: Part = { p: [0, 1.3, 0], s: [0.34, 0.14, 0.2] }
const TORSO: Part = { p: [0, 1.68, 0], s: [0.3, 0.6, 0.2] }
const CHEST: Part = { p: [0, 1.86, 0.02], s: [0.42, 0.14, 0.24] }
const LEG: Part = { p: [0, -HIP_Y / 2, 0], s: [0.11, HIP_Y, 0.11] }
const FOOT: Part = { p: [0, -HIP_Y + 0.03, 0.06], s: [0.13, 0.06, 0.24] }
const ARM: Part = { p: [0, -0.5, 0], s: [0.08, 1.0, 0.08] }
const NECK: Part = { p: [0, 0.05, 0], s: [0.07, 0.1, 0.07] }
const HEAD: Part = { p: [0, 0.25, 0], s: [0.28, 0.3, 0.28] }
const SLIT: Part = { p: [0, 0.27, 0.142], s: [0.19, 0.035, 0.012] }

function Box({ part, material, shadow }: { part: Part; material: Material; shadow: boolean }) {
  return (
    <mesh
      geometry={UNIT_BOX}
      material={material}
      position={part.p}
      scale={part.s}
      castShadow={shadow}
      renderOrder={shadow ? 0 : 10}
    />
  )
}

export type HunterMaterials = { shell: Material; frame: Material; slit: Material }
type Materials = HunterMaterials
export type HunterPose = Pick<HunterState, 'x' | 'z' | 'facing' | 'headYaw' | 'speed' | 'walkPhase' | 'mode'>

/** Animated robot body. Rendered once normally and once as the Awareness x-ray silhouette. */
export function HunterBody({
  hunter: h,
  materials,
  shadow,
  visible,
}: {
  hunter: HunterPose
  materials: Materials
  shadow: boolean
  visible?: () => boolean
}) {
  const root = useRef<Group>(null)
  const body = useRef<Group>(null)
  const head = useRef<Group>(null)
  const legL = useRef<Group>(null)
  const legR = useRef<Group>(null)
  const armL = useRef<Group>(null)
  const armR = useRef<Group>(null)
  const { shell, frame, slit } = materials

  useFrame(() => {
    if (!root.current) return
    root.current.visible = visible ? visible() : true
    if (!root.current.visible) return
    root.current.position.set(h.x, 0, h.z)
    root.current.rotation.y = h.facing

    const amount = Math.min(1, h.speed / HUNTER.patrolSpeed)
    const chasing = h.mode === 'chase'
    const swing = Math.sin(h.walkPhase) * (chasing ? 0.7 : 0.42) * amount
    if (legL.current) legL.current.rotation.x = swing
    if (legR.current) legR.current.rotation.x = -swing
    if (armL.current) armL.current.rotation.x = -swing * (chasing ? 1.1 : 0.5)
    if (armR.current) armR.current.rotation.x = swing * (chasing ? 1.1 : 0.5)
    if (body.current) {
      body.current.position.y = Math.abs(Math.sin(h.walkPhase)) * 0.04 * amount
      body.current.rotation.x = chasing ? 0.14 * amount : 0
    }
    if (head.current) head.current.rotation.y = h.headYaw
  })

  return (
    <group ref={root}>
      <group ref={body}>
        <Box part={PELVIS} material={frame} shadow={shadow} />
        <Box part={TORSO} material={shell} shadow={shadow} />
        <Box part={CHEST} material={shell} shadow={shadow} />
        {([-1, 1] as const).map((side) => (
          <group key={`leg${side}`} ref={side < 0 ? legL : legR} position={[side * 0.12, HIP_Y, 0]}>
            <Box part={LEG} material={frame} shadow={shadow} />
            <Box part={FOOT} material={frame} shadow={shadow} />
          </group>
        ))}
        {([-1, 1] as const).map((side) => (
          <group key={`arm${side}`} ref={side < 0 ? armL : armR} position={[side * 0.25, SHOULDER_Y, 0]}>
            <Box part={ARM} material={frame} shadow={shadow} />
          </group>
        ))}
        <group ref={head} position={[0, NECK_Y, 0]}>
          <Box part={NECK} material={frame} shadow={shadow} />
          <Box part={HEAD} material={shell} shadow={shadow} />
          <Box part={SLIT} material={slit} shadow={false} />
        </group>
      </group>
    </group>
  )
}

const XRAY: Materials = { shell: xrayDangerMaterial, frame: xrayDangerMaterial, slit: xrayDangerMaterial }

/**
 * THE WARDEN: tall thin primitive robot with one red slit. THE WEAVER: low six-legged frame, same slit.
 * Blackout: no vision cone, and only the slit shows beyond `hunterRevealDistance`.
 * Awareness perk: a flat red silhouette shows through walls when close.
 */
export function HunterView({
  hunter: h,
  level,
  player,
  blackout = false,
  awareness = false,
}: {
  hunter: HunterState
  level: LevelData
  player: PlayerState
  blackout?: boolean
  awareness?: boolean
}) {
  const { hunter: shellColor } = useSkinColors()
  // Own copies so Blackout can hide the body (material.visible) without touching shared level materials.
  const materials = useMemo<Materials>(
    () => ({ shell: flatMaterial(shellColor).clone(), frame: flatMaterial('ink').clone(), slit: slitMaterial }),
    [shellColor],
  )
  useEffect(
    () => () => {
      materials.shell.dispose()
      materials.frame.dispose()
    },
    [materials],
  )

  const distance = () => Math.hypot(h.x - player.x, h.z - player.z)

  useFrame(() => {
    if (!blackout) return
    const show = distance() < MODIFIERS.blackout.hunterRevealDistance
    materials.shell.visible = show
    materials.frame.visible = show
  })

  const weaver = h.profile.kind === 'weaver'
  const Body = weaver ? WeaverBody : HunterBody
  const aware = () => distance() < PERK_EFFECTS.awarenessDistance

  const primitive = (
    <>
      <Body hunter={h} materials={materials} shadow />
      {awareness && <Body hunter={h} materials={XRAY} shadow={false} visible={aware} />}
    </>
  )

  return (
    <>
      {!blackout && <VisionCone hunter={h} level={level} />}
      {weaver ? (
        primitive
      ) : (
        <V4Only fallback={primitive}>
          <WardenRig
            hunter={h}
            shell={shellColor}
            bodyVisible={blackout ? () => distance() < MODIFIERS.blackout.hunterRevealDistance : undefined}
            xrayVisible={awareness ? aware : undefined}
          />
        </V4Only>
      )}
    </>
  )
}

/** Warden GLB placed from the sim each frame (grid sectors and the Core). */
export function WardenRig({
  hunter: h,
  visible,
  ...props
}: { hunter: HunterPose; visible?: () => boolean } & Omit<Parameters<typeof WardenModel>[0], 'hunter'>) {
  const root = useRef<Group>(null)
  useFrame(() => {
    const g = root.current
    if (!g) return
    g.visible = visible ? visible() : true
    g.position.set(h.x, 0, h.z)
    g.rotation.y = h.facing
  })
  return (
    <group ref={root}>
      <WardenModel hunter={h} {...props} />
    </group>
  )
}
