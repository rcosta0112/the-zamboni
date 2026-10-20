<!--
  A button: an outlined base with an outlined body standing a little above it. The states follow
  Eigodojo's AnswerButton (default, hover, active), in the Zamboni mockup's colours: white
  outlines, a white tint for hover. Active as drawn in the Zamboni mockup (*Start Button*): the
  base's outline goes and the body comes down to the bottom, with no fill. There's no disabled state
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
    /* Whole pixels, so the outlines are crisp. */
    width: round(calc(226 * var(--ui-unit)), 1px);
    height: round(calc(55 * var(--ui-unit)), 1px);
    margin: 0;
    padding: 0;
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
      top var(--time-press) ease-out,
      bottom var(--time-press) ease-out,
      background-color var(--time-press) ease-out;
  }

  .button:hover .body,
  .button.highlighted .body {
    background-color: var(--color-fill-hover);
  }

  /* Pressed (the mockup's *Star Button Active*): the base's outline goes, and the body, the same
     size, comes down to the bottom, leaving the background showing above it. No fill. Placed by its
     insets, not a transform: the browser rounds both to the same pixels, so the bottom lines of
     the two states fall on the same row (a transformed body was a pixel off at some scales). */
  /* The base's bottom stays (the body's bottom line lands on it), and its top and sides go only
     when the body has landed: gone at once, they left the bottom edge without a line while the
     body moved (a flash). Released, the outline is back at once. */
  .button:active,
  .button.pressed {
    border-top-color: transparent;
    border-left-color: transparent;
    border-right-color: transparent;
    transition: border-color 0s var(--time-press);
  }

  .button:active .body,
  .button.pressed .body {
    top: var(--control-depth);
    bottom: calc(-1 * var(--line));
    background-color: transparent;
  }
</style>
