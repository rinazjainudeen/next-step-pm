import {
  EXPERIENCE_LEVELS,
  PHASES,
  PM_TYPES,
  PRODUCT_TYPES,
  ROLES,
  STAGES,
  TOOLS,
  WAYS_OF_WORKING,
  labelOf,
  type ExperienceId,
  type PhaseId,
  type RoleId,
  type StageId,
  type TaskFallbackId,
  type TimelineId,
} from "../content/taxonomy";
import { blockPhases, type Block, type DelegatedTask } from "./blocks-types";
import { finishOptions, phasesCovered } from "./intake-phases";
import { MAX_TEAM_COUNT, NOT_SURE, OTHER_TOOL, type IntakeAnswers, type TeamRoleId } from "./intake-types";
import type { Plan, PlanAction, PlanBlock, PlanPace, PlanPhase, PlanTask, PlanToolExample } from "./plan-types";

/**
 * The curriculum engine: answers + blocks -> plan.
 *
 * Pure and deterministic. No database, no AI, no randomness and no clock, so
 * the same answers always give the same plan. See docs/content-model.md section 4.
 */

const HOURS_PER_DAY = 8;
const DAYS_PER_WEEK = 5;

/**
 * The shortest and longest each timeline answer could mean, in weeks, and the
 * length to plan across. That's the middle of the range, so there's room for
 * slippage. "6 months or more" has no end, so it plans across 6 months. "Under
 * 1 month" could be days away, so it isn't stretched at all.
 */
export const TIMELINE_WEEKS: Record<TimelineId, { min: number; plan: number; max: number }> = {
  "under-1m": { min: 0, plan: 0, max: 4 },
  "1-3m": { min: 4, plan: 9, max: 13 },
  "3-6m": { min: 13, plan: 20, max: 26 },
  "6m-plus": { min: 26, plan: 26, max: Infinity },
};

/**
 * The least time a plan allows for Build. Blocks only count the PM's part of
 * Build, not the engineering, so without this it could look like a few hours.
 */
export const MIN_BUILD_DAYS = 10;

/** How much of a plan's spare time goes to Build. The other phases share the rest. */
const BUILD_SHARE_OF_SPARE = 2 / 3;

/** With no Build, a plan runs to at most this many times what the work usually takes. */
const MAX_STRETCH = 3;

const BUILD_PHASE: PhaseId = "build";
const BUILD_NOTE = "Build depends on your team and scope, so this length is a starting point. Agree real dates with your engineers.";
const MEASURE_NOTE = "Results take time to appear, so expect to finish this after your milestone.";

const NO_TOOL_MATCH = "This works in whatever documents, tracker or whiteboard your team already uses.";

/** A block's estimate is start-to-finish working time. Ranges use the midpoint. */
export function effortInDays(effort: string): number {
  const match = /^(\d+)(?:-(\d+))? (minute|hour|day)s?$/.exec(effort);
  if (!match) return 0;
  const low = Number(match[1]);
  const midpoint = (low + Number(match[2] ?? low)) / 2;
  if (match[3] === "day") return midpoint;
  return (match[3] === "hour" ? midpoint : midpoint / 60) / HOURS_PER_DAY;
}

// --- 1. Select ---

/** "Not sure" starts from the beginning, so it counts as starting something new. */
function stageFor(answers: IntakeAnswers): StageId {
  return answers.stage === NOT_SURE ? "new" : answers.stage;
}

function matchesPmType(block: Block, answers: IntakeAnswers): boolean {
  return block.appliesTo.pmTypes.some((id) => id === answers.pm);
}

function matchesProduct(block: Block, answers: IntakeAnswers): boolean {
  return block.appliesTo.productTypes.some((id) => id === answers.product);
}

/** A match on PM type OR product type is enough. Two empty lists mean everyone. */
function fitsPerson(block: Block, answers: IntakeAnswers): boolean {
  const { pmTypes, productTypes } = block.appliesTo;
  if (pmTypes.length === 0 && productTypes.length === 0) return true;
  return matchesPmType(block, answers) || matchesProduct(block, answers);
}

function fitsStage(block: Block, answers: IntakeAnswers): boolean {
  const { stages } = block.appliesTo;
  return stages.length === 0 || stages.includes(stageFor(answers));
}

/** "Not sure" only gets blocks that suit any team. */
function fitsWayOfWorking(block: Block, answers: IntakeAnswers): boolean {
  const { waysOfWorking } = block.appliesTo;
  return waysOfWorking.length === 0 || waysOfWorking.some((id) => id === answers.way);
}

function fitsVisitor(block: Block, answers: IntakeAnswers): boolean {
  return !block.placeholder && fitsPerson(block, answers) && fitsStage(block, answers) && fitsWayOfWorking(block, answers);
}

/** The first phase of this plan that the block belongs to, if any. */
function placeIn(block: Block, covered: readonly PhaseId[]): PhaseId | undefined {
  const phases = blockPhases(block.phase);
  return covered.find((id) => phases.includes(id));
}

// --- 2. Order ---

const byKindThenId = (a: Block, b: Block): number => {
  const rank = (block: Block) => (block.kind === "core" ? 0 : 1);
  if (rank(a) !== rank(b)) return rank(a) - rank(b);
  return a.id < b.id ? -1 : 1;
};

/** Puts blocks after whatever they depend on within the same phase. */
function orderByDependency(blocks: readonly Block[]): Block[] {
  const remaining = [...blocks].sort(byKindThenId);
  const ordered: Block[] = [];
  while (remaining.length > 0) {
    const waiting = new Set(remaining.map((block) => block.id));
    const ready = remaining.findIndex((block) => !block.dependsOn.some((id) => waiting.has(id)));
    // The validator rejects circular dependencies. This just means a bad file can't hang the page.
    ordered.push(...remaining.splice(Math.max(ready, 0), 1));
  }
  return ordered;
}

// --- 3 to 5. Shape, assign and tools ---

function experienceFor(answers: IntakeAnswers): ExperienceId {
  return answers.exp === NOT_SURE ? "intermediate" : answers.exp;
}

type RoleDetails = { id: RoleId; label: string; person?: string; plural?: string; covers?: readonly RoleId[]; reviewsFor?: readonly RoleId[] };
const ROLE_DETAILS: readonly RoleDetails[] = ROLES;

/** One person in this role, for labels that don't read as a person on their own. */
function personIn(role: RoleId): string {
  const details = ROLE_DETAILS.find((item) => item.id === role);
  return details?.person ?? details?.label ?? role;
}

function teamMember(role: TeamRoleId, count: number | undefined): string {
  const person = personIn(role);
  if (!count) return `your ${person}`;
  const plural = ROLE_DETAILS.find((item) => item.id === role)?.plural ?? `${person}s`;
  return `your ${count === MAX_TEAM_COUNT ? `${count}+` : count} ${plural}`;
}

/** The best person in the team for a task: the named roles in order, or anyone who covers them. */
function teamRoleFor(item: DelegatedTask, answers: IntakeAnswers): TeamRoleId | undefined {
  const inTeam = (role: RoleId): role is TeamRoleId => answers.team.some((id) => id === role);
  const coveredBy = (role: RoleId) => ROLE_DETAILS.filter((other) => other.covers?.includes(role)).map((other) => other.id);
  return [item.role, ...(item.orRoles ?? [])].flatMap((role) => [role, ...coveredBy(role)]).find(inTeam);
}

const MISSING_ROLE_NOTE: Record<TaskFallbackId, string> = {
  pm: "This sits with you. Agree who can help, and add time for it.",
  "find-someone": "This needs specialist skills, so find someone who can do it, and add time for it.",
  "ask-around": "Ask whoever knows this best, such as a colleague who has worked on the product.",
};

const TEAM_UNKNOWN_WHO: Record<TaskFallbackId, string> = {
  pm: "This sits with you for now",
  "find-someone": "Find someone who can do this",
  "ask-around": "Ask whoever knows this best",
};

function assignTask(item: DelegatedTask, answers: IntakeAnswers): PlanTask {
  const { task, ifMissing } = item;
  const roleLabel = labelOf(ROLES, item.role);
  const teamRole = teamRoleFor(item, answers);
  if (teamRole) {
    return { roleLabel, task, inTeam: true, who: `Ask ${teamMember(teamRole, answers.teamCounts[teamRole])}` };
  }
  const person = personIn(item.role);
  if (answers.team.includes(NOT_SURE)) {
    const someone = `${/^[AEIO]/.test(person) ? "An" : "A"} ${person}`;
    const note = ifMissing === "pm" ? `${someone} could help, if you have one.` : `${someone} would usually do this.`;
    return { roleLabel, task, inTeam: false, who: TEAM_UNKNOWN_WHO[ifMissing], note };
  }
  return { roleLabel, task, inTeam: false, who: `No ${person} in your team`, note: MISSING_ROLE_NOTE[ifMissing] };
}

function toolExamples(block: Block, answers: IntakeAnswers): PlanToolExample[] {
  return answers.tools.flatMap((tool) => {
    const tip = tool === NOT_SURE || tool === OTHER_TOOL ? undefined : block.toolExamples[tool];
    return tip ? [{ toolLabel: labelOf(TOOLS, tool), tip }] : [];
  });
}

// --- 7. Explain ---

function whyTimeline(block: Block, answers: IntakeAnswers, phaseId: PhaseId): string {
  if (block.kind === "add-on") {
    const reasons = [
      matchesPmType(block, answers) ? `${labelOf(PM_TYPES, answers.pm)} as your kind of PM` : "",
      matchesProduct(block, answers) ? `${labelOf(PRODUCT_TYPES, answers.product)} as your product` : "",
    ].filter(Boolean);
    if (reasons.length > 0) return `Because you chose ${reasons.join(" and ")}.`;
  }
  return `Because your plan covers ${labelOf(PHASES, phaseId)}.`;
}

function whyRhythm(block: Block, answers: IntakeAnswers): string {
  if (block.appliesTo.waysOfWorking.length === 0) return "Because it suits any team.";
  return `Because your team works with ${labelOf(WAYS_OF_WORKING, answers.way)}.`;
}

function whyOnboarding(answers: IntakeAnswers): string {
  const stage = labelOf(STAGES, stageFor(answers));
  return `Because you're ${stage[0].toLowerCase()}${stage.slice(1)}. Skip this if you already know the product.`;
}

/** Everything about a block except its place in the timeline. */
/**
 * The team's reviewers for a block. Someone standing in for a role reviews in
 * its place, but nobody reviews work they've stepped in to do themselves.
 */
function reviewersFor(block: Block, answers: IntakeAnswers): string[] {
  const inTeam = (role: RoleId) => answers.team.some((id) => id === role);
  const steppedIn = block.roles.canDelegateTo.map((item) => [item.role, teamRoleFor(item, answers)]).filter(([role, member]) => member && member !== role).map(([, member]) => member);
  const reviewers = block.roles.reviewers.flatMap((role) => {
    if (inTeam(role)) return [role];
    return ROLE_DETAILS.filter((other) => other.reviewsFor?.includes(role) && inTeam(other.id)).map((other) => other.id);
  });
  return [...new Set(reviewers)].filter((role) => !steppedIn.includes(role as TeamRoleId)).map((role) => labelOf(ROLES, role));
}

function shapeBlock(block: Block, answers: IntakeAnswers, why: string, checkFirst: PlanBlock["checkFirst"]): PlanBlock {
  const level = experienceFor(answers);
  const tools = toolExamples(block, answers);
  return {
    id: block.id,
    title: block.title,
    summary: block.summary,
    kind: block.kind,
    effort: block.estimatedEffort,
    why,
    steps: block.steps[level].map((text, index) => ({ id: `${block.id}/${level}/${index}`, text })),
    tasks: block.roles.canDelegateTo.map((item) => assignTask(item, answers)),
    reviewers: reviewersFor(block, answers),
    tools,
    ...(tools.length === 0 ? { toolTip: NO_TOOL_MATCH } : {}),
    definitionOfDone: block.definitionOfDone,
    pitfalls: block.pitfalls,
    checkFirst,
  };
}

// --- 6. Pace ---

/** Squeezing a tight plan leaves tiny rounding errors, which mustn't add a week. */
const toWeeks = (days: number) => Math.round((days / DAYS_PER_WEEK) * 1000) / 1000;

function weeksLabel(startDay: number, endDay: number): string {
  const first = Math.floor(toWeeks(startDay)) + 1;
  const last = Math.max(first, Math.ceil(toWeeks(endDay)));
  return first === last ? `Week ${first}` : `Weeks ${first} to ${last}`;
}

function durationText(days: number): string {
  if (days < 1) return "less than a day";
  if (days < DAYS_PER_WEEK) {
    const rounded = Math.round(days);
    return rounded === 1 ? "about a day" : `about ${rounded} days`;
  }
  // Rounded up, so this always matches the last week shown in the timeline.
  const weeks = Math.ceil(toWeeks(days));
  return weeks === 1 ? "about a week" : `about ${weeks} weeks`;
}

type PhaseGroup = { phaseId: PhaseId; blocks: Block[] };

type Schedule = {
  /** Working days for each phase, in order. */
  lengths: number[];
  /** What the work usually takes, including the minimum for Build. */
  neededDays: number;
  /** What the plan runs for, once fitted to the timeline. */
  plannedDays: number;
};

/**
 * Fits the phases to the visitor's timeline. A plan with Build gives Build most
 * of the spare time, because that's the part we can't estimate. Otherwise phases
 * grow evenly, up to a limit, because small work shouldn't fill a long timeline.
 * A plan too long for the timeline is squeezed to end on time.
 */
function schedulePhases(groups: readonly PhaseGroup[], time: IntakeAnswers["time"]): Schedule {
  const needed = groups.map(({ phaseId, blocks }) => {
    const days = blocks.reduce((sum, block) => sum + effortInDays(block.estimatedEffort), 0);
    return phaseId === BUILD_PHASE ? Math.max(days, MIN_BUILD_DAYS) : days;
  });
  const neededDays = needed.reduce((sum, days) => sum + days, 0);
  if (time === NOT_SURE || neededDays === 0) return { lengths: needed, neededDays, plannedDays: neededDays };

  const { plan, max } = TIMELINE_WEEKS[time];
  const build = groups.findIndex((group) => group.phaseId === BUILD_PHASE);
  const longest = build === -1 ? neededDays * MAX_STRETCH : Infinity;
  const plannedDays = Math.min(Math.max(neededDays, Math.min(plan * DAYS_PER_WEEK, longest)), max * DAYS_PER_WEEK);
  const spare = plannedDays - neededDays;
  const others = neededDays - (needed[build] ?? 0);
  if (build === -1 || spare <= 0 || others === 0) {
    const lengths = needed.map((days) => (days * plannedDays) / neededDays);
    return { lengths, neededDays, plannedDays };
  }
  const forBuild = spare * BUILD_SHARE_OF_SPARE;
  const lengths = needed.map((days, index) => (index === build ? days + forBuild : days * (1 + (spare - forBuild) / others)));
  return { lengths, neededDays, plannedDays };
}

function paceFor({ lengths, neededDays, plannedDays }: Schedule, answers: IntakeAnswers, hasBuild: boolean, canFinishLater: boolean): PlanPace {
  const { time } = answers;
  const needed = durationText(neededDays);
  const planned = durationText(plannedDays);
  if (time === NOT_SURE) {
    return { status: "open", message: `This plan takes ${planned} at a steady pace, with no deadline to work to.` };
  }
  const { min, max } = TIMELINE_WEEKS[time];
  if (neededDays > max * DAYS_PER_WEEK) {
    return {
      status: "tight",
      message: `This is tight. The work usually takes ${needed}, and you have up to ${max} weeks. We've fitted it in, so expect to run steps side by side or do less of each.`,
    };
  }
  const fits = `This plan takes ${planned}, which fits your timeline.`;
  if (hasBuild) {
    if (plannedDays <= neededDays) return { status: "fits", message: fits };
    if (lengths.length === 1) return { status: "fits", message: `We've planned Build across ${planned} to suit your timeline.` };
    return { status: "fits", message: `We've planned this across ${planned} to suit your timeline, with most of the spare time going to Build.` };
  }
  if (neededDays < min * DAYS_PER_WEEK) {
    const nextStep = canFinishLater ? "Use it to go deeper, or come back and choose a later phase to finish." : "Use it to go deeper.";
    return { status: "spare", message: `This work usually takes ${needed}. We've allowed ${planned}, so you have time to spare. ${nextStep}` };
  }
  if (needed === planned) return { status: "fits", message: fits };
  return { status: "fits", message: `This work usually takes ${needed}. We've spread it across ${planned} to suit your timeline, and it may well need less.` };
}

// --- The summary ---

function whoText(answers: IntakeAnswers): string {
  const parts = [
    answers.pm === NOT_SURE ? "" : `PM type: ${labelOf(PM_TYPES, answers.pm)}`,
    answers.product === NOT_SURE ? "" : `Product: ${labelOf(PRODUCT_TYPES, answers.product)}`,
    answers.exp === NOT_SURE ? "" : `Experience: ${labelOf(EXPERIENCE_LEVELS, answers.exp).split(" (")[0]}`,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "Product manager";
}

function whereText(answers: IntakeAnswers, covered: readonly PhaseId[]): string {
  const opening = answers.stage === NOT_SURE ? "Not sure of your stage, so your plan starts at the beginning" : labelOf(STAGES, answers.stage);
  const first = labelOf(PHASES, covered[0]);
  const last = labelOf(PHASES, covered[covered.length - 1]);
  const span = covered.length === 1 ? `focused on ${first}` : `from ${first} to ${last}`;
  return `${opening}, ${span}.`;
}

function firstActions(phases: readonly PlanPhase[], count: number): PlanAction[] {
  return phases
    .flatMap((phase) => phase.blocks)
    .flatMap((block) => block.steps.map((step) => ({ blockId: block.id, blockTitle: block.title, text: step.text })))
    .slice(0, count);
}

/** Earlier work that the next actions rely on, listed once each. */
function checksBeforeActions(phases: readonly PlanPhase[], actions: readonly PlanAction[]): PlanBlock["checkFirst"] {
  const blocks = phases.flatMap((phase) => phase.blocks).filter((block) => actions.some((action) => action.blockId === block.id));
  const checks = new Map(blocks.flatMap((block) => block.checkFirst).map((check) => [check.id, check]));
  return [...checks.values()];
}

// --- Putting it together ---

export function buildPlan(answers: IntakeAnswers, blocks: readonly Block[]): Plan {
  const covered = phasesCovered(answers).map((phase) => phase.id);
  const eligible = blocks.filter((block) => fitsVisitor(block, answers));
  const inTimeline = eligible.filter((block) => block.kind === "core" || block.kind === "add-on");

  const byPhase = covered
    .map((phaseId) => ({
      phaseId,
      blocks: orderByDependency(inTimeline.filter((block) => placeIn(block, covered) === phaseId)),
    }))
    .filter((group) => group.blocks.length > 0);

  const schedule = schedulePhases(byPhase, answers.time);

  const titles = new Map(blocks.map((block) => [block.id, block.title]));
  const checksFor = (block: Block, done: ReadonlySet<string>) =>
    block.dependsOn.filter((id) => !done.has(id)).map((id) => ({ id, title: titles.get(id) ?? id }));

  const furthestFinish = finishOptions(answers).at(-1)?.id;
  const canFinishLater = furthestFinish !== undefined && furthestFinish !== covered[covered.length - 1];
  const pace = paceFor(schedule, answers, byPhase.some((group) => group.phaseId === BUILD_PHASE), canFinishLater);
  const phaseNote = (phaseId: PhaseId) => {
    if (phaseId === BUILD_PHASE) return BUILD_NOTE;
    return phaseId === "measure" && pace.status === "tight" ? MEASURE_NOTE : undefined;
  };

  // Walked in order, so a dependency only counts as covered if it comes earlier.
  const done = new Set<string>();
  let day = 0;
  const phases: PlanPhase[] = byPhase.map(({ phaseId, blocks: phaseBlocks }, index) => {
    const startDay = day;
    day += schedule.lengths[index];
    const shaped = phaseBlocks.map((block) => {
      const checkFirst = checksFor(block, done);
      done.add(block.id);
      return shapeBlock(block, answers, whyTimeline(block, answers, phaseId), checkFirst);
    });
    const phase = PHASES.find((item) => item.id === phaseId);
    return {
      id: phaseId,
      label: phase?.label ?? phaseId,
      readyWhen: phase?.readyWhen ?? "",
      weeks: weeksLabel(startDay, day),
      ...(phaseNote(phaseId) ? { note: phaseNote(phaseId) } : {}),
      blocks: shaped,
    };
  });

  const stage = stageFor(answers);
  const showOnboarding = stage === "mid-build" || stage === "live";
  const alongside = (kind: Block["kind"]) =>
    orderByDependency(eligible.filter((block) => block.kind === kind && placeIn(block, covered)));

  const nextActions = firstActions(phases, 3);

  return {
    who: whoText(answers),
    where: whereText(answers, covered),
    nextActions,
    checkBeforeActions: checksBeforeActions(phases, nextActions),
    // A live product's loop starts by measuring, so this work comes from the last release.
    checkBeforeLabel: answers.stage === "live" && phases[0]?.id === "measure" ? "From your last release, find" : "Make sure these are done first",
    pace,
    getUpToSpeed: showOnboarding
      ? alongside("onboarding").map((block) => shapeBlock(block, answers, whyOnboarding(answers), []))
      : [],
    phases,
    rhythm: alongside("ways-of-working").map((block) => shapeBlock(block, answers, whyRhythm(block, answers), [])),
  };
}
