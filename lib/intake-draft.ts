import { finishOptions, phasesForStage, stageFits } from "./intake-phases";
import { TEAM_ROLE_IDS, TOOL_ANSWER_IDS } from "./intake-questions";
import { challengeFits } from "./leader-intake";
import { PM_TYPE_IDS, type PhaseId } from "../content/taxonomy";
import {
  MAX_PM_TYPES,
  MAX_TEAM_COUNT,
  NOT_SURE,
  type ExploreQuestionId,
  type IntakeDraft,
  type MultiQuestionId,
  type NotSure,
  type SingleQuestionId,
  type TeamRoleId,
} from "./intake-types";

/**
 * The rules for changing answers. Pure functions: an old draft goes in and a new
 * one comes out, so they can be tested without a browser.
 */

/**
 * Keeps the starting point and the two phase follow-ups consistent with the
 * answers they depend on. Every change and every web address goes through this
 * one rule. A starting point must belong to the track, a start phase to the
 * stage, a finish must be reachable from that start, and a leaders-only
 * challenge needs a level that leads people.
 */
export function tidyDraft(draft: IntakeDraft): IntakeDraft {
  // Each track has its own starting points, so changing track clears the old one.
  const stage = draft.stage !== null && draft.stage !== NOT_SURE && !stageFits(draft.stage, draft.work) ? null : draft.stage;
  // A challenge only leaders are offered goes if the level changes to one that doesn't lead people.
  const challenge = challengeFits(draft.challenge, draft.level) ? draft.challenge : null;
  const tidied = { ...draft, stage, challenge, phase: keepIfOffered(draft.phase, phasesForStage(stage)) };
  return { ...tidied, until: keepIfOffered(draft.until, finishOptions(tidied)) };
}

/** Keeps a phase answer if it's on offer. "Not sure" is fine whenever the question is asked. */
function keepIfOffered(answer: IntakeDraft["phase"], offered: readonly { id: PhaseId }[]): IntakeDraft["phase"] {
  if (offered.length === 0) return null;
  return answer === NOT_SURE || offered.some((item) => item.id === answer) ? answer : null;
}

/** Sets a one-answer question, then re-checks anything that depended on it. */
export function chooseSingle(draft: IntakeDraft, question: SingleQuestionId | ExploreQuestionId, value: string): IntakeDraft {
  return tidyDraft({ ...draft, [question]: value } as IntakeDraft);
}

/** Sets either phase follow-up. */
export function choosePhase(draft: IntakeDraft, question: "phase" | "until", value: PhaseId | NotSure): IntakeDraft {
  return tidyDraft({ ...draft, [question]: value });
}

/**
 * Ticks or unticks an item on a multi-select. "Not sure" can't sit alongside
 * real answers, so ticking one clears the other. Items stay in taxonomy order,
 * so the same answers always give the same web address.
 */
export function toggleMulti(draft: IntakeDraft, question: MultiQuestionId, value: string): IntakeDraft {
  const current: string[] = draft[question];
  const allowed: readonly string[] = question === "team" ? TEAM_ROLE_IDS : question === "pm" ? PM_TYPE_IDS : TOOL_ANSWER_IDS;
  // A visitor at the limit has to untick one first, so no answer disappears unnoticed.
  const adding = value !== NOT_SURE && !current.includes(value);
  if (question === "pm" && adding && current.filter((id) => id !== NOT_SURE).length >= MAX_PM_TYPES) return draft;
  let chosen: string[];
  if (value === NOT_SURE) {
    chosen = current.includes(NOT_SURE) ? [] : [NOT_SURE];
  } else {
    const ticked = current.includes(value) ? current.filter((id) => id !== value) : [...current, value];
    chosen = allowed.filter((id) => ticked.includes(id));
  }
  const next = { ...draft, [question]: chosen } as IntakeDraft;
  if (question === "team") {
    // A role that's been unticked shouldn't keep its number.
    next.teamCounts = Object.fromEntries(Object.entries(draft.teamCounts).filter(([id]) => chosen.includes(id)));
  }
  return next;
}

/** Sets how many of a ticked role there are. One is the default, so it isn't stored. */
export function setTeamCount(draft: IntakeDraft, role: TeamRoleId, count: number): IntakeDraft {
  if (!draft.team.includes(role)) return draft;
  const teamCounts = { ...draft.teamCounts };
  delete teamCounts[role];
  if (count > 1) teamCounts[role] = Math.min(count, MAX_TEAM_COUNT);
  return { ...draft, teamCounts };
}
