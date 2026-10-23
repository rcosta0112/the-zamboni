// The scene, lit like Part 1's Blender scenes (Big Moon Tiny Moon, Models/Props/Camp Site 1.01.blend):
// - World (ambient light and background): a blue gradient by direction, light cyan at and below
//   the horizon to deep blue overhead (Blender ColorRamp, Ease interpolation, strength 1).
// - Sun: yellow, strength 7.5, low (~20°), near-sharp shadows.
// - Colour management: Filmic in Blender → AgX tone mapping here (three.js has no Filmic).
// Blender and three.js use the same light units here (sun irradiance, world radiance), so the
// values carry over directly.

import * as THREE from 'three/webgpu';
import { abs, color, float, fract, fwidth, max, min, mix, mx_fractal_noise_float, positionWorld, smoothstep, uniform, vec3 } from 'three/tsl';
import { settings } from './settings';

const FLOOR_SIZE = 400;

/** Blender world ColorRamp: position (0..1 of "up") → linear RGB. */
const WORLD_RAMP: [number, [number, number, number]][] = [
  [0.0, [0.205, 0.831, 1.0]],
  [0.327, [0.0, 0.468, 1.0]],
  [1.0, [0.0, 0.209, 1.0]],
];
/** Blender sun colour (linear). */
const SUN_COLOR = new THREE.Color().setRGB(0.993, 1.0, 0.377, THREE.LinearSRGBColorSpace);

const SNOW = 0xf3f7f9;

const gridOpacity = uniform(settings.showGrid ? 0.35 : 0);

export interface World {
  sun: THREE.DirectionalLight;
  ambient: THREE.HemisphereLight;
  sky: THREE.DataTexture;
  /** The same gradient, for metal to reflect (see `reflections`). */
  reflections: THREE.DataTexture;
  /** The landed ground (hidden while the ship flies: terrain.ts has its own). */
  floor: THREE.Mesh;
}

/** The sun's colour: also what the room lights of sunlit rooms are tinted toward. */
export const sunColor: Readonly<THREE.Color> = SUN_COLOR;

export function createWorld(scene: THREE.Scene): World {
  // The world gradient, as an equirectangular texture: the visible background, as the World is
  // in Blender. Its lighting is the hemisphere light below.
  const sky = worldGradientTexture(8, 128);
  scene.background = sky;
  // For reflections on metal: the same gradient, wide enough for three's PMREM (it sizes its cube
  // from the texture's width; at 8 px it gave nothing). Not scene.environment: that would light
  // every material a second time. Only metallic materials get it (cutaway.ts), and metal has no
  // diffuse part, so nothing else changes.
  const reflections = worldGradientTexture(256, 128);

  // Ambient light from the same gradient. (scene.environment, with or without PMREM, didn't light
  // anything in this setup, so the diffuse part is computed directly: what matters for these matte
  // flat-colour materials.) Facing up: the cosine-weighted average of the sky gradient; facing
  // down: the cyan below the horizon. Intensity π turns Blender's world radiance into irradiance.
  const ambient = new THREE.HemisphereLight(upperHemisphereColor(), linearColor(WORLD_RAMP[0]![1]), Math.PI * settings.worldStrength);
  scene.add(ambient);

  // Distance haze in the horizon colour (the floor is finite; this hides its edge).
  const horizon = WORLD_RAMP[0]![1];
  scene.fog = new THREE.Fog(new THREE.Color().setRGB(horizon[0], horizon[1], horizon[2], THREE.LinearSRGBColorSpace), settings.hazeNear, settings.hazeFar);

  const sun = new THREE.DirectionalLight(SUN_COLOR, settings.sunIntensity);
  sun.castShadow = true;
  sun.shadow.mapSize.set(settings.shadowMapSize, settings.shadowMapSize);
  sun.shadow.radius = 1.5; // the Blender sun's angle is 0.5°: nearly sharp shadows
  const s = sun.shadow.camera;
  s.near = 1;
  s.far = 80;
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(FLOOR_SIZE, FLOOR_SIZE), snowMaterial(positionWorld.xz));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  return { sun, ambient, sky, reflections, floor };
}

/**
 * Per frame: keep the sun's shadow area on the character; apply tuning. `insideAmount` (0..1): how
 * far she is inside the ship, where the world's blue light is turned down (it has no way in but the
 * windows, and it made the rooms too blue; owner, 2026-10-12).
 */
export function updateWorld(world: World, scene: THREE.Scene, target: THREE.Vector3, insideAmount: number): void {
  const el = THREE.MathUtils.degToRad(settings.sunElevationDeg);
  const az = THREE.MathUtils.degToRad(settings.sunAzimuthDeg);
  const dist = 30;
  world.sun.position.set(
    target.x + Math.cos(el) * Math.sin(az) * dist,
    target.y + Math.sin(el) * dist,
    target.z + Math.cos(el) * Math.cos(az) * dist,
  );
  world.sun.target.position.copy(target);
  world.sun.intensity = settings.sunIntensity;
  // The shadow map: its size, and the square around her that it covers: sharp indoors, wider
  // outdoors so the ship's shadow is seen from further away. One texel is 2 × range / size (1.2 cm at
  // 4096 and 25 m): the size of the steps on a shadow's edge.
  const shadow = world.sun.shadow;
  if (shadow.mapSize.x !== settings.shadowMapSize) {
    shadow.mapSize.set(settings.shadowMapSize, settings.shadowMapSize);
    shadow.map?.dispose();
    shadow.map = null;
  }
  const r = THREE.MathUtils.lerp(settings.shadowRangeOutdoors, settings.shadowRangeIndoors, insideAmount);
  if (shadow.camera.right !== r) {
    shadow.camera.left = -r;
    shadow.camera.right = r;
    shadow.camera.top = r;
    shadow.camera.bottom = -r;
    shadow.camera.updateProjectionMatrix();
  }
  world.ambient.intensity = Math.PI * settings.worldStrength * THREE.MathUtils.lerp(1, settings.worldIndoors, insideAmount);
  scene.backgroundIntensity = settings.worldStrength;
  scene.environmentIntensity = settings.metalReflections; // no scene.environment: this scales the metals' envNode

  const f = scene.fog as THREE.Fog;
  f.near = settings.haze ? settings.hazeNear : 1e6;
  f.far = settings.haze ? settings.hazeFar : 1e6 + 1;
  gridOpacity.value = settings.showGrid ? 0.35 : 0;
}

function linearColor([r, g, b]: [number, number, number]): THREE.Color {
  return new THREE.Color().setRGB(r, g, b, THREE.LinearSRGBColorSpace);
}

/** Cosine-weighted average radiance of the upper hemisphere: what a surface facing straight up receives. */
function upperHemisphereColor(): THREE.Color {
  const steps = 256;
  let r = 0;
  let g = 0;
  let b = 0;
  let weight = 0;
  for (let i = 0; i < steps; i++) {
    const el = ((i + 0.5) / steps) * (Math.PI / 2); // elevation 0..90°
    const w = Math.sin(el) * Math.cos(el); // cos(angle to the normal) × solid-angle factor
    const c = ramp(Math.sin(el));
    r += c[0] * w;
    g += c[1] * w;
    b += c[2] * w;
    weight += w;
  }
  return linearColor([r / weight, g / weight, b / weight]);
}

/** Evaluate the Blender ColorRamp (Ease interpolation) at t. */
function ramp(t: number): [number, number, number] {
  const stops = WORLD_RAMP;
  if (t <= stops[0]![0]) return stops[0]![1];
  for (let i = 1; i < stops.length; i++) {
    const [p1, c1] = stops[i]!;
    const [p0, c0] = stops[i - 1]!;
    if (t <= p1) {
      let k = (t - p0) / (p1 - p0);
      k = k * k * (3 - 2 * k); // Ease
      return [c0[0] + (c1[0] - c0[0]) * k, c0[1] + (c1[1] - c0[1]) * k, c0[2] + (c1[2] - c0[2]) * k];
    }
  }
  return stops[stops.length - 1]![1];
}

/** Equirectangular texture of the world gradient: the ramp is driven by the direction's height (Blender's Z). */
function worldGradientTexture(w: number, h: number): THREE.DataTexture {
  const data = new Float32Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    // Data row 0 is the bottom of the equirect (straight down): elevation −90° … +90°.
    const elevation = ((y + 0.5) / h - 0.5) * Math.PI;
    const [r, g, b] = ramp(Math.max(0, Math.sin(elevation)));
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 1;
    }
  }
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat, THREE.FloatType);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.LinearSRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

/** Near-white snow with very faint large-scale variation, plus an optional faint grid. `at`: where on the snow a point is (m). */
function snowMaterial(at: THREE.Node<'vec2'>): THREE.MeshStandardNodeMaterial {
  const variation = mx_fractal_noise_float(vec3(at.mul(0.08), 0), 3, 2.0, 0.5);
  const base = mix(color(SNOW), color(0xe4eef3), smoothstep(-0.4, 0.6, variation).mul(0.6));

  const lines = (spacing: number) => {
    const coord = at.div(spacing);
    const d = abs(fract(coord.sub(0.5)).sub(0.5)).div(fwidth(coord));
    return float(1).sub(min(min(d.x, d.y), 1));
  };
  const grid = max(lines(1).mul(0.4), lines(10)).mul(gridOpacity);

  const material = new THREE.MeshStandardNodeMaterial({ roughness: 0.92, metalness: 0 });
  material.colorNode = mix(base, color(0x7f93a0), grid);
  return material;
}
