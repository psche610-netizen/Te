'use client'

import { useFrame } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ExtrudeGeometry, MeshBasicMaterial, Path, Shape, type Group, type Mesh } from 'three'
import { HUNTER, PALETTE, PERK_EFFECTS } from '@/lib/game/config'
import { pillarHit } from '@/lib/game/core/arena'
import type { CoreHunter } from '@/lib/game/core/hunters'
import {
  CORE,
  computeCoreResult,
  createCoreSession,
  mirrorCore,
  ringMid,
  segCenter,
  stepCoreSession,
  type CoreSession,
} from '@/lib/game/core/session'
import { live } from '@/lib/game/live'
import { coreJuiceSource, createJuice, endJuice, stepJuice } from '@/lib/game/juice'
import { flatMaterial, xrayDangerMaterial } from '@/lib/game/materials'
import { toPerkSet } from '@/lib/game/perks'
import type { NightMirror } from '@/lib/game/session'
import { useGameStore } from '@/lib/game/store'
import { useSkinColors } from '@/lib/game/use-skin-colors'
import { FanCone, type FanCast, type FanState } from './fan-cone'
import { GameRig } from './game-rig'
import { HunterBody, type HunterMaterials, WardenRig } from './hunter-view'
import { V4Only } from './v4-model'
import { PlayerView } from './player-view'
import { CONE_OPACITY, HALF_FOV } from './vision-cone'

const TAU = Math.PI * 2
const SEG_ARC = TAU / CORE.segments
const SEAM = 0.012
const RING_DEPTH = 0.6

const ringMat = flatMaterial('concrete')
const baseMat = flatMaterial('graphite')
const warnMat = flatMaterial('danger', true)
const signalMat = flatMaterial('signal', true)

/** Annulus sector in the XY plane; the mesh is rotated +90° on X so shape angle = world atan2(z, x) and depth goes down. */
function annulus(inner: number, outer: number, a0: number, a1: number, depth: number) {
  const shape = new Shape()
  shape.absarc(0, 0, outer, a0, a1, false)
  shape.absarc(0, 0, inner, a1, a0, true)
  shape.closePath()
  return new ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 8 })
}

function fullRing(inner: number, outer: number, depth: number) {
  const shape = new Shape()
  shape.absarc(0, 0, outer, 0, TAU, false)
  const hole = new Path()
  hole.absarc(0, 0, inner, 0, TAU, true)
  shape.holes.push(hole)
  return new ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 64 })
}

function CoreLoop({ session }: { session: CoreSession }) {
  const [juice] = useState(createJuice)
  useEffect(() => () => endJuice(), [])
  useFrame((_, dt) => {
    if (!useGameStore.getState().paused) {
      stepCoreSession(session, dt)
      stepJuice(juice, coreJuiceSource(session), dt)
    }
    const store = useGameStore.getState()
    const snap = mirrorCore(session)
    const patch: Partial<NightMirror> = {}
    let changed = false
    for (const key of Object.keys(snap) as (keyof NightMirror)[]) {
      if (store[key] !== snap[key]) {
        ;(patch as Record<string, unknown>)[key] = snap[key]
        changed = true
      }
    }
    if (changed) store.syncNight(patch)
    if (session.status !== 'playing' && !session.reported) {
      session.reported = true
      store.recordNight(computeCoreResult(session))
    }
  })
  return null
}

function StaticArena({ session }: { session: CoreSession }) {
  const slitMat = useSlitMaterial(session)
  const rim = useMemo(() => fullRing(CORE.rim.inner, CORE.rim.outer, RING_DEPTH), [])
  const spokeLength = CORE.rim.inner + 0.3 - CORE.pillarRadius
  const spokeMid = CORE.pillarRadius + spokeLength / 2
  const columns = useMemo(() => Array.from({ length: 10 }, (_, i) => (i / 10) * TAU + 0.2), [])

  return (
    <group>
      <mesh geometry={rim} material={baseMat} rotation-x={Math.PI / 2} receiveShadow />
      {columns.map((a) => (
        <mesh
          key={a}
          material={baseMat}
          position={[(CORE.rim.outer - 1) * Math.cos(a), -7, (CORE.rim.outer - 1) * Math.sin(a)]}
        >
          <boxGeometry args={[1.6, 13, 1.6]} />
        </mesh>
      ))}
      {CORE.spokeAngles.map((a) => (
        <mesh
          key={a}
          material={baseMat}
          position={[spokeMid * Math.cos(a), -0.28, spokeMid * Math.sin(a)]}
          rotation-y={-a}
          receiveShadow
        >
          <boxGeometry args={[spokeLength, 0.6, CORE.spokeHalfWidth * 2]} />
        </mesh>
      ))}
      <mesh material={baseMat} position={[0, 2.5, 0]} castShadow>
        <cylinderGeometry args={[CORE.pillarRadius * 0.75, CORE.pillarRadius, 12, 6]} />
      </mesh>
      <mesh material={baseMat} position={[0, -6, 0]}>
        <cylinderGeometry args={[CORE.pillarRadius, CORE.pillarRadius * 0.7, 12, 6]} />
      </mesh>
      <mesh
        material={slitMat}
        position={[CORE.pillarRadius * 0.8 * Math.cos(Math.PI / 4), 6, CORE.pillarRadius * 0.8 * Math.sin(Math.PI / 4)]}
        rotation-y={-Math.PI / 4}
      >
        <boxGeometry args={[0.3, 0.26, 2.2]} />
      </mesh>
    </group>
  )
}

function RingView({ session, index }: { session: CoreSession; index: number }) {
  const group = useRef<Group>(null)
  const segRefs = useRef<(Mesh | null)[]>([])
  const termRefs = useRef<(Mesh | null)[]>([])
  const def = CORE.rings[index]
  const geos = useMemo(
    () =>
      Array.from({ length: CORE.segments }, (_, j) =>
        annulus(def.inner, def.outer, j * SEG_ARC + SEAM, (j + 1) * SEG_ARC - SEAM, RING_DEPTH),
      ),
    [def.inner, def.outer],
  )
  const terminals = session.terminals.map((t, id) => ({ ...t, id })).filter((t) => t.ring === index)
  const mid = ringMid(index)

  useFrame(({ clock }) => {
    const ring = session.rings[index]
    if (group.current) group.current.rotation.y = -ring.angle
    ring.segs.forEach((seg, j) => {
      const mesh = segRefs.current[j]
      if (!mesh) return
      if (seg.state === 'down') {
        mesh.position.y = -Math.min(seg.t * seg.t * 9, 40)
        mesh.visible = seg.t < 3
        mesh.material = ringMat
      } else {
        mesh.visible = true
        const rise = seg.returned && seg.t < CORE.riseTime ? 1 - seg.t / CORE.riseTime : 0
        mesh.position.y = -rise * 3
        const flash = seg.state === 'warn' && Math.floor(clock.elapsedTime * (4 + seg.t * 4)) % 2 === 0
        mesh.material = flash ? warnMat : ringMat
      }
    })
    terminals.forEach((t, k) => {
      const plate = termRefs.current[k]
      if (plate) plate.material = session.terminals[t.id].done ? baseMat : signalMat
    })
  })

  return (
    <group ref={group}>
      {geos.map((g, j) => (
        <mesh
          key={j}
          ref={(m) => {
            segRefs.current[j] = m
          }}
          geometry={g}
          material={ringMat}
          rotation-x={Math.PI / 2}
          receiveShadow
        />
      ))}
      {terminals.map((t, k) => {
        const a = segCenter(t.seg)
        return (
          <group key={t.id} position={[mid * Math.cos(a), 0, mid * Math.sin(a)]} rotation-y={-a}>
            <mesh material={baseMat} position={[0, 0.5, 0]} castShadow>
              <boxGeometry args={[1.1, 1, 1.1]} />
            </mesh>
            <mesh
              ref={(m) => {
                termRefs.current[k] = m
              }}
              material={signalMat}
              position={[0, 1.02, 0]}
            >
              <boxGeometry args={[0.7, 0.06, 0.7]} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

const fallDepth = (t: number, max: number) => (t >= 0 ? -Math.min(t * t * 9, max) : 0)

const coneCast: FanCast = (x, z, dx, dz, range) => pillarHit(x, z, dx, dz, range) ?? range

/** Slits go dark once the ending passes `slitOff`. */
function useSlitMaterial(session: CoreSession) {
  const material = useMemo(() => new MeshBasicMaterial({ color: PALETTE.danger }), [])
  useEffect(() => () => material.dispose(), [material])
  useFrame(() => {
    material.color.set(session.ending >= CORE.slitOff ? PALETTE.ink : PALETTE.danger)
  })
  return material
}

function CoreHunterView({ session, hunter: h }: { session: CoreSession; hunter: CoreHunter }) {
  const group = useRef<Group>(null)
  const slit = useSlitMaterial(session)
  const { hunter: shellColor } = useSkinColors()
  const materials = useMemo<HunterMaterials>(
    () => ({ shell: flatMaterial(shellColor), frame: flatMaterial('ink'), slit }),
    [shellColor, slit],
  )
  const xray = useMemo<HunterMaterials>(
    () => ({ shell: xrayDangerMaterial, frame: xrayDangerMaterial, slit: xrayDangerMaterial }),
    [],
  )
  const shown = () => h.active || (h.fall >= 0 && h.fall < 3)
  const aware = () =>
    h.active && Math.hypot(h.x - session.player.x, h.z - session.player.z) < PERK_EFFECTS.awarenessDistance
  const read = useCallback(
    (out: FanState) => {
      out.x = h.x
      out.z = h.z
      out.angle = h.facing + h.headYaw
      out.opacity = h.active && session.ending < 0 ? CONE_OPACITY[h.mode] : 0
    },
    [h, session],
  )

  useFrame(() => {
    if (group.current) group.current.position.y = h.active ? 0 : fallDepth(h.fall, 60)
  })

  return (
    <>
      <FanCone cast={coneCast} range={HUNTER.visionRange} halfFov={HALF_FOV} read={read} />
      <group ref={group}>
        <V4Only
          fallback={
            <>
              <HunterBody hunter={h} materials={materials} shadow visible={shown} />
              {session.perks.awareness && (
                <HunterBody hunter={h} materials={xray} shadow={false} visible={aware} />
              )}
            </>
          }
        >
          <WardenRig
            hunter={h}
            shell={shellColor}
            slit={slit}
            visible={shown}
            xrayVisible={session.perks.awareness ? aware : undefined}
          />
        </V4Only>
      </group>
    </>
  )
}

function FallingPlayer({ session }: { session: CoreSession }) {
  const group = useRef<Group>(null)
  useFrame(() => {
    if (group.current) group.current.position.y = fallDepth(session.fall, 60)
  })
  return (
    <group ref={group}>
      <PlayerView player={session.player} />
    </group>
  )
}

export function CoreScene() {
  const [session] = useState(() => {
    const { equipped, night } = useGameStore.getState()
    const perks = toPerkSet(equipped)
    return createCoreSession({ night, secondWind: perks.secondWind, perks })
  })

  useEffect(() => {
    live.session = null
  }, [session])

  return (
    <>
      <CoreLoop session={session} />
      <GameRig player={session.player} />
      <StaticArena session={session} />
      {CORE.rings.map((_, i) => (
        <RingView key={i} session={session} index={i} />
      ))}
      {session.hunters.map((h) => (
        <CoreHunterView key={h.id} session={session} hunter={h} />
      ))}
      <FallingPlayer session={session} />
    </>
  )
}
