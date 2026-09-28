import { BoxGeometry, GreaterDepth, MeshBasicMaterial, MeshLambertMaterial } from 'three'
import { PALETTE, type PaletteKey } from './config'

const cache = new Map<string, MeshLambertMaterial>()

/** Shared flat-shaded matte material per palette color. Emissive only for interactables. */
export function flatMaterial(key: PaletteKey, emissive = false) {
  const id = `${key}:${emissive}`
  let mat = cache.get(id)
  if (!mat) {
    mat = new MeshLambertMaterial({
      color: PALETTE[key],
      flatShading: true,
      ...(emissive ? { emissive: PALETTE[key], emissiveIntensity: 0.6 } : {}),
    })
    cache.set(id, mat)
  }
  return mat
}

/** Flat silhouette drawn only where the mesh is hidden behind geometry. */
export const xrayMaterial = new MeshBasicMaterial({
  color: PALETTE.signal,
  transparent: true,
  opacity: 0.35,
  depthFunc: GreaterDepth,
  depthWrite: false,
})

/** Awareness perk: the hunter's silhouette through walls, flat danger red. */
export const xrayDangerMaterial = new MeshBasicMaterial({
  color: PALETTE.danger,
  transparent: true,
  opacity: 0.4,
  depthFunc: GreaterDepth,
  depthWrite: false,
})

/** Unlit flat red for the hunter's eye slit. */
export const slitMaterial = new MeshBasicMaterial({ color: PALETTE.danger })

export const UNIT_BOX = new BoxGeometry(1, 1, 1)
