import { useGLTF } from '@react-three/drei'
import { useMemo } from 'react'
import {
  Color,
  type Material,
  MeshStandardMaterial,
  type Object3D,
  SRGBColorSpace,
  type Texture,
  TextureLoader,
} from 'three'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import manifest from './v4-manifest.json'

/** V4 kit registry + shared atlas materials. Source: `scripts/sync-v4-assets.mjs` → `v4-manifest.json`. */

type MaterialSpec = {
  atlas_cell: string | null
  fallback_color: number[]
  emission: number
  roughness?: number
  atlas?: string
  decal_kind?: string
}

export type ClipMeta = { loop: boolean; drive: 'time' | 'walkPhase'; frames: number; seconds: number }

export type AssetSpec = {
  id: string
  category: string
  triangles: number
  rigged: boolean
  clips: string[]
  materials: string[]
  clip_meta?: Record<string, ClipMeta>
  tint_slots?: { suit: string; trim: string }
  anchors_blender?: Record<string, number[]>
  decal_item?: string
  decal_variants?: string[]
}

const MATERIALS = manifest.materials as unknown as Record<string, MaterialSpec>
export const ASSETS = manifest.assets as unknown as Record<string, AssetSpec>
export type AssetId = keyof typeof manifest.assets

/** Runtime shader specs for water / waterfall / molten (Phases 24–25). */
export const ASSET_EFFECTS = manifest.effects as unknown as Record<string, Record<string, unknown>>

export const assetUrl = (id: AssetId) => `/models/v4/${id}.glb`

// No Draco (would fetch a decoder from a CDN; breaks offline APK). Meshopt decoder is bundled.
const DRACO = false

export function preloadAssets(ids: readonly AssetId[]) {
  for (const id of ids) useGLTF.preload(assetUrl(id), DRACO)
}

// ---------------------------------------------------------------------------
// Shared textures: ONE painted atlas + ONE decal atlas, loaded lazily once.

let atlasTex: Texture | null = null
let decalTex: Texture | null = null

function loadTexture(url: string) {
  const t = new TextureLoader().load(url)
  t.flipY = false // glTF UV origin is top-left
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 4
  return t
}

export function atlasTexture() {
  return (atlasTex ??= loadTexture(manifest.textures.atlas))
}

export function decalTexture() {
  return (decalTex ??= loadTexture(manifest.textures.decals))
}

// ---------------------------------------------------------------------------
// Material factory: one shared MeshStandardMaterial per manifest material name.

const materialCache = new Map<string, MeshStandardMaterial>()

function buildMaterial(name: string, spec: MaterialSpec) {
  const color = new Color().fromArray(spec.fallback_color ?? [1, 1, 1])
  const m = new MeshStandardMaterial({ name, metalness: 0, roughness: spec.roughness ?? 0.9 })

  if (spec.atlas === 'decals') {
    m.map = decalTexture()
    // "mask" = white alpha mask tinted by the material color; "color" = atlas color as is.
    m.color = spec.decal_kind === 'mask' ? color : new Color(1, 1, 1)
    m.transparent = true
    m.depthWrite = false
    m.polygonOffset = true
    m.polygonOffsetFactor = -2
    m.polygonOffsetUnits = -2
    m.roughness = 0.9
  } else if (spec.atlas_cell) {
    m.map = atlasTexture()
    m.roughness = 0.9
  } else {
    m.color = color
  }

  if (spec.emission > 0) {
    m.emissive = color.clone()
    m.emissiveIntensity = spec.emission
  }
  return m
}

/** Shared V4 material by name. Unknown names get a neutral concrete fallback so nothing renders black. */
export function v4Material(name: string): MeshStandardMaterial {
  let m = materialCache.get(name)
  if (!m) {
    const spec = MATERIALS[name] ?? MATERIALS.concrete
    m = buildMaterial(name, spec)
    materialCache.set(name, m)
  }
  return m
}

type MeshLike = Object3D & { isMesh?: boolean; material?: Material | Material[] }

/** Swap every GLB placeholder material for the shared atlas material of the same name. */
export function applyV4Materials(root: Object3D, shadows = true) {
  root.traverse((o) => {
    const mesh = o as MeshLike
    if (!mesh.isMesh || !mesh.material) return
    const swap = (mat: Material) => v4Material(mat.name)
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(swap) : swap(mesh.material)
    const decal = Array.isArray(mesh.material)
      ? mesh.material.some((m) => m.transparent)
      : mesh.material.transparent
    mesh.castShadow = shadows && !decal
    mesh.receiveShadow = true
  })
  return root
}

/**
 * Per-instance recolor of the tint slots (suit / trim). Clones only the slot materials, so the
 * atlas texture is still shared. Pass hex colors; omitted slots keep the shared material.
 */
export function tintAsset(root: Object3D, id: AssetId, tint: { suit?: string; trim?: string }) {
  const slots = ASSETS[id]?.tint_slots
  if (!slots) return root
  const clones = new Map<string, MeshStandardMaterial>()
  const slotColor = (name: string) =>
    name === slots.suit ? tint.suit : name === slots.trim ? tint.trim : undefined
  root.traverse((o) => {
    const mesh = o as MeshLike
    if (!mesh.isMesh || !mesh.material || Array.isArray(mesh.material)) return
    const hex = slotColor(mesh.material.name)
    if (!hex) return
    let m = clones.get(mesh.material.name)
    if (!m) {
      m = (mesh.material as MeshStandardMaterial).clone()
      // Atlas cells are painted color; multiply keeps the paint strokes, so drop the map for a clean recolor.
      m.map = null
      m.color = new Color(hex)
      clones.set(mesh.material.name, m)
    }
    mesh.material = m
  })
  return root
}

/**
 * Loads a kit asset (suspends), returns a fresh instance with shared V4 materials.
 * Rigged assets are cloned with SkeletonUtils so each instance has its own skeleton.
 */
export function useV4Asset(id: AssetId) {
  const gltf = useGLTF(assetUrl(id), DRACO)
  const scene = useMemo(() => {
    const rigged = ASSETS[id]?.rigged ?? false
    return applyV4Materials(rigged ? cloneSkinned(gltf.scene) : gltf.scene.clone(true))
  }, [gltf.scene, id])
  return { scene, animations: gltf.animations, spec: ASSETS[id] }
}

/** Clip time for a looped clip driven by the sim's walkPhase (radians). */
export function walkPhaseTime(meta: ClipMeta, walkPhase: number) {
  const cycle = walkPhase / (Math.PI * 2)
  return (cycle - Math.floor(cycle)) * meta.seconds
}
