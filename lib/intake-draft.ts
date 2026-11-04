import { finishOptions, phasesForStage } from "./intake-phases";
import { TEAM_ROLE_IDS, TOOL_ANSWER_IDS } from "./intake-questions";
import type { PhaseId } from "../content/taxonomy";
import {
  MAX_TEAM_COUNT,
  NOT_SURE,
  type IntakeDraft,
  type MultiQuestionId,
  type SingleQuestionId,
  type TeamRoleId,
} from "./intake-types";

/**
 * The rules for changing answers. Pure functions: an old draft goes in and a new
 * one comes out, so they can be tested without a browser.
 */

/**
 * Keeps the two phase follow-ups consistent with the answers they depend on.
 * Every change and every web address goes through this one rule. A start phase
 * must belong to the stage, and a finish must be reachable from that start.
 */
export function tidyDraft(draft: IntakeDraft): IntakeDraft {
  const phase = phasesForStage(draft.stage).some((item) => item.id === draft.phase) ? draft.phase : null;
  const tidied = { ...draft, phase };
  const until = finishOptions(tidied).some((item) => item.id === draft.until) ? draft.until : null;
  return { ...tidied, until };
}

/** Sets a one-answer question, then re-checks anything that depended on it. */
export function chooseSingle(draft: IntakeDraft, question: SingleQuestionId, value: string): IntakeDraft {
  return tidyDraft({ ...draft, [question]: value } as IntakeDraft);
}

/** Sets either phase follow-up. Null means "Not sure". */
export function choosePhase(draft: IntakeDraft, question: "phase" | "until", value: PhaseId | null): IntakeDraft {
  return tidyDraft({ ...draft, [question]: value });
}

/**
 * Ticks or unticks an item on a multi-select. "Not sure" can't sit alongside
 * real answers, so ticking one clears the other. Items stay in taxonomy order,
 * so the same answers always give the same web address.
 */
export function toggleMulti(draft: IntakeDraft, question: MultiQuestionId, value: string): IntakeDraft {
  const current: string[] = draft[question];
  const allowed: readonly string[] = question === "team" ? TEAM_ROLE_IDS : TOOL_ANSWER_IDS;
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
