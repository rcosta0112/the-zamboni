// A scene's `whenClosed` (scenes.ts): something to do each time a door is closed, and once the
// conversation that starts ends. Chapter 1 (owner, 2026-11-20, the 0300 scene file): the player
// closes the viewport (engineering's window), Dr. Ogawa asks for it open, and it opens again once his
// lines are over. Every time, not once.

import type { Command } from './commands';
import { Door } from './doors';
import type { Entities } from './entities';

export interface WhenClosed {
  /** The door watched (the viewport: `engineering-window-left`; its other half and its lever move with it). */
  id: string;
  /** Run once it has finished closing (a `story` command: the lines). */
  do: Command[];
  /** Run once the conversation `do` started is over (or at once, if nothing was said). */
  then?: Command[];
}

type State = 'unknown' | 'open' | 'closing' | 'talking';

export class ClosedWatch {
  private rules: readonly WhenClosed[] = [];
  private states: State[] = [];

  constructor(
    private readonly entities: Entities,
    private readonly run: (command: Command) => void,
  ) {}

  /** Per frame: the scene's rules (a new list, a new scene: watched afresh), and whether a conversation is on. */
  update(rules: readonly WhenClosed[] | undefined, talking: boolean): void {
    rules ??= [];
    if (rules !== this.rules) {
      this.rules = rules;
      this.states = rules.map(() => 'unknown');
    }
    rules.forEach((rule, i) => {
      const door = this.entities.get(rule.id)?.find((c): c is Door => c instanceof Door);
      if (!door) return;
      switch (this.states[i]) {
        case 'unknown':
          if (door.open) this.states[i] = 'open';
          return;
        case 'open':
          if (!door.open) this.states[i] = 'closing';
          return;
        case 'closing':
          // Opened again on its way: nothing happens.
          if (door.open) this.states[i] = 'open';
          else if (!door.moving) {
            this.states[i] = 'talking';
            for (const command of rule.do) this.run(command);
          }
          return;
        case 'talking':
          if (talking) return;
          this.states[i] = 'unknown';
          for (const command of rule.then ?? []) this.run(command);
          return;
      }
    });
  }
}
