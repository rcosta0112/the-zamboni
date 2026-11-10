// Grain for the planet shot, like the noise in the owner's EEVEE render (owner, 2026-11-10: option A, in
// the shaders, no post-processing pass yet). Each material's final colour (after tone mapping, as seen)
// is multiplied by 1 + a random value: black stays black (the sky between the stars, as EEVEE's), the
// darks get more of it (`response`). The planet, its atmosphere and the sky all use the same uniforms,
// so one preset value sets them all.
// Mapped to the surface (owner, 2026-11-10: on the screen it slid over the planet): a 3D noise on the
// material's own coordinates (the planet's position, the sky's direction), so it turns and zooms with
// them. Its cells stay about `size` pixels on screen: a grid twice as fine fades in each time the lens
// doubles (as the star layers do), so it neither grows 9× through the zoom nor shimmers far away.

import * as THREE from 'three/webgpu';
import { clamp, dot, exp2, float, floor, Fn, frameId, fract, fwidth, length, log2, mix, output, screenSize, select, sqrt, uniform, vec3, vec4 } from 'three/tsl';

export interface GrainPreset {
  /** How strong: the colour varies by up to ± this share (0: off). */
  amount: number;
  /** A grain's size on screen, in pixels of a 1080-line screen (it stays on the surface: about this size at every zoom). */
  size: number;
  /** 0: the same everywhere; 1: twice as strong in the darks, none in white. */
  response: number;
  /** 0: grey grain; 1: each colour channel its own. */
  colour: number;
  /** New grain each frame (a render's noise); off: it stays put on the surface. */
  moving: boolean;
}

export const GRAIN_OFF: GrainPreset = { amount: 0, size: 1, response: 0.5, colour: 0.3, moving: false };

type Vec3Node = THREE.Node<'vec3'>;
type FloatNode = THREE.Node<'float'>;

const u = {
  amount: uniform(0),
  size: uniform(1),
  response: uniform(0.5),
  colour: uniform(0.3),
  moving: uniform(0),
};

/** A random value 0..1 for a point (Dave Hoskins' hash13: no sine). */
function hash13(p: Vec3Node): FloatNode {
  const p3 = fract(p.mul(0.1031)).toVar();
  p3.addAssign(dot(p3, p3.zyx.add(31.32)));
  return fract(p3.x.add(p3.y).mul(p3.z));
}

/** −1..1, peaked at 0 (two random values summed: softer than flat noise), one per cell. */
function signed(cell: Vec3Node): FloatNode {
  return hash13(cell).add(hash13(cell.add(vec3(57.3, 11.9, 23.1)))).sub(1);
}

/** Grey and per-channel noise for one grid (cells `cellSize` across), mixed by `colour`. */
function grid(p: Vec3Node, cellSize: FloatNode): Vec3Node {
  const cell = floor(p.div(cellSize));
  const grey = signed(cell);
  const each = vec3(signed(cell.add(vec3(101, 0, 0))), signed(cell.add(vec3(0, 103, 0))), signed(cell.add(vec3(0, 0, 107))));
  return mix(vec3(grey), each, u.colour);
}

/**
 * The node to set as a material's `outputNode`: its own colour, grained by a noise on `coords` (the
 * surface's own position, or the sky's direction).
 */
export function grainOutput(coords: Vec3Node): THREE.Node<'vec4'> {
  return Fn(() => {
    // A new place in the noise each frame, if moving (kept small, for float precision).
    const frame = select(u.moving.greaterThan(0.5), float(frameId.mod(997)), float(0));
    const p = coords.add(vec3(frame.mul(0.37), frame.mul(0.61), frame.mul(0.53))).toVar();
    // The wanted cell, in the coordinates' units: `size` pixels (of a 1080-line screen) on the surface.
    const pixel = length(fwidth(coords)).mul(0.577);
    const level = log2(pixel.mul(u.size).mul(screenSize.y).div(1080).max(1e-6)).toVar();
    const coarse = exp2(floor(level).add(1));
    const t = fract(level);
    // The finer grid fades out as the cells grow towards the coarser; the mix's spread kept even.
    const n = mix(grid(p, coarse.mul(0.5)), grid(p, coarse), t).div(sqrt(t.mul(t).add(float(1).sub(t).mul(float(1).sub(t)))));
    const lum = clamp(dot(output.rgb, vec3(0.2126, 0.7152, 0.0722)), 0, 1);
    const amp = u.amount.mul(mix(float(1), float(1).sub(lum).mul(2), u.response));
    return vec4(output.rgb.mul(n.mul(amp).add(1)).max(0), output.a);
  })() as THREE.Node<'vec4'>;
}

export function applyGrain(preset: GrainPreset): void {
  u.amount.value = preset.amount;
  u.size.value = preset.size;
  u.response.value = preset.response;
  u.colour.value = preset.colour;
  u.moving.value = preset.moving ? 1 : 0;
}
