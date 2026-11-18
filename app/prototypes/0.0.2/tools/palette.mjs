// The ship's flat colours as two materials, `Palette` and `Palette Metal` (a step of export.mjs, after `resize`:
// `node tools/palette.mjs <in.glb> <out.glb>`). Every material that is opaque, single-sided,
// untextured and has no extension but specular, IOR and emissive strength joins it; each becomes
// one 16 px square in small images, and the faces that had it get their UVs on its square's centre.
// In each mesh, the primitives that now share a palette material are joined into one (one draw call).
// Two materials, not one, because the game decides per material whether a surface reflects the sky:
// metalness 0.5 or more (cutaway.ts). `Palette Metal` holds the colours at 0.5 and above; `Palette`'s
// metalness factor is its colours' highest (below 0.5), its image scaled up to match.
// Plan: doc/plans/features/palette-material.md (SC-180, step 2).
//
// What each colour keeps, exactly (three.js's physical shading):
// - base colour → `Palette` (sRGB); emissive colour × strength → `Palette Emission` (sRGB), with the
//   material's emissive strength set to the largest one (the image scaled down to fit);
// - roughness (G) and metalness (B) → `Palette MR` (linear), and in its alpha the specular
//   intensity (glTF's specular factor: three uses it for F90 too);
// - the specular colour → `Palette Specular` (sRGB), its factor 2 (the file's colours go up to 2),
//   corrected for the IOR (the palette's is 1.45, as most of the file's; a material without the
//   IOR extension has 1.5).
// The sampler is nearest, no mipmaps: the squares never blur into each other.

import { NodeIO, TextureInfo } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { joinPrimitives, prune } from '@gltf-transform/functions';
import { PropertyType } from '@gltf-transform/core';
import sharp from 'sharp';

const [, , input, output] = process.argv;
if (!input || !output) {
  console.error('palette: node tools/palette.mjs <in.glb> <out.glb>');
  process.exit(2);
}
/** Materials the game finds by name stay apart (ship.ts's cockpit floor; textured anyway). */
const KEEP_APART = new Set(['Floor Tiles', 'Grate']);
/** Extensions a palette colour may have: what the images carry. */
const ALLOWED = new Set(['KHR_materials_specular', 'KHR_materials_ior', 'KHR_materials_emissive_strength']);
const SQUARE = 16; // px
const IOR = 1.45;

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(input);
const root = doc.getRoot();

const f0 = (ior) => ((ior - 1) / (ior + 1)) ** 2;
const ext = (m, name) => m.listExtensions().find((e) => e.extensionName === name);
const hasTexture = (m) => [m, ...m.listExtensions()].some((p) => doc.getGraph().listChildEdges(p).some((e) => e.getChild().propertyType === PropertyType.TEXTURE));

const why = new Map(); // material name → why it stays apart (for the summary)
function joins(m) {
  const no = (reason) => (why.set(m.getName(), reason), false);
  if (KEEP_APART.has(m.getName())) return no('found by name');
  if (m.getAlphaMode() !== 'OPAQUE' || m.getBaseColorFactor()[3] < 1) return no('transparent');
  if (m.getDoubleSided()) return no('double-sided');
  if (hasTexture(m)) return no('textured');
  const other = m.listExtensions().find((e) => !ALLOWED.has(e.extensionName));
  if (other) return no(other.extensionName.replace('KHR_materials_', ''));
  return true;
}

const used = new Set(root.listMeshes().flatMap((mesh) => mesh.listPrimitives().map((p) => p.getMaterial())).filter(Boolean));
const colours = root.listMaterials().filter((m) => used.has(m) && joins(m));
if (colours.length === 0) {
  console.log('PALETTE: no material joins');
  await io.write(output, doc);
  process.exit(0);
}

// Each colour's values, as three.js would shade it.
const values = colours.map((m) => {
  const spec = ext(m, 'KHR_materials_specular');
  const ior = ext(m, 'KHR_materials_ior')?.getIOR() ?? 1.5;
  const strength = ext(m, 'KHR_materials_emissive_strength')?.getEmissiveStrength() ?? 1;
  const colour = spec ? spec.getSpecularColorFactor()[0] : 1; // grey in this file; checked below
  if (spec && new Set(spec.getSpecularColorFactor()).size > 1) console.log(`PALETTE: ${m.getName()}'s specular colour isn't grey: its red kept`);
  return {
    name: m.getName(),
    base: m.getBaseColorFactor().slice(0, 3),
    emissive: m.getEmissiveFactor().map((c) => c * strength),
    roughness: m.getRoughnessFactor(),
    metalness: m.getMetallicFactor(),
    intensity: spec ? spec.getSpecularFactor() : 1,
    specular: (colour * f0(ior)) / f0(IOR), // the colour that gives the same F0 at the palette's IOR
  };
});
const METAL = 0.5; // cutaway.ts: a material this metallic reflects the sky
const metalness = { false: Math.max(0, ...values.filter((v) => v.metalness < METAL).map((v) => v.metalness)) || 1, true: 1 };
const strength = Math.max(1, ...values.flatMap((v) => v.emissive));
const SPECULAR = 2;
const tooBright = values.filter((v) => v.specular > SPECULAR + 1e-3);
if (tooBright.length) console.log(`PALETTE: specular above ${SPECULAR}, clamped: ${tooBright.map((v) => v.name).join(', ')}`);

// The images: a grid of squares, a power of two wide.
const columns = 2 ** Math.ceil(Math.log2(Math.ceil(Math.sqrt(colours.length))));
const rows = 2 ** Math.ceil(Math.log2(Math.ceil(colours.length / columns)));
const width = columns * SQUARE;
const height = rows * SQUARE;
const toSrgb = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const byte = (c) => Math.round(Math.min(1, Math.max(0, c)) * 255);
async function image(texel) {
  const pixels = Buffer.alloc(width * height * 4);
  values.forEach((v, i) => {
    const rgba = texel(v);
    const x0 = (i % columns) * SQUARE;
    const y0 = Math.floor(i / columns) * SQUARE;
    for (let y = y0; y < y0 + SQUARE; y++) for (let x = x0; x < x0 + SQUARE; x++) rgba.forEach((c, k) => (pixels[(y * width + x) * 4 + k] = c));
  });
  return sharp(pixels, { raw: { width, height, channels: 4 } }).png().toBuffer();
}
const srgb = (rgb) => [...rgb.map((c) => byte(toSrgb(c))), 255];
const texture = async (name, texel) => doc.createTexture(name).setMimeType('image/png').setURI(`${name.replace(/ /g, '-').toLowerCase()}.png`).setImage(await image(texel));

const baseImage = await texture('Palette', (v) => srgb(v.base));
const emissiveImage = await texture('Palette Emission', (v) => srgb(v.emissive.map((c) => c / strength)));
const mrImage = await texture('Palette MR', (v) => [255, byte(v.roughness), byte(v.metalness / metalness[v.metalness >= METAL]), byte(v.intensity)]);
const specularImage = await texture('Palette Specular', (v) => srgb([0, 0, 0].map(() => Math.min(v.specular, SPECULAR) / SPECULAR)));

const nearest = (info) => info.setMagFilter(TextureInfo.MagFilter.NEAREST).setMinFilter(TextureInfo.MinFilter.NEAREST);
const extensionOf = (name) => doc.createExtension(ALL_EXTENSIONS.find((E) => E.EXTENSION_NAME === name));
function paletteMaterial(name, metallic) {
  const palette = doc.createMaterial(name).setBaseColorFactor([1, 1, 1, 1]).setRoughnessFactor(1).setMetallicFactor(metallic).setEmissiveFactor([1, 1, 1]);
  palette.setBaseColorTexture(baseImage);
  nearest(palette.getBaseColorTextureInfo());
  palette.setEmissiveTexture(emissiveImage);
  nearest(palette.getEmissiveTextureInfo());
  palette.setMetallicRoughnessTexture(mrImage);
  nearest(palette.getMetallicRoughnessTextureInfo());
  const specular = extensionOf('KHR_materials_specular').createSpecular().setSpecularFactor(1).setSpecularColorFactor([SPECULAR, SPECULAR, SPECULAR]).setSpecularTexture(mrImage).setSpecularColorTexture(specularImage);
  nearest(specular.getSpecularTextureInfo());
  nearest(specular.getSpecularColorTextureInfo());
  palette.setExtension('KHR_materials_specular', specular);
  palette.setExtension('KHR_materials_ior', extensionOf('KHR_materials_ior').createIOR().setIOR(IOR));
  palette.setExtension('KHR_materials_emissive_strength', extensionOf('KHR_materials_emissive_strength').createEmissiveStrength().setEmissiveStrength(strength));
  return palette;
}
const materials = { false: paletteMaterial('Palette', metalness.false), true: paletteMaterial('Palette Metal', 1) };
const materialOf = new Map(colours.map((m, i) => [m, materials[values[i].metalness >= METAL]]));

// Each primitive of a palette colour: UVs on its square's centre (glTF's v goes down the image).
const square = new Map(colours.map((m, i) => [m, [((i % columns) + 0.5) / columns, (Math.floor(i / columns) + 0.5) / rows]]));
let primitivesBefore = 0;
let primitivesAfter = 0;
let joined = 0;
for (const mesh of root.listMeshes()) {
  primitivesBefore += mesh.listPrimitives().length;
  const onPalette = [];
  for (const prim of mesh.listPrimitives()) {
    const uv = square.get(prim.getMaterial());
    if (!uv) continue;
    for (const semantic of prim.listSemantics()) if (semantic.startsWith('TEXCOORD_')) prim.setAttribute(semantic, null);
    const count = prim.getAttribute('POSITION').getCount();
    const array = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) array.set(uv, i * 2);
    prim.setAttribute('TEXCOORD_0', doc.createAccessor().setType('VEC2').setArray(array).setBuffer(root.listBuffers()[0]));
    prim.setMaterial(materialOf.get(prim.getMaterial()));
    onPalette.push(prim);
  }
  // Joined by kind (same attributes, mode, indexed or not): Blender's export makes them alike.
  const kinds = new Map();
  for (const prim of onPalette) {
    const key = [prim.getMaterial().getName(), prim.getMode(), !!prim.getIndices(), ...prim.listSemantics().sort(), prim.listTargets().length].join();
    kinds.set(key, [...(kinds.get(key) ?? []), prim]);
  }
  for (const prims of kinds.values()) {
    if (prims.length < 2 || prims.some((p) => p.listTargets().length)) continue;
    const one = joinPrimitives(prims);
    for (const p of prims) {
      mesh.removePrimitive(p);
      p.dispose();
    }
    mesh.addPrimitive(one);
    joined += prims.length - 1;
  }
  primitivesAfter += mesh.listPrimitives().length;
}
for (const m of colours) m.dispose();
// Only the accessors and materials nothing uses now (a full prune drops the lights' nodes and
// the normals of unlit meshes: see drop-uvs.mjs).
await doc.transform(prune({ propertyTypes: [PropertyType.ACCESSOR, PropertyType.MATERIAL], keepAttributes: true }));
await io.write(output, doc);

const materialsAfter = root.listMaterials().length;
console.log(`PALETTE: ${colours.length} colours → two materials (${values.filter((v) => v.metalness >= METAL).length} metal; ${width}×${height} px, emission strength ${+strength.toFixed(2)}); materials ${materialsAfter + colours.length - 2} → ${materialsAfter}; primitives ${primitivesBefore} → ${primitivesAfter} (meshes, not instances)`);
console.log(`PALETTE: joined: ${colours.map((m) => m.getName()).join(', ')}`);
console.log(`PALETTE: apart: ${[...why].map(([n, r]) => `${n} (${r})`).join(', ')}`);
