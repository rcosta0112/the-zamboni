<!--
  A progress bar: a plain strip 4 px tall, filling from the left in the text's colour over a track a
  little darker than what's under it (owner, 2026-10-24, SC-135). As wide as its container: the
  screen places it (the start screen: along the window's bottom edge).
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
    width: 100%;
    height: 4px;
    overflow: clip;
    background-color: var(--color-track);
  }

  .fill {
    position: absolute;
    inset: 0;
    background-color: var(--color-white);
    transform-origin: left;
    transition: scale 200ms linear;
  }
</style>
