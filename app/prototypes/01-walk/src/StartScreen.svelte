<!--
  The start screen: the mockup's layout (Figma, "The Zamboni", Desktop - 4), covering the 3D view.
  A progress bar while the game loads, then the start button in its place. Everything is placed on
  the mockup's 1440 × 1024 frame, which is scaled to fit the window (--ui-unit: one mockup pixel).
  The button is used with a click, Enter or Space, or any gamepad button (main.ts calls `press`:
  the gamepad is read in the frame loop).
  Plan: doc/plans/features/start-screen.md
-->
<script lang="ts">
  import { fade } from 'svelte/transition';
  import { Button, ProgressBar } from '@zamboni/ui';

  interface Props {
    /** The button was used. `byPointer`: with a click or a touch (then the mouse can be captured). */
    onstart: (byPointer: boolean) => void;
  }
  let { onstart }: Props = $props();

  let progress = $state(0);
  let ready = $state(false);
  let used = $state(false);
  let pressed = $state(false);
  let leaving = $state(false);
  // With a gamepad or the keyboard the button is always the one they're on: it looks hovered until
  // the mouse moves.
  let highlighted = $state(true);

  /** How long the button stays down when a key or a gamepad button uses it (ms). */
  const PRESS = 120;

  /** The share of the load that's done, 0..1. */
  export function setProgress(share: number): void {
    progress = share;
  }

  /** Everything is loaded: the button takes the bar's place. */
  export function setReady(): void {
    ready = true;
  }

  /** A key or a gamepad button uses the button: it goes down, then the game starts. */
  export function press(): void {
    if (!ready || used) return;
    used = true;
    highlighted = true;
    pressed = true;
    setTimeout(() => leave(false), PRESS);
  }

  function click(event: MouseEvent): void {
    // A click made by Enter or Space on the focused button has no detail: `press` has it already.
    if (!ready || used || event.detail === 0) return;
    used = true;
    leave(true);
  }

  function leave(byPointer: boolean): void {
    leaving = true;
    onstart(byPointer);
  }

  function keydown(event: KeyboardEvent): void {
    if (event.repeat) return;
    highlighted = true;
    if (event.code === 'Enter' || event.code === 'NumpadEnter' || event.code === 'Space') press();
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
    <div class="control">
      {#if ready}
        <div class="slot" in:fade={{ duration: 300 }}>
          <Button {highlighted} {pressed} onclick={click}>START</Button>
        </div>
      {:else}
        <div class="slot" out:fade={{ duration: 300 }}>
          <ProgressBar value={progress} />
        </div>
      {/if}
    </div>
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

  /* Where the mockup's button is, but centred: there it's 17 px left of the title's centre. */
  .control {
    position: absolute;
    left: 50%;
    top: calc(674 * var(--ui-unit));
    width: calc(226 * var(--ui-unit));
    height: calc(55 * var(--ui-unit));
    translate: -50% 0;
  }

  /* The bar going and the button coming are both there for a moment: one over the other. */
  .slot {
    position: absolute;
    inset: 0;
  }
</style>
