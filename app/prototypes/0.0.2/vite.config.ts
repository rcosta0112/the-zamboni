import { svelte } from '@sveltejs/vite-plugin-svelte';
import { readFileSync, writeFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';

// This version's number, shown in the tuning panel's title.
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

/**
 * The tuning pages' saved presets (dev only), one JSON file each: GET <route> reads the file; POST saves
 * one ({ name, <item>: {...} }) under `<key>.<name>` and makes it the default. The pages fetch instead of
 * importing the file, so a save doesn't reload them. synth.html: /__synth/patches (src/synth/patches.json);
 * scanner-synth.html: /__synth/scanner (src/synth/scanner-patches.json);
 * planet.html: /__planet/presets (src/planet/presets.json). shot-editor.html: /__shots (public/cutscenes/shots.json,
 * the saved flight shots, read by the game too: flight-shots.md; no default).
 */
function savedPresets(route: string, path: string, key: string, item: string, makeDefault = true): Plugin {
  const file = new URL(path, import.meta.url);
  return {
    name: `zamboni-presets${route.replaceAll('/', '-')}`,
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(route, (req, res) => {
        const reply = (status: number, body: string) => {
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json');
          res.end(body);
        };
        if (req.method === 'GET') return reply(200, readFileSync(file, 'utf8'));
        if (req.method !== 'POST') return reply(405, '{}');
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', () => {
          try {
            const { name, [item]: value } = JSON.parse(body);
            if (typeof name !== 'string' || !name.trim() || name.length > 60 || typeof value !== 'object' || !value) throw new Error(`bad ${item}`);
            const data = JSON.parse(readFileSync(file, 'utf8'));
            data[key][name.trim()] = value;
            if (makeDefault) data.default = name.trim();
            writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
            reply(200, JSON.stringify(data));
          } catch (err) {
            reply(400, JSON.stringify({ error: String(err) }));
          }
        });
      });
    },
  };
}

export default defineConfig({
  // The interface (the start screen, with @zamboni/ui's components) is Svelte.
  plugins: [
    svelte(),
    savedPresets('/__synth/patches', './src/synth/patches.json', 'patches', 'patch'),
    savedPresets('/__synth/scanner', './src/synth/scanner-patches.json', 'patches', 'patch'),
    savedPresets('/__planet/presets', './src/planet/presets.json', 'presets', 'preset'),
    savedPresets('/__shots', './public/cutscenes/shots.json', 'shots', 'shot', false),
  ],
  // Game files, fonts and UI images: this version's own, in public/ (Vite's default), served at the root.
  define: { __VERSION__: JSON.stringify(version) },
  // Three's add-ons (GLTFLoader…) import 'three'; point that at the WebGPU build so the whole
  // app shares one copy of three (as the official WebGPU examples do with their import map).
  resolve: { alias: [{ find: /^three$/, replacement: 'three/webgpu' }] },
  // Not watched: .export/ (raw exports, check output) and dist/ are deleted and rewritten whole, and on
  // Windows a watch on a deleted folder can loop forever, leaking native memory (item 57: GBs an hour).
  server: { port: 5202, strictPort: true, watch: { ignored: ['**/.export/**', '**/dist/**'] } },
  preview: { port: 5202, strictPort: true },
  build: { target: 'es2022' },
});
