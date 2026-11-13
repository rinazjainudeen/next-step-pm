/**
 * The plan's reveal: a short bit of motion on "Your plan at a glance", played
 * once, right after someone presses "Build my plan" at the end of the questions.
 * The phases arrive one after another, each step count counts up, the phase
 * you're in glows once, and the timeline below settles in after them. It's
 * over in about a second and never covers or holds back the plan.
 *
 * It never plays on a refresh, a shared link, Back and Forward, "Change" from
 * Your answers or the example plan. The questions leave a one-off note in this
 * tab's session storage naming the plan, and the plan page takes it away the
 * first time it looks. With "reduce motion" on, it doesn't play.
 */

export const REVEAL_KEY = "next-step-pm:plan-reveal";

export type RevealStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** This tab's session storage. It can be blocked, and merely asking for it can throw. Browser only. */
export function sessionStore(): RevealStorage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** Called by the questions, just before going to the plan. Storage can be blocked, so a failure just means no reveal. */
export function markReveal(storage: RevealStorage | null, planHref: string): void {
  try {
    storage?.setItem(REVEAL_KEY, planHref);
  } catch {
    // No reveal. The plan still opens.
  }
}

/** Whether to play the reveal for this plan. Always clears the note, so it plays at most once. */
export function takeReveal(storage: RevealStorage | null, planHref: string, reducedMotion: boolean): boolean {
  if (!storage) return false;
  try {
    const wanted = storage.getItem(REVEAL_KEY);
    if (wanted === null) return false;
    storage.removeItem(REVEAL_KEY);
    return !reducedMotion && wanted === planHref;
  } catch {
    return false;
  }
}

export type RevealTimings = {
  /** Gap between one phase arriving and the next: 60 to 90ms for up to 8 phases. */
  stagger: number;
  /** How long one phase takes to arrive. */
  riseFor: number;
  /** How long after its phase starts a step count starts counting. */
  countAfter: number;
  /** How long a step count takes to count up. */
  countFor: number;
  /** How long after its phase starts the "You're here" glow starts. */
  glowAfter: number;
  /** How long the glow lasts. */
  glowFor: number;
  /** When the timeline below starts to settle in. */
  timelineAt: number;
  /** How long it takes. */
  timelineFor: number;
  /** When it's all over, at the latest. */
  total: number;
};

/** In milliseconds. Under 1.2 seconds whatever the number of phases: more phases means a shorter gap between them. */
export function revealTimings(phaseCount: number): RevealTimings {
  const stagger = Math.min(90, Math.round(420 / Math.max(phaseCount - 1, 1)));
  const lastStart = stagger * Math.max(phaseCount - 1, 0);
  const riseFor = 320;
  const countAfter = 80;
  const countFor = 420;
  const glowAfter = 200;
  const glowFor = 560;
  const timelineAt = lastStart + 120;
  const timelineFor = 420;
  // The glow can be on the last phase, so the latest it can end is after the last one.
  const total = Math.max(lastStart + riseFor, lastStart + countAfter + countFor, lastStart + glowAfter + glowFor, timelineAt + timelineFor);
  return { stagger, riseFor, countAfter, countFor, glowAfter, glowFor, timelineAt, timelineFor, total };
}

/** The number a step count shows `elapsed` ms after it starts counting: eases out, and rests on the real number. */
export function countAt(to: number, elapsed: number, duration: number): number {
  if (elapsed <= 0) return 0;
  if (elapsed >= duration) return to;
  return Math.round(to * (1 - (1 - elapsed / duration) ** 3));
}
