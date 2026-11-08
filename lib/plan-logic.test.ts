import { test } from "node:test";
import assert from "node:assert/strict";
import { CAREER_LEVELS, CHALLENGES, CHALLENGE_IDS, COMPANY_SIZE_IDS, SKILLS, EXPERIENCE_IDS, PHASES, PM_TYPE_IDS, PRODUCT_TYPE_IDS, ROLES, STAGES, TIMELINE_IDS, TOOL_IDS, TOOLS, WAY_OF_WORKING_IDS, labelOf } from "../content/taxonomy";
import { loadBlocks } from "./blocks-load";
import { blockPhases, type Block } from "./blocks-types";
import { buildPlan, effortInDays } from "./curriculum-engine";
import { tidyDraft } from "./intake-draft";
import { finishOptions, phasesForStage, stagesFor, trackFor } from "./intake-phases";
import { TEAM_ROLE_IDS } from "./intake-questions";
import { NOT_SURE, OTHER_TOOL, type IntakeAnswers, type IntakeDraft } from "./intake-types";
import { parseDraft, planHref, readerFromRecord, startHref, withOldLinkDefaults } from "./intake-url";
import { HOME_STATS } from "./site-stats";
import { firstUnansweredStep, validateDraft } from "./intake-validate";
import type { Plan } from "./plan-types";

/**
 * The permanent logic checks. Each rule below must hold for any plan a visitor
 * can reach, whatever blocks exist, so new blocks are covered automatically.
 *
 * These rules are worked out separately from the engine, from the content
 * model, so a mistake in the engine can't hide itself.
 */

const BLOCKS = loadBlocks();
const WORK_ANSWERS: IntakeDraft["work"][] = ["product", "strategy", "coaching", NOT_SURE];
const byId = new Map(BLOCKS.map((block) => [block.id, block]));
const DAYS_PER_WEEK = 5;

// Written out here on purpose, so changing a number in the engine fails a test.
const MIN_PHASE_DAYS: Record<string, number> = { build: 20, measure: 20 };
const OVERLAP_SHARE = 1 / 4;
const BUILD_SHARE = 2 / 3;
const MAX_STRETCH = 3;
const RULES = {
  "under-1m": { min: 0, plan: 0, max: 4 },
  "1-3m": { min: 4, plan: 9, max: 13 },
  "3-6m": { min: 13, plan: 20, max: 26 },
  "6m-plus": { min: 26, plan: 26, max: Infinity },
};

// --- The answers to try ---

type Route = Pick<IntakeDraft, "stage" | "phase" | "time" | "until"> & { work?: IntakeDraft["work"] };

/** Every route a visitor can take through the stage and timeline questions. */
function allRoutes(): Route[] {
  return WORK_ANSWERS.flatMap((work) => {
    const stages: IntakeDraft["stage"][] = [...stagesFor(work).map((stage) => stage.id), NOT_SURE];
    return stages.flatMap((stage) => {
      const starts = phasesForStage(stage).map((phase) => phase.id);
      const phases: IntakeDraft["phase"][] = starts.length > 0 ? [...starts, NOT_SURE] : [null];
      return phases.flatMap((phase) =>
        ([...TIMELINE_IDS, NOT_SURE] as IntakeDraft["time"][]).flatMap((time) => {
          const finishes = finishOptions({ work, stage, phase, time }).map((option) => option.id);
          const untils: IntakeDraft["until"][] = finishes.length > 0 ? [...finishes, NOT_SURE] : [null];
          return untils.map((until) => ({ work, stage, phase, time, until }));
        }),
      );
    });
  });
}

const TEAMS: Pick<IntakeAnswers, "team" | "teamCounts">[] = [
  { team: [NOT_SURE], teamCounts: {} },
  ...TEAM_ROLE_IDS.map((role) => ({ team: [role], teamCounts: {} })),
  { team: ["qa"], teamCounts: { qa: 3 } },
  { team: ["policy-legal"], teamCounts: { "policy-legal": 2 } },
  { team: ["backend-engineer", "fullstack-engineer", "architect"], teamCounts: { "backend-engineer": 6, "fullstack-engineer": 3 } },
  { team: ["ba", "ux-designer", "tech-lead", "qa"], teamCounts: { "ux-designer": 2 } },
  { team: [...TEAM_ROLE_IDS], teamCounts: Object.fromEntries(TEAM_ROLE_IDS.map((role) => [role, 20])) },
];

const TOOL_SETS: IntakeAnswers["tools"][] = [[NOT_SURE], [OTHER_TOOL], ...TOOL_IDS.map((tool) => [tool]), ["jira", OTHER_TOOL], [...TOOL_IDS]];

const PM_ANSWERS: IntakeAnswers["pm"][] = [...PM_TYPE_IDS.map((id) => [id]), ["ai", "hardware"], ["growth", "platform"], ["data", "transformation"]];
const PEOPLE = PM_ANSWERS.flatMap((pm) => PRODUCT_TYPE_IDS.map((product) => ({ pm, product })));
const WAYS = [...WAY_OF_WORKING_IDS, NOT_SURE] as const;
const LEVELS = [...CAREER_LEVELS.map((level) => level.id), NOT_SURE] as const;
const SIZES = [...COMPANY_SIZE_IDS, NOT_SURE] as const;
const CHALLENGE_ANSWERS = [...CHALLENGE_IDS, NOT_SURE] as const;
const FAVOURS: Record<string, readonly string[]> = Object.fromEntries(CHALLENGES.map((challenge) => [challenge.id, challenge.favours]));
const STEPS_FOR: Record<string, string> = { associate: "beginner", "product-manager": "intermediate", senior: "experienced", group: "experienced", director: "experienced", vp: "experienced", [NOT_SURE]: "intermediate" };
const LEADS_PEOPLE = ["group", "director", "vp"];
const levelOf = (answers: IntakeAnswers) => STEPS_FOR[answers.level] as (typeof EXPERIENCE_IDS)[number];
const sizeOf = (answers: IntakeAnswers) => (answers.size === NOT_SURE ? "established" : answers.size);

function answersFor(route: Route, pick: Partial<IntakeAnswers>): IntakeAnswers {
  const result = validateDraft(tidyDraft({ work: "product", pm: ["general"], product: "b2b", level: "product-manager", size: "scaling", challenge: NOT_SURE, team: ["ba"], teamCounts: {}, tools: ["jira"], way: "scrum", ...route, ...pick }));
  assert.ok(result.ok, `A reachable answer set failed validation: ${JSON.stringify({ route, pick })}`);
  return result.answers;
}

// --- The rules ---

const isPlaced = (block: Block, phaseId: string) => blockPhases(block.phase).some((id) => id === phaseId);

/** The blocks as a track sees them: a reused block takes its track place, order and limits. */
function blocksOnTrack(track: string): Block[] {
  return BLOCKS.map((block) => {
    const place = block.alsoIn?.find((item) => PHASES.find((phase) => phase.id === item.phase)?.track === track);
    if (!place) return block;
    const { appliesTo } = block;
    return {
      ...block,
      phase: place.phase,
      kind: place.forEveryone || block.kind === "craft" ? "core" : block.kind,
      dependsOn: place.after,
      comesAfter: place.after,
      appliesTo: place.forEveryone ? { ...appliesTo, pmTypes: [], productTypes: [], experience: [] } : appliesTo,
    };
  });
}

function expectedPhases(answers: IntakeAnswers): string[] {
  const stage = STAGES.find((item) => item.id === answers.stage) ?? STAGES.find((item) => item.track === trackFor(answers.work)) ?? STAGES[0];
  const journey: readonly string[] = stage.journey;
  const start = answers.phase === null || answers.phase === NOT_SURE ? 0 : journey.indexOf(answers.phase);
  const usualEnd = journey.indexOf(stage.phases[stage.phases.length - 1]);
  const usualFinish = stage.id === "live" && start >= usualEnd ? journey.length - 1 : usualEnd;
  const finish = answers.until === null || answers.until === NOT_SURE ? usualFinish : journey.indexOf(answers.until);
  return journey.slice(start, finish + 1);
}

function fitsApartFromLevel(block: Block, answers: IntakeAnswers): boolean {
  const { pmTypes, productTypes, stages, waysOfWorking, companySizes = [], leadsPeople } = block.appliesTo;
  const person = (pmTypes.length === 0 && productTypes.length === 0) || pmTypes.some((id) => answers.pm.some((chosen) => chosen === id)) || productTypes.some((id) => id === answers.product);
  const stage = answers.stage === NOT_SURE ? "new" : answers.stage;
  const way = waysOfWorking.length === 0 || waysOfWorking.some((id) => id === answers.way);
  const size = companySizes.length === 0 || companySizes.includes(sizeOf(answers));
  return !block.placeholder && person && (stages.length === 0 || stages.includes(stage)) && way && size && !leadsPeople;
}

function fits(block: Block, answers: IntakeAnswers): boolean {
  const { experience } = block.appliesTo;
  return fitsApartFromLevel(block, answers) && (experience.length === 0 || experience.includes(levelOf(answers)));
}

/** Written only for levels below the visitor's. */
function isBelow(block: Block, answers: IntakeAnswers): boolean {
  const { experience } = block.appliesTo;
  const visitor = EXPERIENCE_IDS.indexOf(levelOf(answers));
  return experience.length > 0 && experience.every((level) => EXPERIENCE_IDS.indexOf(level) < visitor);
}

const sorted = (ids: readonly string[]) => [...ids].sort();

const BAD_WORDING: [string, RegExp][] = [
  ["undefined", /\bundefined\b/],
  ["null", /\bnull\b/],
  ["NaN", /NaN/],
  ["Infinity", /Infinity/],
  ["a raw id", /\b(not-sure|under-1m|1-3m|3-6m|6m-plus|mid-build|data-ai)\b/],
  ["a double space", / {2}/],
  ["a double full stop", /\.\./],
  ["a space before punctuation", / [.,;:]/],
  ["a wrong article", /\b[Aa] (?:Architect|Engineer|Analyst|Officer)/],
  ["a singular count", /\b1 [A-Z]\w+s\b/],
  ["zero of something", /\b(your|about) 0\b/],
  ["a week range that goes nowhere", /Weeks (\d+) to \1\b/],
  ["an empty start", /^\s/],
];

const weekRange = (label: string): [number, number] => {
  const match = /^Weeks? (\d+)(?: to (\d+))?$/.exec(label);
  assert.ok(match, `"${label}" isn't a week label`);
  return [Number(match[1]), Number(match[2] ?? match[1])];
};

/** Works out each phase's weeks from the timing rules in docs/content-model.md. */
function expectedSchedule(plan: Plan, answers: IntakeAnswers) {
  const needed = plan.phases.map((phase) => {
    const efforts = phase.blocks.filter((block) => !block.optional).map((block) => effortInDays(block.effort));
    const longest = Math.max(0, ...efforts);
    const days = longest + (efforts.reduce((total, effort) => total + effort, 0) - longest) * OVERLAP_SHARE;
    return Math.max(days, MIN_PHASE_DAYS[phase.id] ?? 0);
  });
  const neededDays = needed.reduce((sum, days) => sum + days, 0);
  const build = plan.phases.findIndex((phase) => phase.id === "build");
  let lengths = needed;
  let plannedDays = neededDays;
  let status: Plan["pace"]["status"] = "open";
  if (answers.time !== NOT_SURE) {
    const { min, plan: planWeeks, max } = RULES[answers.time];
    const limit = build === -1 ? neededDays * MAX_STRETCH : Infinity;
    plannedDays = Math.min(Math.max(neededDays, Math.min(planWeeks * DAYS_PER_WEEK, limit)), max * DAYS_PER_WEEK);
    status = neededDays > max * DAYS_PER_WEEK ? "tight" : build === -1 && neededDays < min * DAYS_PER_WEEK ? "spare" : "fits";
    const spare = plannedDays - neededDays;
    const others = neededDays - (needed[build] ?? 0);
    lengths =
      build === -1 || spare <= 0 || others === 0
        ? needed.map((days) => (days * plannedDays) / neededDays)
        : needed.map((days, index) => (index === build ? days + spare * BUILD_SHARE : days + (spare * (1 - BUILD_SHARE) * days) / others));
  }
  let day = 0;
  const round = (days: number) => Math.round((days / DAYS_PER_WEEK) * 1000) / 1000;
  const labels = lengths.map((length) => {
    const first = Math.floor(round(day)) + 1;
    day += length;
    const last = Math.max(first, Math.ceil(round(day)));
    return first === last ? `Week ${first}` : `Weeks ${first} to ${last}`;
  });
  return { labels, status, neededDays, plannedDays };
}

/** Returns everything wrong with a plan, in plain English. Empty means it's sound. */
export function problemsWith(answers: IntakeAnswers, plan: Plan): string[] {
  const problems: string[] = [];
  const track = trackFor(answers.work);
  const BLOCKS = blocksOnTrack(track);
  const byId = new Map(BLOCKS.map((block) => [block.id, block]));
  const timeline = plan.phases.flatMap((phase) => phase.blocks);
  const required = timeline.filter((block) => !block.optional);
  const skills = [...plan.skillsForLevel, ...plan.skillsAnyLevel];
  const everyBlock = [...plan.getUpToSpeed, ...timeline, ...plan.rhythm, ...skills, ...plan.refreshBasics, ...plan.leadYourTeam];
  const covered = expectedPhases(answers);
  const level = levelOf(answers);

  // Shape
  if (plan.phases.length === 0) problems.push("The plan has no phases.");
  if (plan.nextActions.length !== Math.min(3, required.flatMap((block) => block.steps).length)) problems.push("The plan doesn't have 3 next actions.");
  if (plan.nextActions.some((action) => !required.some((block) => block.id === action.blockId))) problems.push("A next action comes from a Go further block.");
  // The challenge: marked blocks build a favoured skill, and the next actions start at the first one.
  const favoured = FAVOURS[answers.challenge] ?? [];
  for (const block of timeline) {
    const shouldMark = !block.optional && (byId.get(block.id) as Block).skills.some((skill) => favoured.includes(skill));
    if ((block.helpsChallenge ?? false) !== shouldMark) problems.push(`${block.id} is wrongly${shouldMark ? " not" : ""} marked as helping with the challenge.`);
  }
  const fromMarked = required.slice(Math.max(required.findIndex((block) => block.helpsChallenge), 0));
  if (plan.nextActions.some((action, index) => action.text !== fromMarked.flatMap((block) => block.steps)[index]?.text)) problems.push("The next actions don't start at the right block.");
  if (plan.skillsFirst !== (answers.challenge === "grow")) problems.push("Grow your skills is in the wrong place.");
  if (plan.newToProductFirst !== (answers.challenge === "new-to-role" && plan.getUpToSpeed.length > 0)) problems.push("The new-to-product section is in the wrong place.");
  if (timeline.some((block) => (byId.get(block.id) as Block).optional !== block.optional)) problems.push("A Go further block isn't marked.");
  for (const phase of plan.phases) {
    const firstOptional = phase.blocks.findIndex((block) => block.optional);
    if (firstOptional !== -1 && phase.blocks.slice(firstOptional).some((block) => !block.optional)) problems.push(`${phase.id} has a required block after a Go further block.`);
  }
  if (plan.phases.some((phase) => phase.blocks.length === 0)) problems.push("A phase has no blocks.");
  const ids = everyBlock.map((block) => block.id);
  if (new Set(ids).size !== ids.length) problems.push(`A block appears twice: ${ids.join(", ")}.`);

  // Phases and blocks
  const usedPhases = plan.phases.map((phase) => phase.id);
  const expected = covered.filter((phaseId) => BLOCKS.some((block) => (block.kind === "core" || block.kind === "add-on") && fits(block, answers) && isPlaced(block, phaseId)));
  if (usedPhases.join() !== expected.join()) problems.push(`Phases are ${usedPhases.join()}, expected ${expected.join()}.`);
  for (const phase of plan.phases) {
    for (const block of phase.blocks) {
      if (!isPlaced(byId.get(block.id) as Block, phase.id)) problems.push(`${block.id} is in the wrong phase, ${phase.id}.`);
    }
  }
  const eligible = (kinds: readonly string[]) => BLOCKS.filter((block) => kinds.includes(block.kind) && fits(block, answers) && covered.some((phaseId) => isPlaced(block, phaseId))).map((block) => block.id);
  if (sorted(timeline.map((block) => block.id)).join() !== sorted(eligible(["core", "add-on"])).join()) problems.push("The timeline has the wrong blocks.");
  // Team rituals are for product teams: none on the other tracks, and none with no team roles.
  const noTeam = answers.team.includes(NOT_SURE);
  const rhythm = track === "product" ? eligible(["ways-of-working"]).filter((id) => !noTeam || id === "wow-stakeholder-updates") : [];
  if (sorted(plan.rhythm.map((block) => block.id)).join() !== sorted(rhythm).join()) problems.push("The rhythm section has the wrong blocks.");
  if (sorted(skills.map((block) => block.id)).join() !== sorted(eligible(["craft"])).join()) problems.push("Grow your skills has the wrong blocks.");
  const refresh = BLOCKS.filter((block) => fitsApartFromLevel(block, answers) && isBelow(block, answers) && covered.some((phaseId) => isPlaced(block, phaseId))).map((block) => block.id);
  if (sorted(plan.refreshBasics.map((block) => block.id)).join() !== sorted(refresh).join()) problems.push("Refresh the basics has the wrong blocks.");
  // The fundamentals rule: a block a lower level would get is never lost, only moved.
  const lowerLevel = BLOCKS.filter((block) => block.appliesTo.experience.length > 0 && !block.appliesTo.experience.includes(level) && fitsApartFromLevel(block, answers) && isBelow(block, answers) && covered.some((phaseId) => isPlaced(block, phaseId)));
  if (lowerLevel.some((block) => !ids.includes(block.id))) problems.push("A basic was dropped instead of moving to Refresh the basics.");
  const leads = LEADS_PEOPLE.includes(answers.level);
  const onTimeline = timeline.map((block) => block.id);
  const leadExpected = leads ? BLOCKS.filter((block) => (block.appliesTo.leadsPeople || block.inLeadYourTeam) && !onTimeline.includes(block.id)).map((block) => block.id) : [];
  if (plan.leaderNudge !== (leads && track === "product")) problems.push(`The leader nudge is wrongly ${plan.leaderNudge ? "shown" : "hidden"}.`);
  const wrongTrack = plan.phases.filter((phase) => PHASES.find((item) => item.id === phase.id)?.track !== track);
  if (wrongTrack.length > 0) problems.push(`A phase is from the wrong track: ${wrongTrack[0].id}.`);
  if (track !== "product" && plan.getUpToSpeed.length > 0) problems.push("A strategy or coaching plan shows product onboarding.");
  if (sorted(plan.leadYourTeam.map((block) => block.id)).join() !== sorted(leadExpected).join()) problems.push("Lead your team has the wrong blocks.");
  for (const block of everyBlock) {
    const shouldMove = (byId.get(block.id) as Block).movesUpFor?.includes(sizeOf(answers)) ?? false;
    if (shouldMove !== (block.movedUp ?? false)) problems.push(`${block.id} is wrongly${shouldMove ? " not" : ""} marked as moved up.`);
  }
  const levelsOf = (id: string) => (byId.get(id) as Block).appliesTo.experience.length;
  if (plan.skillsForLevel.some((block) => levelsOf(block.id) === 0)) problems.push("A skill for every level is listed as picked for your level.");
  if (plan.skillsAnyLevel.some((block) => levelsOf(block.id) !== 0)) problems.push("A level-specific skill is listed as useful at any level.");
  const narrowing = plan.skillsForLevel.map((block) => levelsOf(block.id));
  if (narrowing.some((levels, index) => index > 0 && levels < narrowing[index - 1])) problems.push("The most specific skills don't come first.");
  const onboarding = answers.stage === "mid-build" || answers.stage === "live" ? eligible(["onboarding"]) : [];
  if (sorted(plan.getUpToSpeed.map((block) => block.id)).join() !== sorted(onboarding).join()) problems.push("Get up to speed has the wrong blocks.");

  // Dependencies
  const earlier = new Set<string>();
  for (const block of timeline) {
    const source = byId.get(block.id) as Block;
    const toCheck = block.checkFirst.map((check) => check.id);
    for (const dependency of source.dependsOn) {
      if (earlier.has(dependency) === toCheck.includes(dependency)) problems.push(`${block.id}: ${dependency} must be earlier or a check, and not both.`);
    }
    if (toCheck.some((id) => !source.dependsOn.includes(id))) problems.push(`${block.id} checks something it doesn't depend on.`);
    earlier.add(block.id);
  }
  for (const phase of plan.phases) {
    const inPhase = phase.blocks.map((block) => block.id);
    const outOfOrder = phase.blocks.flatMap((block) => block.checkFirst).filter((check) => inPhase.includes(check.id));
    if (outOfOrder.length > 0) problems.push(`${outOfOrder[0].id} comes after a block that depends on it, in the same phase.`);
  }
  const actionBlocks = new Set(plan.nextActions.map((action) => action.blockId));
  const hidden = timeline.filter((block) => actionBlocks.has(block.id)).flatMap((block) => block.checkFirst).filter((check) => !plan.checkBeforeActions.some((item) => item.id === check.id));
  if (hidden.length > 0) problems.push(`The next actions hide a prerequisite: ${hidden[0].id}.`);
  for (const phase of plan.phases) {
    const ids = phase.blocks.map((block) => block.id);
    for (const block of phase.blocks) {
      if (block.movedUp) continue;
      const before = (byId.get(block.id) as Block).comesAfter ?? [];
      if (before.some((id) => ids.includes(id) && ids.indexOf(id) > ids.indexOf(block.id))) problems.push(`${block.id} comes before a block it should follow.`);
    }
    const required = phase.blocks.filter((block) => !block.optional).map((block) => block.id);
    if (required.includes("discover-decision") && required.at(-1) !== "discover-decision") problems.push(`The discovery decision isn't last: ${required.join(", ")}.`);
    if (ids.includes("measure-next-decision") && ids.at(-1) !== "measure-next-decision") problems.push(`The next decision isn't last: ${ids.join(", ")}.`);
    if (ids.includes("test-beta-pilot") && ids.at(-1) !== "test-beta-pilot") problems.push(`The pilot isn't last in Test: ${ids.join(", ")}.`);
    if (ids.includes("launch-incident-response") && ids.indexOf("launch-support-readiness") > ids.indexOf("launch-incident-response")) problems.push(`Incident response comes before support: ${ids.join(", ")}.`);
    for (const [index, id] of ids.entries()) {
      const source = byId.get(id) as Block;
      const anchors = (source.comesAfter ?? []).filter((other) => ids.includes(other));
      if (source.kind !== "add-on" || anchors.length === 0) continue;
      const anchorAt = Math.max(...anchors.map((other) => ids.indexOf(other)));
      const between = ids.slice(anchorAt + 1, index).map((other) => byId.get(other) as Block);
      if (between.some((other) => other.kind !== "add-on")) problems.push(`${id} doesn't sit straight after what it extends: ${ids.join(", ")}.`);
    }
  }
  const laterTask = plan.checkBeforeActions.find((check) => timeline.some((block) => block.id === check.id));
  if (laterTask && !plan.checkBeforeLabel.startsWith("From your last release")) problems.push(`${laterTask.id} is called done first, but it's also a task later.`);

  // Tasks
  for (const block of everyBlock) {
    const source = byId.get(block.id) as Block;
    const teamKnown = !answers.team.includes(NOT_SURE);
    const texts = block.tasks.map((task) => task.task);
    if (new Set(texts).size !== texts.length) problems.push(`${block.id} lists the same task twice.`);
    block.tasks.forEach((task, index) => {
      const item = source.roles.canDelegateTo[index];
      const coverers = (role: string): string[] => ROLES.filter((other) => "covers" in other && (other.covers as readonly string[]).includes(role)).map((other) => other.id);
      const roles = [item.role, ...(item.orRoles ?? [])].flatMap((role) => [role, ...coverers(role)]);
      const chosen = roles.find((role) => answers.team.some((id) => id === role));
      const available = chosen !== undefined;
      const count = chosen ? answers.teamCounts[chosen as keyof typeof answers.teamCounts] : undefined;
      if (chosen && !task.who.includes(labelOf(ROLES, chosen).split(" / ")[0])) problems.push(`${block.id}: "${task.task}" should go to ${chosen}, not "${task.who}".`);
      if (chosen && count && !task.who.includes(String(count))) problems.push(`${block.id}: "${task.who}" has lost its number.`);
      if (task.inTeam !== available) problems.push(`${block.id}: "${task.task}" should ${available ? "" : "not "}go to the team.`);
      if (available && (task.note !== undefined || !task.who.startsWith("Ask your "))) problems.push(`${block.id}: a task for someone in the team reads "${task.who}".`);
      if (!available && task.note === undefined) problems.push(`${block.id}: a task with nobody to do it has no note.`);
      const onThePm = /sits with you/.test(`${task.who} ${task.note ?? ""}`);
      if (onThePm !== (!available && item.ifMissing === "pm")) problems.push(`${block.id}: "${task.task}" is wrongly${onThePm ? "" : " not"} left with the PM.`);
      if (teamKnown && !available && !task.who.startsWith("No ")) problems.push(`${block.id}: a missing role reads "${task.who}".`);
      if (!teamKnown && !available && task.who.startsWith("No ")) problems.push(`${block.id}: says a role is missing when the team is unknown.`);
    });
    const allowed: string[] = source.roles.reviewers.flatMap((role) => ROLES.filter((other) => other.id === role || ("reviewsFor" in other && (other.reviewsFor as readonly string[]).includes(role)))).map((other) => other.label);
    const teamLabels = answers.team.map((id) => labelOf(ROLES, id));
    if (block.reviewers.some((label) => !allowed.includes(label) || !teamLabels.includes(label))) problems.push(`${block.id} suggests a reviewer who isn't right: ${block.reviewers.join(", ")}.`);
    if (new Set(block.reviewers).size !== block.reviewers.length) problems.push(`${block.id} lists a reviewer twice.`);
  }

  // Tools and steps
  for (const block of everyBlock) {
    const source = byId.get(block.id) as Block;
    const tools = answers.tools.filter((tool) => tool !== NOT_SURE && tool !== OTHER_TOOL && source.toolExamples[tool]).map((tool) => labelOf(TOOLS, tool));
    if (block.tools.map((tool) => tool.toolLabel).join() !== tools.join()) problems.push(`${block.id} shows the wrong tools.`);
    if ((block.tools.length === 0) !== (block.toolTip !== undefined)) problems.push(`${block.id} has a blank or doubled tools area.`);
    if (block.steps.map((step) => step.text).join() !== source.steps[level].join()) problems.push(`${block.id} has the wrong level of steps.`);
  }

  // Timing
  const weeks = plan.phases.map((phase) => weekRange(phase.weeks));
  weeks.forEach(([first, last], index) => {
    if (last < first) problems.push(`Weeks go backwards: ${plan.phases[index].weeks}.`);
    const start = index === 0 ? 1 : weeks[index - 1][1];
    if (first < start || first > start + 1) problems.push(`Weeks don't join up: ${plan.phases.map((phase) => phase.weeks).join(", ")}.`);
  });
  const lastWeek = weeks.at(-1)?.[1] ?? 0;
  const { labels, status, neededDays, plannedDays } = expectedSchedule(plan, answers);
  if (plan.phases.map((phase) => phase.weeks).join() !== labels.join()) problems.push(`Weeks are ${plan.phases.map((phase) => phase.weeks).join(", ")}, expected ${labels.join(", ")}.`);
  if (plan.pace.status !== status) problems.push(`Pace is ${plan.pace.status}, expected ${status}.`);
  if (answers.time !== NOT_SURE && lastWeek > RULES[answers.time].max) problems.push(`The plan ends in week ${lastWeek}, past its limit.`);
  const quotedLimit = /about (\d+) weeks, and you have up to (\d+) weeks/.exec(plan.pace.message);
  if (status === "tight" && (!quotedLimit || Number(quotedLimit[1]) <= Number(quotedLimit[2]))) problems.push(`A tight plan reads as fitting: ${plan.pace.message}`);
  const quoted = /(?:planned (?:this|Build) across|spread it across|allowed|This plan takes) about (\d+) weeks/.exec(plan.pace.message);
  if (quoted && Number(quoted[1]) !== lastWeek) problems.push(`The plan says ${quoted[1]} weeks but ends in week ${lastWeek}.`);
  const hasBuild = plan.phases.some((phase) => phase.id === "build");
  const spareTime = plannedDays > neededDays;
  if (/spare time going to Build/.test(plan.pace.message) && (!spareTime || plan.phases.length === 1)) problems.push("The plan mentions spare time for Build when there isn't any to share.");
  if (!hasBuild && status === "fits" && spareTime && Math.ceil(neededDays / DAYS_PER_WEEK) !== lastWeek && !/may well need less/.test(plan.pace.message)) problems.push("A stretched plan doesn't say it may need less.");
  if (plan.phases.some((phase) => (phase.id === "build") !== (phase.note?.startsWith("Build depends") ?? false))) problems.push("The Build note is missing or misplaced.");
  if (status === "tight" && answers.time === "under-1m" && !/To make this realistic/.test(plan.pace.message)) problems.push("A tight under-1-month plan gives no advice.");
  if (answers.time !== "under-1m" && /To make this realistic/.test(plan.pace.message)) problems.push("Only under-1-month plans get this advice.");
  if (/earlier finish/.test(plan.pace.message) && (plan.phases.length < 2 || finishOptions(answers).length === 0)) problems.push("The plan suggests an earlier finish that doesn't exist.");
  const finishes = finishOptions(answers).map((option) => option.id);
  const lastPhase = covered[covered.length - 1];
  const laterExists = finishes.indexOf(lastPhase as never) !== -1 && finishes.indexOf(lastPhase as never) < finishes.length - 1;
  if (/later phase/.test(plan.pace.message) && !laterExists) problems.push("The plan suggests a later phase that doesn't exist.");

  // Wording about the product
  const existingProduct = answers.stage === "mid-build" || answers.stage === "live";
  const notes = everyBlock.flatMap((block) => block.tasks.map((task) => task.note ?? ""));
  if (!existingProduct && notes.some((note) => /worked on the product/.test(note))) problems.push("A plan with no existing product mentions colleagues who've worked on it.");
  const review = timeline.find((block) => block.id === "measure-post-launch-review");
  const reviewTitle = answers.stage === "live" ? "Review your latest release" : "Hold a post-launch review";
  if (review && review.title !== reviewTitle) problems.push(`The review is called "${review.title}".`);

  // Wording
  const words = [plan.who, plan.where, plan.pace.message, ...plan.phases.flatMap((phase) => [phase.weeks, phase.note ?? "ok"])];
  for (const block of everyBlock) words.push(block.why, ...block.tasks.flatMap((task) => [task.who, task.note ?? "ok"]));
  for (const text of words) {
    if (text.length === 0) problems.push("Some text is empty.");
    for (const [name, pattern] of BAD_WORDING) {
      if (pattern.test(text)) problems.push(`"${text}" contains ${name}.`);
    }
  }
  return problems;
}

function checkPlan(answers: IntakeAnswers): void {
  const problems = problemsWith(answers, buildPlan(answers, BLOCKS));
  assert.deepEqual(problems, [], planHref(answers));
}

// --- Trying them ---

test("every route through the questions gives a sound plan, at every level and way of working", () => {
  let index = 0;
  for (const route of allRoutes()) {
    for (const level of LEVELS) {
      for (const way of WAYS) {
        // Moves through the people, teams and tools, so each gets used in many different routes.
        index += 1;
        const answers = answersFor(route, { level, way, size: SIZES[index % SIZES.length], challenge: CHALLENGE_ANSWERS[index % CHALLENGE_ANSWERS.length], ...PEOPLE[index % PEOPLE.length], ...TEAMS[index % TEAMS.length], tools: TOOL_SETS[Math.floor(index / 7) % TOOL_SETS.length] });
        checkPlan(answers);
        if (index % 5 === 0) assert.deepEqual(buildPlan(answers, [...BLOCKS].reverse()), buildPlan(answers, BLOCKS), "The order of the block files changed the plan.");
      }
    }
  }
  assert.ok(index > 8000);
});

test("every kind of PM and product gives a sound plan on very different routes", () => {
  const routes = allRoutes().filter((_, index, all) => index % Math.floor(all.length / 6) === 0);
  for (const route of routes) {
    for (const pm of [...PM_ANSWERS, [NOT_SURE]] as IntakeAnswers["pm"][]) {
      for (const product of [...PRODUCT_TYPE_IDS, NOT_SURE] as const) {
        for (const level of LEVELS) checkPlan(answersFor(route, { pm, product, level, way: pm[0] === "ai" ? "kanban" : "scrum" }));
      }
    }
  }
});

test("every team gives a sound plan with every set of tools", () => {
  const routes: Route[] = [
    { stage: "new", phase: NOT_SURE, time: "1-3m", until: "measure" },
    { stage: "live", phase: "measure", time: NOT_SURE, until: null },
    { stage: "mid-build", phase: "test", time: "under-1m", until: "launch" },
  ];
  for (const route of routes) {
    for (const team of TEAMS) {
      for (const tools of TOOL_SETS) checkPlan(answersFor(route, { ...team, tools }));
    }
  }
});

test("the order team and tools are picked in doesn't change who does what", () => {
  const route: Route = { stage: "new", phase: NOT_SURE, time: "1-3m", until: "measure" };
  const team = [...TEAM_ROLE_IDS];
  const forwards = buildPlan(answersFor(route, { team }), BLOCKS);
  const backwards = buildPlan(answersFor(route, { team: team.toReversed() }), BLOCKS);
  assert.deepEqual(forwards, backwards);
});

test("a plan's link gives back exactly the same plan", () => {
  allRoutes().forEach((route, index) => {
    const answers = answersFor(route, { ...PEOPLE[index % PEOPLE.length], ...TEAMS[index % TEAMS.length], tools: TOOL_SETS[index % TOOL_SETS.length] });
    const query = planHref(answers).split("?")[1];
    const record = Object.fromEntries(new URLSearchParams(query));
    const result = validateDraft(parseDraft(readerFromRecord(record)));
    assert.ok(result.ok, query);
    assert.deepEqual(buildPlan(result.answers, BLOCKS), buildPlan(answers, BLOCKS), query);
  });
});

test("hand-edited links never crash: they build a sound plan or go back to the questions", () => {
  const values: Record<string, string[]> = {
    pm: ["general", "ai", "ai,hardware", "ai,data,growth", "not-sure", "wizard", "__proto__", ""],
    product: ["consumer", "data-ai", "not-sure", "x"],
    work: ["product", "strategy", "coaching", "not-sure", "wizard"],
    challenge: ["measurement", "grow", "new-to-role", "not-sure", "wizard"],
    stage: ["new", "mid-build", "live", "strategy-none", "strategy-ready", "coaching-some", "not-sure", "constructor"],
    phase: [...PHASES.map((phase) => phase.id), "not-sure", "nap"],
    exp: ["beginner", "experienced", "not-sure", "x", "constructor"],
    level: ["associate", "senior", "vp", "not-sure", "wizard"],
    size: ["early-startup", "enterprise", "not-sure", "huge"],
    team: ["ba", "ba:0", "qa:3", "qa:99", "ba:-3", "ba:2.5", "ba:abc", "not-sure", "not-sure:5", "ba,qa:2,not-sure", "wizard,ba", ",ba,", "pm", "ba:3,ba:5"],
    tools: ["jira", "other", "not-sure", "jira,other", "abacus,figma", "not-sure,other"],
    time: [...TIMELINE_IDS, "not-sure", "toString"],
    until: [...PHASES.map((phase) => phase.id), "not-sure", "x"],
    way: ["scrum", "kanban", "hybrid", "not-sure", "waterfall"],
  };
  // A small fixed-seed shuffle, so a failure can be repeated exactly.
  let seed = 12345;
  const next = (limit: number) => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return (seed >>> 8) % limit;
  };
  let plans = 0;
  for (let count = 0; count < 100000; count += 1) {
    const record: Record<string, string> = {};
    for (const [key, options] of Object.entries(values)) {
      if (next(12) !== 0) record[key] = options[next(options.length)];
    }
    const draft = parseDraft(readerFromRecord(record));
    const result = validateDraft(draft);
    if (result.ok) {
      plans += 1;
      assert.deepEqual(problemsWith(result.answers, buildPlan(result.answers, BLOCKS)), [], JSON.stringify(record));
    } else {
      assert.ok(startHref(draft, firstUnansweredStep(draft) ?? 1).startsWith("/start"), JSON.stringify(record));
    }
  }
  assert.ok(plans > 100, `Only ${plans} of the links built a plan, so this test isn't testing much.`);
});

// --- Rules for the blocks themselves ---

test("every block builds one to three real skills", () => {
  for (const block of BLOCKS) {
    assert.ok(block.skills.length >= 1 && block.skills.length <= 3, block.id);
  }
  const counts = Object.fromEntries(SKILLS.map((skill) => [skill.id, BLOCKS.filter((block) => block.skills.includes(skill.id)).length]));
  for (const skill of SKILLS) assert.ok(counts[skill.id] > 0, skill.id);
});

test("data blocks come first and are marked when you can't tell if it's working", () => {
  const plan = buildPlan(answersFor({ stage: "new", phase: NOT_SURE, time: "6m-plus", until: "measure" }, { challenge: "measurement" }), BLOCKS);
  const discover = plan.phases[0].blocks;
  assert.equal(discover[0].id, "discover-frame-opportunity");
  assert.equal(discover[1].id, "discover-data-signals");
  assert.equal(discover[1].helpsChallenge, true);
  assert.equal(plan.nextActions[0].blockId, "discover-data-signals");
});

test("every challenge keeps the agreed order rules", () => {
  for (const challenge of CHALLENGE_ANSWERS) {
    for (const route of [{ stage: "new", phase: NOT_SURE, time: "6m-plus", until: "measure" }, { work: "strategy", stage: "strategy-none", phase: null, time: NOT_SURE, until: null }] as Route[]) {
      checkPlan(answersFor(route, { challenge, pm: ["ai", "growth"], product: "b2b", level: "senior" }));
    }
  }
});

test("every add-on names the block it extends, so none falls to the end of a phase", () => {
  // Leads-people blocks sit outside the timeline, so they have nothing to follow.
  assert.deepEqual(BLOCKS.filter((block) => block.kind === "add-on" && !block.comesAfter?.length && !block.appliesTo.leadsPeople).map((block) => block.id), []);
});

test("Measure runs in the agreed order", () => {
  const plan = buildPlan(answersFor({ stage: "new", phase: "plan", time: "6m-plus", until: "measure" }, {}), BLOCKS);
  const core = BLOCKS.filter((block) => block.kind === "core" && block.phase === "measure").map((block) => block.id);
  const shown = plan.phases.flatMap((phase) => phase.blocks).map((block) => block.id).filter((id) => core.includes(id));
  assert.deepEqual(shown, ["measure-dashboard", "measure-user-feedback", "measure-results-hypothesis", "measure-experiments", "measure-post-launch-review", "measure-next-decision"]);
});

// --- The tracks ---

const trackPlan = (work: "strategy" | "coaching", stage: IntakeDraft["stage"], pick: Partial<IntakeAnswers> = {}) =>
  buildPlan(answersFor({ work, stage, phase: null, time: "6m-plus", until: NOT_SURE }, { level: "senior", ...pick }), BLOCKS);
const order = (plan: Plan) => plan.phases.map((phase) => phase.blocks.map((block) => block.id));

test("the strategy track runs in the agreed order", () => {
  assert.deepEqual(order(trackPlan("strategy", "strategy-none", { pm: ["ai"] })), [
    ["strat-scope-mandate", "discover-market-competitors", "strat-context-scan"],
    ["strat-diagnose-challenge", "strat-capabilities", "addon-aistrat-opportunities", "addon-ai-data-readiness"],
    ["craft-product-vision", "craft-product-strategy", "craft-positioning", "strat-choose-bets", "strat-build-buy"],
    ["craft-north-star", "craft-okrs", "craft-business-case", "strat-roadmap-bets", "strat-portfolio-allocation"],
    ["strat-narrative", "craft-exec-communication", "strat-align-leaders", "addon-aistrat-governance", "strat-cascade"],
    ["strat-review", "strat-refresh"],
  ]);
});

test("the coaching track runs in the agreed order", () => {
  assert.deepEqual(order(trackPlan("coaching", "coaching-new")), [
    ["cap-mandate", "cap-listen", "cap-maturity"],
    ["cap-operating-model", "cap-roles-career", "cap-standards"],
    ["cap-pilot", "cap-coaching", "cap-training"],
    ["cap-community", "cap-playbook", "cap-leaders", "addon-transformation-change"],
    ["cap-measure", "cap-hiring-onboarding", "cap-self-sustaining"],
  ]);
});

test("every level gets a sound plan on each track, and beginners keep the core strategy blocks", () => {
  const ids = order(trackPlan("strategy", "strategy-none", { level: "associate" })).flat();
  for (const id of ["craft-product-vision", "craft-product-strategy", "craft-north-star", "craft-okrs"]) assert.ok(ids.includes(id), id);
  for (const id of ["craft-positioning", "strat-portfolio-allocation", "strat-cascade", "craft-exec-communication"]) assert.ok(!ids.includes(id), id);
});

test("a block on a track's timeline isn't repeated in Grow your skills", () => {
  const plan = trackPlan("strategy", "strategy-none");
  const skills = [...plan.skillsForLevel, ...plan.skillsAnyLevel].map((block) => block.id);
  for (const id of ["craft-product-vision", "craft-okrs", "craft-exec-communication"]) assert.ok(!skills.includes(id), id);
  assert.ok(skills.includes("craft-influence"));
});

test("reused blocks don't ask strategy or coaching visitors to check for product work", () => {
  for (const plan of [trackPlan("strategy", "strategy-none"), trackPlan("coaching", "coaching-new")]) {
    const checks = plan.phases.flatMap((phase) => phase.blocks).flatMap((block) => block.checkFirst);
    assert.deepEqual(checks, []);
  }
});

test("starting partway through a track checks for the earlier track work", () => {
  const plan = trackPlan("strategy", "strategy-ready");
  assert.ok(plan.checkBeforeActions.some((check) => check.id === "strat-choose-bets"));
});

test("Transformation PMs keep the change block on the product track, and everyone gets it on coaching", () => {
  assert.ok(order(trackPlan("coaching", "coaching-established", { pm: ["general"] })).flat().includes("addon-transformation-change"));
  const product = buildPlan(answersFor({ stage: "mid-build", phase: "launch", time: "6m-plus", until: "launch" }, { pm: ["general"] }), BLOCKS);
  assert.ok(!order(product).flat().includes("addon-transformation-change"));
});

test("the Build and Measure minimums only apply to the product track", () => {
  const plan = buildPlan(answersFor({ work: "strategy", stage: "strategy-none", phase: null, time: NOT_SURE, until: null }, {}), BLOCKS);
  assert.ok(plan.phases.every((phase) => phase.note === undefined));
});

test("people leaders get one-to-ones and delegation on every track", () => {
  for (const level of ["group", "director", "vp"] as const) {
    for (const work of ["strategy", "coaching"] as const) {
      const ids = trackPlan(work, NOT_SURE, { level }).leadYourTeam.map((block) => block.id);
      assert.ok(ids.includes("lead-one-to-ones") && ids.includes("lead-delegate-ownership"), `${level} on ${work}`);
    }
  }
});

test("other levels never get Lead your team, on any track", () => {
  for (const level of ["associate", "product-manager", "senior", NOT_SURE] as const) {
    assert.deepEqual(trackPlan("strategy", "strategy-none", { level }).leadYourTeam, [], level);
    assert.deepEqual(trackPlan("coaching", "coaching-new", { level }).leadYourTeam, [], level);
  }
});

test("Lead your team picks up a block the coaching plan doesn't reach", () => {
  const ids = trackPlan("coaching", "coaching-established", { level: "director" }).leadYourTeam.map((block) => block.id);
  assert.ok(ids.includes("cap-coaching"));
  assert.ok(!ids.includes("cap-hiring-onboarding"));
});

test("only people leaders on the product track see the nudge", () => {
  const product = (level: IntakeAnswers["level"], work: IntakeDraft["work"] = "product") => buildPlan(answersFor({ work, stage: NOT_SURE, phase: null, time: NOT_SURE, until: null }, { level }), BLOCKS).leaderNudge;
  for (const level of ["group", "director", "vp"] as const) assert.equal(product(level), true, level);
  assert.equal(product("director", NOT_SURE), true);
  for (const level of ["associate", "product-manager", "senior", NOT_SURE] as const) assert.equal(product(level), false, level);
  assert.equal(product("director", "strategy"), false);
  assert.equal(product("director", "coaching"), false);
});

test("strategy and coaching plans have no rhythm section", () => {
  for (const way of ["scrum", "kanban", "hybrid", NOT_SURE] as const) {
    assert.deepEqual(trackPlan("strategy", "strategy-none", { way, team: ["ba"] }).rhythm, [], way);
    assert.deepEqual(trackPlan("coaching", "coaching-new", { way, team: ["ba"] }).rhythm, [], way);
  }
});

test("a PM with no team roles only sends stakeholder updates", () => {
  const route: Route = { stage: "new", phase: NOT_SURE, time: "1-3m", until: NOT_SURE };
  for (const way of ["scrum", "kanban", "hybrid", NOT_SURE] as const) {
    const plan = buildPlan(answersFor(route, { way, team: [NOT_SURE] }), BLOCKS);
    assert.deepEqual(plan.rhythm.map((block) => block.id), ["wow-stakeholder-updates"], way);
    assert.ok(buildPlan(answersFor(route, { way, team: ["ba"] }), BLOCKS).rhythm.length >= 1, way);
  }
  assert.ok(buildPlan(answersFor(route, { way: "scrum", team: ["ba"] }), BLOCKS).rhythm.length > 1);
});

test("only the review block changes its name on a live product", () => {
  assert.deepEqual(BLOCKS.filter((block) => block.titleWhenLive).map((block) => block.id), ["measure-post-launch-review"]);
  const live = buildPlan(answersFor({ stage: "live", phase: "measure", time: NOT_SURE, until: null }, {}), BLOCKS);
  const titles = live.phases.flatMap((phase) => phase.blocks).map((block) => block.title);
  assert.ok(titles.includes("Review your latest release"));
  assert.ok(!titles.includes("Hold a post-launch review"));
});

test("a part-built or live product can still point to people who've worked on it", () => {
  const plan = buildPlan(answersFor({ stage: "mid-build", phase: NOT_SURE, time: NOT_SURE, until: null }, { team: ["ba"] }), BLOCKS);
  assert.ok(plan.getUpToSpeed.flatMap((block) => block.tasks).some((task) => /worked on the product/.test(task.note ?? "")));
});

test("people leaders on the product track get all four Lead your team blocks", () => {
  for (const level of ["group", "director", "vp"] as const) {
    const plan = buildPlan(answersFor({ stage: "new", phase: NOT_SURE, time: NOT_SURE, until: null }, { level }), BLOCKS);
    assert.deepEqual(plan.leadYourTeam.map((block) => block.id).toSorted(), ["cap-coaching", "cap-hiring-onboarding", "lead-delegate-ownership", "lead-one-to-ones"]);
  }
});

test("coaching-track leaders get coaching on their timeline, shown once", () => {
  const plan = trackPlan("coaching", "coaching-new", { level: "director" });
  assert.deepEqual(plan.leadYourTeam.map((block) => block.id).toSorted(), ["lead-delegate-ownership", "lead-one-to-ones"]);
  assert.equal(order(plan).flat().filter((id) => id === "cap-coaching").length, 1);
});

test("old links build a sound plan at every old experience answer", () => {
  for (const [exp, level] of [["beginner", "associate"], ["intermediate", "product-manager"], ["experienced", "senior"], [NOT_SURE, NOT_SURE]]) {
    // The plan page fills a missing challenge as Not sure for old links, as it does here.
    const result = validateDraft(withOldLinkDefaults(parseDraft(readerFromRecord({ pm: "ai", product: "b2b", stage: "new", phase: "not-sure", exp, team: "ba", tools: "jira", time: "1-3m", until: "not-sure", way: "scrum" }))));
    assert.ok(result.ok, exp);
    assert.equal(result.answers.level, level);
    assert.deepEqual(problemsWith(result.answers, buildPlan(result.answers, BLOCKS)), [], exp);
  }
});

test("the home page's stats match the real content", () => {
  const stat = (label: string) => HOME_STATS.find((item) => item.label === label)?.value;
  assert.equal(stat("Learning blocks"), String(BLOCKS.length));
  assert.equal(stat("Lifecycle phases"), String(PHASES.filter((phase) => phase.track === "product").length));
  assert.equal(stat("Career levels"), String(CAREER_LEVELS.length));
  assert.equal(stat("Team roles"), String(ROLES.length));
  assert.ok(BLOCKS.every((block) => block.sources.length > 0));
});

test("every PM type and company size has blocks of its own, apart from general", () => {
  for (const id of PM_TYPE_IDS.filter((type) => type !== "general")) assert.ok(BLOCKS.some((block) => block.appliesTo.pmTypes.includes(id)), id);
  for (const id of COMPANY_SIZE_IDS) assert.ok(BLOCKS.some((block) => block.appliesTo.companySizes?.includes(id)), id);
});

test("Platform PMs get the blocks re-tagged for them", () => {
  for (const id of ["addon-internal-users", "addon-tech-platform-adoption", "addon-tech-api-product"]) {
    assert.ok(byId.get(id)?.appliesTo.pmTypes.includes("platform"), id);
  }
});

test("the hardware blocks ask a hardware engineer where it fits", () => {
  const hardware = BLOCKS.filter((block) => block.appliesTo.pmTypes.includes("hardware"));
  assert.equal(hardware.length, 6);
  for (const block of hardware) {
    const roles = block.roles.canDelegateTo.flatMap((item) => [item.role, ...(item.orRoles ?? [])]);
    assert.ok(roles.includes("hardware-engineer"), block.id);
  }
});

test("large organisations see their priorities first", () => {
  const plan = buildPlan(answersFor({ stage: "mid-build", phase: "test", time: "6m-plus", until: "launch" }, { size: "enterprise" }), BLOCKS);
  assert.equal(plan.phases[0].blocks[0].id, "test-security-privacy");
  assert.equal(plan.phases[0].blocks.at(-1)?.id, "test-beta-pilot");
  const skills = buildPlan(answersFor({ stage: "new", phase: NOT_SURE, time: NOT_SURE, until: null }, { size: "enterprise" }), BLOCKS).skillsAnyLevel;
  assert.equal(skills[0].id, "craft-metric-tree");
});

test("Test and Launch run in the agreed order", () => {
  const answers = answersFor({ stage: "mid-build", phase: "test", time: "6m-plus", until: "launch" }, { pm: ["ai"], product: "b2b" });
  const ids = buildPlan(answers, BLOCKS).phases.map((phase) => phase.blocks.map((block) => block.id));
  assert.deepEqual(ids[0], ["test-acceptance-accessibility", "test-ai-model-evaluation", "test-performance-reliability", "test-security-privacy", "addon-b2b-enterprise-readiness", "test-beta-pilot"]);
  assert.deepEqual(ids[1], ["launch-go-to-market", "addon-b2b-sales-enablement", "launch-release-plan", "launch-support-readiness", "launch-incident-response"]);
});

test("AI add-ons come before the PRD, and discovery add-ons come before sizing", () => {
  const ids = buildPlan(answersFor({ stage: "new", phase: NOT_SURE, time: "6m-plus", until: "define" }, { pm: ["ai"], product: "b2b" }), BLOCKS).phases.flatMap((phase) => phase.blocks).map((block) => block.id);
  const before = (first: string, second: string) => assert.ok(ids.indexOf(first) !== -1 && ids.indexOf(first) < ids.indexOf(second), `${first} should come before ${second}: ${ids.join(", ")}`);
  before("define-problem-statement", "addon-ai-is-ai-right");
  before("addon-ai-is-ai-right", "addon-ai-data-readiness");
  before("addon-ai-data-readiness", "define-product-brief");
  before("discover-user-research", "addon-b2b-customer-discovery");
  before("addon-b2b-customer-discovery", "discover-opportunity-sizing");
  before("discover-decision", "discover-opportunity-tree");
});

test("no real block is a placeholder", () => {
  assert.deepEqual(BLOCKS.filter((block) => block.placeholder).map((block) => block.id), []);
});

test("every kind of PM and product has blocks of its own", () => {
  const addOns = BLOCKS.filter((block) => block.kind === "add-on");
  const pmTypes = new Set(addOns.flatMap((block) => block.appliesTo.pmTypes));
  const productTypes = new Set<string>(addOns.flatMap((block) => block.appliesTo.productTypes));
  // A general PM gets the core blocks, so needs no add-ons.
  assert.deepEqual(PM_TYPE_IDS.filter((id) => id !== "general" && !pmTypes.has(id)), []);
  assert.deepEqual(PRODUCT_TYPE_IDS.filter((id) => !productTypes.has(id)), []);
});

test("every way of working has a rhythm", () => {
  const rhythm = BLOCKS.filter((block) => block.kind === "ways-of-working");
  for (const way of WAY_OF_WORKING_IDS) assert.ok(rhythm.some((block) => block.appliesTo.waysOfWorking.includes(way)), way);
  assert.ok(rhythm.some((block) => block.appliesTo.waysOfWorking.length === 0), "Not sure needs at least one block for any team.");
});

test("every experience level has skills picked for it, and some for everyone", () => {
  const craft = BLOCKS.filter((block) => block.kind === "craft");
  for (const level of EXPERIENCE_IDS) assert.ok(craft.some((block) => block.appliesTo.experience.includes(level)), level);
  assert.ok(craft.some((block) => block.appliesTo.experience.length === 0));
});

test("every role in the team question can actually receive a task", () => {
  const roles = new Set<string>(BLOCKS.flatMap((block) => block.roles.canDelegateTo.flatMap((item) => [item.role, ...(item.orRoles ?? [])])));
  const covering = ROLES.filter((role) => "covers" in role).map((role) => role.id);
  assert.deepEqual(TEAM_ROLE_IDS.filter((role) => !roles.has(role) && !covering.some((id) => id === role)), []);
});

test("no block gives two roles the same task", () => {
  for (const block of BLOCKS) {
    const tasks = block.roles.canDelegateTo.map((item) => item.task);
    assert.equal(new Set(tasks).size, tasks.length, `${block.id}: use orRoles for a task more than one role can do.`);
  }
});

test("experienced steps are instructions, not descriptions of finished work", () => {
  const finished = /\b(done|complete|completed|agreed|booked|published|verified|defined|combined|shared|updated)[.;]/;
  for (const block of BLOCKS) {
    for (const step of block.steps.experienced) assert.doesNotMatch(step, finished, block.id);
  }
});
