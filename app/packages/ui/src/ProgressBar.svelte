<!--
  A progress bar: the button's outlined base, filling from the left. The same size as a Button, so
  one can take the other's place without anything moving. Not in the mockups: proposed with the
  start screen (doc/plans/features/start-screen.md).
  `value`: 0..1.
-->
<script lang="ts">
  interface Props {
    value: number;
    label?: string;
  }
  let { value, label = 'Loading' }: Props = $props();
  const share = $derived(Math.min(1, Math.max(0, value)));
</script>

<div class="bar" role="progressbar" aria-label={label} aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(share * 100)}>
  <div class="fill" style:scale="{share} 1"></div>
</div>

<style>
  .bar {
    position: relative;
    box-sizing: border-box;
    width: calc(226 * var(--ui-unit));
    height: calc(55 * var(--ui-unit));
    overflow: clip;
    border: var(--line) solid var(--color-white);
    border-radius: var(--radius-control);
  }

  .fill {
    position: absolute;
    inset: 0;
    background-color: var(--color-fill-active);
    transform-origin: left;
    transition: scale 200ms linear;
  }
</style>
