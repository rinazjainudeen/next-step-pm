import {
  EXPERIENCE_IDS,
  PHASE_IDS,
  PM_TYPE_IDS,
  PRODUCT_TYPE_IDS,
  STAGE_IDS,
  TIMELINE_IDS,
  WAY_OF_WORKING_IDS,
  isOneOf,
} from "../content/taxonomy";
import { tidyDraft } from "./intake-draft";
import { TEAM_ROLE_IDS, TOOL_ANSWER_IDS, TOTAL_STEPS } from "./intake-questions";
import { MAX_TEAM_COUNT, NOT_SURE, type IntakeDraft, type NotSure, type TeamRoleId } from "./intake-types";

/**
 * Answers live in the web address, so Back, refresh and sharing all work with
 * no database. For example:
 * /plan?pm=ai&product=public&stage=mid-build&phase=build&exp=beginner&team=ba,backend-engineer:3&tools=jira&time=1-3m&until=launch&way=scrum
 *
 * Addresses can be edited by hand, so anything unrecognised is ignored.
 */

type ParamReader = { get(name: string): string | null };

function pickOne<T extends string>(params: ParamReader, name: string, allowed: readonly T[]): T | NotSure | null {
  const value = params.get(name);
  if (value === NOT_SURE) return NOT_SURE;
  return isOneOf(allowed, value) ? value : null;
}

/** Keeps the known ids from a list. Real answers win over "Not sure", and order is fixed. */
function pickMany<T extends string>(values: string[], allowed: readonly T[]): (T | NotSure)[] {
  const known = allowed.filter((id) => values.includes(id));
  if (known.length > 0) return known;
  return values.includes(NOT_SURE) ? [NOT_SURE] : [];
}

const splitList = (value: string | null) => (value ?? "").split(",");

/** Reads `team=ba,backend-engineer:3`. A role with no number counts as 1. */
function parseTeam(params: ParamReader): Pick<IntakeDraft, "team" | "teamCounts"> {
  const entries = splitList(params.get("team")).map((entry) => entry.split(":"));
  const team = pickMany(entries.map(([id]) => id), TEAM_ROLE_IDS);
  const teamCounts: IntakeDraft["teamCounts"] = {};
  for (const [id, rawCount] of entries) {
    const count = Number(rawCount);
    if (isOneOf(TEAM_ROLE_IDS, id) && Number.isInteger(count) && count > 1) {
      teamCounts[id] = Math.min(count, MAX_TEAM_COUNT);
    }
  }
  return { team, teamCounts };
}

function pickPhase(params: ParamReader, name: string) {
  const value = params.get(name);
  return isOneOf(PHASE_IDS, value) ? value : null;
}

export function parseDraft(params: ParamReader): IntakeDraft {
  return tidyDraft({
    pm: pickOne(params, "pm", PM_TYPE_IDS),
    product: pickOne(params, "product", PRODUCT_TYPE_IDS),
    stage: pickOne(params, "stage", STAGE_IDS),
    phase: pickPhase(params, "phase"),
    exp: pickOne(params, "exp", EXPERIENCE_IDS),
    ...parseTeam(params),
    tools: pickMany(splitList(params.get("tools")), TOOL_ANSWER_IDS),
    time: pickOne(params, "time", TIMELINE_IDS),
    until: pickPhase(params, "until"),
    way: pickOne(params, "way", WAY_OF_WORKING_IDS),
  });
}

/** The current question number. Anything invalid falls back to question 1. */
export function parseStep(params: ParamReader): number {
  const step = Number(params.get("step"));
  return Number.isInteger(step) && step >= 1 && step <= TOTAL_STEPS ? step : 1;
}

/** True when the visitor is changing one answer from their answers page. */
export function parseEditing(params: ParamReader): boolean {
  return params.get("edit") === "1";
}

/**
 * Turns a draft into a query string, leaving out blanks. The values are our own
 * ids, which are safe in a web address, so commas stay readable.
 */
export function draftToQuery(draft: IntakeDraft): string {
  const { pm, product, stage, phase, exp, team, teamCounts, tools, time, until, way } = draft;
  const teamEntries = team.map((id) => {
    const count = teamCounts[id as TeamRoleId];
    return count ? `${id}:${count}` : id;
  });
  const pairs: [string, string | null][] = [
    ["pm", pm],
    ["product", product],
    ["stage", stage],
    ["phase", phase],
    ["exp", exp],
    ["team", teamEntries.join(",")],
    ["tools", tools.join(",")],
    ["time", time],
    ["until", until],
    ["way", way],
  ];
  return pairs
    .filter(([, value]) => value)
    .map(([name, value]) => `${name}=${value}`)
    .join("&");
}

function withQuery(path: string, ...parts: string[]): string {
  const query = parts.filter(Boolean).join("&");
  return query ? `${path}?${query}` : path;
}

/**
 * The address of a question, carrying the answers so far. `editing` means the
 * visitor came to change one answer and goes straight back afterwards.
 */
export function startHref(draft: IntakeDraft, step: number, editing = false): string {
  return withQuery("/start", step > 1 ? `step=${step}` : "", editing ? "edit=1" : "", draftToQuery(draft));
}

/** The address of the finished plan. It has no step, so it reads the same however it was reached. */
export function planHref(draft: IntakeDraft): string {
  return withQuery("/plan", draftToQuery(draft));
}

/** Lets server pages, which receive a plain object, use the same reader. */
export function readerFromRecord(record: Record<string, string | string[] | undefined>): ParamReader {
  return {
    get(name) {
      const value = record[name];
      return (Array.isArray(value) ? value[0] : value) ?? null;
    },
  };
}
