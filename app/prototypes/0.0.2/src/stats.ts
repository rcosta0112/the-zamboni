// Frame-rate readout: average and worst frame time over the last half second, the
// rendering backend (WebGPU or WebGL2) and the render size.

export class Stats {
  private el: HTMLElement;
  private frames = 0;
  private elapsed = 0;
  private worst = 0;

  constructor(
    el: HTMLElement,
    private backend: string,
  ) {
    this.el = el;
  }

  frame(dt: number, width: number, height: number): void {
    this.frames++;
    this.elapsed += dt;
    this.worst = Math.max(this.worst, dt);
    if (this.elapsed < 0.5) return;

    const avgMs = (this.elapsed / this.frames) * 1000;
    this.el.textContent =
      `${(1000 / avgMs).toFixed(0)} fps  ${avgMs.toFixed(1)} ms  (worst ${(this.worst * 1000).toFixed(1)} ms)\n` +
      `${this.backend}  ${width}×${height}`;
    this.frames = 0;
    this.elapsed = 0;
    this.worst = 0;
  }
}
