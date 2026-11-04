import { PHASES, STAGES, type PhaseId, type TimelineId } from "../content/taxonomy";
import { NOT_SURE, type IntakeDraft } from "./intake-types";

/**
 * Which lifecycle phases a visitor's plan runs through. A stage gives the usual
 * phases and a longer journey. The follow-up answers set where to start and,
 * if the milestone is further on, where to stop.
 */

type Phase = (typeof PHASES)[number];
type StageAnswer = IntakeDraft["stage"];

const toPhases = (ids: readonly PhaseId[]): Phase[] =>
  ids.flatMap((id) => PHASES.filter((phase) => phase.id === id));

function findStage(stage: StageAnswer) {
  return STAGES.find((item) => item.id === stage);
}

/** The phases a visitor can say they're in, in the order they'd work through them. */
export function phasesForStage(stage: StageAnswer): Phase[] {
  return toPhases(findStage(stage)?.phases ?? []);
}

/** A real timeline, as opposed to blank or "Not sure". */
export function hasTimeline(time: TimelineId | typeof NOT_SURE | null): boolean {
  return time !== null && time !== NOT_SURE;
}

/**
 * The phases a visitor can aim to finish by their milestone: from where they
 * are now to the end of the stage's journey. Empty without a real stage and
 * timeline, because "finish by then" has no meaning without both.
 */
export function finishOptions(draft: Pick<IntakeDraft, "stage" | "phase" | "time">): Phase[] {
  const stage = findStage(draft.stage);
  if (!stage || !hasTimeline(draft.time)) return [];
  const journey: readonly PhaseId[] = stage.journey;
  return toPhases(journey.slice(draft.phase ? journey.indexOf(draft.phase) : 0));
}

/**
 * The phases the plan will cover, in order. Runs from the start phase to the
 * chosen finish, or to the end of the stage's usual phases. Not knowing the
 * stage means starting from the beginning, the same as "Starting something new".
 */
export function phasesCovered(answers: Pick<IntakeDraft, "stage" | "phase" | "until">): Phase[] {
  const stage = findStage(answers.stage) ?? STAGES[0];
  const journey: readonly PhaseId[] = stage.journey;
  const start = answers.phase ? journey.indexOf(answers.phase) : 0;
  const finish = journey.indexOf(answers.until ?? stage.phases[stage.phases.length - 1]);
  return toPhases(journey.slice(start, finish + 1));
}
