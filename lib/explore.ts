import { EXPLORE_GOAL_BLOCKS } from "../content/explore-goal-map";
import { HOURS, type ExploreGoalId, type HoursId, type PhaseId } from "../content/taxonomy";
import { NOT_SURE, type IntakeAnswers, type IntakeDraft } from "./intake-types";

/**
 * The rules for the explore path ("I'm exploring product management"). Pure, so they're
 * tested without a browser. The path asks four questions, so everything else is filled in here.
 */

const ROLE: PhaseId = "explore-role";
const FOUNDATIONS: PhaseId = "explore-foundations";
const PRACTISE: PhaseId = "explore-practise";
const APPLY: PhaseId = "explore-apply";

/** The phases each goal gets. "Not sure" starts with understanding the role, then practising. */
const PHASES_FOR_GOAL: Record<ExploreGoalId | typeof NOT_SURE, readonly PhaseId[]> = {
  understand: [ROLE, FOUNDATIONS],
  "work-with-pms": [ROLE, FOUNDATIONS],
  "internal-move": [ROLE, FOUNDATIONS, PRACTISE, APPLY],
  "first-job": [ROLE, FOUNDATIONS, PRACTISE, APPLY],
  [NOT_SURE]: [ROLE, FOUNDATIONS, PRACTISE],
};

type Goal = IntakeDraft["goal"] | undefined;

const goalKey = (goal: Goal): ExploreGoalId | typeof NOT_SURE => (goal && goal !== NOT_SURE ? goal : NOT_SURE);

export function explorePhaseIds(goal: Goal): readonly PhaseId[] {
  return PHASES_FOR_GOAL[goalKey(goal)];
}

/** The explore blocks a goal gets, by id. Reused blocks aren't listed, because they join through `alsoIn`. */
export function exploreBlockIds(goal: Goal): readonly string[] {
  return EXPLORE_GOAL_BLOCKS[goalKey(goal)];
}

/** Every explore block any goal uses. A block with an explore phase that isn't listed for the goal is left out. */
export const ALL_EXPLORE_BLOCK_IDS: ReadonlySet<string> = new Set(Object.values(EXPLORE_GOAL_BLOCKS).flat());

/** "Not sure" assumes 3 to 6 hours. */
export function hoursPerWeek(hours: IntakeDraft["hours"] | undefined): number {
  const chosen = HOURS.find((item) => item.id === (hours as HoursId | undefined));
  return (chosen ?? HOURS[1]).perWeek;
}

/**
 * The explore path asks four questions, so a finished set of answers fills in the rest:
 * beginner steps, and "Not sure" for everything about a product, a team and a milestone.
 */
export function completeExploreAnswers(draft: IntakeDraft): IntakeAnswers {
  return {
    ...draft,
    work: "explore",
    pm: [NOT_SURE],
    level: "associate",
    product: NOT_SURE,
    size: NOT_SURE,
    stage: "explore-new",
    phase: null,
    challenge: NOT_SURE,
    team: [],
    teamCounts: {},
    tools: [],
    time: NOT_SURE,
    until: null,
    way: NOT_SURE,
  };
}
