import {
  BACKGROUND_IDS,
  CAREER_LEVEL_IDS,
  CHALLENGE_IDS,
  COMPANY_SIZE_IDS,
  EXPLORE_GOAL_IDS,
  HOURS_IDS,
  PHASE_IDS,
  PM_TYPE_IDS,
  PRODUCT_TYPE_IDS,
  STAGE_IDS,
  TIMELINE_IDS,
  WAY_OF_WORKING_IDS,
  WORK_KIND_IDS,
  isOneOf,
  type CareerLevelId,
} from "../content/taxonomy";
import { tidyDraft } from "./intake-draft";
import { TEAM_ROLE_IDS, TOOL_ANSWER_IDS, TOTAL_STEPS } from "./intake-questions";
import { KIND_OF_WORK_ENABLED, MAX_PM_TYPES, MAX_TEAM_COUNT, NOT_SURE, VIEW_IDS, type IntakeDraft, type NotSure, type TeamRoleId } from "./intake-types";

/**
 * Answers live in the web address, so Back, refresh and sharing all work with
 * no database. For example:
 * /plan?pm=ai,growth&level=senior&product=public&size=established&stage=mid-build&phase=build&team=ba,backend-engineer:3&tools=jira&time=1-3m&until=launch&way=scrum
 *
 * Addresses can be edited by hand, so anything unrecognised is ignored.
 *
 * Plans shared before Phase 7a use `exp` and have no `size`. They must keep
 * opening, so `exp` is mapped onto a career level and the size counts as Not sure.
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

const OLD_EXPERIENCE = new Map<string | null, CareerLevelId | NotSure>([
  ["beginner", "associate"],
  ["intermediate", "product-manager"],
  ["experienced", "senior"],
  [NOT_SURE, NOT_SURE],
]);

/** A link from before Phase 7a, which has an old experience answer and no level. */
const isOldLink = (params: ParamReader) => params.get("level") === null && OLD_EXPERIENCE.has(params.get("exp"));

/** Reads `level`, or an old link's `exp`. */
function parseLevel(params: ParamReader): IntakeDraft["level"] {
  return pickOne(params, "level", CAREER_LEVEL_IDS) ?? OLD_EXPERIENCE.get(params.get("exp")) ?? null;
}

/** An old link was never asked about size, so it shouldn't be sent back to answer it. */
function parseSize(params: ParamReader): IntakeDraft["size"] {
  return pickOne(params, "size", COMPANY_SIZE_IDS) ?? (isOldLink(params) ? NOT_SURE : null);
}

/** Links from before the kind of work question have a stage and no work. They were always product plans. */
function parseWork(params: ParamReader): IntakeDraft["work"] {
  if (!KIND_OF_WORK_ENABLED) return null;
  return pickOne(params, "work", WORK_KIND_IDS) ?? (params.get("stage") !== null ? "product" : null);
}

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

/** The explore path's three answers. Each is left out of the draft unless the link has a good value. */
function parseExplore(params: ParamReader): Pick<IntakeDraft, "background" | "goal" | "hours"> {
  const background = pickOne(params, "background", BACKGROUND_IDS);
  const goal = pickOne(params, "goal", EXPLORE_GOAL_IDS);
  const hours = pickOne(params, "hours", HOURS_IDS);
  return { ...(background && { background }), ...(goal && { goal }), ...(hours && { hours }) };
}

/** `view=leader` or `view=hands-on`. Anything else, or nothing, leaves the choice to the visitor's level. */
function parseView(params: ParamReader): Pick<IntakeDraft, "view"> {
  const value = params.get("view");
  return isOneOf(VIEW_IDS, value) ? { view: value } : {};
}

export function parseDraft(params: ParamReader): IntakeDraft {
  return tidyDraft({
    work: parseWork(params),
    pm: pickMany(splitList(params.get("pm")), PM_TYPE_IDS).slice(0, MAX_PM_TYPES),
    level: parseLevel(params),
    product: pickOne(params, "product", PRODUCT_TYPE_IDS),
    size: parseSize(params),
    stage: pickOne(params, "stage", STAGE_IDS),
    phase: pickOne(params, "phase", PHASE_IDS),
    challenge: pickOne(params, "challenge", CHALLENGE_IDS),
    ...parseTeam(params),
    tools: pickMany(splitList(params.get("tools")), TOOL_ANSWER_IDS),
    time: pickOne(params, "time", TIMELINE_IDS),
    until: pickOne(params, "until", PHASE_IDS),
    way: pickOne(params, "way", WAY_OF_WORKING_IDS),
    // Links from before the leader view have none, so the level decides.
    ...parseView(params),
    ...parseExplore(params),
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
  const { work, pm, level, product, size, stage, phase, challenge, team, teamCounts, tools, time, until, way, view, background, goal, hours } = draft;
  const teamEntries = team.map((id) => {
    const count = teamCounts[id as TeamRoleId];
    return count ? `${id}:${count}` : id;
  });
  const pairs: [string, string | null][] = [
    ["work", work],
    ["pm", pm.join(",")],
    ["level", level],
    ["product", product],
    ["size", size],
    ["stage", stage],
    ["phase", phase],
    ["challenge", challenge],
    ["team", teamEntries.join(",")],
    ["tools", tools.join(",")],
    ["time", time],
    ["until", until],
    ["way", way],
    ["view", view ?? null],
    ["background", background ?? null],
    ["goal", goal ?? null],
    ["hours", hours ?? null],
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

/**
 * Plans shared before the challenge question have no answer for it. On the
 * plan page only, it counts as "Not sure", so the link still opens. The intake
 * never fills it in for anyone.
 */
export function withOldLinkDefaults(draft: IntakeDraft): IntakeDraft {
  // The explore path has no challenge question, so it has no old links to fill in.
  return draft.challenge === null && draft.work !== "explore" ? { ...draft, challenge: NOT_SURE } : draft;
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
