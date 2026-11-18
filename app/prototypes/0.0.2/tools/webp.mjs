// The textures of an exported file as WebP (a step of export.mjs, after `uvs` and before meshopt:
// `node tools/webp.mjs <in.glb> <out.glb>`). Lossy at quality 90, except images where exact
// colours matter (palettes: their name matches LOSSLESS), which are lossless. The game's loader
// reads WebP through EXT_texture_webp, which three.js's GLTFLoader registers by default.
// Plan: doc/plans/features/optimization.md (step 1)

import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { textureCompress } from '@gltf-transform/functions';
import sharp from 'sharp';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';

const [, , input, output] = process.argv;
if (!input || !output) {
  console.error('webp: node tools/webp.mjs <in.glb> <out.glb>');
  process.exit(2);
}
const LOSSLESS = /palette/i;

// The meshopt codec only so a compressed file can be tried too (the export hands it an uncompressed one).
await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read(input);
const textures = doc.getRoot().listTextures();
const before = textures.reduce((sum, t) => sum + (t.getImage()?.byteLength ?? 0), 0);
const label = (t) => `${t.getName()} ${t.getURI()}`;
const lossless = textures.filter((t) => LOSSLESS.test(label(t))).length;

await doc.transform(
  textureCompress({ encoder: sharp, targetFormat: 'webp', lossless: true, pattern: LOSSLESS }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 90, pattern: /^(?![\s\S]*palette)/i }),
);
const after = textures.reduce((sum, t) => sum + (t.getImage()?.byteLength ?? 0), 0);
await io.write(output, doc);
const mb = (n) => (n / 1e6).toFixed(2);
console.log(`WEBP: ${textures.length} textures (${lossless} lossless), ${mb(before)} → ${mb(after)} MB`);
