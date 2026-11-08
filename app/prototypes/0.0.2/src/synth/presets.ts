// The synth's saved patches (patches.json), written by synth.html's Save buttons through the dev
// server (vite.config.ts, `synthPatches`). The temple chord: the owner's, 2026-11-08.
import type { Patch } from './synth';
import data from './patches.json';

export interface PatchFile {
  default: string;
  patches: Record<string, Patch>;
}

export const PATCHES = (data as unknown as PatchFile).patches;
export const DEFAULT_PATCH: Patch = PATCHES[data.default]!;
