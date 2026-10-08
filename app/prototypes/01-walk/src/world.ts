// The scene, lit like Part 1's Blender scenes (Big Moon Tiny Moon, Models/Props/Camp Site 1.01.blend):
// - World (ambient light and background): a blue gradient by direction, light cyan at and below
//   the horizon to deep blue overhead (Blender ColorRamp, Ease interpolation, strength 1).
// - Sun: yellow, strength 7.5, low (~20°), near-sharp shadows.
// - Colour management: Filmic in Blender → AgX tone mapping here (three.js has no Filmic).
// Blender and three.js use the same light units here (sun irradiance, world radiance), so the
// values carry over directly.

import * as THREE from 'three/webgpu';
import { abs, color, float, fract, fwidth, max, min, mix, mx_fractal_noise_float, positionWorld, smoothstep, uniform, vec2, vec3 } from 'three/tsl';
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
}

export function createWorld(scene: THREE.Scene): World {
  // The world gradient, as an equirectangular texture: the visible background, as the World is
  // in Blender. Its lighting is the hemisphere light below.
  const sky = worldGradientTexture();
  scene.background = sky;

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
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.radius = 1.5; // the Blender sun's angle is 0.5°: nearly sharp shadows
  const s = sun.shadow.camera;
  s.left = -25;
  s.right = 25;
  s.top = 25;
  s.bottom = -25;
  s.near = 1;
  s.far = 80;
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(FLOOR_SIZE, FLOOR_SIZE), snowMaterial());
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  return { sun, ambient, sky };
}

/** Per frame: keep the sun's shadow area on the character; apply tuning. */
export function updateWorld(world: World, scene: THREE.Scene, target: THREE.Vector3): void {
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
  world.ambient.intensity = Math.PI * settings.worldStrength;
  scene.backgroundIntensity = settings.worldStrength;

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
function worldGradientTexture(): THREE.DataTexture {
  const w = 8;
  const h = 128;
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

/** Near-white snow with very faint large-scale variation, plus an optional faint grid. */
function snowMaterial(): THREE.MeshStandardNodeMaterial {
  const variation = mx_fractal_noise_float(vec3(positionWorld.xz.mul(0.08), 0), 3, 2.0, 0.5);
  const base = mix(color(SNOW), color(0xe4eef3), smoothstep(-0.4, 0.6, variation).mul(0.6));

  const lines = (spacing: number) => {
    const coord = vec2(positionWorld.x, positionWorld.z).div(spacing);
    const d = abs(fract(coord.sub(0.5)).sub(0.5)).div(fwidth(coord));
    return float(1).sub(min(min(d.x, d.y), 1));
  };
  const grid = max(lines(1).mul(0.4), lines(10)).mul(gridOpacity);

  const material = new THREE.MeshStandardNodeMaterial({ roughness: 0.92, metalness: 0 });
  material.colorNode = mix(base, color(0x7f93a0), grid);
  return material;
}
