import { svelte } from '@sveltejs/vite-plugin-svelte';
import { readFileSync, writeFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import { ALL_FLAME_KEYS } from './src/flight-shots/flame-keys';

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

/**
 * flame-editor.html's save (plan doc/plans/features/flame-editor.md): POST /__flames { values: { key: value } }
 * rewrites those keys' defaults in src/settings.ts in place (the value only; the line's comment kept), only keys of
 * flame-keys.ts and values of their kind. The write doesn't hot-reload the open pages (the editor keeps its state;
 * the game shows the values once reloaded).
 */
function savedFlames(): Plugin {
  const file = new URL('./src/settings.ts', import.meta.url);
  let wroteAt = 0;
  return {
    name: 'zamboni-flames',
    apply: 'serve',
    handleHotUpdate(ctx) {
      if (ctx.file.endsWith('/src/settings.ts') && Date.now() - wroteAt < 3000) return [];
    },
    configureServer(server) {
      server.middlewares.use('/__flames', (req, res) => {
        const reply = (status: number, body: string) => {
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json');
          res.end(body);
        };
        if (req.method !== 'POST') return reply(405, '{}');
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', () => {
          try {
            const { values } = JSON.parse(body) as { values: Record<string, unknown> };
            let text = readFileSync(file, 'utf8');
            for (const [key, value] of Object.entries(values)) {
              const k = ALL_FLAME_KEYS.find((f) => f.key === key);
              if (!k) throw new Error(`not a flame value: ${key}`);
              let written: string;
              if (k.kind === 'number' && typeof value === 'number' && Number.isFinite(value)) written = String(value);
              else if (k.kind === 'colour' && typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)) written = `'${value.toLowerCase()}'`;
              else if (k.kind === 'on' && typeof value === 'boolean') written = String(value);
              else throw new Error(`bad value for ${key}`);
              const line = new RegExp(`^(  ${key}: )[^,\n]+,`, 'm');
              if (!line.test(text)) throw new Error(`${key} not found in settings.ts`);
              text = text.replace(line, `$1${written},`);
            }
            wroteAt = Date.now();
            writeFileSync(file, text);
            reply(200, JSON.stringify({ saved: Object.keys(values).length }));
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
    savedFlames(),
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
