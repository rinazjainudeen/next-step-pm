import { CAREER_LEVELS, CHALLENGES, type Challenge, type ChallengeId, type SkillId } from "../content/taxonomy";
import { NOT_SURE, type IntakeDraft } from "./intake-types";

/**
 * How the intake and the plan speak to people leaders: Group PMs, Directors and
 * VPs. Pure, so it's tested without a browser. See docs/decisions.md (13 November 2026).
 */

const ALL_CHALLENGES: readonly Challenge[] = CHALLENGES;

/** True for the levels that lead other product people. "Not sure" and a blank answer don't. */
export function leadsPeople(level: IntakeDraft["level"]): boolean {
  return CAREER_LEVELS.some((item) => item.id === level && item.leadsPeople);
}

/** The order leaders see the challenges in: their own first, then the shared ones. */
const LEADER_ORDER: readonly ChallengeId[] = [
  "team-performance",
  "hiring",
  "alignment",
  "portfolio",
  "what-to-build",
  "too-many-requests",
  "measurement",
  "slow-delivery",
  "new-to-role",
  "grow",
];

/** The challenges offered at a level, in the wording that level sees. */
export function challengeOptions(level: IntakeDraft["level"]): { id: ChallengeId; label: string; description: string }[] {
  if (!leadsPeople(level)) {
    return ALL_CHALLENGES.filter((item) => !item.leadersOnly).map((item) => ({ id: item.id as ChallengeId, label: item.label, description: item.description }));
  }
  return LEADER_ORDER.map((id) => {
    const item = ALL_CHALLENGES.find((challenge) => challenge.id === id) as Challenge;
    return { id, label: item.forLeaders?.label ?? item.label, description: item.forLeaders?.description ?? item.description };
  });
}

/** True when a challenge answer can stand at this level. A leaders-only challenge needs a people leader. */
export function challengeFits(challenge: IntakeDraft["challenge"], level: IntakeDraft["level"]): boolean {
  if (challenge === null || challenge === NOT_SURE) return true;
  return !ALL_CHALLENGES.find((item) => item.id === challenge)?.leadersOnly || leadsPeople(level);
}

export type ChallengeDetails = {
  label: string;
  favours: readonly SkillId[];
  /** The blocks that help most, best first. Only people leaders have them. */
  blocks: readonly string[];
};

/** The visitor's challenge as they see it, or nothing for "Not sure". */
export function challengeDetails(answers: Pick<IntakeDraft, "challenge" | "level">): ChallengeDetails | undefined {
  const item = ALL_CHALLENGES.find((challenge) => challenge.id === answers.challenge);
  if (!item || !challengeFits(answers.challenge, answers.level)) return undefined;
  const leader = leadsPeople(answers.level);
  return {
    label: (leader && item.forLeaders?.label) || item.label,
    favours: item.favours,
    blocks: leader ? (item.forLeaders?.blocks ?? []) : [],
  };
}

/** Every block id a challenge names, for the content check. */
export function namedChallengeBlocks(): { challenge: string; blockId: string; favours: readonly SkillId[] }[] {
  return ALL_CHALLENGES.flatMap((item) => (item.forLeaders?.blocks ?? []).map((blockId) => ({ challenge: item.id, blockId, favours: item.favours })));
}
