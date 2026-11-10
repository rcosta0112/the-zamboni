// Grain for the planet shot, like the noise in the owner's EEVEE render (owner, 2026-11-10: option A, in
// the shaders, no post-processing pass yet). Each material's final colour (after tone mapping, as seen)
// is multiplied by 1 + a random value per pixel, new each frame: black stays black (the sky between the
// stars, as EEVEE's), the darks get more of it (`response`). The planet, its atmosphere and the sky all
// use the same uniforms, so one preset value sets them all.

import * as THREE from 'three/webgpu';
import { clamp, dot, float, floor, Fn, frameId, fract, mix, output, screenCoordinate, screenSize, select, uniform, vec2, vec3, vec4 } from 'three/tsl';

export interface GrainPreset {
  /** How strong: the colour varies by up to ± this share (0: off). */
  amount: number;
  /** A grain's size in pixels of a 1080-line screen. */
  size: number;
  /** 0: the same everywhere; 1: twice as strong in the darks, none in white. */
  response: number;
  /** 0: grey grain; 1: each colour channel its own. */
  colour: number;
  /** New grain each frame (a render's noise); off: it stays put on the screen. */
  moving: boolean;
}

export const GRAIN_OFF: GrainPreset = { amount: 0, size: 1, response: 0.5, colour: 0.3, moving: true };

type Vec2Node = THREE.Node<'vec2'>;
type FloatNode = THREE.Node<'float'>;

const u = {
  amount: uniform(0),
  size: uniform(1),
  response: uniform(0.5),
  colour: uniform(0.3),
  moving: uniform(1),
};

/** A random value 0..1 for a point (Dave Hoskins' hash12: no sine). */
function hash12(p: Vec2Node): FloatNode {
  const p3 = fract(vec3(p.x, p.y, p.x).mul(0.1031)).toVar();
  p3.addAssign(dot(p3, p3.yzx.add(33.33)));
  return fract(p3.x.add(p3.y).mul(p3.z));
}

/** −1..1, peaked at 0 (two random values summed: softer than flat noise). */
function signed(p: Vec2Node): FloatNode {
  return hash12(p).add(hash12(p.add(vec2(57.3, 11.9)))).sub(1);
}

/** The node to set as a material's `outputNode`: its own colour, grained. */
export function grainOutput(): THREE.Node<'vec4'> {
  return Fn(() => {
    const cell = floor(screenCoordinate.div(u.size.mul(screenSize.y).div(1080).max(1)));
    // A new place in the noise each frame (kept under ~60 000, for float precision).
    const frame = select(u.moving.greaterThan(0.5), float(frameId.mod(997)), float(0));
    const p = cell.add(vec2(frame.mul(37), frame.mul(61)));
    const grey = signed(p);
    const each = vec3(signed(p.add(vec2(101, 0))), signed(p.add(vec2(0, 103))), signed(p.add(vec2(107, 109))));
    const n = mix(vec3(grey), each, u.colour);
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
