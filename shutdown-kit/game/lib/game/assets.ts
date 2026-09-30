import { useGLTF } from '@react-three/drei'
import { useMemo } from 'react'
import {
  type AnimationClip,
  type BufferGeometry,
  Color,
  Float32BufferAttribute,
  type Material,
  Matrix4,
  MeshStandardMaterial,
  type Object3D,
  SRGBColorSpace,
  type Texture,
  TextureLoader,
  Vector3,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
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
  if (typeof window === 'undefined') return
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

const pivotsFixed = new WeakSet<Object3D>()

/**
 * Kit builds before the `pivot_part` fix exported the children of clip pivots (locker door, valve
 * wheel, service door...) with their pivot offset applied twice. Re-centre them once per GLB, unless
 * the node carries the `pivot_fixed` extra from a fixed build.
 */
function fixPivots(scene: Object3D, clips: AnimationClip[], rigged: boolean) {
  if (pivotsFixed.has(scene)) return
  pivotsFixed.add(scene)
  if (rigged) return
  const targets = new Set(clips.flatMap((c) => c.tracks.map((t) => t.name.slice(0, t.name.lastIndexOf('.')))))
  for (const name of targets) {
    const node = scene.getObjectByName(name)
    if (!node || node.userData.pivot_fixed || node.position.lengthSq() === 0) continue
    for (const child of node.children) child.position.sub(node.position)
  }
}

/**
 * Loads a kit asset (suspends), returns a fresh instance with shared V4 materials.
 * Rigged assets are cloned with SkeletonUtils so each instance has its own skeleton.
 */
export function useV4Asset(id: AssetId) {
  const gltf = useGLTF(assetUrl(id), DRACO)
  const scene = useMemo(() => {
    const rigged = ASSETS[id]?.rigged ?? false
    fixPivots(gltf.scene, gltf.animations, rigged)
    return applyV4Materials(rigged ? cloneSkinned(gltf.scene) : gltf.scene.clone(true))
  }, [gltf, id])
  return { scene, animations: gltf.animations, spec: ASSETS[id] }
}

// ---------------------------------------------------------------------------
// Instancing: bake a GLB into one merged geometry per material, so N copies cost one draw call
// per material instead of N x meshes.

export type AssetPart = { geometry: BufferGeometry; material: MeshStandardMaterial; decal: boolean }

/** Picks a node subtree by name (e.g. the sliding leaf of a door) or everything except it. */
export type PartFilter = { key: string; node: string; exclude?: boolean }

const partsCache = new Map<string, AssetPart[]>()

function underNode(o: Object3D, name: string, root: Object3D) {
  for (let p: Object3D | null = o; p && p !== root; p = p.parent) if (p.name === name) return true
  return false
}

const KEEP_ATTRS = ['position', 'normal', 'uv'] as const

function normalizeForMerge(g: BufferGeometry) {
  const out = g.index ? g.toNonIndexed() : g
  for (const name of Object.keys(out.attributes)) {
    if (!(KEEP_ATTRS as readonly string[]).includes(name)) out.deleteAttribute(name)
  }
  if (!out.getAttribute('normal')) out.computeVertexNormals()
  if (!out.getAttribute('uv')) {
    out.setAttribute('uv', new Float32BufferAttribute(new Float32Array(out.getAttribute('position').count * 2), 2))
  }
  return out
}

function extractParts(key: string, root: Object3D, filter?: PartFilter): AssetPart[] {
  const cached = partsCache.get(key)
  if (cached) return cached
  root.updateMatrixWorld(true)
  const toRoot = root.matrixWorld.clone().invert()
  const byMat = new Map<string, BufferGeometry[]>()
  root.traverse((o) => {
    const mesh = o as MeshLike & { geometry?: BufferGeometry }
    if (!mesh.isMesh || !mesh.geometry || !mesh.material || Array.isArray(mesh.material)) return
    if (filter && underNode(o, filter.node, root) === !!filter.exclude) return
    const g = mesh.geometry.clone()
    g.applyMatrix4(new Matrix4().multiplyMatrices(toRoot, o.matrixWorld))
    const name = mesh.material.name
    byMat.set(name, [...(byMat.get(name) ?? []), normalizeForMerge(g)])
  })
  const parts: AssetPart[] = []
  for (const [name, list] of byMat) {
    const geometry = list.length === 1 ? list[0] : mergeGeometries(list, false)
    if (!geometry) continue
    geometry.computeBoundingSphere()
    const material = v4Material(name)
    parts.push({ geometry, material, decal: material.transparent })
  }
  partsCache.set(key, parts)
  return parts
}

/** Merged per-material geometry of a kit asset (suspends while loading). Shared, never mutate. */
export function useAssetParts(id: AssetId, filter?: PartFilter) {
  const gltf = useGLTF(assetUrl(id), DRACO)
  return useMemo(() => {
    fixPivots(gltf.scene, gltf.animations, ASSETS[id]?.rigged ?? false)
    return extractParts(`${id}:${filter?.key ?? 'all'}`, gltf.scene, filter)
  }, [gltf, id, filter])
}

/** Uniform translation a clip applies to one node between its first and last key (e.g. a door slide). */
export function clipNodeOffset(clips: AnimationClip[], clip: string, node: string) {
  const track = clips.find((c) => c.name === clip)?.tracks.find((t) => t.name === `${node}.position`)
  if (!track) return new Vector3()
  const v = track.values
  const n = v.length
  return new Vector3(v[n - 3] - v[0], v[n - 2] - v[1], v[n - 1] - v[2])
}

type DecalUv = [u0: number, v0: number, u1: number, v1: number, aspect: number]
export const DECAL_UVS = (manifest as unknown as { decal_uvs?: Record<string, DecalUv> }).decal_uvs ?? {}

const decalCache = new Map<string, AssetPart[]>()

/** Decal quad parts re-pointed from the item baked into the GLB to another decal atlas item. */
export function remapDecal(parts: AssetPart[], from: string, to: string): AssetPart[] {
  const key = `${parts[0]?.geometry.uuid}:${to}`
  const cached = decalCache.get(key)
  if (cached) return cached
  const a = DECAL_UVS[from]
  const b = DECAL_UVS[to]
  if (!a || !b) return parts
  const out = parts.map((p) => {
    const geometry = p.geometry.clone()
    const uv = geometry.getAttribute('uv')
    for (let i = 0; i < uv.count; i++) {
      const u = (uv.getX(i) - a[0]) / (a[2] - a[0])
      const v = (uv.getY(i) - a[1]) / (a[3] - a[1])
      uv.setXY(i, b[0] + u * (b[2] - b[0]), b[1] + v * (b[3] - b[1]))
    }
    uv.needsUpdate = true
    return { ...p, geometry }
  })
  decalCache.set(key, out)
  return out
}

/** Clip time for a looped clip driven by the sim's walkPhase (radians). */
export function walkPhaseTime(meta: ClipMeta, walkPhase: number) {
  const cycle = walkPhase / (Math.PI * 2)
  return (cycle - Math.floor(cycle)) * meta.seconds
}
