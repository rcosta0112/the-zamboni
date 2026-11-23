/**
 * The flames' values the flame editor shows and saves (plan doc/plans/features/flame-editor.md): the keys of
 * `settings` (settings.ts), as the panel's *Flight: thruster flames* folder labels them. Shared by the page and
 * vite.config.ts's `/__flames` (which writes only these keys, and only values of their kind).
 */

export type FlameKey = {
  key: string;
  label: string;
  kind: 'number' | 'colour' | 'on';
  step?: number;
  min?: number;
  max?: number;
};

export const FLAME_KEYS: FlameKey[] = [
  { key: 'thrusterFlames', label: 'shown', kind: 'on' },
  { key: 'thrusterFlameColor', label: 'colour', kind: 'colour' },
  { key: 'thrusterFlameStrength', label: 'brightness', kind: 'number', step: 0.1, min: 0, max: 20 },
  { key: 'thrusterFlameFade', label: 'fades by (share)', kind: 'number', step: 0.01, min: 0.05, max: 1 },
  { key: 'thrusterFlameGrain', label: 'grain', kind: 'number', step: 0.01, min: 0, max: 1 },
  { key: 'thrusterFlameGrainSize', label: 'grain size (m)', kind: 'number', step: 0.005, min: 0.005, max: 1 },
  { key: 'thrusterFlameSpeed', label: 'grain speed (m/s)', kind: 'number', step: 1, min: 0, max: 200 },
  { key: 'thrusterFlameFlicker', label: 'flicker', kind: 'number', step: 0.01, min: 0, max: 1 },
  { key: 'thrusterFlameFlickerLength', label: 'flicker: length', kind: 'number', step: 0.01, min: 0, max: 0.9 },
  { key: 'thrusterFlameFlickerRate', label: 'flicker: speed', kind: 'number', step: 0.5, min: 0, max: 60 },
  // The engines' power (landing-takeoff-shots.md): times the length, core and flicker speed by power^these.
  { key: 'thrusterPowerLength', label: 'power: length', kind: 'number', step: 0.05, min: 0, max: 2 },
  { key: 'thrusterPowerCore', label: 'power: core', kind: 'number', step: 0.05, min: 0, max: 2 },
  { key: 'thrusterPowerFlicker', label: 'power: flicker', kind: 'number', step: 0.05, min: 0, max: 2 },
];

export const GLOW_KEYS: FlameKey[] = [
  { key: 'thrusterGlow', label: 'shown', kind: 'on' },
  { key: 'thrusterGlowCoreColor', label: 'core', kind: 'colour' },
  { key: 'thrusterGlowHaloColor', label: 'halo', kind: 'colour' },
  { key: 'thrusterGlowRadii', label: 'size (nozzle radii)', kind: 'number', step: 0.1, min: 0, max: 20 },
  { key: 'thrusterGlowFront', label: 'front pair: size', kind: 'number', step: 0.05, min: 0, max: 2 },
  { key: 'thrusterGlowCore', label: 'core size', kind: 'number', step: 0.01, min: 0.05, max: 1 },
  { key: 'thrusterGlowHalo', label: 'halo brightness', kind: 'number', step: 0.05, min: 0, max: 3 },
  { key: 'thrusterGlowOut', label: 'out of nozzle (m)', kind: 'number', step: 0.05, min: 0, max: 3 },
  { key: 'thrusterGlowOutFront', label: 'front: out (m)', kind: 'number', step: 0.05, min: 0, max: 3 },
  { key: 'thrusterGlowTowardRadii', label: 'to camera (radii)', kind: 'number', step: 0.1, min: 0, max: 6 },
  { key: 'thrusterGlowFlicker', label: 'flicker', kind: 'number', step: 0.01, min: 0, max: 0.5 },
  { key: 'thrusterGlowFlickerRate', label: 'flicker: speed', kind: 'number', step: 1, min: 1, max: 40 },
];

export const ALL_FLAME_KEYS = [...FLAME_KEYS, ...GLOW_KEYS];
