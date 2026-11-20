/**
 * tools.html: every editor and test page of this version, by category (plan flight-shots.md, pass 0).
 * Dev only (owner, 2026-11-20): served by the dev server, not a build input (the build takes index.html
 * only), and it refuses to draw outside `import.meta.env.DEV`. Never linked from the game.
 * Gamepad: D-pad (or the left stick) up/down moves, A opens. Keyboard: arrows and Enter; the mouse clicks.
 * A page added: one line in TOOLS. Each page but the game has a "← Tools" link back.
 */

interface Tool {
  /** The link's text. */
  name: string;
  /** Where it goes (null: not built yet, shown greyed). */
  href: string | null;
  /** One line on what it's for. */
  about: string;
}

/** Category → its pages, in order. */
const TOOLS: Record<string, Tool[]> = {
  Scenery: [{ name: 'Planet', href: '/planet.html', about: 'The planet seen from space (scene 0050): look, presets.' }],
  Materials: [{ name: 'Water and ice', href: '/water-test.html', about: 'The pond water and the ice shaders, on a test page (SC-181).' }],
  Sound: [
    { name: 'Synth', href: '/synth.html', about: 'Sounds made in code: the temple light’s patch.' },
    { name: 'Scanner synth', href: '/scanner-synth.html', about: 'The scanner’s sound: hold to play, as R1 in the game.' },
  ],
  Cutscenes: [{ name: 'Shot editor', href: null, about: 'Flybys, landings, take-offs: pick seeds, save named shots (flight shots, pass 2).' }],
  'The game': [
    { name: 'New game', href: '/', about: 'From the start: the animatic, then chapter 1.' },
    { name: '0050 · Planet', href: '/?scene=0050', about: 'The animatic from the planet shot.' },
    { name: '0100 · Cutscene 1', href: '/?scene=0100', about: 'The animatic from cutscene 1.' },
    { name: '0200 · Opening', href: '/?scene=0200', about: 'Cutscene 2, then chapter 1.' },
    { name: '0300 · Chapter 1', href: '/?scene=0300', about: 'In flight, playable.' },
    { name: '0400 · Flyby', href: '/?scene=0400', about: 'The flyby, then the conversation.' },
    { name: '0500 · What’s that', href: '/?scene=0500', about: 'The conversation at once (all seated).' },
    { name: '0600 · Landing', href: '/?scene=0600', about: 'The landing cutscene, then the landed scene.' },
    { name: '0700 · Landed', href: '/?scene=0700', about: 'Parked on the plain, playable.' },
    { name: 'Test scene', href: '/?test', about: 'The checks’ game (saving on).' },
  ],
};

/** The last link opened, so "← Tools" comes back to it. */
const KEY = 'zamboni-tools-selected';

function draw(root: HTMLElement): HTMLAnchorElement[] {
  const links: HTMLAnchorElement[] = [];
  for (const [category, tools] of Object.entries(TOOLS)) {
    const section = root.appendChild(document.createElement('section'));
    section.appendChild(document.createElement('h2')).textContent = category;
    for (const tool of tools) {
      const row = section.appendChild(document.createElement('div'));
      row.className = 'row';
      if (tool.href) {
        const a = row.appendChild(document.createElement('a'));
        a.href = tool.href;
        a.textContent = tool.name;
        a.addEventListener('click', () => sessionStorage.setItem(KEY, tool.href!));
        a.addEventListener('focus', () => select(links.indexOf(a)));
        links.push(a);
      } else {
        const span = row.appendChild(document.createElement('span'));
        span.className = 'later';
        span.textContent = `${tool.name} (not built yet)`;
      }
      row.appendChild(document.createElement('small')).textContent = tool.about;
    }
  }
  return links;
}

let links: HTMLAnchorElement[] = [];
/** The selected link's index: marked by a class, not :focus (Chrome drops :focus while the window isn't focused). */
let selected = 0;

function select(index: number): void {
  if (index < 0 || index === selected && links[index]?.classList.contains('selected')) return;
  selected = index;
  links.forEach((a, i) => a.classList.toggle('selected', i === index));
  links[index]?.focus();
}

/** Moves the selection with the D-pad or the left stick; A opens the selected link. */
function padNavigation(): void {
  const held = { up: false, down: false, a: false };
  const at = () => selected;
  const step = (by: number) => select((at() + by + links.length) % links.length);
  const frame = () => {
    let up = false, down = false, a = false;
    for (const pad of navigator.getGamepads?.() ?? []) {
      if (!pad) continue;
      up ||= !!pad.buttons[12]?.pressed || (pad.axes[1] ?? 0) < -0.6;
      down ||= !!pad.buttons[13]?.pressed || (pad.axes[1] ?? 0) > 0.6;
      a ||= !!pad.buttons[0]?.pressed;
    }
    if (up && !held.up) step(-1);
    if (down && !held.down) step(1);
    if (a && !held.a) links[at()]?.click();
    Object.assign(held, { up, down, a });
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      step(e.key === 'ArrowDown' ? 1 : -1);
    }
  });
}

const root = document.getElementById('tools')!;
if (!import.meta.env.DEV) {
  root.textContent = 'The tools page runs on the dev server only.';
} else {
  links = draw(root);
  const last = sessionStorage.getItem(KEY);
  select(Math.max(0, links.findIndex((a) => a.getAttribute('href') === last)));
  padNavigation();
}
