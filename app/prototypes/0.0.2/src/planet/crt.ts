// The navigation screen's CRT look (plan planet-map-page.md, step 3c; owner, 2026-11-25: scanlines, flicker and
// noise, chunky; the noise like the planet shot's over the stars). One cheap pass over the screen's picture
// (the map's render target and the 2D overlay's canvas, composited here), so everything on the screen gets it:
// - **scanlines:** a dark band in the lower half of each line, `lines` across the screen's height, its edges
//   softened over one pixel; finer than about 2 px they fade to an even grey (no moiré);
// - **noise:** grain.ts's (a hash per cell, ± a share of the colour, more in the darks), its cells one
//   scanline square, a new pattern at each `noiseTick`; `onBlack` adds a faint static on the black too;
// - **flicker:** the whole screen's brightness, set per tick by the page (`flickerGain`).
// Ticks are stepped (a rate in Hz, not every frame): the chunky look, and the pass runs only when one ticks.

import * as THREE from 'three/webgpu';
import { abs, clamp, dot, float, floor, fract, Fn, fwidth, max, mix, pow, smoothstep, texture, uniform, uv, vec2, vec3, vec4 } from 'three/tsl';
import { signed } from './grain';

export interface CrtLook {
  /** Scanlines across the screen's height. */
  scanLines: number;
  /** How dark a scanline's band looks, 0..1 (0.5: half as bright, as seen). */
  scanDark: number;
  /** The noise: the colour varies by up to ± this share (0: off). The planet shot's grain: 0.325. */
  noise: number;
  /** 0: the same everywhere; 1: twice as strong in the darks, none in the brightest (the planet's: 0.54). */
  noiseResponse: number;
  /** A noise cell's size, in scanlines. */
  noiseSize: number;
  /** New noise this many times a second (0: it stays put). */
  noiseRate: number;
  /** A faint static on the black too, in the line colour (0: black stays black, as over the stars). */
  noiseOnBlack: number;
  /** The flicker: the screen's brightness varies by up to ± this share. */
  flicker: number;
  /** A new flicker brightness this many times a second. */
  flickerRate: number;
}

export interface Crt {
  material: THREE.MeshBasicNodeMaterial;
  setLook(look: CrtLook & { colour: string }): void;
  /**
   * The time, in seconds: sets this tick's noise and flicker. True when either ticked (the pass needs drawing).
   */
  tick(seconds: number): boolean;
}

/** `picture`: the map (linear); `overlay`: the 2D overlay's canvas texture (straight alpha); both the screen's shape. */
export function createCrt(picture: THREE.Texture, overlay: THREE.Texture, aspect: number, look: CrtLook & { colour: string }): Crt {
  const u = {
    aspect: uniform(aspect),
    lines: uniform(look.scanLines),
    dark: uniform(look.scanDark),
    noise: uniform(look.noise),
    response: uniform(look.noiseResponse),
    size: uniform(look.noiseSize),
    onBlack: uniform(look.noiseOnBlack),
    colour: uniform(new THREE.Color(look.colour)),
    noiseTick: uniform(0),
    flickerGain: uniform(1),
  };
  let rates = { noise: look.noiseRate, flicker: look.flicker > 0 ? look.flickerRate : 0, flickerShare: look.flicker };

  const colour = Fn(() => {
    const p = uv(); // `QuadMesh`: v runs down the screen
    const map = texture(picture, p).rgb;
    const over = texture(overlay, p);
    const base = mix(map, over.rgb, over.a).toVar();

    // Scanlines: the band's centre at 0.75 of each line; its half width 0.25; the edge over one pixel.
    const line = p.y.mul(u.lines);
    const pixel = max(fwidth(line), 1e-4);
    const fromBand = abs(fract(line.sub(0.25)).sub(0.5)); // 0 at the band's centre … 0.5 between bands
    const inBand = clamp(float(0.25).sub(fromBand).div(pixel).add(0.5), 0, 1);
    const evenGrey = smoothstep(0.35, 0.6, pixel); // lines finer than ~2 px: the band's average instead
    // `dark` as seen (sRGB-ish): the picture here is linear, so the band's brightness is raised to 2.2.
    const band = pow(float(1).sub(u.dark.mul(inBand)), 2.2);
    const scan = mix(band, pow(float(1).sub(u.dark), 2.2).add(1).mul(0.5), evenGrey);

    // Noise: grain.ts's cells, one scanline square (the screen's aspect kept), a new pattern each tick.
    const cell = floor(vec2(p.x.mul(u.aspect), p.y).mul(u.lines).div(max(u.size, 0.1)));
    const n = signed(vec3(cell, u.noiseTick));
    const lum = clamp(dot(base, vec3(0.2126, 0.7152, 0.0722)), 0, 1);
    const amp = u.noise.mul(mix(float(1), float(1).sub(lum).mul(2), u.response));
    const lineColour = vec3(u.colour.x, u.colour.y, u.colour.z);
    const grained = base.mul(n.mul(amp).add(1)).max(0).add(lineColour.mul(u.onBlack).mul(max(n, 0)));

    return vec4(grained.mul(scan).mul(u.flickerGain), 1);
  });

  const material = new THREE.MeshBasicNodeMaterial();
  material.colorNode = colour();
  material.name = 'Map CRT';

  let lastNoise = -1, lastFlicker = -1;
  return {
    material,
    setLook(next) {
      u.lines.value = Math.max(1, next.scanLines);
      u.dark.value = next.scanDark;
      u.noise.value = next.noise;
      u.response.value = next.noiseResponse;
      u.size.value = next.noiseSize;
      u.onBlack.value = next.noiseOnBlack;
      u.colour.value.set(next.colour);
      rates = { noise: next.noiseRate, flicker: next.flicker > 0 ? next.flickerRate : 0, flickerShare: next.flicker };
      if (next.flicker <= 0) u.flickerGain.value = 1;
    },
    tick(seconds) {
      // Kept small (float precision in the hash): the noise's tick wraps.
      const noise = rates.noise > 0 ? Math.floor(seconds * rates.noise) % 997 : 0;
      const flicker = rates.flicker > 0 ? Math.floor(seconds * rates.flicker) : 0;
      const changed = noise !== lastNoise || flicker !== lastFlicker;
      if (flicker !== lastFlicker && rates.flicker > 0) u.flickerGain.value = 1 + (Math.random() * 2 - 1) * rates.flickerShare;
      u.noiseTick.value = noise;
      lastNoise = noise;
      lastFlicker = flicker;
      return changed;
    },
  };
}
