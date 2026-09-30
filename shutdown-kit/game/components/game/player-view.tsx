'use client'

import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { CylinderGeometry, IcosahedronGeometry, type Group, type Material } from 'three'
import { PLAYER } from '@/lib/game/config'
import { flatMaterial, UNIT_BOX, xrayMaterial } from '@/lib/game/materials'
import type { PlayerState } from '@/lib/game/player'
import { useSkinColors } from '@/lib/game/use-skin-colors'
import { OperatorModel } from './v4-character'
import { V4Only } from './v4-model'

type Part = { p: [number, number, number]; s: [number, number, number] }

const LIMB = new CylinderGeometry(0.43, 0.34, 1, 5)
const HELMET = new IcosahedronGeometry(0.62, 0)
const BODY = new CylinderGeometry(0.52, 0.38, 1, 5)

const TORSO: Part = { p: [0, 1.2, 0], s: [0.6, 0.72, 0.43] }
const HEAD: Part = { p: [0, 1.75, 0], s: [0.33, 0.39, 0.32] }
const LEG: Part = { p: [0, -0.42, 0], s: [0.26, 0.84, 0.3] }
const ARM: Part = { p: [0, -0.32, 0], s: [0.21, 0.66, 0.24] }

/** Faceless mannequin. Rendered twice: solid, and as an x-ray silhouette where walls hide it. */
export function Mannequin({ p, material, xray = false }: { p: PlayerState; material: Material; xray?: boolean }) {
  const body = useRef<Group>(null)
  const legL = useRef<Group>(null)
  const legR = useRef<Group>(null)
  const armL = useRef<Group>(null)
  const armR = useRef<Group>(null)

  useFrame(() => {
    const amount = Math.min(1, p.speed / PLAYER.walkSpeed)
    const amp = (p.running ? 0.85 : 0.55) * amount
    const swing = Math.sin(p.walkPhase) * amp
    if (legL.current) legL.current.rotation.x = swing
    if (legR.current) legR.current.rotation.x = -swing
    if (armL.current) armL.current.rotation.x = -swing * 0.8
    if (armR.current) armR.current.rotation.x = swing * 0.8
    if (body.current) {
      body.current.position.y = Math.abs(Math.cos(p.walkPhase)) * 0.05 * amount - (p.crouching ? 0.14 : 0)
      body.current.rotation.x = p.running ? 0.18 * amount : p.crouching ? 0.28 : 0.04 * amount
    }
  })

  const shadow = !xray
  const mesh = (part: Part) => (
    <mesh
      geometry={part === HEAD ? HELMET : part === TORSO ? BODY : LIMB}
      material={part === HEAD && !xray ? flatMaterial('concrete') : material}
      position={part.p}
      scale={part.s}
      castShadow={shadow}
      renderOrder={xray ? 10 : 0}
    />
  )

  return (
    <group ref={body}>
      {mesh(TORSO)}
      {mesh(HEAD)}
      {!xray && <>
        <mesh geometry={UNIT_BOX} material={flatMaterial('ink')} position={[0, 0.91, 0]} scale={[0.45, 0.09, 0.32]} castShadow />
        <mesh geometry={UNIT_BOX} material={flatMaterial('concrete')} position={[0, 0.92, 0.18]} scale={[0.1, 0.08, 0.035]} />
        <mesh geometry={UNIT_BOX} material={flatMaterial('graphite')} position={[0, 1.27, -0.23]} scale={[0.36, 0.46, 0.17]} castShadow />
        {[-1, 1].map(side => <mesh key={side} geometry={UNIT_BOX} material={flatMaterial('graphite')} position={[side * 0.18, 1.25, 0.18]} scale={[0.055, 0.55, 0.04]} />)}
      </>}
      <group ref={legL} position={[-0.14, 0.85, 0]}>
        {mesh(LEG)}
        {!xray && <mesh geometry={UNIT_BOX} material={flatMaterial('graphite')} position={[0, -0.78, 0.05]} scale={[0.22, 0.14, 0.33]} castShadow />}
      </group>
      <group ref={legR} position={[0.14, 0.85, 0]}>
        {mesh(LEG)}
        {!xray && <mesh geometry={UNIT_BOX} material={flatMaterial('graphite')} position={[0, -0.78, 0.05]} scale={[0.22, 0.14, 0.33]} castShadow />}
      </group>
      <group ref={armL} position={[-0.36, 1.52, 0]}>
        {mesh(ARM)}
        {!xray && <mesh geometry={HELMET} material={flatMaterial('graphite')} position={[0, -0.67, 0]} scale={[0.14, 0.22, 0.17]} castShadow />}
      </group>
      <group ref={armR} position={[0.36, 1.52, 0]}>
        {mesh(ARM)}
        {!xray && <mesh geometry={HELMET} material={flatMaterial('graphite')} position={[0, -0.67, 0]} scale={[0.14, 0.22, 0.17]} castShadow />}
      </group>
    </group>
  )
}

export function PlayerView({ player: p, isHidden }: { player: PlayerState; isHidden?: () => boolean }) {
  const root = useRef<Group>(null)
  const { suit } = useSkinColors()

  useFrame(() => {
    const g = root.current
    if (!g) return
    g.visible = !isHidden?.()
    g.position.set(p.x, 0, p.z)
    g.rotation.y = p.facing
  })

  return (
    <group ref={root}>
      <V4Only
        fallback={
          <>
            <Mannequin p={p} material={flatMaterial(suit)} />
            <Mannequin p={p} material={xrayMaterial} xray />
          </>
        }
      >
        <OperatorModel p={p} suit={suit} xray />
      </V4Only>
    </group>
  )
}
