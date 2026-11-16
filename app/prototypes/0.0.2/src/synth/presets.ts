// The synth's saved patches (patches.json), written by synth.html's Save buttons through the dev
// server (vite.config.ts, `savedPresets`). The temple chord: the owner's, 2026-11-08.
import type { Patch } from './synth';
import data from './patches.json';
import scannerData from './scanner-patches.json';

export interface PatchFile {
  default: string;
  patches: Record<string, Patch>;
}

export const PATCHES = (data as unknown as PatchFile).patches;
export const DEFAULT_PATCH: Patch = PATCHES[data.default]!;

/** The scanner's patches (scanner-patches.json, saved by scanner-synth.html). The game plays its default (owner, 2026-11-16). */
export const SCANNER_PATCH: Patch = (scannerData as unknown as PatchFile).patches[scannerData.default]!;
