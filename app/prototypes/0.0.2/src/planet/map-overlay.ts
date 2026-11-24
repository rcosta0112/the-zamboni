// The planet map's 2D overlay (plan doc/plans/features/non-linear-travel/planet-map-page.md, step 3), drawn on a
// canvas over the map's material, in the same green:
// - the **grid**, its spacing by zoom: 16° (`010`) zoomed out, 4° in the middle, 1° at the quadrant step.
//   Meridians stop at the parallel nearest each pole (planet-map.md: the quadrants there are thin);
// - **sector names, like a chart's coordinates**: each parallel's (north–south) where it crosses the screen's left
//   edge, each meridian's (east–west) where it crosses the top edge; turned (heading up), a line that misses its
//   edge takes the other one. None on the whole globe (owner, 2026-11-24). A name that would cover another is
//   skipped;
//   - at the quadrant step, **each quadrant's name in its cell**;
// - **marks**: waypoints ○, signals □, visited sites × (placeholders);
// - **the ship**, a triangle along its heading;
// - **a border** round the screen, in the line colour (owner, 2026-11-24: 2 px).
// Sizes follow the canvas's height, so it reads the same on the page and on the station's screen.

import { hex3, quadrantName, travel, type MapView, type PlanetMap } from './map';

export type MarkKind = 'waypoint' | 'signal' | 'visited';

export interface MapMark {
  kind: MarkKind;
  northSouth: number;
  eastWest: number;
}

export interface MapOverlay {
  view: MapView;
  /** The line colour (sRGB hex), the map's. */
  colour: string;
  /** The grid's brightness, 0..1. */
  grid: number;
  /** The icons' line width, in canvas pixels. */
  lineWidth: number;
  /** The border round the screen, in canvas pixels (0: none). */
  border: number;
  ship?: { northSouth: number; eastWest: number; heading: number };
  marks: readonly MapMark[];
}

/** The grid's spacing in degrees at a zoom (the screen's width in degrees): about four lines across. */
export function gridSpacing(width: number): number {
  return width >= 64 ? 16 : width >= 16 ? 4 : 1;
}

/** At this screen width or less, each quadrant's name is written in its cell. */
export const QUADRANT_NAMES_WIDTH = 2;

const DEG = Math.PI / 180;

type Point = { x: number; y: number };
type Box = { x: number; y: number; w: number; h: number };

export function drawMapOverlay(ctx: CanvasRenderingContext2D, map: PlanetMap, o: MapOverlay): void {
  const w = ctx.canvas.width, h = ctx.canvas.height;
  ctx.clearRect(0, 0, w, h);
  const { view } = o;
  const whole = view.width >= 180;
  const spacing = gridSpacing(view.width);

  // What's worth drawing: the whole sphere zoomed out; zoomed in, `reach` degrees around the centre (more than
  // the screen's corners), the east–west reach widened by the parallels' shrinking towards the poles.
  const reach = whole ? 180 : view.width;
  const nsMin = whole ? 0 : Math.max(0, view.northSouth - reach);
  const nsMax = whole ? 180 : Math.min(180, view.northSouth + reach);
  const poleGap = Math.min(nsMin, 180 - nsMax);
  const ewReach = whole || poleGap <= 0 ? 180 : Math.min(180, reach / Math.sin(poleGap * DEG));
  const sample = whole ? 2 : view.width / 32;

  const at = (ns: number, ew: number): Point | null => {
    const p = map.project(ns, ew);
    return p && { x: p.x * w, y: p.y * h };
  };
  /** A line through positions, as runs of screen points (broken where it goes round the far side). */
  const trace = (from: number, to: number, place: (t: number) => [number, number]): Point[][] => {
    const runs: Point[][] = [];
    let run: Point[] | null = null;
    const n = Math.max(1, Math.ceil((to - from) / sample));
    for (let i = 0; i <= n; i++) {
      const [ns, ew] = place(from + ((to - from) * i) / n);
      const p = at(ns, ew);
      if (!p) {
        run = null;
        continue;
      }
      if (!run) runs.push((run = []));
      run.push(p);
    }
    return runs;
  };

  const fontSize = Math.round(Math.max(10, h * 0.03));
  const pad = Math.max(2, Math.round(fontSize * 0.3));
  ctx.font = `${fontSize}px ui-monospace, Consolas, monospace`;
  ctx.lineJoin = 'round';

  // The grid.
  const parallels: { value: number; runs: Point[][] }[] = [];
  const meridians: { value: number; runs: Point[][] }[] = [];
  for (let ns = Math.ceil(nsMin / spacing) * spacing; ns <= nsMax; ns += spacing) {
    if (ns <= 0 || ns >= 180) continue; // the poles are points
    parallels.push({ value: ns, runs: trace(view.eastWest - ewReach, view.eastWest + ewReach, (ew) => [ns, ew]) });
  }
  const ewFirst = ewReach >= 180 ? 0 : Math.ceil((view.eastWest - ewReach) / spacing) * spacing;
  const ewLast = ewReach >= 180 ? 360 - spacing : view.eastWest + ewReach;
  const mFrom = Math.max(nsMin, spacing), mTo = Math.min(nsMax, 180 - spacing);
  for (let ew = ewFirst; ew <= ewLast; ew += spacing) {
    if (mTo > mFrom) meridians.push({ value: ((ew % 360) + 360) % 360, runs: trace(mFrom, mTo, (ns) => [ns, ew]) });
  }
  ctx.strokeStyle = o.colour;
  ctx.globalAlpha = o.grid;
  ctx.lineWidth = Math.max(1, o.lineWidth * 0.6);
  ctx.beginPath();
  for (const line of [...parallels, ...meridians]) {
    for (const run of line.runs) {
      run.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    }
  }
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Each quadrant's name in its cell, at the closest step.
  if (view.width <= QUADRANT_NAMES_WIDTH) {
    ctx.fillStyle = o.colour;
    ctx.globalAlpha = 0.6;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const ewCells = Math.min(180, reach / Math.max(Math.sin(Math.max(poleGap, 0.5) * DEG), 1e-3));
    const cell = w / view.width; // a degree on the screen, about
    for (let ns = Math.floor(nsMin); ns < Math.ceil(nsMax); ns++) {
      for (let ew = Math.floor(view.eastWest - ewCells); ew < view.eastWest + ewCells; ew++) {
        const p = at(ns + 0.5, ew + 0.5);
        if (!p) continue;
        // A cell cut by the screen's edge: its name moved into the screen, if it stays in the cell.
        const text = quadrantName(ns, ew);
        const half = ctx.measureText(text).width / 2 + pad;
        const x = Math.min(w - half, Math.max(half, p.x));
        const y = Math.min(h - fontSize / 2 - pad, Math.max(fontSize / 2 + pad, p.y));
        if (Math.abs(x - p.x) < cell * 0.4 && Math.abs(y - p.y) < cell * 0.4) ctx.fillText(text, x, y);
      }
    }
    ctx.globalAlpha = 1;
  }

  // The marks and the ship, at full brightness.
  const size = Math.max(6, h * 0.018);
  ctx.lineWidth = Math.max(1, o.lineWidth);
  for (const mark of o.marks) {
    const p = at(mark.northSouth, mark.eastWest);
    if (!p) continue;
    ctx.beginPath();
    if (mark.kind === 'waypoint') ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
    else if (mark.kind === 'signal') ctx.rect(p.x - size * 0.85, p.y - size * 0.85, size * 1.7, size * 1.7);
    else {
      const s = size * 0.8;
      ctx.moveTo(p.x - s, p.y - s);
      ctx.lineTo(p.x + s, p.y + s);
      ctx.moveTo(p.x + s, p.y - s);
      ctx.lineTo(p.x - s, p.y + s);
    }
    ctx.stroke();
  }
  if (o.ship) drawShip(ctx, o.ship, view, at, Math.max(8, h * 0.025));

  // The sector names, last, each on a black box so the lines don't run through it.
  const taken: Box[] = [];
  const label = (text: string, x: number, y: number, align: 'left' | 'right', baseline: 'top' | 'bottom' | 'middle') => {
    const tw = ctx.measureText(text).width;
    const bx = align === 'left' ? x : x - tw;
    const by = baseline === 'top' ? y : baseline === 'bottom' ? y - fontSize : y - fontSize / 2;
    const box = { x: bx - 2, y: by - 1, w: tw + 4, h: fontSize + 2 };
    if (box.x < 0 || box.y < 0 || box.x + box.w > w || box.y + box.h > h) return;
    if (taken.some((b) => b.x < box.x + box.w && box.x < b.x + b.w && b.y < box.y + box.h && box.y < b.y + b.h)) return;
    taken.push(box);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#000';
    ctx.fillRect(box.x, box.y, box.w, box.h);
    ctx.fillStyle = o.colour;
    ctx.globalAlpha = 0.85;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(text, bx, by);
  };
  const crossing = (runs: Point[][], edge: 'left' | 'top'): number | null => {
    for (const run of runs) {
      for (let i = 1; i < run.length; i++) {
        const a = run[i - 1]!, b = run[i]!;
        const [ua, ub, va, vb, limit] = edge === 'left' ? [a.x, b.x, a.y, b.y, h] : [a.y, b.y, a.x, b.x, w];
        if (ua === ub || ua * ub > 0) continue;
        const v = va + ((vb - va) * -ua) / (ub - ua);
        if (v >= 0 && v <= limit) return v;
      }
    }
    return null;
  };
  /** A name at the line's crossing with its edge (`first`), else the other edge. */
  const name = (text: string, runs: Point[][], first: 'left' | 'top') => {
    for (const edge of [first, first === 'left' ? 'top' : 'left'] as const) {
      const v = crossing(runs, edge);
      if (v === null) continue;
      if (edge === 'left') label(text, pad, v - pad, 'left', 'bottom');
      else label(text, v + pad, pad, 'left', 'top');
      return;
    }
  };
  // None on the whole globe (owner, 2026-11-24): it reaches no edge anyway.
  if (!whole) {
    for (const line of parallels) name(hex3(line.value), line.runs, 'left');
    for (const line of meridians) name(hex3(line.value), line.runs, 'top');
  }
  ctx.globalAlpha = 1;
  if (o.border > 0) {
    ctx.strokeStyle = o.colour;
    ctx.lineWidth = o.border;
    ctx.strokeRect(o.border / 2, o.border / 2, w - o.border, h - o.border);
  }
}

/** The ship: a triangle pointing along its heading on the screen (the globe's turn and the view's roll included). */
function drawShip(
  ctx: CanvasRenderingContext2D,
  ship: { northSouth: number; eastWest: number; heading: number },
  view: MapView,
  at: (ns: number, ew: number) => Point | null,
  size: number,
): void {
  const p = at(ship.northSouth, ship.eastWest);
  if (!p) return;
  const ahead = travel(ship.northSouth, ship.eastWest, ship.heading, Math.min(view.width, 180) / 200);
  const to = at(ahead.northSouth, ahead.eastWest) ?? p;
  const angle = to.x === p.x && to.y === p.y ? -Math.PI / 2 : Math.atan2(to.y - p.y, to.x - p.x);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(size, 0);
  ctx.lineTo(-size * 0.7, size * 0.6);
  ctx.lineTo(-size * 0.7, -size * 0.6);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}
