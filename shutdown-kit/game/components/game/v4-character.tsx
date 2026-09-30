'use client'

import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  AlwaysStencilFunc,
  type AnimationAction,
  AnimationMixer,
  KeepStencilOp,
  LoopOnce,
  LoopRepeat,
  type Material,
  Mesh,
  NotEqualStencilFunc,
  type Object3D,
  Quaternion,
  ReplaceStencilOp,
  SkinnedMesh,
  Vector3,
} from 'three'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import {
  ASSETS,
  type AssetId,
  applyV4Materials,
  assetUrl,
  tintAsset,
  v4Material,
  walkPhaseTime,
} from '@/lib/game/assets'
import { HUNTER_PROFILES, PALETTE, type PaletteKey, PLAYER } from '@/lib/game/config'
import type { HunterMode } from '@/lib/game/hunter'
import { xrayDangerMaterial, xrayMaterial } from '@/lib/game/materials'
import type { PlayerState } from '@/lib/game/player'

/**
 * Rigged V4 characters (operator, warden). Clips are blended by weight every frame:
 * `walkPhase` clips are scrubbed from the sim's walk phase (so feet match the ground speed),
 * `time` clips advance with the frame delta. Gameplay state is only read, never written.
 */

type Tint = { suit?: string; trim?: string }
type Weights = Record<string, number>

const SLIT_MATERIAL = 'danger-red'
const BLEND_RATE = 10
const Y_AXIS = new Vector3(0, 1, 0)
const yaw = new Quaternion()

type RigParts = {
  scene: Object3D
  /** Everything except the eye slit (Blackout hides these). */
  body: Object3D[]
  xray: Object3D[]
  owned: Material[]
}

/** Fresh skinned clone with shared V4 materials, optional tint, slit override and x-ray siblings. */
function buildRig(source: Object3D, id: AssetId, tint: Tint | null, slit: Material | null, xray: Material | null): RigParts {
  const scene = applyV4Materials(cloneSkinned(source))
  if (tint) tintAsset(scene, id, tint)

  const body: Object3D[] = []
  const meshes: Mesh[] = []
  const owned = new Set<Material>()
  scene.traverse((o) => {
    const mesh = o as Mesh
    if (!mesh.isMesh) return
    mesh.frustumCulled = false // skinned bounds don't follow the pose
    meshes.push(mesh)
    const mat = mesh.material as Material
    if (mat.name === SLIT_MATERIAL) {
      if (slit) mesh.material = slit
    } else {
      body.push(mesh)
      if (mat !== v4Material(mat.name)) owned.add(mat)
    }
  })

  const xrayMeshes: Object3D[] = []
  if (xray) {
    // Stencil mask: visible body pixels write 1, the x-ray skips them, so the silhouette only shows
    // where OTHER geometry hides the character (not the pack behind the torso). The body renders
    // after the level (renderOrder 5) so a wall drawn later can't leave stale stencil behind it.
    const masked = new Map<Material, Material>()
    for (const mesh of meshes) {
      const src = mesh.material as Material
      if (src === slit) continue // caller-owned (the Core animates it); a tiny unmasked sliver is fine
      let m = masked.get(src)
      if (!m) {
        m = src.clone()
        m.stencilWrite = true
        m.stencilRef = 1
        m.stencilFunc = AlwaysStencilFunc
        m.stencilZPass = ReplaceStencilOp
        masked.set(src, m)
        owned.add(m)
      }
      mesh.material = m
      mesh.renderOrder = 5
    }
    const silhouette = xray.clone()
    silhouette.stencilWrite = true
    silhouette.stencilRef = 1
    silhouette.stencilFunc = NotEqualStencilFunc
    silhouette.stencilZPass = KeepStencilOp
    owned.add(silhouette)

    for (const mesh of meshes) {
      const skinned = mesh as SkinnedMesh
      const copy = skinned.isSkinnedMesh
        ? new SkinnedMesh(skinned.geometry, silhouette)
        : new Mesh(mesh.geometry, silhouette)
      if (skinned.isSkinnedMesh) (copy as SkinnedMesh).bind(skinned.skeleton, skinned.bindMatrix)
      copy.position.copy(mesh.position)
      copy.quaternion.copy(mesh.quaternion)
      copy.scale.copy(mesh.scale)
      copy.renderOrder = 10
      copy.frustumCulled = false
      mesh.parent?.add(copy)
      xrayMeshes.push(copy)
    }
  }
  return { scene, body, xray: xrayMeshes, owned: [...owned] }
}

/** Loads a rigged kit asset (suspends) and returns a per-instance clip blender. */
function useCharacterRig(id: AssetId, tint: Tint | null, slit: Material | null, xray: Material | null) {
  const gltf = useGLTF(assetUrl(id), false)
  const spec = ASSETS[id]
  const suit = tint?.suit
  const trim = tint?.trim

  const rig = useMemo(
    () => buildRig(gltf.scene, id, suit || trim ? { suit, trim } : null, slit, xray),
    [gltf, id, suit, trim, slit, xray],
  )
  useEffect(() => () => rig.owned.forEach((m) => m.dispose()), [rig])

  const { mixer, actions, head, headRest } = useMemo(() => {
    const mixer = new AnimationMixer(rig.scene)
    const actions: Record<string, AnimationAction> = {}
    for (const clip of gltf.animations) {
      const meta = spec?.clip_meta?.[clip.name]
      const action = mixer.clipAction(clip)
      action.setLoop(meta?.loop === false ? LoopOnce : LoopRepeat, Infinity)
      action.clampWhenFinished = true
      if (meta?.drive === 'walkPhase') action.timeScale = 0
      action.setEffectiveWeight(0)
      action.play()
      actions[clip.name] = action
    }
    const head = rig.scene.getObjectByName('head') ?? null
    return { mixer, actions, head, headRest: head?.quaternion.clone() ?? null }
  }, [rig, gltf.animations, spec])

  useEffect(
    () => () => {
      mixer.stopAllAction()
      mixer.uncacheRoot(rig.scene)
    },
    [mixer, rig],
  )

  const weights = useRef<Weights>({})

  /** Blend toward `target` (clip → weight, should sum to 1), scrub walk clips, apply head yaw. */
  const step = (target: Weights, dt: number, walkPhase: number, headYaw = 0) => {
    const k = 1 - Math.exp(-BLEND_RATE * dt)
    const current = weights.current
    for (const name in actions) {
      const action = actions[name]
      const w = (current[name] ?? 0) + ((target[name] ?? 0) - (current[name] ?? 0)) * k
      current[name] = w
      const wasOff = action.getEffectiveWeight() < 1e-3
      action.setEffectiveWeight(w)
      const meta = spec?.clip_meta?.[name]
      if (meta?.drive === 'walkPhase') action.time = walkPhaseTime(meta, walkPhase)
      else if (meta?.loop === false && wasOff && w > 1e-3) action.reset().setEffectiveWeight(w)
    }
    if (head && headRest) head.quaternion.copy(headRest)
    mixer.update(dt)
    if (head && headYaw) head.quaternion.multiply(yaw.setFromAxisAngle(Y_AXIS, headYaw))
  }

  return { rig, step, has: (name: string) => name in actions }
}

/** Keeps only clips that exist, renormalized to sum 1 (falls back to `idle`). */
function pick(target: Weights, has: (n: string) => boolean): Weights {
  const out: Weights = {}
  let sum = 0
  for (const name in target) {
    if (!has(name) || target[name] <= 0) continue
    out[name] = target[name]
    sum += target[name]
  }
  if (sum <= 0) return has('idle') ? { idle: 1 } : {}
  for (const name in out) out[name] /= sum
  return out
}

const suitTint = (suit: PaletteKey): Tint | null =>
  suit === 'signal' || suit === 'amber' ? null : { suit: PALETTE[suit] }

const shellTint = (shell: PaletteKey): Tint | null =>
  shell === 'graphite' || shell === 'petrol' ? null : { suit: PALETTE[shell], trim: PALETTE.petrol }

// ---------------------------------------------------------------------------

/** The operator GLB. `xray` adds the through-walls silhouette (same skeleton, no extra skinning). */
export function OperatorModel({ p, suit, xray = false }: { p: PlayerState; suit: PaletteKey; xray?: boolean }) {
  const tint = useMemo(() => suitTint(suit), [suit])
  const { rig, step, has } = useCharacterRig('operator-amber', tint, null, xray ? xrayMaterial : null)

  useFrame((_, dt) => {
    const a = Math.min(1, p.speed / PLAYER.walkSpeed)
    const target: Weights = p.crouching ? { crouch: 1 } : { [p.running ? 'run' : 'walk']: a, idle: 1 - a }
    step(pick(target, has), Math.min(dt, 0.1), p.walkPhase)
  })

  return <primitive object={rig.scene} />
}

export type WardenPose = { speed: number; walkPhase: number; mode: HunterMode; headYaw: number }

const SCAN_MODES: ReadonlySet<HunterMode> = new Set<HunterMode>(['suspicious', 'investigate', 'search'])

export type HunterKind = keyof typeof HUNTER_PROFILES

/** Per hunter: GLB, locomotion clip, and the patrol speed its walk cycle was authored for. */
const HUNTER_RIGS: Record<HunterKind, { asset: AssetId; walk: string }> = {
  warden: { asset: 'warden', walk: 'walk' },
  // Tripod gait from `weaver-body.tsx` (manifest `gait`); `strike` is not wired (no view-side state).
  weaver: { asset: 'weaver', walk: 'scuttle' },
}

/**
 * The warden / weaver GLB. Clip by mode: stunned → stunned; moving → walk or scuttle (chase → chase);
 * standing while searching → scan, else idle. The sim's head yaw is added on top of the clip.
 */
export function WardenModel({
  hunter: h,
  kind = 'warden',
  shell,
  slit = null,
  bodyVisible,
  xrayVisible,
}: {
  hunter: WardenPose
  kind?: HunterKind
  shell: PaletteKey
  /** Replaces the red slit material (the Core dims it during the ending). */
  slit?: Material | null
  /** Blackout: hide everything except the slit. */
  bodyVisible?: () => boolean
  /** Awareness perk: danger silhouette through walls while this returns true. */
  xrayVisible?: () => boolean
}) {
  const tint = useMemo(() => shellTint(shell), [shell])
  const { asset, walk } = HUNTER_RIGS[kind]
  const { rig, step, has } = useCharacterRig(asset, tint, slit, xrayVisible ? xrayDangerMaterial : null)
  const shownBody = useRef(true)
  const patrolSpeed = HUNTER_PROFILES[kind].patrolSpeed

  useFrame((_, dt) => {
    const a = Math.min(1, h.speed / patrolSpeed)
    const rest = SCAN_MODES.has(h.mode) ? 'scan' : 'idle'
    const target: Weights =
      h.mode === 'stunned' ? { stunned: 1 } : { [h.mode === 'chase' ? 'chase' : walk]: a, [rest]: 1 - a }
    step(pick(target, has), Math.min(dt, 0.1), h.walkPhase, h.headYaw)

    const show = bodyVisible ? bodyVisible() : true
    if (show !== shownBody.current) {
      shownBody.current = show
      for (const o of rig.body) o.visible = show
    }
    if (xrayVisible) {
      const x = xrayVisible()
      for (const o of rig.xray) o.visible = x
    }
  })

  return <primitive object={rig.scene} />
}
