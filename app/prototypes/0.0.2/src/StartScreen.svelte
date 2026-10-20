<!--
  The start screen: the mockup's layout (Figma, "The Zamboni", Desktop - 4), covering the 3D view.
  A progress bar while the game loads, then the buttons in its place: START, or CONTINUE (the
  checkpoint save) above NEW GAME when there's a save. Everything is placed on the mockup's
  1440 × 1024 frame, which is scaled to fit the window (--ui-unit: one mockup pixel).
  A button is used with a click, or Enter or Space on the chosen one; the arrows (or W / S) choose.
  The gamepad: any button uses the chosen one, the D-pad or the left stick chooses (main.ts calls
  `press` and `move`: the gamepad is read in the frame loop).
  Plan: doc/plans/features/start-screen.md; *Continue*: doc/plans/architecture/game-architecture/game-structure.md (pass 4)
-->
<script module lang="ts">
  export type StartChoice = 'new' | 'continue';
</script>

<script lang="ts">
  import { fade } from 'svelte/transition';
  import { Button, ProgressBar } from '@zamboni/ui';

  interface Props {
    /** A button was used. `byPointer`: with a click or a touch (then the mouse can be captured). */
    onstart: (byPointer: boolean, choice: StartChoice) => void;
  }
  let { onstart }: Props = $props();

  let progress = $state(0);
  let ready = $state(false);
  let used = $state(false);
  let pressed = $state(false);
  let leaving = $state(false);
  // The buttons, top to bottom, and the one chosen (the first: CONTINUE when there's a save).
  let buttons = $state<{ choice: StartChoice; label: string }[]>([]);
  let chosen = $state(0);
  // With a gamepad or the keyboard the chosen button is the one they're on: it looks hovered until
  // the mouse moves.
  let highlighted = $state(true);

  /** How long the button stays down when a key or a gamepad button uses it (ms). */
  const PRESS = 120;

  /** The share of the load that's done, 0..1. */
  export function setProgress(share: number): void {
    progress = share;
  }

  /** Everything is loaded: the buttons take the bar's place. `canContinue`: there's a save. */
  export function setReady(canContinue: boolean): void {
    buttons = canContinue
      ? [
          { choice: 'continue', label: 'CONTINUE' },
          { choice: 'new', label: 'NEW GAME' },
        ]
      : [{ choice: 'new', label: 'START' }];
    chosen = 0;
    ready = true;
  }

  /** A key or a gamepad button uses the chosen button: it goes down, then the game starts. */
  export function press(): void {
    if (!ready || used) return;
    used = true;
    highlighted = true;
    pressed = true;
    setTimeout(() => leave(false, buttons[chosen]!.choice), PRESS);
  }

  /** Choose the button above (-1) or below (1). */
  export function move(step: number): void {
    if (!ready || used) return;
    highlighted = true;
    chosen = Math.min(buttons.length - 1, Math.max(0, chosen + step));
  }

  function click(event: MouseEvent, index: number): void {
    // A click made by Enter or Space on the focused button has no detail: `press` has it already.
    if (!ready || used || event.detail === 0) return;
    used = true;
    chosen = index;
    leave(true, buttons[index]!.choice);
  }

  function leave(byPointer: boolean, choice: StartChoice): void {
    leaving = true;
    onstart(byPointer, choice);
  }

  function keydown(event: KeyboardEvent): void {
    if (event.repeat) return;
    highlighted = true;
    if (event.code === 'Enter' || event.code === 'NumpadEnter' || event.code === 'Space') press();
    else if (event.code === 'ArrowUp' || event.code === 'KeyW') move(-1);
    else if (event.code === 'ArrowDown' || event.code === 'KeyS') move(1);
  }
</script>

<svelte:window onkeydown={keydown} onpointermove={() => (highlighted = false)} />

<div class="screen" class:leaving>
  <div class="pattern"></div>
  <div class="frame">
    <p class="series">Big Moon Tiny Moon</p>
    <h1 class="title">
      <span class="glow" aria-hidden="true">The Zamboni</span>
      <span class="face">The Zamboni</span>
      <span class="outline" aria-hidden="true">The Zamboni</span>
    </h1>
  </div>
  <div class="control">
      {#if ready}
        {#each buttons as button, i (button.choice)}
          <div class="slot" style:top="calc({i} * var(--button-step))" in:fade={{ duration: 300 }}>
            <Button highlighted={highlighted && i === chosen} pressed={pressed && i === chosen} onclick={(e) => click(e, i)}>{button.label}</Button>
          </div>
        {/each}
      {:else}
        <div class="slot" out:fade={{ duration: 300 }}>
          <ProgressBar value={progress} />
        </div>
      {/if}
  </div>
</div>

<style>
  .screen {
    --ui-unit: min(100vw / 1440, 100vh / 1024);
    position: fixed;
    inset: 0;
    overflow: hidden;
    background: var(--color-sky) url('/ui/start-background.png') center / cover no-repeat;
    color: var(--color-white);
    user-select: none;
    transition: opacity 600ms ease-out;
  }

  .screen.leaving {
    opacity: 0;
    pointer-events: none;
  }

  /* White lines on black, added to the blue under it. */
  .pattern {
    position: absolute;
    inset: 0;
    background: url('/ui/start-pattern.png') 0 0 / calc(600 * var(--ui-unit)) repeat;
    mix-blend-mode: screen;
    opacity: 0.24;
  }

  .frame {
    position: absolute;
    left: 50%;
    top: 50%;
    width: calc(1440 * var(--ui-unit));
    height: calc(1024 * var(--ui-unit));
    translate: -50% -50%;
  }

  .series,
  .title span {
    position: absolute;
    left: 50%;
    margin: 0;
    translate: -50% -50%;
    white-space: nowrap;
    line-height: normal;
  }

  .series {
    top: calc(428 * var(--ui-unit));
    font: 400 calc(36 * var(--ui-unit)) var(--font-text);
    letter-spacing: calc(10.8 * var(--ui-unit));
    /* The space after the last letter isn't part of the line in Figma: the letters are centred. */
    padding-left: calc(10.8 * var(--ui-unit));
  }

  .title {
    margin: 0;
    font: 400 calc(96 * var(--ui-unit)) var(--font-title);
  }

  .title .face {
    top: calc(511 * var(--ui-unit));
  }

  .title .glow {
    top: calc(520 * var(--ui-unit));
    margin-left: calc(2 * var(--ui-unit));
    color: var(--color-sky-deep);
    opacity: 0.5;
    filter: blur(calc(10.95 * var(--ui-unit)));
  }

  .title .outline {
    top: calc(519 * var(--ui-unit));
    margin-left: calc(6 * var(--ui-unit));
    color: transparent;
    opacity: 0.59;
    -webkit-text-stroke: var(--line) var(--color-white);
  }

  /* Where the mockup's button is, but centred: there it's 17 px left of the title's centre.
     Outside the frame (centred by a transform, so at a fraction of a pixel) and snapped to whole
     pixels, position and size, so its outlines are crisp: 674 is its top on the frame, 512 the
     frame's middle. */
  .control {
    position: absolute;
    left: round(calc(50% - 113 * var(--ui-unit)), 1px);
    top: round(calc(50% + (674 - 512) * var(--ui-unit)), 1px);
    width: round(calc(226 * var(--ui-unit)), 1px);
    height: round(calc(55 * var(--ui-unit)), 1px);
  }

  /* The bar going and the first button coming are both there for a moment: one over the other.
     A second button (NEW GAME) goes below the first: not in the mockup, a placeholder gap of 20. */
  .control {
    --button-step: round(calc(75 * var(--ui-unit)), 1px);
  }

  .slot {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    height: 100%;
  }
</style>
