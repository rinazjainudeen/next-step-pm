import { countTicked } from "./plan-ticks";

/**
 * Which phases of the timeline are open, and the overview above them. Pure, so it's
 * tested without a browser. The component is components/plan/plan-phases.tsx.
 */

export type PhaseOutline = {
  id: string;
  label: string;
  weeks: string;
  /** Every block in the phase, for links to a block. */
  blockIds: readonly string[];
  /** The ids that count towards progress: the steps, or a leader's questions, of the required blocks. */
  stepIds: readonly string[];
  /** Every required block in the phase is done. */
  done: boolean;
};

/** A visitor's own open and close choices. A phase they haven't touched follows the plan. */
export type PhaseChoices = Readonly<Record<string, boolean>>;

/** The phase you're in opens. Once a visitor opens or closes a phase, their choice wins. */
export function isPhaseOpen(id: string, choices: PhaseChoices, current: string | null): boolean {
  return choices[id] ?? id === current;
}

/** Every phase open. */
export function openAll(phases: readonly Pick<PhaseOutline, "id">[]): PhaseChoices {
  return Object.fromEntries(phases.map((phase) => [phase.id, true]));
}

/** Back to the first view: only the phase you're in. */
export const ONLY_CURRENT: PhaseChoices = {};

/** The id of a phase's section, which the overview links to. */
export const phaseAnchor = (id: string) => `phase-${id}`;

/**
 * The phase that holds a link's target: a phase itself, or a block in it.
 * Null if the target isn't in the timeline, such as a skill or the feedback form.
 */
export function phaseForTarget(hash: string, phases: readonly Pick<PhaseOutline, "id" | "blockIds">[]): string | null {
  let target = hash.startsWith("#") ? hash.slice(1) : hash;
  try {
    target = decodeURIComponent(target);
  } catch {
    // A badly encoded link is read as it is.
  }
  if (!target) return null;
  const phase = phases.find((item) => phaseAnchor(item.id) === target || item.blockIds.includes(target));
  return phase?.id ?? null;
}

/** Opens the phase a link points to, keeping every other choice. Unchanged if it's open already. */
export function openFor(phaseId: string | null, choices: PhaseChoices, current: string | null): PhaseChoices {
  if (phaseId === null || isPhaseOpen(phaseId, choices, current)) return choices;
  return { ...choices, [phaseId]: true };
}

export type PhaseOverviewRow = {
  id: string;
  label: string;
  weeks: string;
  blocks: number;
  steps: number;
  ticked: number;
  status: "done" | "current" | "later";
};

/** One row per phase, for the overview at the top of the timeline. */
export function phaseOverview(phases: readonly PhaseOutline[], current: string | null, ticks: readonly string[]): PhaseOverviewRow[] {
  return phases.map((phase) => ({
    id: phase.id,
    label: phase.label,
    weeks: phase.weeks,
    blocks: phase.blockIds.length,
    steps: phase.stepIds.length,
    ticked: countTicked(ticks, phase.stepIds),
    status: phase.done ? "done" : phase.id === current ? "current" : "later",
  }));
}

/** "1 block", "8 blocks". */
export const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;
