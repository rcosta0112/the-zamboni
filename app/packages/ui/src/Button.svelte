<!--
  A button: an outlined base with an outlined body standing a little above it. The states follow
  Eigodojo's AnswerButton (default, hover, active: the body goes down onto the base), in the
  Zamboni mockup's colours: white outlines, white tints for the fills. There's no disabled state
  yet: nothing shows a button that can't be used.
  `highlighted`: it looks hovered (the control a gamepad or the keyboard is on). `pressed`: it
  looks pressed (a gamepad button or a key is using it; the mouse does that by itself).
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    children: Snippet;
    highlighted?: boolean;
    pressed?: boolean;
    onclick?: (event: MouseEvent) => void;
  }
  let { children, highlighted = false, pressed = false, onclick }: Props = $props();
</script>

<button type="button" class="button" class:highlighted class:pressed {onclick}>
  <span class="body"><span class="label">{@render children()}</span></span>
</button>

<style>
  .button {
    position: relative;
    display: block;
    box-sizing: border-box;
    width: calc(226 * var(--ui-unit));
    height: calc(55 * var(--ui-unit));
    margin: 0;
    padding: 0;
    overflow: clip;
    border: var(--line) solid var(--color-white);
    border-radius: var(--radius-control);
    background: none;
    color: var(--color-white);
    font: 700 calc(24 * var(--ui-unit)) / 1 var(--font-text);
    cursor: pointer;
    outline: none;
    -webkit-tap-highlight-color: transparent;
  }

  /* Over the base's outline on three sides; short of its bottom by the button's depth. */
  .body {
    position: absolute;
    inset: calc(-1 * var(--line)) calc(-1 * var(--line)) var(--control-depth) calc(-1 * var(--line));
    display: grid;
    place-items: center;
    box-sizing: border-box;
    border: var(--line) solid var(--color-white);
    border-radius: var(--radius-control);
    transition:
      translate var(--time-press) ease-out,
      background-color var(--time-press) ease-out;
  }

  .button:hover .body,
  .button.highlighted .body {
    background-color: var(--color-fill-hover);
  }

  .button:active .body,
  .button.pressed .body {
    translate: 0 var(--control-depth);
    background-color: var(--color-fill-active);
  }
</style>
