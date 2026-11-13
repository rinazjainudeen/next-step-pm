/**
 * The home hero's background: a few faint blocks drift slowly, and every few
 * seconds some of them line up into a short rising path (blocks becoming a
 * plan), hold for a moment, then drift apart again. Pure maths here, so it can
 * be tested; components/site/hero-ambient.tsx draws it.
 *
 * Positions are fractions of the hero's width and height, so it fits any screen.
 */

export type AmbientBlock = {
  /** Where it rests, as a fraction of the hero's width and height. */
  x: number;
  y: number;
  /** Size in pixels. */
  width: number;
  height: number;
  /** Drift: how far (px), how slowly (ms per loop) and where in the loop it starts. */
  reach: number;
  period: number;
  offset: number;
};

/** Few on purpose: cheap on phones, and calm. */
export const AMBIENT_BLOCKS: readonly AmbientBlock[] = [
  { x: 0.08, y: 0.18, width: 30, height: 18, reach: 12, period: 19000, offset: 0.4 },
  { x: 0.3, y: 0.82, width: 24, height: 15, reach: 14, period: 23000, offset: 2.1 },
  { x: 0.47, y: 0.12, width: 34, height: 20, reach: 10, period: 21000, offset: 4.2 },
  { x: 0.55, y: 0.6, width: 26, height: 16, reach: 14, period: 17000, offset: 1.3 },
  { x: 0.64, y: 0.88, width: 30, height: 18, reach: 12, period: 25000, offset: 5.0 },
  { x: 0.72, y: 0.3, width: 22, height: 14, reach: 16, period: 18000, offset: 3.3 },
  { x: 0.8, y: 0.7, width: 32, height: 19, reach: 12, period: 22000, offset: 0.9 },
  { x: 0.88, y: 0.16, width: 26, height: 16, reach: 14, period: 20000, offset: 2.7 },
  { x: 0.94, y: 0.52, width: 24, height: 15, reach: 12, period: 24000, offset: 4.6 },
];

/** How many blocks join the path each time. */
export const PATH_LENGTH = 5;

/** One loop, in milliseconds: drift, line up, hold, drift apart. */
export const CYCLE = { drift: 5200, gather: 1400, hold: 1800, release: 1600 } as const;
export const CYCLE_LENGTH = CYCLE.drift + CYCLE.gather + CYCLE.hold + CYCLE.release;

const smooth = (t: number) => t * t * (3 - 2 * t);

/** How lined up the path is, from 0 (loose) to 1 (a straight path), `time` ms in. */
export function alignment(time: number): number {
  const t = ((time % CYCLE_LENGTH) + CYCLE_LENGTH) % CYCLE_LENGTH;
  if (t < CYCLE.drift) return 0;
  if (t < CYCLE.drift + CYCLE.gather) return smooth((t - CYCLE.drift) / CYCLE.gather);
  if (t < CYCLE.drift + CYCLE.gather + CYCLE.hold) return 1;
  return 1 - smooth((t - CYCLE.drift - CYCLE.gather - CYCLE.hold) / CYCLE.release);
}

/** Which loop `time` is in, so each loop can line up different blocks. */
export const cycleOf = (time: number) => Math.floor(Math.max(time, 0) / CYCLE_LENGTH);

/**
 * The blocks that join the path in a given loop, in path order (left to right
 * by where they rest, so they don't cross over). A different mix each loop.
 */
export function pathBlocks(cycle: number, count = AMBIENT_BLOCKS.length, length = PATH_LENGTH): number[] {
  const order = Array.from({ length: count }, (_, index) => index);
  // A small fixed shuffle per loop, so it's the same on every visit and in tests.
  let seed = (cycle * 2654435761 + 1013904223) >>> 0;
  for (let i = order.length - 1; i > 0; i--) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order.slice(0, Math.min(length, count)).sort((a, b) => a - b);
}

type Point = { x: number; y: number };
export type AmbientPath = { from: Point; to: Point };

/** Where the path sits on wider screens: a short line rising to the right, beside the words, along the hero's steps. */
export const PATH: AmbientPath = { from: { x: 0.58, y: 0.74 }, to: { x: 0.86, y: 0.44 } };
/** On phones the words fill the width, so the path sits low on the right, beside the buttons rather than behind the text. */
export const PATH_NARROW: AmbientPath = { from: { x: 0.62, y: 0.95 }, to: { x: 0.9, y: 0.82 } };
/** Below this hero width (px), the narrow path is used. */
export const NARROW_BELOW = 640;

export const pathFor = (width: number): AmbientPath => (width < NARROW_BELOW ? PATH_NARROW : PATH);

/** Where the `slot`th block on the path goes, as fractions of the hero. */
export function pathPoint(slot: number, path: AmbientPath = PATH, length = PATH_LENGTH): Point {
  const t = length <= 1 ? 0.5 : slot / (length - 1);
  return { x: path.from.x + (path.to.x - path.from.x) * t, y: path.from.y + (path.to.y - path.from.y) * t };
}

/** How far a block has drifted from where it rests, `time` ms in. Starts at 0, so nothing jumps when the motion starts. */
export function drift(block: AmbientBlock, time: number): { x: number; y: number; turn: number } {
  const angle = (2 * Math.PI * time) / block.period;
  return {
    x: block.reach * (Math.sin(angle + block.offset) - Math.sin(block.offset)),
    y: block.reach * 0.7 * (Math.cos(angle * 0.8 + block.offset) - Math.cos(block.offset)),
    turn: 4 * (Math.sin(angle * 0.6 + block.offset) - Math.sin(block.offset)),
  };
}
