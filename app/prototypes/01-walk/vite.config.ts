import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

export default defineConfig({
  // The interface (the start screen, and @zamboni/ui's components) is Svelte.
  plugins: [svelte()],
  publicDir: '../../assets',
  // Three's add-ons (GLTFLoader…) import 'three'; point that at the WebGPU build so the whole
  // app shares one copy of three (as the official WebGPU examples do with their import map).
  resolve: { alias: [{ find: /^three$/, replacement: 'three/webgpu' }] },
  server: { port: 5201, strictPort: true },
  preview: { port: 5201, strictPort: true },
  build: { target: 'es2022' },
});
