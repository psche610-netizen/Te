// Fallback for GLBs exported with embedded images: strips every texture so the
// runtime atlas (manifest.json "runtime") is the only copy.
// Usage: npx -p @gltf-transform/core -p @gltf-transform/extensions -p @gltf-transform/functions node assets/v4/source/pack.mjs [models-dir]
import {readdir, readFile, writeFile} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {prune} from '@gltf-transform/functions';

const dir = resolve(process.argv[2] ?? fileURLToPath(new URL('../models', import.meta.url)));
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
let before = 0, after = 0;

for (const file of (await readdir(dir)).filter(f => f.endsWith('.glb'))) {
  const path = join(dir, file);
  const bytes = await readFile(path);
  const doc = await io.readBinary(new Uint8Array(bytes));
  for (const texture of doc.getRoot().listTextures()) texture.dispose();
  await doc.transform(prune());
  const out = await io.writeBinary(doc);
  await writeFile(path, out);
  before += bytes.byteLength;
  after += out.byteLength;
  console.log(`${file}: ${(bytes.byteLength / 1e6).toFixed(2)} MB -> ${(out.byteLength / 1e6).toFixed(2)} MB`);
}
console.log(`total: ${(before / 1e6).toFixed(1)} MB -> ${(after / 1e6).toFixed(1)} MB`);
