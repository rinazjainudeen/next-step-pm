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

/** True for a real phase, as opposed to blank or "Not sure". */
function isPhase(answer: IntakeDraft["phase"]): answer is PhaseId {
  return answer !== null && answer !== NOT_SURE;
}

function startIndex(journey: readonly PhaseId[], phase: IntakeDraft["phase"]): number {
  return isPhase(phase) ? journey.indexOf(phase) : 0;
}

/** The phases a visitor can say they're in now, in the order they'd work through them. */
export function phasesForStage(stage: StageAnswer): Phase[] {
  return toPhases(findStage(stage)?.startPhases ?? []);
}

/** A real timeline, as opposed to blank or "Not sure". */
export function hasTimeline(time: TimelineId | typeof NOT_SURE | null): boolean {
  return time !== null && time !== NOT_SURE;
}

/**
 * The phases a visitor can aim to finish by their milestone: from where they
 * are now to the end of the stage's journey. Not knowing the stage means
 * starting from the beginning, so it gets the same route as starting something
 * new. Empty without a real timeline, because "by then" has no meaning.
 */
export function finishOptions(draft: Pick<IntakeDraft, "stage" | "phase" | "time">): Phase[] {
  const stage = draft.stage === NOT_SURE ? STAGES[0] : findStage(draft.stage);
  if (!stage || !hasTimeline(draft.time)) return [];
  const journey: readonly PhaseId[] = stage.journey;
  const options = toPhases(journey.slice(startIndex(journey, draft.phase)));
  // With only one phase left, there's nothing to choose.
  return options.length > 1 ? options : [];
}

/**
 * The phases the plan will cover, in order. Runs from the start phase to the
 * chosen finish, or otherwise to the end of the stage's usual phases. Not knowing the
 * stage means starting from the beginning, the same as "Starting something new".
 */
export function phasesCovered(answers: Pick<IntakeDraft, "stage" | "phase" | "until">): Phase[] {
  const stage = findStage(answers.stage) ?? STAGES[0];
  const journey: readonly PhaseId[] = stage.journey;
  const start = startIndex(journey, answers.phase);
  const lastUsual = journey.indexOf(stage.phases[stage.phases.length - 1]);
  // Starting past the usual end, such as a live product in Build, runs to the end of the route.
  const usualFinish = start > lastUsual ? journey.length - 1 : lastUsual;
  const finish = isPhase(answers.until) ? journey.indexOf(answers.until) : usualFinish;
  return toPhases(journey.slice(start, finish + 1));
}
