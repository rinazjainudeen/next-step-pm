import {
  CAREER_LEVELS,
  CHALLENGES,
  COMPANY_SIZES,
  EXPERIENCE_IDS,
  WORK_KINDS,
  PHASES,
  PM_TYPES,
  PRODUCT_TYPES,
  ROLES,
  STAGES,
  TOOLS,
  WAYS_OF_WORKING,
  labelOf,
  type CompanySizeId,
  type ExperienceId,
  type PhaseId,
  type RoleId,
  type SkillId,
  type StageId,
  type TaskFallbackId,
  type TimelineId,
  type TrackId,
} from "../content/taxonomy";
import { blockPhases, type Block, type DelegatedTask } from "./blocks-types";
import { finishOptions, phasesCovered, trackFor } from "./intake-phases";
import { MAX_TEAM_COUNT, NOT_SURE, OTHER_TOOL, type IntakeAnswers, type TeamRoleId } from "./intake-types";
import { OPENING_LINES } from "./plan-wording";
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
 * The least time a plan allows for a phase. Blocks only count the PM's part of
 * Build, not the engineering, so without this it could look like a few hours.
 * Measure needs time for results to build up after launch.
 */
export const MIN_PHASE_DAYS: Partial<Record<PhaseId, number>> = { build: 20, measure: 20 };

/** Blocks in a phase overlap. Each block after the longest adds this share of its length. */
const OVERLAP_SHARE = 1 / 4;

/** How much of a plan's spare time goes to Build. The other phases share the rest. */
const BUILD_SHARE_OF_SPARE = 2 / 3;

/** With no Build, a plan runs to at most this many times what the work usually takes. */
const MAX_STRETCH = 3;

const BUILD_PHASE: PhaseId = "build";
/** Phases where a plan can be cut back to a smaller release. */
const RELEASE_PHASES: readonly PhaseId[] = ["plan", "build", "test", "launch"];
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

/** "Not sure" is pitched at product manager level. */
function careerLevelFor(answers: IntakeAnswers) {
  const id = answers.level === NOT_SURE ? "product-manager" : answers.level;
  return CAREER_LEVELS.find((level) => level.id === id) ?? CAREER_LEVELS[1];
}

function experienceFor(answers: IntakeAnswers): ExperienceId {
  return careerLevelFor(answers).steps;
}

/** "Not sure" assumes an established organisation. */
function sizeFor(answers: IntakeAnswers): CompanySizeId {
  return answers.size === NOT_SURE ? "established" : answers.size;
}

// --- 1. Select ---

/**
 * Places existing blocks on the visitor's track. A reused block becomes a
 * timeline block there, and follows the track's order, not its usual one. It's
 * replaced rather than copied, so it can't also appear in "Grow your skills".
 */
function placeOnTrack(blocks: readonly Block[], track: TrackId): Block[] {
  return blocks.map((block) => {
    const place = block.alsoIn?.find((item) => PHASES.find((phase) => phase.id === item.phase)?.track === track);
    if (!place) return block;
    const everyone = place.forEveryone ?? false;
    return {
      ...block,
      phase: place.phase,
      kind: everyone || block.kind === "craft" ? "core" : block.kind,
      dependsOn: place.after,
      comesAfter: place.after.length > 0 ? place.after : undefined,
      appliesTo: everyone ? { ...block.appliesTo, pmTypes: [], productTypes: [], experience: [] } : block.appliesTo,
    };
  });
}

/** "Not sure" starts from the beginning, so it counts as starting something new. */
function stageFor(answers: IntakeAnswers): StageId {
  return answers.stage === NOT_SURE ? "new" : answers.stage;
}

function matchesPmType(block: Block, answers: IntakeAnswers): boolean {
  return block.appliesTo.pmTypes.some((id) => answers.pm.some((chosen) => chosen === id));
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

/** An empty list means every level. "Not sure" counts as intermediate, the same as for steps. */
function fitsExperience(block: Block, answers: IntakeAnswers): boolean {
  const { experience } = block.appliesTo;
  return experience.length === 0 || experience.includes(experienceFor(answers));
}

/** Basics written for levels below the visitor's. They're kept, in "Refresh the basics". */
function isBelowLevel(block: Block, answers: IntakeAnswers): boolean {
  const { experience } = block.appliesTo;
  const visitor = EXPERIENCE_IDS.indexOf(experienceFor(answers));
  return experience.length > 0 && experience.every((level) => EXPERIENCE_IDS.indexOf(level) < visitor);
}

function fitsCompanySize(block: Block, answers: IntakeAnswers): boolean {
  const sizes = block.appliesTo.companySizes ?? [];
  return sizes.length === 0 || sizes.includes(sizeFor(answers));
}

/** Everything except the experience limit, which decides where a block goes, not whether it's kept. */
function fitsApartFromLevel(block: Block, answers: IntakeAnswers): boolean {
  return !block.placeholder && fitsPerson(block, answers) && fitsStage(block, answers) && fitsWayOfWorking(block, answers) && fitsCompanySize(block, answers);
}

/** The skills the visitor's challenge favours. "Not sure" favours none. */
function favouredSkills(answers: IntakeAnswers): readonly SkillId[] {
  return CHALLENGES.find((challenge) => challenge.id === answers.challenge)?.favours ?? [];
}

function helpsChallenge(block: Block, answers: IntakeAnswers): boolean {
  const favoured = favouredSkills(answers);
  return !block.optional && block.skills.some((skill) => favoured.includes(skill));
}

function movesUp(block: Block, answers: IntakeAnswers): boolean {
  return block.movesUpFor?.includes(sizeFor(answers)) ?? false;
}

/** The first phase of this plan that the block belongs to, if any. */
function placeIn(block: Block, covered: readonly PhaseId[]): PhaseId | undefined {
  const phases = blockPhases(block.phase);
  return covered.find((id) => phases.includes(id));
}

// --- 2. Order ---

/**
 * Puts blocks after whatever they depend on or come after within the same
 * phase. When several could go next, a block with a place to follow goes first,
 * and an add-on goes before core work, so it sits straight after what it
 * extends. "Go further" blocks always go last. A block that moves up for the
 * visitor's organisation goes as early as its dependencies allow. In the
 * timeline, a block that helps with the visitor's challenge goes as early as
 * its dependencies and order links allow, so the agreed order still holds.
 */
function orderByDependency(blocks: readonly Block[], answers: IntakeAnswers, favourChallenge = false): Block[] {
  const present = new Set(blocks.map((block) => block.id));
  const follows = (block: Block) => (movesUp(block, answers) ? [] : (block.comesAfter ?? []).filter((id) => present.has(id)));
  const rank = (block: Block) => {
    if (movesUp(block, answers)) return -1;
    if (block.optional) return 4;
    // After an add-on that follows the block just placed, so add-ons still sit straight after what they extend.
    if (favourChallenge && helpsChallenge(block, answers) && !(block.kind === "add-on" && follows(block).length > 0)) return 0.5;
    if (follows(block).length > 0) return block.kind === "add-on" ? 0 : 1;
    return block.kind === "core" ? 2 : 3;
  };
  const remaining = [...blocks].sort((a, b) => rank(a) - rank(b) || (a.id < b.id ? -1 : 1));
  const ordered: Block[] = [];
  while (remaining.length > 0) {
    const waiting = new Set(remaining.map((block) => block.id));
    const ready = remaining.findIndex((block) => ![...block.dependsOn, ...follows(block)].some((id) => waiting.has(id)));
    // The validator rejects circular dependencies. This just means a bad file can't hang the page.
    ordered.push(...remaining.splice(Math.max(ready, 0), 1));
  }
  return ordered;
}

// --- 3 to 5. Shape, assign and tools ---

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

/** With no existing product, there's nobody who has worked on it. */
const NO_PRODUCT_ASK_AROUND = "Ask a colleague who knows this area.";

function hasExistingProduct(answers: IntakeAnswers): boolean {
  return answers.stage === "mid-build" || answers.stage === "live";
}

function missingRoleNote(ifMissing: TaskFallbackId, answers: IntakeAnswers): string {
  return ifMissing === "ask-around" && !hasExistingProduct(answers) ? NO_PRODUCT_ASK_AROUND : MISSING_ROLE_NOTE[ifMissing];
}

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
  return { roleLabel, task, inTeam: false, who: `No ${person} in your team`, note: missingRoleNote(ifMissing, answers) };
}

function toolExamples(block: Block, answers: IntakeAnswers): PlanToolExample[] {
  return answers.tools.flatMap((tool) => {
    const tip = tool === NOT_SURE || tool === OTHER_TOOL ? undefined : block.toolExamples[tool];
    return tip ? [{ toolLabel: labelOf(TOOLS, tool), tip }] : [];
  });
}

// --- 7. Explain ---

const matchedPmTypes = (block: Block, answers: IntakeAnswers) =>
  answers.pm.filter((id) => block.appliesTo.pmTypes.some((type) => type === id)).map((id) => labelOf(PM_TYPES, id)).join(" and ");

function whyCompanySize(answers: IntakeAnswers): string {
  if (answers.size === NOT_SURE) return "Because we've assumed an established organisation.";
  return `Because you chose ${labelOf(COMPANY_SIZES, answers.size)} as the size of your organisation.`;
}

function whyTimeline(block: Block, answers: IntakeAnswers, phaseId: PhaseId): string {
  if (block.kind === "add-on") {
    const reasons = [
      matchesPmType(block, answers) ? `${matchedPmTypes(block, answers)} as your kind of PM` : "",
      matchesProduct(block, answers) ? `${labelOf(PRODUCT_TYPES, answers.product)} as your product` : "",
    ].filter(Boolean);
    if (reasons.length > 0) return `Because you chose ${reasons.join(" and ")}.`;
    if (block.appliesTo.companySizes?.length) return whyCompanySize(answers);
  }
  return `Because your plan covers ${labelOf(PHASES, phaseId)}.`;
}

function whyRhythm(block: Block, answers: IntakeAnswers): string {
  if (block.appliesTo.waysOfWorking.length === 0) return "Because it suits any team.";
  return `Because your team works with ${labelOf(WAYS_OF_WORKING, answers.way)}.`;
}

/** A skill for one level is more specific than one for two, so it comes first. */
const byNarrowestLevel = (a: Block, b: Block) => a.appliesTo.experience.length - b.appliesTo.experience.length;

function whyRefresh(): string {
  return "Because you've moved past this level. It's here if you want to check the basics.";
}

function whyLead(): string {
  return "Because you lead other product people.";
}

function whyCraft(block: Block): string {
  if (block.appliesTo.experience.length === 0) return "Because it's a useful skill at any level.";
  return "Because it suits your experience.";
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

function titleFor(block: Block, answers: IntakeAnswers): string {
  return answers.stage === "live" && block.titleWhenLive ? block.titleWhenLive : block.title;
}

function shapeBlock(block: Block, answers: IntakeAnswers, why: string, checkFirst: PlanBlock["checkFirst"], helps = false): PlanBlock {
  const level = experienceFor(answers);
  const tools = toolExamples(block, answers);
  return {
    id: block.id,
    title: titleFor(block, answers),
    summary: block.summary,
    kind: block.kind,
    ...(block.optional ? { optional: true } : {}),
    ...(movesUp(block, answers) ? { movedUp: true } : {}),
    ...(helps ? { helpsChallenge: true } : {}),
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

/** Blocks in a phase overlap, so a phase is its longest block plus a share of the rest. */
function phaseDays(blocks: readonly Block[]): number {
  const days = blocks.map((block) => effortInDays(block.estimatedEffort));
  const total = days.reduce((sum, value) => sum + value, 0);
  const longest = Math.max(0, ...days);
  return longest + (total - longest) * OVERLAP_SHARE;
}

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
    // "Go further" blocks are extra, so they don't add to the plan's length.
    const days = phaseDays(blocks.filter((block) => !block.optional));
    return Math.max(days, MIN_PHASE_DAYS[phaseId] ?? 0);
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

/** What a visitor can do about a plan that won't fit in under a month. */
function tightAdvice(covered: readonly PhaseId[], canFinishEarlier: boolean, track: TrackId): string {
  const canNarrow = covered.some((id) => RELEASE_PHASES.includes(id));
  const finishFirst = "finish one phase first by choosing an earlier finish in Your answers";
  if (canNarrow && canFinishEarlier) return `To make this realistic, narrow it to the smallest valuable release, or ${finishFirst}.`;
  if (canNarrow) return "To make this realistic, narrow it to the smallest valuable release.";
  if (canFinishEarlier) return `To make this realistic, ${finishFirst}.`;
  if (track !== "product") return "To make this realistic, narrow the scope, or move the milestone.";
  return "To make this realistic, narrow what you need to learn, or move the milestone.";
}

function paceFor({ lengths, neededDays, plannedDays }: Schedule, answers: IntakeAnswers, hasBuild: boolean, canFinishLater: boolean, advice: string): PlanPace {
  const { time } = answers;
  const needed = durationText(neededDays);
  const planned = durationText(plannedDays);
  if (time === NOT_SURE) {
    return { status: "open", message: `This plan takes ${planned} at a steady pace, with no deadline to work to.` };
  }
  const { min, max } = TIMELINE_WEEKS[time];
  if (neededDays > max * DAYS_PER_WEEK) {
    const opening = `This is tight. The work usually takes ${needed}, and you have up to ${max} weeks.`;
    if (time === "under-1m") return { status: "tight", message: `${opening} We've fitted it in, so expect steps to run side by side. ${advice}` };
    return { status: "tight", message: `${opening} We've fitted it in, so expect to run steps side by side or do less of each.` };
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
  const track = trackFor(answers.work);
  const parts = [
    track === "product" ? "" : `Work: ${labelOf(WORK_KINDS, track)}`,
    answers.pm.includes(NOT_SURE) ? "" : `PM type: ${answers.pm.map((id) => labelOf(PM_TYPES, id)).join(" and ")}`,
    answers.product === NOT_SURE ? "" : `Product: ${labelOf(PRODUCT_TYPES, answers.product)}`,
    answers.level === NOT_SURE ? "" : `Level: ${careerLevelFor(answers).short}`,
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

/**
 * The first steps of the plan, in order. If a block helps with the visitor's
 * challenge, the actions start there instead.
 */
function firstActions(phases: readonly PlanPhase[], count: number): PlanAction[] {
  const blocks = phases.flatMap((phase) => phase.blocks).filter((block) => !block.optional);
  const firstHelping = blocks.findIndex((block) => block.helpsChallenge);
  return blocks
    .slice(Math.max(firstHelping, 0))
    .flatMap((block) => block.steps.map((step) => ({ blockId: block.id, blockTitle: block.title, text: step.text })))
    .slice(0, count);
}

/** One sentence for the level, then one for the first PM type or the track. */
function openingLine(answers: IntakeAnswers, track: TrackId): string {
  const level = OPENING_LINES.levels[answers.level];
  if (track !== "product") return `${level} ${OPENING_LINES.tracks[track]}`;
  const first = answers.pm[0];
  return `${level} ${OPENING_LINES.pmTypes[first === undefined || first === NOT_SURE ? "general" : first]}`;
}

/** Earlier work that the next actions rely on, listed once each. */
function checksBeforeActions(phases: readonly PlanPhase[], actions: readonly PlanAction[]): PlanBlock["checkFirst"] {
  const blocks = phases.flatMap((phase) => phase.blocks).filter((block) => actions.some((action) => action.blockId === block.id));
  const checks = new Map(blocks.flatMap((block) => block.checkFirst).map((check) => [check.id, check]));
  return [...checks.values()];
}

// --- Putting it together ---

export function buildPlan(answers: IntakeAnswers, allBlocks: readonly Block[]): Plan {
  const track = trackFor(answers.work);
  const blocks = placeOnTrack(allBlocks, track);
  const covered = phasesCovered(answers).map((phase) => phase.id);
  const kept = blocks.filter((block) => fitsApartFromLevel(block, answers));
  const others = kept.filter((block) => !block.appliesTo.leadsPeople);
  const leads = careerLevelFor(answers).leadsPeople;
  const leadBlocks = leads ? kept.filter((block) => block.appliesTo.leadsPeople || block.inLeadYourTeam) : [];
  const eligible = others.filter((block) => fitsExperience(block, answers));
  const inTimeline = eligible.filter((block) => block.kind === "core" || block.kind === "add-on");

  const byPhase = covered
    .map((phaseId) => ({
      phaseId,
      blocks: orderByDependency(inTimeline.filter((block) => placeIn(block, covered) === phaseId), answers, true),
    }))
    .filter((group) => group.blocks.length > 0);

  const schedule = schedulePhases(byPhase, answers.time);

  const titles = new Map(blocks.map((block) => [block.id, titleFor(block, answers)]));
  const checksFor = (block: Block, done: ReadonlySet<string>) =>
    block.dependsOn.filter((id) => !done.has(id)).map((id) => ({ id, title: titles.get(id) ?? id }));

  const furthestFinish = finishOptions(answers).at(-1)?.id;
  const canFinishLater = furthestFinish !== undefined && furthestFinish !== covered[covered.length - 1];
  const canFinishEarlier = furthestFinish !== undefined && covered.length > 1;
  const advice = tightAdvice(covered, canFinishEarlier, track);
  const pace = paceFor(schedule, answers, byPhase.some((group) => group.phaseId === BUILD_PHASE), canFinishLater, advice);
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
      return shapeBlock(block, answers, whyTimeline(block, answers, phaseId), checkFirst, helpsChallenge(block, answers));
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

  const showOnboarding = hasExistingProduct(answers);
  const alongside = (kind: Block["kind"]) =>
    orderByDependency(eligible.filter((block) => block.kind === kind && placeIn(block, covered)), answers);

  const nextActions = firstActions(phases, 3);
  const onTimeline = new Set(byPhase.flatMap((group) => group.blocks.map((block) => block.id)));
  // Team rituals suit a product team. A strategy or coaching plan, or a PM with no team, doesn't run them.
  const noTeam = answers.team.includes(NOT_SURE);
  const rhythm = track === "product" ? alongside("ways-of-working").filter((block) => !noTeam || block.worksWithoutTeam) : [];
  const skills = alongside("craft");
  const shapeSkill = (block: Block) => shapeBlock(block, answers, whyCraft(block), []);

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
    rhythm: rhythm.map((block) => shapeBlock(block, answers, whyRhythm(block, answers), [])),
    leadYourTeam: orderByDependency(leadBlocks.filter((block) => !onTimeline.has(block.id)), answers).map((block) => shapeBlock(block, answers, whyLead(), [])),
    leaderNudge: leads && track === "product",
    openingLine: openingLine(answers, track),
    newToProductFirst: answers.challenge === "new-to-role" && showOnboarding,
    skillsFirst: answers.challenge === "grow",
    refreshBasics: orderByDependency(others.filter((block) => isBelowLevel(block, answers) && placeIn(block, covered)), answers).map((block) =>
      shapeBlock(block, answers, whyRefresh(), []),
    ),
    skillsForLevel: skills.filter((block) => block.appliesTo.experience.length > 0).sort(byNarrowestLevel).map(shapeSkill),
    skillsAnyLevel: skills.filter((block) => block.appliesTo.experience.length === 0).map(shapeSkill),
  };
}
