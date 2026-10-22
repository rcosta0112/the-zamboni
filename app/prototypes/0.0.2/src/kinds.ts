// The kinds of things in the ship: what each one is and its defaults, defined once here. The file
// carries each instance's `kind` and `id` (and its geometry: a door's axis and angle, how far a sliding
// door moves); behaviour comes from here. The other kinds (keypads, the ladder, the rack…) have no
// defaults yet: their features find their things by kind (entities.ts, `ofKind`).
// Plan: doc/plans/architecture/game-architecture/game-structure.md

/** How a door's sounds go (doors.ts, `createDoorSounds`). */
export type DoorSound =
  /** A small door (lockers, the fridge, the cupboard): a latch when it opens and when it shuts. */
  | 'latch'
  /** A hatch (the floor hatch, the roof hatch): the same, lower. */
  | 'hatch'
  /** Down to the ground (the side door, the ramp): a motor while it moves, a stop when it gets there. */
  | 'motor'
  /** A slide when it starts to move. */
  | 'slide'
  /** None of its own: the handle of a device (the lever), which has the sound. */
  | 'none';

export interface DoorKind {
  /** It turns on a hinge, or slides. */
  moves: 'hinge' | 'slide';
  sound: DoorSound;
  /** Opens down until it rests on the ground: fully open, a walkable slope stands in for it. */
  toGround: boolean;
  /** Opens when she's near, closes when she leaves (unless shut from a panel). */
  auto: boolean;
}

const door = (moves: DoorKind['moves'], sound: DoorSound, more: Partial<DoorKind> = {}): DoorKind => ({ moves, sound, toGround: false, auto: false, ...more });

export const DOOR_KINDS = {
  door: door('hinge', 'latch'),
  hatch: door('hinge', 'hatch'),
  'drop-door': door('hinge', 'motor', { toGround: true }),
  'sliding-door': door('slide', 'slide', { auto: true }),
  'sliding-window': door('slide', 'slide'),
  'lever-handle': door('slide', 'none'),
} satisfies Record<string, DoorKind>;

/** What she uses to open something else (`controls`): a keypad, a bulkhead door's panel, the window's lever. */
export const DEVICE_KINDS = ['keypad', 'door-panel', 'lever'] as const;

/** Things with no action of their own: used only when the story has their `use_<id>` (the pilot's seat). */
export const STORY_KINDS = ['seat'] as const;

/** The kinds without defaults: their features find them by kind. */
const OTHER_KINDS = ['character', 'ramp', ...DEVICE_KINDS, ...STORY_KINDS, 'ladder', 'jetpack', 'jetpack-rack', 'boombox', 'outfit', 'clothes', 'hanger'] as const;

export type DoorKindName = keyof typeof DOOR_KINDS;
export type Kind = DoorKindName | (typeof OTHER_KINDS)[number];

export function isKind(kind: string): kind is Kind {
  return kind in DOOR_KINDS || (OTHER_KINDS as readonly string[]).includes(kind);
}

export function isDeviceKind(kind: unknown): kind is (typeof DEVICE_KINDS)[number] {
  return (DEVICE_KINDS as readonly unknown[]).includes(kind);
}

export function isStoryKind(kind: unknown): kind is (typeof STORY_KINDS)[number] {
  return (STORY_KINDS as readonly unknown[]).includes(kind);
}

export function isDoorKind(kind: string): kind is DoorKindName {
  return kind in DOOR_KINDS;
}
