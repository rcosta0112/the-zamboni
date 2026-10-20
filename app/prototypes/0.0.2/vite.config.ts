import { svelte } from '@sveltejs/vite-plugin-svelte';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

// This version's number, shown in the tuning panel's title.
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
  // The interface (the start screen, with @zamboni/ui's components) is Svelte.
  plugins: [svelte()],
  // Game files, fonts and UI images: this version's own, in public/ (Vite's default), served at the root.
  define: { __VERSION__: JSON.stringify(version) },
  // Three's add-ons (GLTFLoader…) import 'three'; point that at the WebGPU build so the whole
  // app shares one copy of three (as the official WebGPU examples do with their import map).
  resolve: { alias: [{ find: /^three$/, replacement: 'three/webgpu' }] },
  server: { port: 5202, strictPort: true },
  preview: { port: 5202, strictPort: true },
  build: { target: 'es2022' },
});
