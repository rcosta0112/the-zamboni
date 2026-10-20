// The story (Ink, through inkjs): the one place story state lives (doc/architecture/README.md,
// *Systems*). The game reads its variables (a scene's commands with `if` / `unless`), sets them, and
// runs a knot when something the story cares about is used (`use_<id>`, dashes as underscores); the
// knots act on the game through the external function `command(name, id, value)`, which runs one of
// the commands (commands.ts). No dialogue on screen yet: a knot's lines go to the console.
// The slice's story is a test one, `public/test/story.ink` (compiled by `npm run ink`).
// Plan: doc/plans/architecture/game-architecture/game-structure.md (pass 3)

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

export class GameStory {
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

  /** The knot run when the thing with this id is used, if the story has one. */
  useKnot(id: string): string | null {
    const knot = `use_${id.replaceAll('-', '_')}`;
    return this.ink.KnotContainerWithName(knot) ? knot : null;
  }

  /** A knot's `# key: value` tag (its first lines' tags), e.g. `verb`. */
  tag(knot: string, key: string): string | null {
    for (const tag of this.ink.TagsForContentAtPath(knot) ?? []) {
      const [k, ...rest] = tag.split(':');
      if (k!.trim() === key) return rest.join(':').trim();
    }
    return null;
  }

  /** Runs a knot to its end; its lines go to the console (no dialogue yet). */
  run(knot: string): void {
    this.ink.ChoosePathString(knot);
    while (this.ink.canContinue) {
      const line = this.ink.Continue()?.trim();
      if (line) console.info(`[0.0.2] ink: ${line}`);
    }
    if (this.ink.currentChoices.length > 0) console.warn(`[0.0.2] ink: "${knot}" offers choices (no dialogue yet)`);
  }
}
