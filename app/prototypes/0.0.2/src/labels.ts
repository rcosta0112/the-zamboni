// What the prompts call the ship's things (owner, 2026-10-21: every prompt names what it acts on,
// "Open fridge", "Open Dr. Kaufman's locker"): by id, or by kind when the id isn't listed. A door's
// panel or keypad names the door it opens. Sentence case: "Open cockpit door".
// The crew's names are in story.ts (`displayName`). A `use_<id>` knot's `# verb:` tag is the whole
// prompt, name included.

const BY_ID: Record<string, string> = {
  'cargo-ramp': 'ramp',
  'side-door': 'side door',
  'cockpit-door-right': 'cockpit door',
  'engineering-door-right': 'engineering door',
  'engineering-window-left': 'window',
  'top-hatch-lower': 'roof hatch',
  'floor-hatch': 'trapdoor',
  'crew-locker-door-1': 'locker',
  'crew-locker-door-2': "Dr. Kaufman's locker",
  'cargo-locker-door': "Dr. Ogawa's locker",
  'galley-door-1': 'fridge',
  'galley-door-2': 'fridge',
  'galley-door-3': 'cupboard',
};

const BY_KIND: Record<string, string> = {
  hatch: 'hatch',
  ladder: 'ladder',
};

/** The thing's name in a prompt; "door" when nothing says otherwise. */
export function labelOf(id: string | undefined, kind?: string): string {
  return (id && BY_ID[id]) || (kind && BY_KIND[kind]) || 'door';
}
