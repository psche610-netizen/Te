// Copies the V4 kit (GLBs + the two shared atlases) from ../assets/v4 into public/, and writes a
// trimmed runtime manifest to lib/game/v4-manifest.json. Runs before `dev` and `build`.
// The public copies are gitignored (they duplicate ../assets/v4); the trimmed manifest is committed
// so typecheck works without running this script.
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const game = join(dirname(fileURLToPath(import.meta.url)), '..')
const kit = join(game, '..', 'assets', 'v4')
const modelsOut = join(game, 'public', 'models', 'v4')
const texturesOut = join(game, 'public', 'textures', 'v4')
const manifestOut = join(game, 'lib', 'game', 'v4-manifest.json')

if (!existsSync(join(kit, 'manifest.json'))) {
  console.warn(`[sync-v4] ${kit} not found, skipping (game keeps primitive fallbacks)`)
  process.exit(0)
}

let copied = 0
function sync(src, dst) {
  if (existsSync(dst)) {
    const a = statSync(src)
    const b = statSync(dst)
    if (a.size === b.size && a.mtimeMs <= b.mtimeMs) return
  }
  copyFileSync(src, dst)
  copied++
}

mkdirSync(modelsOut, { recursive: true })
mkdirSync(texturesOut, { recursive: true })

const manifest = JSON.parse(readFileSync(join(kit, 'manifest.json'), 'utf8'))
const ids = new Set(manifest.assets.map((a) => a.id))

for (const f of readdirSync(join(kit, 'models'))) {
  if (f.endsWith('.glb') && ids.has(f.slice(0, -4))) sync(join(kit, 'models', f), join(modelsOut, f))
}

const atlas = manifest.textures?.atlas ?? 'textures/v4-atlas.png'
const decals = manifest.textures?.decals ?? 'textures/decals-atlas.png'
sync(join(kit, atlas), join(texturesOut, 'v4-atlas.png'))
sync(join(kit, decals), join(texturesOut, 'decals-atlas.png'))

const KEEP = [
  'id',
  'category',
  'triangles',
  'rigged',
  'clips',
  'clip_meta',
  'tint_slots',
  'materials',
  'effects',
  'bounds_blender',
  'anchors_blender',
  'decal_item',
  'decal_variants',
  'gait',
  'fall_lip_blender',
  'fall_landing_blender',
  'waterfall_anchor_blender',
]
const decalLayoutPath = join(kit, 'textures', 'decals-layout.json')
const decalUvs = existsSync(decalLayoutPath)
  ? Object.fromEntries(
      Object.entries(JSON.parse(readFileSync(decalLayoutPath, 'utf8')).items).map(([k, v]) => [k, [...v.uv, v.aspect]]),
    )
  : {}

const runtime = {
  version: manifest.version,
  textures: { atlas: '/textures/v4/v4-atlas.png', decals: '/textures/v4/decals-atlas.png' },
  decal_uvs: decalUvs,
  materials: manifest.materials,
  effects: manifest.effects ?? {},
  assets: Object.fromEntries(
    manifest.assets
      .slice()
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((a) => [a.id, Object.fromEntries(KEEP.filter((k) => k in a).map((k) => [k, a[k]]))]),
  ),
}
const json = `${JSON.stringify(runtime, null, 1)}\n`
const prev = existsSync(manifestOut) ? readFileSync(manifestOut, 'utf8') : ''
if (prev !== json) writeFileSync(manifestOut, json)

console.log(`[sync-v4] ${ids.size} assets, ${copied} files copied${prev !== json ? ', manifest updated' : ''}`)
