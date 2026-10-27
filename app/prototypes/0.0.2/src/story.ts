// The story (Ink, through inkjs): the one place story state lives (doc/architecture/README.md,
// *Systems*). The game reads its variables (a scene's commands with `if` / `unless`), sets them, and
// runs a knot when something the story cares about is used (`use_<id>`, dashes as underscores); the
// knots act on the game through the external function `command(name, id, value)`, which runs one of
// the commands (commands.ts). A knot's lines go to the dialogue box (`onLines`, dialogue.ts), each
// with its speaker (the name before a colon, as the script is written); talking to a character runs
// `talk_<id>`. Ink's choices are the conversation's topics (owner, 2026-10-22): a knot runs up to its
// choices, the box shows them, and the one picked (`choose`) runs on to the next ones or the end.
// The game's story is `public/story/story.ink` (the owner's lines, copied from the scene files);
// the checks' is `public/test/story.ink` (`?test`, main.ts); both compiled by `npm run ink`. Its whole
// state is what a save keeps of the story (save.ts).
// Plans: doc/plans/architecture/game-architecture/game-structure.md (passes 3, 4),
// doc/plans/features/dialogue.md (passes 1, 2, topics)

import { Story } from 'inkjs';
import type { Command } from './commands';

/** Ink's `command(name, id, value)` as one of the commands: `value` is a `set`'s state, a `sound`'s cue. */
function fromInk(name: string, id: string, value: string): Command | null {
  switch (name) {
    case 'set':
      return value === 'open' || value === 'closed' ? { do: 'set', id, state: value } : null;
    case 'lock':
    case 'unlock':
    case 'enable':
    case 'disable':
    case 'cutscene':
      return { do: name, id };
    case 'sound':
      return { do: 'sound', cue: value as Extract<Command, { do: 'sound' }>['cue'], ...(id ? { at: id } : {}) };
    default:
      return null;
  }
}

/** A line of a knot: who says it (null: narration) and what. */
export interface Line {
  speaker: string | null;
  /** The speaker's character id (null: narration): a watched conversation's camera finds them by it. */
  id: string | null;
  text: string;
}

/** The characters' names on screen, by id: the prompt's *Talk to* and the box's speaker. */
const DISPLAY_NAMES: Record<string, string> = {
  green: 'Dr. Green',
  kaufman: 'Dr. Kaufman',
  ogawa: 'Dr. Ogawa',
  'adam-red': 'Adam',
  'adam-blue': 'Adam',
};

/** The speakers as the script names them, to character ids. */
const SPEAKERS: Record<string, string> = {
  Green: 'green',
  Kaufman: 'kaufman',
  Ogawa: 'ogawa',
  'Adam Red': 'adam-red',
  'Adam Blue': 'adam-blue',
  Adam: 'adam-red',
};

/** A character's name on screen (its id if it has none). */
export function displayName(id: string): string {
  return DISPLAY_NAMES[id] ?? id;
}

/** `Name: text` as a line: a known speaker before the colon, or narration. */
function toLine(raw: string): Line {
  const colon = raw.indexOf(':');
  const id = colon > 0 ? SPEAKERS[raw.slice(0, colon).trim()] : undefined;
  return id ? { speaker: displayName(id), id, text: raw.slice(colon + 1).trim() } : { speaker: null, id: null, text: raw };
}

export class GameStory {
  /**
   * Where a knot's lines go (the dialogue box), up to its topics (the choices' text, none at its
   * end); none of either for a knot that says nothing. Not set, the console.
   */
  onLines: ((lines: Line[], topics: string[]) => void) | null = null;

  private constructor(private readonly ink: Story) {}

  /** The compiled story at `url`; `run` carries out the commands its knots call. */
  static async load(url: string, run: (command: Command) => void): Promise<GameStory> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`no story at ${url} (${response.status})`);
    const ink = new Story(await response.text());
    ink.onError = (message) => console.warn(`[0.0.2] ink: ${message}`);
    ink.BindExternalFunction('command', (name: string, id: string, value: string) => {
      const command = fromInk(name, id, value);
      if (command) run(command);
      else console.warn(`[0.0.2] ink: no command "${name}" (${id}, ${value})`);
    });
    return new GameStory(ink);
  }

  /** A story variable's value (undefined if there's none by that name). */
  get(name: string): unknown {
    return this.ink.variablesState.$(name) ?? undefined;
  }

  set(name: string, value: boolean | number | string): void {
    this.ink.variablesState.$(name, value);
  }

  /** Ink's whole state (variables, visited knots, where it is) as JSON: what a save keeps. */
  state(): string {
    return this.ink.state.ToJson();
  }

  /** Back to a saved state (`state()`'s JSON). */
  restore(json: string): void {
    this.ink.state.LoadJson(json);
  }

  /** Back to the story's start: a new game. */
  reset(): void {
    this.ink.ResetState();
  }

  /** The knot run when the thing with this id is used, if the story has one. */
  useKnot(id: string): string | null {
    return this.knot(`use_${id.replaceAll('-', '_')}`);
  }

  /** The knot run when she talks to the character with this id, if the story has one. */
  talkKnot(id: string): string | null {
    return this.knot(`talk_${id.replaceAll('-', '_')}`);
  }

  /** The knot by that name, if the story has one. */
  knot(name: string): string | null {
    return this.ink.KnotContainerWithName(name) ? name : null;
  }

  /** A knot's `# key: value` tag (its first lines' tags), e.g. `verb`. */
  tag(knot: string, key: string): string | null {
    for (const tag of this.ink.TagsForContentAtPath(knot) ?? []) {
      const [k, ...rest] = tag.split(':');
      if (k!.trim() === key) return rest.join(':').trim();
    }
    return null;
  }

  /** Runs a knot up to its topics or its end (its commands as they come): its lines to `onLines`. */
  run(knot: string): void {
    this.ink.ChoosePathString(knot);
    this.flow(knot);
  }

  /** The topic picked (an index into the last `onLines`' topics): runs on to the next ones or the end. */
  choose(index: number): void {
    this.ink.ChooseChoiceIndex(index);
    this.flow('a topic');
  }

  private flow(from: string): void {
    const lines: Line[] = [];
    while (this.ink.canContinue) {
      const raw = this.ink.Continue()?.trim();
      if (raw) lines.push(toLine(raw));
    }
    const topics = this.ink.currentChoices.map((choice) => choice.text.trim());
    if (this.onLines) this.onLines(lines, topics);
    else {
      for (const line of lines) console.info(`[0.0.2] ink: ${line.speaker ? `${line.speaker}: ` : ''}${line.text}`);
      if (topics.length > 0) console.warn(`[0.0.2] ink: ${from} offers topics, with no box to show them`);
    }
  }
}
