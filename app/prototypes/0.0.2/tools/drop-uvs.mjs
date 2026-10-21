// The UV sets no texture reads, dropped from an exported file (a step of export.mjs, between dedup
// and meshopt: `node tools/drop-uvs.mjs <in.glb> <out.glb>`). Blender's export leaves every UV
// set on every mesh; the game drops the unused ones at load anyway (pipelines.ts, sameLayouts), so
// this only makes the file smaller (the ship: 4.51 → 3.82 MB in 1.21).
// The rule is the game's: a primitive keeps the sets its material's textures read (through
// KHR_texture_transform too), and set 0 if the material is anisotropic (its direction comes from
// it). glTF wants the sets numbered without gaps, so every set up to the highest one read is kept.
// Plan: doc/plans/features/faster-load.md (stage 4)

import { NodeIO, PropertyType } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune } from '@gltf-transform/functions';

const [, , input, output] = process.argv;
if (!input || !output) {
  console.error('drop-uvs: node tools/drop-uvs.mjs <in.glb> <out.glb>');
  process.exit(2);
}
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(input);

/** The highest UV set a material's textures read, or -1 for none. */
function highestRead(material) {
  let top = -1;
  for (const prop of [material, ...material.listExtensions()]) {
    for (const edge of doc.getGraph().listChildEdges(prop)) {
      const info = edge.getChild();
      // A slot's TextureInfo is there even when the slot has no texture.
      if (info.propertyType !== 'TextureInfo' || !prop.getRef(edge.getName().replace(/Info$/, ''))) continue;
      let set = info.getTexCoord();
      for (const e of info.listExtensions()) if (e.extensionName === 'KHR_texture_transform' && e.getTexCoord() != null) set = e.getTexCoord();
      top = Math.max(top, set);
    }
    if (prop.extensionName === 'KHR_materials_anisotropy' && prop.getAnisotropyStrength() > 0) top = Math.max(top, 0);
  }
  return top;
}

let dropped = 0;
let kept = 0;
for (const mesh of doc.getRoot().listMeshes()) {
  for (const primitive of mesh.listPrimitives()) {
    const top = primitive.getMaterial() ? highestRead(primitive.getMaterial()) : -1;
    for (const semantic of primitive.listSemantics()) {
      const set = /^TEXCOORD_(\d+)$/.exec(semantic);
      if (!set) continue;
      if (Number(set[1]) > top) {
        primitive.setAttribute(semantic, null);
        dropped++;
      } else kept++;
    }
  }
}
// Only the accessors no primitive uses now: a full prune would also drop the lights' nodes, and
// without keepAttributes the normals of unlit meshes (the see-through copies are lit and read them).
await doc.transform(prune({ propertyTypes: [PropertyType.ACCESSOR], keepAttributes: true }));
await io.write(output, doc);
console.log(`UVS: ${dropped} UV sets dropped, ${kept} kept`);
