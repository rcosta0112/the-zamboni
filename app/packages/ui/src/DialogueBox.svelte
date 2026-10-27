<!--
  The dialogue box (placeholder, owner 2026-10-21): a solid white rectangle low in the middle of the
  screen, the speaker's name at its top left, the line typed out, and a small button prompt at its
  bottom right saying what the button does now (Skip, Next, End). Every character is laid out from
  the start and the untyped ones are transparent, so line breaks never move (as the Design
  Challenge's Typewriter.svelte). Topics (owner, 2026-10-22): her lines to choose from, in the box in
  place of the line, under her name, the selected one marked; shown at once, never typed. The game drives it: `show(view)` each time something changes,
  `show(null)` to take it away. Sizes in --ui-unit, one pixel of a 1440 × 1024 frame scaled to fit
  the window, as the start screen's: about 45% × 17% of a 16:9 window.
  Plan: doc/plans/features/dialogue.md
-->
<script module lang="ts">
  export interface DialogueView {
    /** Who's talking (null: narration, no name). */
    speaker: string | null;
    text: string;
    /** How many characters of `text` are shown. */
    typed: number;
    /** What the button does now. */
    action: 'Skip' | 'Next' | 'End' | 'Choose';
    /** The button, as the last device used names it (E, ◯). */
    glyph: string;
    /** Her lines to choose from, shown in place of `text` (none: the line). */
    topics: string[];
    /** The selected topic's index. */
    selected: number;
  }
</script>

<script lang="ts">
  let view = $state<DialogueView | null>(null);
  const chars = $derived(view ? [...view.text] : []);

  export function show(next: DialogueView | null): void {
    view = next;
  }
</script>

{#if view}
  <div class="box" role="dialog" aria-live="polite">
    {#if view.speaker}<div class="speaker">{view.speaker}</div>{/if}
    {#if view.topics.length > 0}
      <ul class="topics" class:four={view.topics.length > 3} role="listbox" aria-label="Topics">
        {#each view.topics as topic, i (i)}
          <li role="option" aria-selected={i === view.selected} class:selected={i === view.selected}>{topic}</li>
        {/each}
      </ul>
    {:else}
      <p class="text">
        <span class="sr-only">{view.text}</span>
        <!-- New spans for each line: reused ones would fade out from the last line's full opacity, a flash. -->
        {#key view.text}<span aria-hidden="true">{#each chars as char, i (i)}<span class:untyped={i >= view.typed}>{char}</span>{/each}</span>{/key}
      </p>
    {/if}
    <div class="prompt"><span class="glyph">{view.glyph}</span>{view.action}</div>
  </div>
{/if}

<style>
  .box {
    --ui-unit: min(100vw / 1440, 100vh / 1024);
    position: fixed;
    left: 50%;
    bottom: calc(30 * var(--ui-unit));
    transform: translateX(-50%);
    box-sizing: border-box;
    width: calc(790 * var(--ui-unit));
    height: calc(170 * var(--ui-unit));
    padding: calc(20 * var(--ui-unit)) calc(28 * var(--ui-unit));
    background: var(--color-white);
    border-radius: calc(16 * var(--ui-unit));
    color: var(--color-ink);
    font-family: var(--font-text);
    pointer-events: none;
  }

  .speaker {
    font-weight: 700;
    font-size: calc(24 * var(--ui-unit));
    line-height: 1.1;
    margin-bottom: calc(6 * var(--ui-unit));
  }

  .text {
    margin: 0;
    font-weight: 400;
    font-size: calc(26 * var(--ui-unit));
    line-height: 1.25;
  }

  .untyped {
    opacity: 0;
  }

  .text span span {
    transition: opacity 80ms linear;
  }

  .prompt {
    position: absolute;
    right: calc(20 * var(--ui-unit));
    bottom: calc(14 * var(--ui-unit));
    display: flex;
    align-items: center;
    gap: calc(8 * var(--ui-unit));
    font-size: calc(18 * var(--ui-unit));
    line-height: 1;
    opacity: 0.75;
  }

  .glyph {
    display: grid;
    place-content: center;
    min-width: calc(24 * var(--ui-unit));
    height: calc(24 * var(--ui-unit));
    padding: 0 calc(4 * var(--ui-unit));
    box-sizing: border-box;
    border: var(--line) solid currentColor;
    border-radius: calc(6 * var(--ui-unit));
    font-weight: 700;
    font-size: calc(15 * var(--ui-unit));
  }

  /* Her lines, as the text's size; three fit the box's height, a fourth a little tighter. */
  .topics {
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: calc(24 * var(--ui-unit));
    line-height: 1.2;
  }

  .topics.four {
    font-size: calc(21 * var(--ui-unit));
    line-height: 1.1;
  }

  .topics li {
    position: relative;
    padding-left: calc(24 * var(--ui-unit));
    opacity: 0.55;
  }

  .topics li.selected {
    opacity: 1;
  }

  .topics li.selected::before {
    content: '▸';
    position: absolute;
    left: 0;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
</style>
