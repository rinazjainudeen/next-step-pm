import { summariseAnswers } from "./intake-questions";
import type { IntakeAnswers } from "./intake-types";
import type { PlanPhase } from "./plan-types";

/**
 * "Building your plan": a short moment, shown once, right after someone presses
 * "Build my plan" at the end of the questions. It shows their answers turning
 * into the plan's phases, using the real plan, then gets out of the way.
 *
 * It never plays on a refresh, a shared link, "Change" from Your answers or the
 * example plan. The questions leave a one-off note in this tab's session storage
 * naming the plan, and the plan page takes it away the first time it looks. With
 * "reduce motion" on, the plan shows straight away.
 */

export const INTRO_KEY = "next-step-pm:build-intro";

export type IntroStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** Called by the questions, just before going to the plan. Storage can be blocked, so a failure just means no intro. */
export function markIntro(storage: IntroStorage | null, planHref: string): void {
  try {
    storage?.setItem(INTRO_KEY, planHref);
  } catch {
    // No intro. The plan still opens.
  }
}

/** Whether to play the intro for this plan. Always clears the note, so it plays at most once. */
export function takeIntro(storage: IntroStorage | null, planHref: string, reducedMotion: boolean): boolean {
  if (!storage) return false;
  try {
    const wanted = storage.getItem(INTRO_KEY);
    if (wanted === null) return false;
    storage.removeItem(INTRO_KEY);
    return !reducedMotion && wanted === planHref;
  } catch {
    return false;
  }
}

/** Long phases show this many block bars, with the exact count beside them. */
export const MAX_BARS = 10;

export type IntroLane = {
  id: string;
  label: string;
  weeks: string;
  /** Required blocks in the phase. */
  blocks: number;
  /** Bars to draw, at most MAX_BARS. */
  bars: number;
  /** Steps (or questions, in the leader view) to tick off, as on the plan. */
  steps: number;
};

export type IntroModel = {
  /** The visitor's answers, as they read in "Your answers". */
  chips: string[];
  lanes: IntroLane[];
  blocks: number;
  steps: number;
};

/**
 * What the intro shows, all from the finished plan. `countSteps` is the plan
 * page's own count, so the numbers match the overview underneath.
 */
export function introModel(answers: IntakeAnswers, phases: readonly PlanPhase[], countSteps: (phase: PlanPhase) => number): IntroModel {
  // The last row, "Phases your plan covers", is the result rather than an answer.
  const chips = summariseAnswers(answers)
    .filter((row) => row.step !== undefined)
    .map((row) => row.value);
  const lanes = phases.map((phase) => {
    const blocks = phase.blocks.filter((block) => !block.optional).length;
    return { id: phase.id, label: phase.label, weeks: phase.weeks, blocks, bars: Math.min(blocks, MAX_BARS), steps: countSteps(phase) };
  });
  return {
    chips,
    lanes,
    blocks: lanes.reduce((sum, lane) => sum + lane.blocks, 0),
    steps: lanes.reduce((sum, lane) => sum + lane.steps, 0),
  };
}

export type IntroTimings = {
  /** Gap between answer chips appearing. */
  chipStagger: number;
  /** When the chips start to drop into the lanes. */
  flowAt: number;
  /** When the first phase lane arrives. */
  lanesAt: number;
  /** Gap between lanes. Shorter when there are more, so the total stays the same. */
  laneStagger: number;
  /** Gap between one lane's block bars. */
  barStagger: number;
  /** How long a lane's step count takes to count up. */
  countFor: number;
  /** When the overlay starts to fade and the plan shows. */
  revealAt: number;
  /** How long the fade takes. */
  fadeFor: number;
  /** When it's over. */
  total: number;
};

/** In milliseconds. Between about 1.5 and 1.9 seconds, whatever the number of phases. */
export function introTimings(laneCount: number): IntroTimings {
  const chipStagger = 35;
  const flowAt = 520;
  const lanesAt = 560;
  const laneStagger = Math.round(Math.min(110, 440 / Math.max(laneCount, 1)));
  const barStagger = 25;
  const countFor = 420;
  const lastLaneDone = lanesAt + laneStagger * Math.max(laneCount - 1, 0) + Math.max(countFor, 150 + barStagger * MAX_BARS);
  const revealAt = Math.max(1250, lastLaneDone + 150);
  const fadeFor = 280;
  return { chipStagger, flowAt, lanesAt, laneStagger, barStagger, countFor, revealAt, fadeFor, total: revealAt + fadeFor };
}

/** The keys that skip the intro. Scrolling keys skip it too, rather than moving the page underneath. */
export const SKIP_KEYS: readonly string[] = ["Escape", "Enter", " ", "ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End"];
