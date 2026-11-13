import { test } from "node:test";
import assert from "node:assert/strict";
import { CAREER_LEVELS, PHASE_IDS, PM_TYPE_IDS, PRODUCT_TYPE_IDS, STAGES, TIMELINE_IDS, WAY_OF_WORKING_IDS } from "../content/taxonomy";
import { makeBlock } from "./blocks-fixture";
import { loadBlocks } from "./blocks-load";
import type { Block } from "./blocks-types";
import { MIN_PHASE_DAYS, TIMELINE_WEEKS, blocksForPlan, buildPlan, effortInDays } from "./curriculum-engine";
import { NO_ADJUSTMENTS } from "./plan-adjustments";
import { MAX_TEAM_COUNT, NOT_SURE, OTHER_TOOL, type IntakeAnswers } from "./intake-types";
import type { Plan } from "./plan-types";

/**
 * Made-up blocks, so these tests check the engine's rules and not today's
 * content. lib/plan-logic.test.ts checks the real blocks.
 */
const dummySteps = (id: string) => ["first", "second", "third", "fourth"].map((word) => `Do the ${word} thing for ${id}.`);

function fixture(id: string, phase: Block["phase"], estimatedEffort: string, dependsOn: string[], overrides: Partial<Block> = {}): Block {
  const steps = dummySteps(id);
  return makeBlock({ id, phase, estimatedEffort, dependsOn, steps: { beginner: steps.map((text) => `Slowly: ${text}`), intermediate: steps, experienced: steps.map((text) => `Briefly: ${text}`) }, ...overrides });
}

const stages = (list: Block["appliesTo"]["stages"]) => ({ appliesTo: { pmTypes: [], productTypes: [], stages: list, waysOfWorking: [], experience: [] } });
const way = (list: Block["appliesTo"]["waysOfWorking"]) => ({ appliesTo: { pmTypes: [], productTypes: [], stages: [], waysOfWorking: list, experience: [] } });

const REAL_BLOCKS_FOR_SUBSET = loadBlocks();

const PLAN_BLOCKS: Block[] = [
  fixture("discover-research", "discover", "10-20 days", []),
  fixture("define-problem", "define", "1-2 days", ["discover-research"]),
  fixture("design-prototype", "design", "5-10 days", ["define-problem"]),
  fixture("plan-roadmap", "plan", "1-2 days", ["define-problem"]),
  fixture("build-stories", "build", "2-4 hours", ["plan-roadmap"]),
  fixture("test-acceptance", "test", "1-3 days", ["build-stories"]),
  fixture("test-ai-evaluation", "test", "3-5 days", ["define-problem"], { kind: "add-on", appliesTo: { pmTypes: ["ai"], productTypes: ["data-ai"], stages: [], waysOfWorking: [], experience: [] } }),
  fixture("launch-release", "launch", "1-2 days", ["test-acceptance"]),
  fixture("measure-results", "measure", "2-3 days", ["define-problem", "launch-release"]),
  fixture("onboarding-product", "any", "10-20 days", [], { kind: "onboarding", ...stages(["mid-build", "live"]) }),
  fixture("wow-sprints", "any", "1-2 hours", [], { kind: "ways-of-working", ...way(["scrum"]) }),
  fixture("wow-flow", "any", "2-4 hours", [], { kind: "ways-of-working", ...way(["kanban"]) }),
];

const ANSWERS: IntakeAnswers = {
  work: null,
  pm: ["general"],
  product: "b2b",
  size: "scaling",
  challenge: NOT_SURE,
  stage: "new",
  phase: NOT_SURE,
  level: "product-manager",
  team: ["ba", "qa"],
  teamCounts: {},
  tools: ["jira"],
  time: "1-3m",
  until: NOT_SURE,
  way: "scrum",
};

const allBlocks = (plan: Plan) => plan.phases.flatMap((phase) => phase.blocks);
const blockIds = (plan: Plan) => allBlocks(plan).map((block) => block.id);
const phaseIds = (plan: Plan) => plan.phases.map((phase) => phase.id);

const addOn = (overrides: Partial<Block> = {}) =>
  makeBlock({
    id: "define-add-on",
    kind: "add-on",
    appliesTo: { pmTypes: ["ai"], productTypes: ["data-ai"], stages: [], waysOfWorking: [], experience: [] },
    ...overrides,
  });

const wow = (ways: Block["appliesTo"]["waysOfWorking"]) =>
  makeBlock({
    id: `wow-${ways.join("-") || "all"}`,
    phase: "any",
    kind: "ways-of-working",
    appliesTo: { pmTypes: [], productTypes: [], stages: [], waysOfWorking: ways, experience: [] },
  });

// --- Effort ---

test("effort is read in working days, using the middle of a range", () => {
  assert.equal(effortInDays("1 day"), 1);
  assert.equal(effortInDays("2-3 days"), 2.5);
  assert.equal(effortInDays("2-4 hours"), 3 / 8);
  assert.equal(effortInDays("30 minutes"), 0.5 / 8);
  assert.equal(effortInDays("nonsense"), 0);
});

test("every real block has an effort the engine can read", () => {
  for (const block of loadBlocks()) assert.ok(effortInDays(block.estimatedEffort) > 0, block.id);
});

// --- Choosing blocks ---

test("each starting point covers its own phases", () => {
  for (const stage of STAGES.filter((item) => item.track === "product")) {
    const plan = buildPlan({ ...ANSWERS, stage: stage.id }, PLAN_BLOCKS);
    assert.deepEqual(phaseIds(plan), [...stage.phases], stage.id);
  }
});

test("Not sure on the stage gives the same phases as starting something new", () => {
  const plan = buildPlan({ ...ANSWERS, stage: NOT_SURE, phase: null }, PLAN_BLOCKS);
  assert.deepEqual(blockIds(plan), blockIds(buildPlan(ANSWERS, PLAN_BLOCKS)));
  assert.match(plan.where, /^Not sure of your stage, so your plan starts at the beginning, from Discover to Plan and prioritise\.$/);
});

test("the start and finish answers set the phases", () => {
  const plan = buildPlan({ ...ANSWERS, stage: "new", phase: "define", until: "launch" }, PLAN_BLOCKS);
  assert.deepEqual(phaseIds(plan), ["define", "design", "plan", "build", "test", "launch"]);
  assert.match(plan.where, /from Define to Launch/);
  const one = buildPlan({ ...ANSWERS, until: "discover" }, PLAN_BLOCKS);
  assert.deepEqual(phaseIds(one), ["discover"]);
  assert.match(one.where, /focused on Discover/);
});

test("a block with several phases appears once, in the first of them that's covered", () => {
  const blocks = [makeBlock({ id: "multi", phase: ["design", "plan"] }), makeBlock({ id: "other", phase: "plan" })];
  const plan = buildPlan({ ...ANSWERS, phase: "plan" }, blocks);
  assert.equal(blockIds(plan).filter((id) => id === "multi").length, 1);
  assert.deepEqual(phaseIds(plan), ["plan"]);
  const earlier = buildPlan(ANSWERS, blocks);
  assert.equal(earlier.phases.find((phase) => phase.id === "design")?.blocks[0].id, "multi");
});

test("a block for phases outside the plan is left out", () => {
  const plan = buildPlan(ANSWERS, [makeBlock({ id: "launch-block", phase: "launch" }), makeBlock()]);
  assert.deepEqual(blockIds(plan), ["define-test-block"]);
});

test("an add-on reaches a matching PM type or a matching product type", () => {
  const blocks = [addOn()];
  assert.equal(blockIds(buildPlan({ ...ANSWERS, pm: ["ai"] }, blocks)).length, 1);
  assert.equal(blockIds(buildPlan({ ...ANSWERS, product: "data-ai" }, blocks)).length, 1);
  assert.equal(blockIds(buildPlan(ANSWERS, blocks)).length, 0);
});

test("an empty list never counts as a match on its own", () => {
  const publicOnly = addOn({ appliesTo: { pmTypes: [], productTypes: ["public"], stages: [], waysOfWorking: [], experience: [] } });
  assert.equal(blockIds(buildPlan(ANSWERS, [publicOnly])).length, 0);
  assert.equal(blockIds(buildPlan({ ...ANSWERS, product: "public" }, [publicOnly])).length, 1);
});

test("Not sure on PM type and product leaves out add-ons aimed at one kind", () => {
  assert.equal(blockIds(buildPlan({ ...ANSWERS, pm: [NOT_SURE], product: NOT_SURE }, [addOn()])).length, 0);
});

test("stage and way-of-working tags must still fit an add-on", () => {
  const midBuildOnly = addOn({ appliesTo: { pmTypes: ["ai"], productTypes: [], stages: ["mid-build"], waysOfWorking: [], experience: [] } });
  assert.equal(blockIds(buildPlan({ ...ANSWERS, pm: ["ai"] }, [midBuildOnly])).length, 0);
  const kanbanOnly = addOn({ appliesTo: { pmTypes: ["ai"], productTypes: [], stages: [], waysOfWorking: ["kanban"], experience: [] } });
  assert.equal(blockIds(buildPlan({ ...ANSWERS, pm: ["ai"] }, [kanbanOnly])).length, 0);
  assert.equal(blockIds(buildPlan({ ...ANSWERS, pm: ["ai"], way: "kanban" }, [kanbanOnly])).length, 1);
});

test("an add-on tagged for AI reaches AI PMs and AI products, and not others", () => {
  const id = "test-ai-evaluation";
  const base: IntakeAnswers = { ...ANSWERS, stage: "mid-build", phase: "test" };
  assert.ok(blockIds(buildPlan({ ...base, pm: ["ai"] }, PLAN_BLOCKS)).includes(id));
  assert.ok(blockIds(buildPlan({ ...base, product: "data-ai" }, PLAN_BLOCKS)).includes(id));
  assert.ok(!blockIds(buildPlan(base, PLAN_BLOCKS)).includes(id));
});

test("a block limited by experience only reaches those levels", () => {
  const forExperienced = makeBlock({ appliesTo: { pmTypes: [], productTypes: [], stages: [], waysOfWorking: [], experience: ["experienced"] } });
  const reached = (level: IntakeAnswers["level"]) => blockIds(buildPlan({ ...ANSWERS, level }, [forExperienced])).length === 1;
  assert.equal(reached("senior"), true);
  assert.equal(reached("vp"), true);
  assert.equal(reached("associate"), false);
  assert.equal(reached("product-manager"), false);
  assert.equal(reached(NOT_SURE), false);
});

test("Not sure on experience counts as intermediate for limits as well as steps", () => {
  const intermediateUp = makeBlock({ appliesTo: { pmTypes: [], productTypes: [], stages: [], waysOfWorking: [], experience: ["intermediate", "experienced"] } });
  assert.equal(blockIds(buildPlan({ ...ANSWERS, level: NOT_SURE }, [intermediateUp])).length, 1);
  assert.equal(blockIds(buildPlan({ ...ANSWERS, level: "associate" }, [intermediateUp])).length, 0);
});

test("an empty experience list reaches every level", () => {
  for (const { id } of CAREER_LEVELS) assert.equal(blockIds(buildPlan({ ...ANSWERS, level: id }, [makeBlock()])).length, 1, id);
  assert.equal(blockIds(buildPlan({ ...ANSWERS, level: NOT_SURE }, [makeBlock()])).length, 1);
});

// --- Go further blocks ---

const goFurther = (overrides: Partial<Block> = {}) => fixture("define-extra", "define", "5 days", [], { optional: true, ...overrides });

test("a Go further block shows in its phase, marked as optional", () => {
  const plan = buildPlan(ANSWERS, [fixture("define-core", "define", "1 day", []), goFurther()]);
  assert.deepEqual(blockIds(plan), ["define-core", "define-extra"]);
  assert.equal(allBlocks(plan)[1].optional, true);
  assert.equal(allBlocks(plan)[0].optional, undefined);
});

test("a Go further block comes after required blocks in its phase, whatever its name", () => {
  const plan = buildPlan({ ...ANSWERS, pm: ["ai"] }, [fixture("z-core", "define", "1 day", []), addOn({ id: "y-add-on" }), goFurther({ id: "a-extra" })]);
  assert.deepEqual(blockIds(plan), ["z-core", "y-add-on", "a-extra"]);
});

test("a Go further block doesn't change the plan's timing", () => {
  const without = buildPlan({ ...ANSWERS, time: NOT_SURE, until: null }, PLAN_BLOCKS);
  const withExtra = buildPlan({ ...ANSWERS, time: NOT_SURE, until: null }, [...PLAN_BLOCKS, goFurther()]);
  assert.equal(withExtra.pace.message, without.pace.message);
  assert.deepEqual(withExtra.phases.map((phase) => phase.weeks), without.phases.map((phase) => phase.weeks));
});

test("a Go further block never reaches the next actions", () => {
  const plan = buildPlan(ANSWERS, [goFurther({ id: "a-extra", phase: "discover" }), fixture("z-core", "discover", "1 day", [])]);
  assert.ok(plan.nextActions.every((action) => action.blockId === "z-core"));
});

test("a plan of only Go further blocks has no next actions, and no crash", () => {
  const plan = buildPlan({ ...ANSWERS, time: "1-3m" }, [goFurther()]);
  assert.deepEqual(plan.nextActions, []);
  assert.ok(plan.pace.message.length > 0);
});

// --- Craft blocks ---

const craft = (id: string, experience: Block["appliesTo"]["experience"] = []) =>
  fixture(id, "any", "1-2 days", [], { kind: "craft", appliesTo: { pmTypes: [], productTypes: [], stages: [], waysOfWorking: [], experience } });

const skillIds = (plan: Plan) => [...plan.skillsStart, ...plan.skillsForLevel, ...plan.skillsAnyLevel].map((block) => block.id);
const allSkills = (plan: Plan) => [...plan.skillsStart, ...plan.skillsForLevel, ...plan.skillsAnyLevel];

test("craft blocks go in Grow your skills, outside the timeline", () => {
  const plan = buildPlan(ANSWERS, [...PLAN_BLOCKS, craft("craft-a")]);
  assert.deepEqual(skillIds(plan), ["craft-a"]);
  assert.ok(!blockIds(plan).includes("craft-a"));
  assert.ok(!plan.rhythm.some((block) => block.id === "craft-a"));
  assert.ok(plan.nextActions.every((action) => action.blockId !== "craft-a"));
});

test("skills split into those picked for your level and those for any level", () => {
  const blocks = [craft("craft-all"), craft("craft-beginner", ["beginner"]), craft("craft-senior", ["experienced"])];
  const split = (level: IntakeAnswers["level"]) => {
    const plan = buildPlan({ ...ANSWERS, level }, blocks);
    return skillIds(plan);
  };
  // Picks for your level come before skills for any level.
  assert.deepEqual(split("associate"), ["craft-beginner", "craft-all"]);
  assert.deepEqual(split("senior"), ["craft-senior", "craft-all"]);
  assert.deepEqual(split("product-manager"), ["craft-all"]);
  assert.deepEqual(split(NOT_SURE), ["craft-all"]);
});

test("the most level-specific skills come first, whatever their names", () => {
  const blocks = [craft("craft-a-two-levels", ["intermediate", "experienced"]), craft("craft-z-one-level", ["experienced"])];
  const plan = buildPlan({ ...ANSWERS, level: "senior" }, blocks);
  assert.deepEqual(skillIds(plan), ["craft-z-one-level", "craft-a-two-levels"]);
});

test("craft blocks don't add to the plan's length", () => {
  const without = buildPlan(ANSWERS, PLAN_BLOCKS);
  const withCraft = buildPlan(ANSWERS, [...PLAN_BLOCKS, craft("craft-a"), craft("craft-b")]);
  assert.equal(withCraft.pace.message, without.pace.message);
});

test("craft blocks say why they're there", () => {
  const plan = buildPlan({ ...ANSWERS, level: "associate" }, [craft("craft-all"), craft("craft-beginner", ["beginner"])]);
  const why = (id: string) => allSkills(plan).find((block) => block.id === id)?.why;
  assert.equal(why("craft-all"), "Because you're starting something new, and it builds delivery and execution, which matters at every stage.");
  assert.equal(why("craft-beginner"), "Because it's pitched at your level, as an associate or junior PM.");
  const unsure = buildPlan({ ...ANSWERS, level: NOT_SURE }, [craft("craft-mid", ["intermediate"])]);
  assert.equal(allSkills(unsure)[0].why, "Because it's pitched at product manager level, which we assume when you're not sure.");
});

test("a craft block that builds a favoured skill names the challenge", () => {
  const plan = buildPlan({ ...ANSWERS, challenge: "measurement" }, [fixture("craft-data", "any", "1-2 days", [], { kind: "craft", skills: ["data"] })]);
  assert.equal(allSkills(plan)[0].why, "Because it builds data and measurement, which helps with “We ship, but can't tell if it's working”.");
});

// --- Two PM types ---

test("a plan includes add-ons for both PM types, and never shows one twice", () => {
  const both = fixture("define-both", "define", "1 day", [], { kind: "add-on", appliesTo: { pmTypes: ["ai", "data"], productTypes: [], stages: [], waysOfWorking: [], experience: [] } });
  const onlyData = fixture("define-data", "define", "1 day", [], { kind: "add-on", appliesTo: { pmTypes: ["data"], productTypes: [], stages: [], waysOfWorking: [], experience: [] } });
  const ids = blockIds(buildPlan({ ...ANSWERS, pm: ["ai", "data"] }, [both, onlyData, addOn()]));
  assert.deepEqual(ids.toSorted(), ["define-add-on", "define-both", "define-data"]);
});

test("the reason names only the PM types that matched", () => {
  const plan = buildPlan({ ...ANSWERS, pm: ["ai", "data"], product: "b2b" }, [addOn()]);
  assert.equal(allBlocks(plan)[0].why, "Because you chose AI as your kind of PM.");
  const both = addOn({ appliesTo: { pmTypes: ["ai", "data"], productTypes: [], stages: [], waysOfWorking: [], experience: [] } });
  assert.equal(allBlocks(buildPlan({ ...ANSWERS, pm: ["ai", "data"], product: "b2b" }, [both]))[0].why, "Because you chose AI and Data as your kind of PM.");
});

// --- Company size ---

const forSizes = (id: string, sizes: NonNullable<Block["appliesTo"]["companySizes"]>) =>
  fixture(id, "define", "1 day", [], { kind: "add-on", appliesTo: { pmTypes: [], productTypes: [], stages: [], waysOfWorking: [], experience: [], companySizes: sizes } });

test("a size add-on only reaches that size of organisation", () => {
  const ids = (size: IntakeAnswers["size"]) => blockIds(buildPlan({ ...ANSWERS, size }, [forSizes("a-big", ["established", "enterprise"]), forSizes("b-small", ["early-startup"])]));
  assert.deepEqual(ids("early-startup"), ["b-small"]);
  assert.deepEqual(ids("enterprise"), ["a-big"]);
  assert.deepEqual(ids("scaling"), []);
});

test("Not sure on size assumes an established organisation", () => {
  const plan = buildPlan({ ...ANSWERS, size: NOT_SURE }, [forSizes("a-big", ["established"])]);
  assert.deepEqual(blockIds(plan), ["a-big"]);
  assert.equal(allBlocks(plan)[0].why, "Because we've assumed an established organisation.");
});

test("a size add-on says why it's there", () => {
  const plan = buildPlan({ ...ANSWERS, size: "early-startup" }, [forSizes("a-small", ["early-startup"])]);
  assert.equal(allBlocks(plan)[0].why, "Because you chose Early start-up as the size of your organisation.");
});

test("a block moves up for its sizes, as early as its dependencies allow", () => {
  const blocks = [inDefine("a-first"), inDefine("b-needs-a", { dependsOn: ["a-first"] }), inDefine("z-moves", { movesUpFor: ["enterprise"], comesAfter: ["b-needs-a"] })];
  assert.deepEqual(blockIds(buildPlan({ ...ANSWERS, size: "scaling" }, blocks)), ["a-first", "b-needs-a", "z-moves"]);
  const moved = buildPlan({ ...ANSWERS, size: "enterprise" }, blocks);
  assert.deepEqual(blockIds(moved), ["z-moves", "a-first", "b-needs-a"]);
  assert.equal(allBlocks(moved)[0].movedUp, true);
  assert.equal(allBlocks(buildPlan({ ...ANSWERS, size: "scaling" }, blocks))[2].movedUp, undefined);
});

test("moving up never breaks a dependency", () => {
  const blocks = [inDefine("a-first"), inDefine("b-moves", { dependsOn: ["a-first"], movesUpFor: ["enterprise"] })];
  assert.deepEqual(blockIds(buildPlan({ ...ANSWERS, size: "enterprise" }, blocks)), ["a-first", "b-moves"]);
});

// --- Refresh the basics ---

test("a level never removes a basic: it moves to Refresh the basics", () => {
  const basic = craft("craft-basics", ["beginner"]);
  const plan = (level: IntakeAnswers["level"]) => buildPlan({ ...ANSWERS, level }, [basic]);
  assert.deepEqual(skillIds(plan("associate")), ["craft-basics"]);
  assert.deepEqual(plan("associate").refreshBasics, []);
  for (const level of ["product-manager", "senior", "group", "director", "vp", NOT_SURE] as const) {
    assert.deepEqual(plan(level).refreshBasics.map((block) => block.id), ["craft-basics"], level);
    assert.deepEqual(skillIds(plan(level)), [], level);
  }
});

test("a block limited to higher levels isn't offered as a refresher", () => {
  const plan = buildPlan({ ...ANSWERS, level: "associate" }, [craft("craft-senior", ["experienced"])]);
  assert.deepEqual(plan.refreshBasics, []);
});

test("refreshers stay out of the timing and next actions", () => {
  const without = buildPlan({ ...ANSWERS, level: "senior" }, PLAN_BLOCKS);
  const plan = buildPlan({ ...ANSWERS, level: "senior" }, [...PLAN_BLOCKS, fixture("define-basic", "define", "20 days", [], { appliesTo: { pmTypes: [], productTypes: [], stages: [], waysOfWorking: [], experience: ["beginner"] } })]);
  assert.deepEqual(plan.refreshBasics.map((block) => block.id), ["define-basic"]);
  assert.equal(plan.pace.message, without.pace.message);
  assert.deepEqual(plan.nextActions, without.nextActions);
});

// --- Lead your team ---

test("Lead your team is empty when no block is written for it", () => {
  assert.deepEqual(buildPlan({ ...ANSWERS, level: "director" }, PLAN_BLOCKS).leadYourTeam, []);
});

test("people leaders get leads-people blocks outside the timeline, and nobody else does", () => {
  const lead = fixture("lead-one", "any", "1 day", [], { kind: "craft", appliesTo: { pmTypes: [], productTypes: [], stages: [], waysOfWorking: [], experience: [], leadsPeople: true } });
  for (const level of ["group", "director", "vp"] as const) {
    const plan = buildPlan({ ...ANSWERS, level }, [lead]);
    assert.deepEqual(plan.leadYourTeam.map((block) => block.id), ["lead-one"], level);
    assert.deepEqual(plan.skillsAnyLevel, [], level);
  }
  for (const level of ["associate", "product-manager", "senior", NOT_SURE] as const) {
    assert.deepEqual(buildPlan({ ...ANSWERS, level }, [lead]).leadYourTeam, [], level);
  }
});

test("the top three levels get the same steps as a senior PM", () => {
  const steps = (level: IntakeAnswers["level"]) => allBlocks(buildPlan({ ...ANSWERS, level }, PLAN_BLOCKS)).flatMap((block) => block.steps);
  for (const level of ["group", "director", "vp"] as const) assert.deepEqual(steps(level), steps("senior"), level);
});

// --- Tracks ---

const strategyAnswers: IntakeAnswers = { ...ANSWERS, work: "strategy", stage: "strategy-none", phase: null, until: NOT_SURE };
const trackBlock = (id: string, phase: Block["phase"], dependsOn: string[] = []) => fixture(id, phase, "1 day", dependsOn);
const reused = (place: NonNullable<Block["alsoIn"]>[number]) => fixture("craft-reused", "any", "1 day", ["product-thing"], { kind: "craft", alsoIn: [place], appliesTo: { pmTypes: [], productTypes: [], stages: [], waysOfWorking: [], experience: ["experienced"] } });

test("a plan only uses its own track's phases", () => {
  const blocks = [trackBlock("define-one", "define"), trackBlock("strat-one", "understand")];
  assert.deepEqual(blockIds(buildPlan(strategyAnswers, blocks)), ["strat-one"]);
  assert.deepEqual(blockIds(buildPlan(ANSWERS, blocks)), ["define-one"]);
});

test("a reused block joins the track's timeline, and leaves Grow your skills", () => {
  const blocks = [trackBlock("strat-first", "understand"), reused({ phase: "understand", after: ["strat-first"], forEveryone: true })];
  const plan = buildPlan(strategyAnswers, blocks);
  assert.deepEqual(blockIds(plan), ["strat-first", "craft-reused"]);
  assert.deepEqual(plan.skillsAnyLevel, []);
  assert.deepEqual(plan.skillsForLevel, []);
});

test("a reused block keeps its usual place on the product track", () => {
  const plan = buildPlan({ ...ANSWERS, level: "senior" }, [reused({ phase: "understand", after: [] })]);
  assert.deepEqual(blockIds(plan), []);
  assert.deepEqual(skillIds(plan), ["craft-reused"]);
});

test("a reused block swaps its dependencies for the track's", () => {
  const plan = buildPlan({ ...strategyAnswers, level: "senior" }, [reused({ phase: "understand", after: [] })]);
  assert.deepEqual(allBlocks(plan)[0].checkFirst, []);
});

test("forEveryone drops a reused block's limits on that track only", () => {
  const limited = (forEveryone?: true) => [reused({ phase: "understand", after: [], ...(forEveryone ? { forEveryone } : {}) })];
  assert.deepEqual(blockIds(buildPlan({ ...strategyAnswers, level: "associate" }, limited(true))), ["craft-reused"]);
  assert.deepEqual(blockIds(buildPlan({ ...strategyAnswers, level: "associate" }, limited())), []);
});

test("a reused add-on stays an add-on unless it's for everyone", () => {
  const change = addOn({ id: "add-change", alsoIn: [{ phase: "scale", after: [], forEveryone: true }] });
  const coaching: IntakeAnswers = { ...ANSWERS, work: "coaching", stage: "coaching-established", phase: null, until: NOT_SURE };
  const plan = buildPlan(coaching, [change]);
  assert.equal(allBlocks(plan)[0].kind, "core");
  assert.deepEqual(blockIds(buildPlan(ANSWERS, [change])), []);
});

test("a plan names the kind of work when it isn't a product plan", () => {
  assert.match(buildPlan(strategyAnswers, []).who, /^Work: Setting product strategy/);
  assert.doesNotMatch(buildPlan(ANSWERS, []).who, /Work:/);
});

test("a block marked for Lead your team reaches leaders on every track", () => {
  const coaching = trackBlock("cap-one", "pilot");
  const marked = { ...coaching, inLeadYourTeam: true };
  assert.deepEqual(buildPlan({ ...ANSWERS, level: "vp" }, [marked]).leadYourTeam.map((block) => block.id), ["cap-one"]);
  assert.deepEqual(buildPlan({ ...ANSWERS, level: "senior" }, [marked]).leadYourTeam, []);
  assert.deepEqual(buildPlan({ ...strategyAnswers, level: "vp" }, [marked]).leadYourTeam.map((block) => block.id), ["cap-one"]);
});

test("Lead your team skips a block already on the timeline", () => {
  const marked = { ...trackBlock("cap-one", "pilot"), inLeadYourTeam: true };
  const coaching: IntakeAnswers = { ...ANSWERS, work: "coaching", stage: "coaching-some", phase: null, until: NOT_SURE, level: "vp" };
  const plan = buildPlan(coaching, [marked]);
  assert.deepEqual(plan.leadYourTeam, []);
  assert.deepEqual(blockIds(plan), ["cap-one"]);
  assert.deepEqual(buildPlan({ ...coaching, stage: "coaching-established" }, [marked]).leadYourTeam.map((block) => block.id), ["cap-one"]);
});

test("the leader nudge is for people leaders on the product track", () => {
  assert.equal(buildPlan({ ...ANSWERS, level: "director" }, []).leaderNudge, true);
  assert.equal(buildPlan({ ...ANSWERS, level: "director", work: NOT_SURE }, []).leaderNudge, true);
  assert.equal(buildPlan({ ...ANSWERS, level: "associate" }, []).leaderNudge, false);
  assert.equal(buildPlan({ ...strategyAnswers, level: "director" }, []).leaderNudge, false);
});

test("Your team's rhythm is left out of strategy and coaching plans", () => {
  const blocks = [wow(["scrum"]), wow([])];
  assert.deepEqual(buildPlan(strategyAnswers, blocks).rhythm, []);
  assert.deepEqual(buildPlan({ ...ANSWERS, work: "coaching", stage: "coaching-new", phase: null, until: NOT_SURE }, blocks).rhythm, []);
});

test("with no team roles, the rhythm only keeps blocks that work without a team", () => {
  const solo = { ...wow([]), id: "wow-solo", worksWithoutTeam: true };
  const blocks = [wow(["scrum"]), wow([]), solo];
  const ids = (team: IntakeAnswers["team"]) => buildPlan({ ...ANSWERS, team }, blocks).rhythm.map((block) => block.id).toSorted();
  assert.deepEqual(ids([NOT_SURE]), ["wow-solo"]);
  assert.deepEqual(ids(["ba"]), ["wow-all", "wow-scrum", "wow-solo"]);
});

test("a block can have another name on a live product", () => {
  const review = fixture("measure-review", "measure", "1 day", [], { title: "Hold a review", titleWhenLive: "Review your latest release" });
  const titleOn = (stage: IntakeAnswers["stage"], phase: IntakeAnswers["phase"]) => allBlocks(buildPlan({ ...ANSWERS, stage, phase, until: "measure", time: "1-3m" }, [review]))[0].title;
  assert.equal(titleOn("live", "measure"), "Review your latest release");
  assert.equal(titleOn("mid-build", "launch"), "Hold a review");
  assert.equal(titleOn("new", NOT_SURE), "Hold a review");
});

test("a check on a block uses its live name too", () => {
  const review = fixture("measure-review", "measure", "1 day", [], { title: "Hold a review", titleWhenLive: "Review your latest release" });
  const next = fixture("discover-next", "discover", "1 day", ["measure-review"]);
  const plan = buildPlan({ ...ANSWERS, stage: "live", phase: "discover", until: "discover", time: "1-3m" }, [review, next]);
  assert.equal(allBlocks(plan)[0].checkFirst[0].title, "Review your latest release");
});

test("tight advice on a track talks about scope, not learning", () => {
  const long = trackBlock("strat-long", "understand");
  const plan = buildPlan({ ...strategyAnswers, stage: "strategy-none", time: "under-1m", until: "understand" }, [{ ...long, estimatedEffort: "30 days" }]);
  assert.match(plan.pace.message, /narrow the scope, or move the milestone\.$/);
});

// --- The challenge ---

const tagged = (id: string, skills: Block["skills"], overrides: Partial<Block> = {}) => fixture(id, "define", "1 day", [], { skills, ...overrides });
const challengeBlocks = [tagged("a-plain", ["delivery"]), tagged("b-other", ["commercial"]), tagged("c-data", ["data"]), tagged("d-strategy", ["strategy"])];

test("a block with a favoured skill comes first in its phase, and is marked", () => {
  const plan = buildPlan({ ...ANSWERS, challenge: "measurement" }, challengeBlocks);
  assert.deepEqual(blockIds(plan), ["c-data", "a-plain", "b-other", "d-strategy"]);
  assert.deepEqual(allBlocks(plan).map((block) => block.helpsChallenge ?? false), [true, false, false, false]);
});

test("each challenge favours its own skills", () => {
  const favoured: Record<string, Block["skills"]> = {
    "what-to-build": ["discovery", "prioritisation"],
    "too-many-requests": ["prioritisation", "communication"],
    measurement: ["data"],
    alignment: ["strategy", "communication"],
    "slow-delivery": ["delivery", "technical"],
    "new-to-role": [],
    grow: ["leadership", "strategy"],
  };
  const everySkill = (["discovery", "strategy", "prioritisation", "data", "design", "delivery", "technical", "communication", "commercial", "leadership"] as const).map((skill) => tagged(`x-${skill}`, [skill]));
  for (const [challenge, skills] of Object.entries(favoured)) {
    const plan = buildPlan({ ...ANSWERS, challenge: challenge as IntakeAnswers["challenge"] }, everySkill);
    const marked = allBlocks(plan).filter((block) => block.helpsChallenge).map((block) => block.id.replace("x-", "")).toSorted();
    assert.deepEqual(marked, [...skills].toSorted(), challenge);
    assert.deepEqual(blockIds(plan).slice(0, skills.length).map((id) => id.replace("x-", "")).toSorted(), [...skills].toSorted(), challenge);
  }
});

test("Not sure gives exactly the plan a challenge with no favoured skills gives", () => {
  for (const blocks of [PLAN_BLOCKS, challengeBlocks]) {
    const notSure = buildPlan(ANSWERS, blocks);
    const balanced = buildPlan({ ...ANSWERS, challenge: "new-to-role" }, blocks);
    assert.deepEqual({ ...notSure, newToProductFirst: false }, { ...balanced, newToProductFirst: false });
    assert.ok(allBlocks(notSure).every((block) => !block.helpsChallenge));
  }
});

test("Not sure keeps today's order and next actions", () => {
  const plan = buildPlan(ANSWERS, challengeBlocks);
  assert.deepEqual(blockIds(plan), ["a-plain", "b-other", "c-data", "d-strategy"]);
  assert.equal(plan.nextActions[0].blockId, "a-plain");
});

test("a favoured block still waits for its dependencies and order links", () => {
  const blocks = [tagged("a-first", ["delivery"]), tagged("b-second", ["delivery"], { dependsOn: ["a-first"] }), tagged("c-data", ["data"], { dependsOn: ["b-second"] }), tagged("d-data", ["data"], { comesAfter: ["a-first"] })];
  assert.deepEqual(blockIds(buildPlan({ ...ANSWERS, challenge: "measurement" }, blocks)), ["a-first", "d-data", "b-second", "c-data"]);
});

test("an add-on still sits straight after what it extends, ahead of a favoured block", () => {
  const blocks = [tagged("a-core", ["delivery"]), addOn({ id: "b-extra", comesAfter: ["a-core"] }), tagged("c-data", ["data"], { dependsOn: ["a-core"] })];
  assert.deepEqual(blockIds(buildPlan({ ...ANSWERS, pm: ["ai"], challenge: "measurement" }, blocks)), ["a-core", "b-extra", "c-data"]);
});

test("a Go further block is never marked or moved by a challenge", () => {
  const plan = buildPlan({ ...ANSWERS, challenge: "measurement" }, [tagged("a-plain", ["delivery"]), tagged("b-extra", ["data"], { optional: true })]);
  assert.deepEqual(blockIds(plan), ["a-plain", "b-extra"]);
  assert.equal(allBlocks(plan)[1].helpsChallenge, undefined);
});

test("the next three actions start at the first marked block", () => {
  const plan = buildPlan({ ...ANSWERS, phase: "discover", until: "define", challenge: "measurement" }, [fixture("discover-plain", "discover", "1 day", [], { skills: ["delivery"] }), tagged("define-data", ["data"])]);
  assert.ok(plan.nextActions.every((action) => action.blockId === "define-data"));
  const none = buildPlan({ ...ANSWERS, phase: "discover", until: "define", challenge: "grow" }, [fixture("discover-plain", "discover", "1 day", [], { skills: ["delivery"] }), tagged("define-data", ["data"])]);
  assert.equal(none.nextActions[0].blockId, "discover-plain");
  assert.ok(plan.nextActions.every((action) => action.label === "challenge"));
  assert.ok(none.nextActions.every((action) => action.label === undefined));
});

test("the next actions carry on past the marked block if it runs out of steps", () => {
  const short = tagged("a-data", ["data"], { steps: { beginner: ["x"], intermediate: ["only step"], experienced: ["x"] } });
  const plan = buildPlan({ ...ANSWERS, challenge: "measurement" }, [tagged("z-plain", ["delivery"]), short]);
  assert.deepEqual(plan.nextActions.map((action) => action.blockId), ["a-data", "z-plain", "z-plain"]);
  // Only actions from the marked block carry its label, so the top of the page shows why it comes first.
  assert.deepEqual(plan.nextActions.map((action) => action.label), ["challenge", undefined, undefined]);
});

test("only timeline blocks are marked, not skills or rhythm", () => {
  const skill = { ...craft("craft-data"), skills: ["data"] } as Block;
  const plan = buildPlan({ ...ANSWERS, challenge: "measurement" }, [skill, { ...wow([]), skills: ["data"] }]);
  assert.ok([...plan.skillsAnyLevel, ...plan.rhythm].every((block) => !block.helpsChallenge));
});

test("a challenge doesn't reorder the rhythm or skills sections", () => {
  const rhythm = [{ ...wow([]), id: "wow-a-plain", skills: ["delivery"] }, { ...wow([]), id: "wow-b-data", skills: ["data"] }] as Block[];
  const skills = [{ ...craft("craft-a-plain"), skills: ["delivery"] }, { ...craft("craft-b-data"), skills: ["data"] }] as Block[];
  const plan = buildPlan({ ...ANSWERS, challenge: "measurement" }, [...rhythm, ...skills]);
  assert.deepEqual(plan.rhythm.map((block) => block.id), ["wow-a-plain", "wow-b-data"]);
  assert.deepEqual(skillIds(plan).toSorted(), ["craft-a-plain", "craft-b-data"]);
  assert.deepEqual(plan.skillsStart.map((block) => block.id), ["craft-b-data", "craft-a-plain"]);
});

test("I'm new puts the new-to-product section first, when there is one", () => {
  const onboarding = fixture("onboard", "any", "1 day", [], { kind: "onboarding", appliesTo: { pmTypes: [], productTypes: [], stages: ["live"], waysOfWorking: [], experience: [] } });
  assert.equal(buildPlan({ ...ANSWERS, stage: "live", challenge: "new-to-role" }, [onboarding]).newToProductFirst, true);
  assert.equal(buildPlan({ ...ANSWERS, stage: "live", challenge: NOT_SURE }, [onboarding]).newToProductFirst, false);
  assert.equal(buildPlan({ ...ANSWERS, stage: "new", challenge: "new-to-role" }, [onboarding]).newToProductFirst, false);
});

test("growing into a bigger role puts Grow your skills above the timeline", () => {
  assert.equal(buildPlan({ ...ANSWERS, challenge: "grow" }, []).skillsFirst, true);
  for (const challenge of ["measurement", "new-to-role", NOT_SURE] as const) assert.equal(buildPlan({ ...ANSWERS, challenge }, []).skillsFirst, false, challenge);
});

// --- The opening line ---

test("the opening line names the level, then the first PM type", () => {
  assert.equal(
    buildPlan({ ...ANSWERS, level: "associate", pm: ["growth", "ai"] }, []).openingLine,
    "You're building your craft, so this plan explains each step and why it matters. Growth steps focus on activation, retention and experiments.",
  );
  assert.equal(
    buildPlan({ ...ANSWERS, level: "vp", pm: ["hardware"] }, []).openingLine,
    "You set product direction for the company, so this plan focuses on strategy, alignment and the organisation you're building. Hardware steps cover cost, manufacturing and certification.",
  );
});

test("the opening line uses general for Not sure, and the track on strategy and coaching", () => {
  assert.equal(
    buildPlan({ ...ANSWERS, level: NOT_SURE, pm: [NOT_SURE] }, []).openingLine,
    "We've pitched this at product manager level. Change it in Your answers at any time. It covers the whole lifecycle, so nothing important is missed.",
  );
  assert.equal(
    buildPlan({ ...strategyAnswers, level: "senior", pm: ["ai"] }, []).openingLine,
    "You own a product line or a hard problem, so this plan focuses on trade-offs, evidence and influence. This plan takes you from understanding the situation to a strategy people act on.",
  );
  assert.match(buildPlan({ ...ANSWERS, work: "coaching", stage: "coaching-new", phase: null, until: NOT_SURE }, []).openingLine, /making it run without you\.$/);
});

test("every level, PM type and track has an opening sentence", () => {
  for (const { id } of CAREER_LEVELS) assert.ok(buildPlan({ ...ANSWERS, level: id }, []).openingLine.length > 40, id);
  for (const id of PM_TYPE_IDS) assert.ok(buildPlan({ ...ANSWERS, pm: [id] }, []).openingLine.split(". ").length >= 2, id);
});

// --- Focus the plan (Phase 8a-2) ---

const manyData = ["a", "b", "c", "d", "e"].map((letter) => tagged(`${letter}-data`, ["data"]));

test("no more than three blocks are labelled, across the whole timeline", () => {
  const phases = [fixture("discover-one", "discover", "1 day", [], { skills: ["data"] }), fixture("discover-two", "discover", "1 day", [], { skills: ["data"] }), ...manyData];
  const plan = buildPlan({ ...ANSWERS, challenge: "measurement" }, phases);
  const labelled = allBlocks(plan).filter((block) => block.helpsChallenge || block.growsSkill);
  assert.equal(labelled.length, 3);
  assert.deepEqual(labelled.map((block) => block.id), ["discover-one", "discover-two", "a-data"]);
});

test("a labelled block's reason names the challenge", () => {
  const plan = buildPlan({ ...ANSWERS, challenge: "measurement" }, manyData);
  const labelled = allBlocks(plan).filter((block) => block.helpsChallenge);
  for (const block of labelled) assert.equal(block.why, "Helps with: We ship, but can't tell if it's working.");
  const unlabelled = allBlocks(plan).filter((block) => !block.helpsChallenge);
  // Past the three labels, the reason still names the challenge.
  for (const block of unlabelled) assert.equal(block.why, "Because you're starting something new, and it builds data and measurement, which helps with “We ship, but can't tell if it's working”.");
});

test("labels start from the phase you're in, and skip finished blocks", () => {
  const blocks = [fixture("discover-data", "discover", "1 day", [], { skills: ["data"] }), ...manyData];
  const ticked = (id: string, count = 4) => Array.from({ length: count }, (_, index) => `${id}/intermediate/${index}`);
  const plan = buildPlan({ ...ANSWERS, challenge: "measurement" }, blocks, { ...NO_ADJUSTMENTS, ticked: [...ticked("discover-data"), ...ticked("a-data")] });
  assert.equal(plan.currentPhase, "define");
  assert.deepEqual(allBlocks(plan).filter((block) => block.helpsChallenge).map((block) => block.id), ["b-data", "c-data", "d-data"]);
  assert.equal(plan.nextActions[0].blockId, "b-data");
});

test("the self-check moves blocks up, after the challenge, and shares the three labels", () => {
  const blocks = [tagged("a-plain", ["delivery"]), tagged("b-design", ["design"]), tagged("c-data", ["data"]), tagged("d-data", ["data"]), tagged("e-design", ["design"])];
  const plan = buildPlan({ ...ANSWERS, challenge: "measurement" }, blocks, { ...NO_ADJUSTMENTS, selfCheck: { design: "getting-started" } });
  assert.deepEqual(blockIds(plan), ["c-data", "d-data", "b-design", "e-design", "a-plain"]);
  assert.deepEqual(allBlocks(plan).filter((block) => block.helpsChallenge).map((block) => block.id), ["c-data", "d-data"]);
  assert.deepEqual(allBlocks(plan).filter((block) => block.growsSkill).map((block) => block.id), ["b-design"]);
  assert.equal(allBlocks(plan).find((block) => block.id === "b-design")?.why, "Builds a skill you want to grow: Design and user experience.");
});

test("next actions from a self-check block carry the skill label", () => {
  const blocks = [tagged("a-plain", ["delivery"]), tagged("b-design", ["design"])];
  const plan = buildPlan({ ...ANSWERS, challenge: "grow" }, blocks, { ...NO_ADJUSTMENTS, selfCheck: { design: "getting-started" } });
  assert.equal(plan.nextActions[0].blockId, "b-design");
  assert.equal(plan.nextActions[0].label, "skill");
});

test("only Getting started moves blocks; Comfortable and Strong don't", () => {
  const blocks = [tagged("a-plain", ["delivery"]), tagged("b-design", ["design"])];
  for (const value of ["comfortable", "strong"] as const) {
    assert.deepEqual(blockIds(buildPlan(ANSWERS, blocks, { ...NO_ADJUSTMENTS, selfCheck: { design: value } })), ["a-plain", "b-design"], value);
  }
});

test("with no self-check and nothing set aside, the order is unchanged", () => {
  for (const challenge of [NOT_SURE, "measurement", "grow"] as const) {
    const plain = buildPlan({ ...ANSWERS, challenge }, PLAN_BLOCKS);
    const withNothing = buildPlan({ ...ANSWERS, challenge }, PLAN_BLOCKS, NO_ADJUSTMENTS);
    assert.deepEqual(withNothing, plain, challenge);
  }
});

test("Grow your skills starts with three: the challenge, then the self-check, then your level", () => {
  const blocks = [craft("craft-level-one", ["experienced"]), craft("craft-level-two", ["experienced"]), { ...craft("craft-strategy"), skills: ["strategy"] }, { ...craft("craft-design"), skills: ["design"] }, craft("craft-any")] as Block[];
  const plan = buildPlan({ ...ANSWERS, level: "senior", challenge: "grow" }, blocks, { ...NO_ADJUSTMENTS, selfCheck: { design: "getting-started" } });
  assert.deepEqual(plan.skillsStart.map((block) => block.id), ["craft-strategy", "craft-design", "craft-level-one"]);
  assert.deepEqual([...plan.skillsForLevel, ...plan.skillsAnyLevel].map((block) => block.id), ["craft-level-two", "craft-any"]);
  const plain = buildPlan({ ...ANSWERS, level: "senior" }, blocks);
  assert.deepEqual(plain.skillsStart.map((block) => block.id), ["craft-level-one", "craft-level-two", "craft-any"]);
});

test("onboarding is folded unless the challenge is I'm new", () => {
  const onboarding = fixture("onboard", "any", "1 day", [], { kind: "onboarding", appliesTo: { pmTypes: [], productTypes: [], stages: ["mid-build"], waysOfWorking: [], experience: [] } });
  for (const challenge of [NOT_SURE, "measurement", "grow", "slow-delivery"] as const) {
    const plan = buildPlan({ ...ANSWERS, stage: "mid-build", challenge }, [onboarding]);
    assert.equal(plan.getUpToSpeed.length, 1);
    assert.equal(plan.newToProductFirst, false, challenge);
  }
  assert.equal(buildPlan({ ...ANSWERS, stage: "mid-build", challenge: "new-to-role" }, [onboarding]).newToProductFirst, true);
});

test("with no team answer, roles read as who usually helps, with no warnings", () => {
  const block = makeBlock({ roles: { owner: "pm", canDelegateTo: [{ role: "ba", orRoles: ["product-owner"], task: "Draft it", ifMissing: "find-someone" }], reviewers: ["tech-lead"] } });
  const plan = buildPlan({ ...ANSWERS, team: [], teamCounts: {} }, [block]);
  const [task] = allBlocks(plan)[0].tasks;
  assert.deepEqual(task, { roleLabel: "Business Analyst", task: "Draft it", inTeam: false, who: "Business Analyst or Product Owner" });
  assert.deepEqual(allBlocks(plan)[0].reviewers, []);
  assert.equal(plan.teamAnswered, false);
});

test("Not sure on the team keeps today's wording", () => {
  const block = makeBlock({ roles: { owner: "pm", canDelegateTo: [{ role: "ba", task: "Draft it", ifMissing: "pm" }], reviewers: [] } });
  assert.equal(allBlocks(buildPlan({ ...ANSWERS, team: [NOT_SURE] }, [block]))[0].tasks[0].who, "This sits with you for now");
  assert.equal(buildPlan({ ...ANSWERS, team: [NOT_SURE] }, [block]).teamAnswered, true);
});

test("with no tools answer, blocks show the tip that works with any tool", () => {
  const block = makeBlock({ toolExamples: { jira: "A Jira tip." } });
  const plan = buildPlan({ ...ANSWERS, tools: [] }, [block]);
  assert.deepEqual(allBlocks(plan)[0].tools, []);
  assert.ok(allBlocks(plan)[0].toolTip);
});

test("Already done counts a block as done, and the phase moves on", () => {
  const blocks = [fixture("discover-one", "discover", "1 day", []), fixture("define-two", "define", "1 day", ["discover-one"])];
  const ticked = Array.from({ length: 4 }, (_, index) => `discover-one/intermediate/${index}`);
  const plan = buildPlan({ ...ANSWERS, phase: "discover", until: "define" }, blocks, { ...NO_ADJUSTMENTS, ticked });
  assert.equal(allBlocks(plan)[0].done, true);
  assert.equal(plan.phases[0].done, true);
  assert.equal(plan.currentPhase, "define");
  assert.deepEqual(allBlocks(plan)[1].checkFirst, []);
  assert.equal(plan.nextActions[0].blockId, "define-two");
});

test("the next actions skip a finished block in the current phase", () => {
  const blocks = [inDefine("a-first"), inDefine("b-second")];
  const ticked = Array.from({ length: 4 }, (_, index) => `a-first/intermediate/${index}`);
  const plan = buildPlan(ANSWERS, blocks, { ...NO_ADJUSTMENTS, ticked });
  assert.equal(plan.currentPhase, "define");
  assert.ok(plan.nextActions.every((action) => action.blockId === "b-second"));
});

test("Not relevant moves a block to Set aside, and blocks that need it show a check", () => {
  const blocks = [fixture("define-one", "define", "1 day", []), fixture("define-two", "define", "1 day", ["define-one"])];
  const plan = buildPlan(ANSWERS, blocks, { ...NO_ADJUSTMENTS, setAside: ["define-one"] });
  assert.deepEqual(blockIds(plan), ["define-two"]);
  assert.deepEqual(plan.setAside.map((block) => block.id), ["define-one"]);
  assert.deepEqual(allBlocks(plan)[0].checkFirst.map((check) => check.id), ["define-one"]);
  assert.deepEqual(blockIds(buildPlan(ANSWERS, blocks, NO_ADJUSTMENTS)), ["define-one", "define-two"]);
});

test("the current phase moves on when everything left is set aside", () => {
  const blocks = [fixture("discover-one", "discover", "1 day", []), fixture("define-two", "define", "1 day", [])];
  const plan = buildPlan({ ...ANSWERS, phase: "discover", until: "define" }, blocks, { ...NO_ADJUSTMENTS, setAside: ["discover-one"] });
  assert.equal(plan.currentPhase, "define");
});

test("when everything is done there are no next actions", () => {
  const blocks = [fixture("define-one", "define", "1 day", [])];
  const ticked = Array.from({ length: 4 }, (_, index) => `define-one/intermediate/${index}`);
  const plan = buildPlan({ ...ANSWERS, phase: "define", until: "define" }, blocks, { ...NO_ADJUSTMENTS, ticked });
  assert.equal(plan.currentPhase, null);
  assert.deepEqual(plan.nextActions, []);
});

test("the rhythm has a one-line summary", () => {
  const blocks = [wow(["scrum"]), wow([])];
  assert.equal(buildPlan(ANSWERS, blocks).rhythmSummary, "Your team's rhythm: 2 repeating activities for Scrum");
  assert.equal(buildPlan({ ...ANSWERS, way: NOT_SURE }, blocks).rhythmSummary, "Your team's rhythm: 1 repeating activity that suit any team");
});

test("a live product's timeline is a loop", () => {
  assert.equal(buildPlan({ ...ANSWERS, stage: "live" }, PLAN_BLOCKS).isLoop, true);
  assert.equal(buildPlan(ANSWERS, PLAN_BLOCKS).isLoop, false);
});

test("the lead-in before the next actions is a plain sentence", () => {
  const roadmap = fixture("plan-one", "plan", "1 day", [], { title: "Make a roadmap" });
  const scope = fixture("plan-four", "plan", "1 day", [], { title: "Agree the scope" });
  const both = buildPlan({ ...ANSWERS, stage: "mid-build", phase: "build", until: "build" }, [roadmap, scope, fixture("build-two", "build", "1 day", ["plan-one", "plan-four"])]);
  assert.equal(both.checkBeforeSentence, "Before you start, check that “Make a roadmap” and “Agree the scope” have been done.");
  const one = buildPlan({ ...ANSWERS, stage: "mid-build", phase: "build", until: "build" }, [scope, fixture("build-two", "build", "1 day", ["plan-four"])]);
  assert.equal(one.checkBeforeSentence, "Before you start, check that “Agree the scope” has been done.");
  assert.equal(buildPlan(ANSWERS, PLAN_BLOCKS).checkBeforeSentence, "");
});

test("the browser gets only the blocks a plan needs, and builds the same plan from them", () => {
  for (const answers of [ANSWERS, { ...ANSWERS, stage: "mid-build" as const, phase: "build" as const }]) {
    const full = buildPlan(answers, REAL_BLOCKS_FOR_SUBSET);
    const subset = blocksForPlan(answers, full, REAL_BLOCKS_FOR_SUBSET);
    assert.ok(subset.length < REAL_BLOCKS_FOR_SUBSET.length);
    assert.deepEqual(buildPlan(answers, subset), full);
    const adjusted = { ...NO_ADJUSTMENTS, setAside: [full.phases[0].blocks[0].id], selfCheck: { data: "getting-started" as const } };
    assert.deepEqual(buildPlan(answers, subset, adjusted), buildPlan(answers, REAL_BLOCKS_FOR_SUBSET, adjusted));
  }
});

test("placeholder blocks never reach a plan", () => {
  assert.deepEqual(blockIds(buildPlan(ANSWERS, [makeBlock({ placeholder: true })])), []);
});

test("onboarding is for people partway through or running a live product, outside the timeline", () => {
  const blockSet = PLAN_BLOCKS;
  const id = "onboarding-product";
  assert.deepEqual(buildPlan(ANSWERS, blockSet).getUpToSpeed, []);
  assert.deepEqual(buildPlan({ ...ANSWERS, stage: NOT_SURE, phase: null }, blockSet).getUpToSpeed, []);
  for (const stage of ["mid-build", "live"] as const) {
    const plan = buildPlan({ ...ANSWERS, stage }, blockSet);
    assert.deepEqual(plan.getUpToSpeed.map((block) => block.id), [id]);
    assert.ok(!blockIds(plan).includes(id));
    assert.match(plan.getUpToSpeed[0].why, /Skip this if you already know the product/);
  }
});

test("onboarding never reaches someone starting something new, even if a block has no stage tag", () => {
  const untagged = makeBlock({ id: "onboard-any", phase: "any", kind: "onboarding" });
  assert.deepEqual(buildPlan(ANSWERS, [untagged]).getUpToSpeed, []);
  assert.deepEqual(buildPlan({ ...ANSWERS, stage: NOT_SURE, phase: null }, [untagged]).getUpToSpeed, []);
  assert.equal(buildPlan({ ...ANSWERS, stage: "live" }, [untagged]).getUpToSpeed.length, 1);
});

test("ways-of-working blocks follow the team's way of working, outside the timeline", () => {
  const blocks = [wow(["scrum"]), wow(["kanban"]), wow([])];
  const ids = (way: IntakeAnswers["way"]) => buildPlan({ ...ANSWERS, way }, blocks).rhythm.map((block) => block.id);
  assert.deepEqual(ids("scrum").toSorted(), ["wow-all", "wow-scrum"]);
  assert.deepEqual(ids("kanban").toSorted(), ["wow-all", "wow-kanban"]);
  assert.deepEqual(ids(NOT_SURE), ["wow-all"]);
  assert.deepEqual(blockIds(buildPlan(ANSWERS, blocks)), []);
});

// --- Order and dependencies ---

test("blocks follow their dependencies within a phase, whatever the file order", () => {
  const first = makeBlock({ id: "z-first" });
  const second = makeBlock({ id: "a-second", dependsOn: ["z-first"] });
  assert.deepEqual(blockIds(buildPlan(ANSWERS, [second, first])), ["z-first", "a-second"]);
});

test("core blocks come before add-ons when nothing else decides", () => {
  const core = makeBlock({ id: "z-core" });
  const extra = addOn({ id: "a-extra" });
  assert.deepEqual(blockIds(buildPlan({ ...ANSWERS, pm: ["ai"] }, [extra, core])), ["z-core", "a-extra"]);
});

const inDefine = (id: string, overrides: Partial<Block> = {}) => fixture(id, "define", "1 day", [], overrides);

test("comesAfter sets the order when both blocks are in the phase", () => {
  const blocks = [inDefine("a-later", { comesAfter: ["z-first"] }), inDefine("z-first")];
  assert.deepEqual(blockIds(buildPlan(ANSWERS, blocks)), ["z-first", "a-later"]);
});

test("comesAfter is ignored when the other block isn't in the plan, and never becomes a check", () => {
  const plan = buildPlan(ANSWERS, [inDefine("a-block", { comesAfter: ["missing-block"] }), inDefine("b-block")]);
  assert.deepEqual(blockIds(plan), ["a-block", "b-block"]);
  assert.deepEqual(allBlocks(plan)[0].checkFirst, []);
});

test("an add-on sits straight after the block it extends, ahead of other core work", () => {
  const extra = addOn({ id: "z-extra", comesAfter: ["b-core"] });
  const blocks = [inDefine("a-core"), inDefine("b-core", { dependsOn: ["a-core"] }), inDefine("c-core", { dependsOn: ["a-core"] }), inDefine("d-core", { dependsOn: ["a-core"] }), extra];
  assert.deepEqual(blockIds(buildPlan({ ...ANSWERS, pm: ["ai"] }, blocks)), ["a-core", "b-core", "z-extra", "c-core", "d-core"]);
});

test("a block can wait for every block on its comesAfter list", () => {
  const blocks = [inDefine("a-decide", { comesAfter: ["b-work", "c-work"] }), inDefine("b-work"), inDefine("c-work")];
  assert.equal(blockIds(buildPlan(ANSWERS, blocks)).at(-1), "a-decide");
});

test("a Go further block stays last even after a block that waits for others", () => {
  const blocks = [inDefine("a-decide", { comesAfter: ["b-work"] }), inDefine("b-work"), inDefine("a-extra", { optional: true })];
  assert.deepEqual(blockIds(buildPlan(ANSWERS, blocks)), ["b-work", "a-decide", "a-extra"]);
});

test("a circular comesAfter in a bad file can't hang the engine", () => {
  const blocks = [inDefine("a", { comesAfter: ["b"] }), inDefine("b", { comesAfter: ["a"] })];
  assert.equal(blockIds(buildPlan(ANSWERS, blocks)).length, 2);
});

test("a dependency earlier in the plan isn't repeated as a check", () => {
  const plan = buildPlan(ANSWERS, PLAN_BLOCKS);
  assert.deepEqual(allBlocks(plan).find((block) => block.id === "define-problem")?.checkFirst, []);
});

test("a dependency before the plan starts becomes check this exists, not a task", () => {
  const plan = buildPlan({ ...ANSWERS, stage: "mid-build", phase: "build" }, PLAN_BLOCKS);
  const stories = allBlocks(plan).find((block) => block.id === "build-stories");
  assert.deepEqual(stories?.checkFirst.map((item) => item.id), ["plan-roadmap"]);
  assert.ok(!blockIds(plan).includes("plan-roadmap"));
});

test("on a live product's loop, a dependency that comes later is treated as already done", () => {
  const plan = buildPlan({ ...ANSWERS, stage: "live" }, PLAN_BLOCKS);
  assert.equal(plan.phases[0].id, "measure");
  const measure = plan.phases[0].blocks[0];
  assert.deepEqual(measure.checkFirst.map((item) => item.id), ["define-problem", "launch-release"]);
});

test("a circular dependency in a bad file can't hang the engine", () => {
  const a = makeBlock({ id: "a", dependsOn: ["b"] });
  const b = makeBlock({ id: "b", dependsOn: ["a"] });
  assert.equal(blockIds(buildPlan(ANSWERS, [a, b])).length, 2);
});

test("a dependency on a block the visitor doesn't get still shows its title", () => {
  const needsAddOn = makeBlock({ id: "needs", dependsOn: ["define-add-on"] });
  const plan = buildPlan(ANSWERS, [needsAddOn, addOn({ title: "The add-on" })]);
  assert.deepEqual(allBlocks(plan)[0].checkFirst, [{ id: "define-add-on", title: "The add-on" }]);
});

// --- Experience ---

test("each experience level gets its own steps", () => {
  const block = PLAN_BLOCKS[0];
  for (const { id, steps } of CAREER_LEVELS) {
    const plan = buildPlan({ ...ANSWERS, level: id }, PLAN_BLOCKS);
    assert.deepEqual(allBlocks(plan)[0].steps.map((step) => step.text), block.steps[steps], id);
  }
});

test("Not sure on experience gets the intermediate steps", () => {
  const plan = buildPlan({ ...ANSWERS, level: NOT_SURE }, PLAN_BLOCKS);
  assert.deepEqual(allBlocks(plan)[0].steps.map((step) => step.text), PLAN_BLOCKS[0].steps.intermediate);
});

test("step ids are unique across a plan, and differ between levels", () => {
  const beginner = allBlocks(buildPlan({ ...ANSWERS, level: "associate" }, PLAN_BLOCKS)).flatMap((block) => block.steps);
  assert.equal(new Set(beginner.map((step) => step.id)).size, beginner.length);
  const experienced = allBlocks(buildPlan({ ...ANSWERS, level: "senior" }, PLAN_BLOCKS)).flatMap((block) => block.steps);
  assert.ok(!beginner.some((step) => experienced.some((other) => other.id === step.id)));
});

// --- Team ---

const taskFor = (answers: IntakeAnswers) => {
  const block = makeBlock({ roles: { owner: "pm", canDelegateTo: [{ role: "backend-engineer", task: "Do it", ifMissing: "pm" }], reviewers: ["qa", "tech-lead"] } });
  return allBlocks(buildPlan(answers, [block]))[0];
};

test("a task goes to a role that's in the team", () => {
  const [task] = taskFor({ ...ANSWERS, team: ["backend-engineer"] }).tasks;
  assert.deepEqual(task, { roleLabel: "Backend Engineer", task: "Do it", inTeam: true, who: "Ask your Backend Engineer" });
});

test("team numbers change the wording", () => {
  const answers = (count: number): IntakeAnswers => ({ ...ANSWERS, team: ["backend-engineer"], teamCounts: { "backend-engineer": count } });
  assert.equal(taskFor(answers(3)).tasks[0].who, "Ask your 3 Backend Engineers");
  assert.equal(taskFor(answers(MAX_TEAM_COUNT)).tasks[0].who, "Ask your 20+ Backend Engineers");
});

test("awkward role names still read properly in the plural", () => {
  const block = makeBlock({ roles: { owner: "pm", canDelegateTo: [{ role: "policy-legal", task: "Check", ifMissing: "pm" }, { role: "qa", task: "Test", ifMissing: "pm" }], reviewers: [] } });
  const answers: IntakeAnswers = { ...ANSWERS, team: ["qa", "policy-legal"], teamCounts: { qa: 2, "policy-legal": 2 } };
  assert.deepEqual(allBlocks(buildPlan(answers, [block]))[0].tasks.map((task) => task.who), [
    "Ask your 2 Policy / Legal / Compliance colleagues",
    "Ask your 2 QA / Testers",
  ]);
});

test("a missing role stays with the PM, with a note", () => {
  const [task] = taskFor(ANSWERS).tasks;
  assert.equal(task.inTeam, false);
  assert.equal(task.who, "No Backend Engineer in your team");
  assert.match(task.note ?? "", /sits with you/);
});

test("Not sure on the team doesn't claim anyone is missing", () => {
  const [task] = taskFor({ ...ANSWERS, team: [NOT_SURE] }).tasks;
  assert.equal(task.inTeam, false);
  assert.equal(task.who, "This sits with you for now");
  assert.ok(!task.who.includes("No "));
});

test("the note reads properly for a role starting with a vowel", () => {
  const block = makeBlock({ roles: { owner: "pm", canDelegateTo: [{ role: "architect", task: "Review", ifMissing: "pm" }], reviewers: [] } });
  const [task] = allBlocks(buildPlan({ ...ANSWERS, team: [NOT_SURE] }, [block]))[0].tasks;
  assert.equal(task.note, "An Architect could help, if you have one.");
});

const delegated = (item: Omit<Block["roles"]["canDelegateTo"][number], "task">, team: IntakeAnswers["team"], teamCounts: IntakeAnswers["teamCounts"] = {}) => {
  const block = makeBlock({ roles: { owner: "pm", canDelegateTo: [{ ...item, task: "Do it" }], reviewers: [] } });
  return allBlocks(buildPlan({ ...ANSWERS, team, teamCounts }, [block]))[0].tasks[0];
};

test("a specialist task never lands on the PM", () => {
  const missing = delegated({ role: "devops", ifMissing: "find-someone" }, ["ba"]);
  assert.equal(missing.who, "No DevOps / SRE engineer in your team");
  assert.match(missing.note ?? "", /specialist skills, so find someone/);
  assert.doesNotMatch(missing.note ?? "", /sits with you/);
  const unknown = delegated({ role: "devops", ifMissing: "find-someone" }, [NOT_SURE]);
  assert.equal(unknown.who, "Find someone who can do this");
  assert.equal(unknown.note, "A DevOps / SRE engineer would usually do this.");
});

test("a task that needs product knowledge points to whoever knows it", () => {
  const block = makeBlock({ phase: "any", kind: "onboarding", roles: { owner: "pm", canDelegateTo: [{ role: "delivery-manager", task: "Do it", ifMissing: "ask-around" }], reviewers: [] } });
  const noteOn = (answers: IntakeAnswers) => buildPlan(answers, [block]).getUpToSpeed[0]?.tasks[0].note;
  assert.match(noteOn({ ...ANSWERS, stage: "live", team: ["ba"] }) ?? "", /worked on the product/);
  assert.match(noteOn({ ...ANSWERS, stage: "mid-build", team: ["ba"] }) ?? "", /worked on the product/);
  const missing = delegated({ role: "delivery-manager", ifMissing: "ask-around" }, ["ba"]);
  assert.equal(missing.note, "Ask a colleague who knows this area.");
  assert.doesNotMatch(missing.note ?? "", /sits with you/);
  assert.equal(delegated({ role: "delivery-manager", ifMissing: "ask-around" }, [NOT_SURE]).who, "Ask whoever knows this best");
});

test("a task with other roles goes to the first one in the team", () => {
  const item: Omit<Block["roles"]["canDelegateTo"][number], "task"> = { role: "tech-lead", orRoles: ["architect", "backend-engineer"], ifMissing: "find-someone" };
  assert.equal(delegated(item, ["backend-engineer"], { "backend-engineer": 6 }).who, "Ask your 6 Backend Engineers");
  assert.equal(delegated(item, ["backend-engineer", "architect"]).who, "Ask your Architect");
  assert.equal(delegated(item, ["backend-engineer", "tech-lead"]).who, "Ask your Tech Lead");
  assert.equal(delegated(item, ["ba"]).who, "No Tech Lead in your team");
});

test("a full-stack engineer covers frontend and backend tasks", () => {
  const frontend = { role: "frontend-engineer", ifMissing: "find-someone" } as const;
  assert.equal(delegated(frontend, ["fullstack-engineer"], { "fullstack-engineer": 3 }).who, "Ask your 3 Full-stack Engineers");
  assert.equal(delegated({ ...frontend, role: "backend-engineer" }, ["fullstack-engineer"]).who, "Ask your Full-stack Engineer");
  assert.equal(delegated(frontend, ["frontend-engineer", "fullstack-engineer"]).who, "Ask your Frontend Engineer");
  assert.equal(delegated({ role: "qa", ifMissing: "pm" }, ["fullstack-engineer"]).inTeam, false);
});

test("a role that isn't a person's title still reads like a person", () => {
  const item = { role: "policy-legal", ifMissing: "find-someone" } as const;
  assert.equal(delegated(item, ["policy-legal"]).who, "Ask your Policy / Legal / Compliance colleague");
  assert.equal(delegated(item, ["ba"]).who, "No Policy / Legal / Compliance colleague in your team");
  assert.equal(delegated(item, [NOT_SURE]).note, "A Policy / Legal / Compliance colleague would usually do this.");
});

test("an architect reviews in place of a missing Tech Lead", () => {
  assert.deepEqual(taskFor({ ...ANSWERS, team: ["architect"] }).reviewers, ["Architect"]);
  assert.deepEqual(taskFor({ ...ANSWERS, team: ["architect", "tech-lead"] }).reviewers, ["Tech Lead"]);
});

test("nobody reviews work they stepped in to do", () => {
  const block = makeBlock({ roles: { owner: "pm", canDelegateTo: [{ role: "devops", orRoles: ["tech-lead"], task: "Roll out", ifMissing: "find-someone" }], reviewers: ["tech-lead"] } });
  const plan = (team: IntakeAnswers["team"]) => allBlocks(buildPlan({ ...ANSWERS, team }, [block]))[0].reviewers;
  assert.deepEqual(plan(["tech-lead"]), []);
  assert.deepEqual(plan(["tech-lead", "devops"]), ["Tech Lead"]);
});

test("only reviewers in the team are suggested", () => {
  assert.deepEqual(taskFor(ANSWERS).reviewers, ["QA / Tester"]);
  assert.deepEqual(taskFor({ ...ANSWERS, team: ["ba"] }).reviewers, []);
});

// --- Tools ---

const toolBlock = makeBlock({ toolExamples: { jira: "Jira tip", notion: "Notion tip" } });

test("only the visitor's tools are shown", () => {
  const block = allBlocks(buildPlan({ ...ANSWERS, tools: ["notion", "figma"] }, [toolBlock]))[0];
  assert.deepEqual(block.tools, [{ toolLabel: "Notion", tip: "Notion tip" }]);
  assert.equal(block.toolTip, undefined);
});

test("with no matching tool there's a tip that works with any tool", () => {
  for (const tools of [["figma"], [NOT_SURE], [OTHER_TOOL]] as IntakeAnswers["tools"][]) {
    const block = allBlocks(buildPlan({ ...ANSWERS, tools }, [toolBlock]))[0];
    assert.deepEqual(block.tools, []);
    assert.ok(block.toolTip);
  }
});

test("an unlisted tool sits beside real tools without adding anything", () => {
  const block = allBlocks(buildPlan({ ...ANSWERS, tools: ["jira", OTHER_TOOL] }, [toolBlock]))[0];
  assert.deepEqual(block.tools, [{ toolLabel: "Jira", tip: "Jira tip" }]);
});

// --- Pace ---

test("blocks in a phase overlap: a phase is its longest block plus a quarter of the rest", () => {
  const blocks = [fixture("define-long", "define", "10 days", []), fixture("define-a", "define", "4 days", []), fixture("define-b", "define", "4 days", [])];
  const plan = buildPlan({ ...ANSWERS, until: "define", phase: "define", time: NOT_SURE }, blocks);
  assert.match(plan.pace.message, /about 3 weeks/);
  const one = buildPlan({ ...ANSWERS, until: "define", phase: "define", time: NOT_SURE }, [fixture("define-long", "define", "10 days", [])]);
  assert.match(one.pace.message, /about 2 weeks/);
});

const buildToLaunch = { ...ANSWERS, stage: "mid-build", phase: "build", until: "launch" } as const;
const weekOf = (plan: Plan, id: string) => plan.phases.find((phase) => phase.id === id)?.weeks;
const lastWeek = (plan: Plan) => Number(plan.phases.at(-1)?.weeks.split(" ").at(-1));

test("starting something new is tight in under a month, and fits 1 to 3 months", () => {
  assert.equal(buildPlan({ ...ANSWERS, time: "under-1m" }, PLAN_BLOCKS).pace.status, "tight");
  assert.equal(buildPlan({ ...ANSWERS, time: "1-3m" }, PLAN_BLOCKS).pace.status, "fits");
});

test("every length of timeline gives its own schedule", () => {
  const lengths = TIMELINE_IDS.map((time) => lastWeek(buildPlan({ ...ANSWERS, stage: "mid-build", phase: "plan", until: "launch", time }, PLAN_BLOCKS)));
  assert.deepEqual(lengths, [4, 9, 20, 26]);
});

test("under 1 month isn't stretched, because the milestone could be days away", () => {
  const plan = buildPlan({ ...ANSWERS, stage: "mid-build", phase: "launch", until: null, time: "under-1m" }, PLAN_BLOCKS);
  assert.equal(plan.phases[0].weeks, "Week 1");
  assert.match(plan.pace.message, /fits your timeline/);
});

test("Build takes most of the spare time, and is never treated as a few hours", () => {
  const plan = buildPlan({ ...buildToLaunch, time: "3-6m" }, PLAN_BLOCKS);
  assert.deepEqual(plan.phases.map((phase) => phase.weeks), ["Weeks 1 to 15", "Weeks 15 to 18", "Weeks 18 to 20"]);
  assert.match(plan.pace.message, /most of the spare time going to Build/);
  assert.ok(plan.phases.find((phase) => phase.id === "build")?.note);
  assert.equal(plan.phases.find((phase) => phase.id === "test")?.note, undefined);
  const noDate = buildPlan({ ...buildToLaunch, time: NOT_SURE, until: null }, PLAN_BLOCKS);
  assert.equal(noDate.pace.status, "open");
  assert.equal(weekOf(noDate, "build"), "Weeks 1 to 4");
  assert.equal(MIN_PHASE_DAYS.build, 20);
});

test("Measure gets at least 4 weeks, because results need time to build up", () => {
  const plan = buildPlan({ ...ANSWERS, stage: "live", phase: "measure", until: "measure", time: NOT_SURE }, PLAN_BLOCKS);
  assert.equal(plan.phases[0].weeks, "Weeks 1 to 4");
  assert.equal(MIN_PHASE_DAYS.measure, 20);
});

test("a tight plan under a month offers both ways out when both exist", () => {
  const plan = buildPlan({ ...ANSWERS, stage: "new", phase: "discover", until: "launch", time: "under-1m" }, PLAN_BLOCKS);
  assert.equal(plan.pace.status, "tight");
  assert.match(plan.pace.message, /To make this realistic, narrow it to the smallest valuable release, or finish one phase first by choosing an earlier finish in Your answers\.$/);
});

test("a tight plan under a month with no release to narrow suggests an earlier finish", () => {
  const plan = buildPlan({ ...ANSWERS, stage: "new", phase: "discover", until: "design", time: "under-1m" }, PLAN_BLOCKS);
  assert.equal(plan.pace.status, "tight");
  assert.match(plan.pace.message, /To make this realistic, finish one phase first by choosing an earlier finish in Your answers\.$/);
  assert.doesNotMatch(plan.pace.message, /smallest valuable release/);
});

test("a tight one-phase plan under a month doesn't suggest an earlier finish", () => {
  const huge = fixture("build-huge", "build", "30 days", []);
  const plan = buildPlan({ ...ANSWERS, stage: "mid-build", phase: "build", until: "build", time: "under-1m" }, [huge]);
  assert.equal(plan.pace.status, "tight");
  assert.match(plan.pace.message, /To make this realistic, narrow it to the smallest valuable release\.$/);
  const research = fixture("discover-huge", "discover", "30 days", []);
  const learning = buildPlan({ ...ANSWERS, stage: "new", phase: "discover", until: "discover", time: "under-1m" }, [research]);
  assert.match(learning.pace.message, /narrow what you need to learn, or move the milestone\.$/);
});

test("advice is only for plans under a month", () => {
  const plan = buildPlan({ ...ANSWERS, stage: "new", phase: "discover", until: "measure", time: "1-3m" }, [...PLAN_BLOCKS, fixture("test-huge", "test", "100 days", [])]);
  assert.equal(plan.pace.status, "tight");
  assert.doesNotMatch(plan.pace.message, /To make this realistic/);
  assert.match(plan.pace.message, /or do less of each\.$/);
});

test("a plan that's only Build runs to the end of the timeline", () => {
  const plan = buildPlan({ ...ANSWERS, stage: "mid-build", phase: "build", until: "build", time: "3-6m" }, PLAN_BLOCKS);
  assert.deepEqual(plan.phases.map((phase) => phase.weeks), ["Weeks 1 to 20"]);
});

test("a plan without Build spreads evenly, and says it may need less", () => {
  const plan = buildPlan({ ...ANSWERS, until: "discover", time: "6m-plus" }, PLAN_BLOCKS);
  assert.equal(plan.pace.status, "spare");
  assert.equal(plan.phases[0].weeks, "Weeks 1 to 9");
  assert.match(plan.pace.message, /usually takes about 3 weeks. We've allowed about 9 weeks, so you have time to spare/);
  assert.match(plan.pace.message, /choose a later phase/);
  const spreadWithin = buildPlan({ ...ANSWERS, time: "1-3m" }, PLAN_BLOCKS);
  assert.equal(spreadWithin.pace.status, "fits");
  assert.match(spreadWithin.pace.message, /may well need less/);
});

test("small work is never stretched past three times its length", () => {
  const plan = buildPlan({ ...ANSWERS, stage: "live", phase: "launch", until: null, time: "6m-plus" }, PLAN_BLOCKS);
  assert.equal(plan.phases[0].weeks, "Week 1");
});

test("Build's message only mentions spare time when there is some to share", () => {
  const buildOnly = buildPlan({ ...ANSWERS, stage: "mid-build", phase: "build", until: "build", time: "3-6m" }, PLAN_BLOCKS);
  assert.equal(buildOnly.pace.message, "We've planned Build across about 20 weeks to suit your timeline.");
  const noSpare = buildPlan({ ...ANSWERS, stage: "mid-build", phase: "build", until: "build", time: "under-1m" }, PLAN_BLOCKS);
  assert.equal(noSpare.pace.message, "This plan takes about 4 weeks, which fits your timeline.");
});

test("Measure on a tight plan is expected to finish after the milestone", () => {
  const plan = buildPlan({ ...ANSWERS, until: "measure", time: "under-1m" }, PLAN_BLOCKS);
  assert.equal(plan.pace.status, "tight");
  assert.match(plan.phases.at(-1)?.note ?? "", /after your milestone/);
  assert.equal(buildPlan({ ...ANSWERS, until: "measure", time: "6m-plus" }, PLAN_BLOCKS).phases.at(-1)?.note, undefined);
});

test("spare time only suggests a later phase if there is one", () => {
  const plan = buildPlan({ ...ANSWERS, stage: "live", phase: "launch", until: null, time: "6m-plus" }, PLAN_BLOCKS);
  assert.equal(plan.pace.status, "spare");
  assert.doesNotMatch(plan.pace.message, /later phase/);
  const lastPhase = buildPlan({ ...ANSWERS, stage: "new", phase: "plan", until: "measure", time: "6m-plus" }, PLAN_BLOCKS);
  assert.doesNotMatch(lastPhase.pace.message, /later phase/);
});

test("6 months or more is never tight", () => {
  const huge = makeBlock({ estimatedEffort: "900 days" });
  assert.notEqual(buildPlan({ ...ANSWERS, time: "6m-plus" }, [huge]).pace.status, "tight");
});

test("Not sure on the timeline gives a steady pace and no warning", () => {
  const huge = makeBlock({ estimatedEffort: "900 days" });
  const plan = buildPlan({ ...ANSWERS, time: NOT_SURE, until: null }, [huge]);
  assert.equal(plan.pace.status, "open");
  assert.match(plan.pace.message, /steady pace/);
});

test("a tight plan is squeezed to end on time, and says why", () => {
  const tight = buildPlan({ ...ANSWERS, stage: "live", until: "launch", time: "under-1m" }, PLAN_BLOCKS);
  assert.equal(tight.pace.status, "tight");
  assert.equal(lastWeek(tight), 4);
  assert.match(tight.pace.message, /usually takes about \d+ weeks, and you have up to 4 weeks/);
});

test("a plan just over its limit never says it takes the same as the limit", () => {
  const justOver = makeBlock({ estimatedEffort: "21 days" });
  const plan = buildPlan({ ...ANSWERS, stage: "new", phase: "define", until: "define", time: "under-1m" }, [justOver]);
  assert.equal(plan.pace.status, "tight");
  assert.match(plan.pace.message, /about 5 weeks, and you have up to 4 weeks/);
});

test("the length quoted matches the last week of the timeline", () => {
  const plan = buildPlan({ ...ANSWERS, level: "associate", time: NOT_SURE, until: null }, PLAN_BLOCKS);
  assert.match(plan.pace.message, new RegExp(`about ${lastWeek(plan)} weeks`));
});

test("recurring and onboarding blocks don't add to the plan's length", () => {
  const without = buildPlan({ ...ANSWERS, stage: "mid-build" }, PLAN_BLOCKS.filter((block) => block.kind === "core" || block.kind === "add-on"));
  const withThem = buildPlan({ ...ANSWERS, stage: "mid-build" }, PLAN_BLOCKS);
  assert.equal(withThem.pace.message, without.pace.message);
});

test("week labels never go backwards", () => {
  const plan = buildPlan({ ...ANSWERS, until: "measure", time: "3-6m" }, PLAN_BLOCKS);
  const weeks = plan.phases.map((phase) => Number(phase.weeks.split(" ").at(-1)));
  assert.deepEqual(weeks, weeks.toSorted((a, b) => a - b));
});

// --- Explaining ---

test("every block says why it's there", () => {
  const plan = buildPlan({ ...ANSWERS, pm: ["ai"], stage: "mid-build" }, PLAN_BLOCKS);
  for (const block of [...allBlocks(plan), ...plan.getUpToSpeed, ...plan.rhythm]) assert.ok(block.why.startsWith("Because"), block.id);
});

test("reasons name what the visitor actually chose", () => {
  const both = allBlocks(buildPlan({ ...ANSWERS, pm: ["ai"], product: "data-ai" }, [addOn()]))[0];
  assert.equal(both.why, "Because you chose AI as your kind of PM and Data or AI product as your product.");
  const product = allBlocks(buildPlan({ ...ANSWERS, product: "data-ai" }, [addOn()]))[0];
  assert.equal(product.why, "Because you chose Data or AI product as your product.");
  assert.equal(allBlocks(buildPlan(ANSWERS, [makeBlock()]))[0].why, "Because you're starting something new, and your plan covers Define.");
  assert.equal(allBlocks(buildPlan({ ...ANSWERS, stage: NOT_SURE }, [makeBlock()]))[0].why, "Because you weren't sure of your stage, and your plan covers Define.");
  const rhythm = buildPlan(ANSWERS, [wow(["scrum"])]).rhythm[0];
  assert.equal(rhythm.why, "Because your team works with Scrum.");
  assert.equal(buildPlan(ANSWERS, [wow([])]).rhythm[0].why, "Because it suits any team, including one that works with Scrum.");
});

// --- The summary ---

test("the next three actions are the first steps, in order", () => {
  const plan = buildPlan({ ...ANSWERS, level: "associate" }, PLAN_BLOCKS);
  assert.equal(plan.nextActions.length, 3);
  assert.deepEqual(plan.nextActions.map((action) => action.text), PLAN_BLOCKS[0].steps.beginner.slice(0, 3));
});

test("the next actions start from instructions at every experience level", () => {
  const plan = buildPlan({ ...ANSWERS, level: "senior" }, PLAN_BLOCKS);
  assert.deepEqual(plan.nextActions.map((action) => action.text), PLAN_BLOCKS.find((block) => block.id === plan.nextActions[0].blockId)?.steps.experienced?.slice(0, 3));
});

test("earlier work the next actions rely on is called out", () => {
  const plan = buildPlan({ ...ANSWERS, stage: "mid-build", phase: "build" }, PLAN_BLOCKS);
  assert.deepEqual(plan.checkBeforeActions.map((check) => check.id), ["plan-roadmap"]);
  assert.deepEqual(buildPlan(ANSWERS, PLAN_BLOCKS).checkBeforeActions, []);
});

test("on a live product's loop, the work to look for comes from the last release", () => {
  const plan = buildPlan({ ...ANSWERS, stage: "live" }, PLAN_BLOCKS);
  assert.match(plan.checkBeforeSentence, /^Before you start, look back at what your last release did for “/);
  assert.match(buildPlan({ ...ANSWERS, stage: "mid-build", phase: "build" }, PLAN_BLOCKS).checkBeforeSentence, /^Before you start, check that “Do the .*” has been done\.$|^Before you start, check that “.+” has been done\.$/);
});

test("the next actions carry on into the next block if one runs out", () => {
  const short = makeBlock({ id: "a", steps: { beginner: ["x"], intermediate: ["one"], experienced: ["x"] } });
  const next = makeBlock({ id: "b", dependsOn: ["a"] });
  assert.deepEqual(buildPlan(ANSWERS, [short, next]).nextActions.map((action) => action.blockId), ["a", "b"]);
});

test("the summary reads properly with and without Not sure", () => {
  assert.equal(buildPlan(ANSWERS, PLAN_BLOCKS).who, "PM type: General · Product: Business software (B2B / SaaS) · Level: Product manager");
  assert.equal(buildPlan({ ...ANSWERS, pm: [NOT_SURE], product: NOT_SURE, level: NOT_SURE }, PLAN_BLOCKS).who, "Product manager");
  assert.equal(buildPlan({ ...ANSWERS, pm: [NOT_SURE], level: NOT_SURE }, PLAN_BLOCKS).who, "Product: Business software (B2B / SaaS)");
  assert.match(buildPlan(ANSWERS, PLAN_BLOCKS).where, /^Starting something new, from Discover to Plan and prioritise\.$/);
});

test("no blocks at all gives an empty plan, not a crash", () => {
  const plan = buildPlan(ANSWERS, []);
  assert.deepEqual(plan.phases, []);
  assert.deepEqual(plan.nextActions, []);
});

// --- Keeping it predictable ---

test("the same answers always give the same plan", () => {
  assert.deepEqual(buildPlan(ANSWERS, PLAN_BLOCKS), buildPlan(ANSWERS, PLAN_BLOCKS));
  assert.deepEqual(buildPlan(ANSWERS, PLAN_BLOCKS), buildPlan(ANSWERS, [...PLAN_BLOCKS].reverse()));
});

test("building a plan doesn't change the answers or the blocks", () => {
  const answers = structuredClone(ANSWERS);
  const blocks = structuredClone(PLAN_BLOCKS);
  buildPlan(answers, blocks);
  assert.deepEqual(answers, ANSWERS);
  assert.deepEqual(blocks, PLAN_BLOCKS);
});

test("two very different visitors get clearly different plans", () => {
  const newcomer = buildPlan(
    { ...ANSWERS, pm: ["general"], stage: "new", level: "associate", team: ["ba"], tools: [NOT_SURE], way: "kanban" },
    PLAN_BLOCKS,
  );
  const expert = buildPlan(
    { ...ANSWERS, pm: ["ai"], product: "data-ai", stage: "mid-build", phase: "test", level: "senior", team: ["qa"], tools: ["github"], until: "launch", way: "scrum" },
    PLAN_BLOCKS,
  );
  assert.deepEqual(phaseIds(newcomer), ["discover", "define", "design", "plan"]);
  assert.deepEqual(phaseIds(expert), ["test", "launch"]);
  assert.ok(blockIds(expert).includes("test-ai-evaluation"));
  assert.deepEqual(newcomer.rhythm.map((block) => block.id), ["wow-flow"]);
  assert.deepEqual(expert.rhythm.map((block) => block.id), ["wow-sprints"]);
  assert.deepEqual(newcomer.getUpToSpeed, []);
  assert.equal(expert.getUpToSpeed.length, 1);
});

test("every mix of the main answers builds a sensible plan from the real blocks", () => {
  const realBlocks = loadBlocks();
  const withNotSure = <T>(values: readonly T[]) => [...values, NOT_SURE] as (T | typeof NOT_SURE)[];
  let checked = 0;
  for (const pm of withNotSure(PM_TYPE_IDS).map((id) => [id])) {
    for (const product of withNotSure(PRODUCT_TYPE_IDS)) {
      for (const stage of withNotSure(STAGES.filter((item) => item.track === "product").map((item) => item.id))) {
        for (const time of withNotSure(TIMELINE_IDS)) {
          for (const way of withNotSure(WAY_OF_WORKING_IDS)) {
            checked += 1;
            const answers: IntakeAnswers = { ...ANSWERS, pm, product, stage, time, way, phase: stage === NOT_SURE ? null : NOT_SURE };
            const plan = buildPlan(answers, realBlocks);
            const name = JSON.stringify({ pm, product, stage, time, way });
            assert.ok(plan.phases.length > 0, name);
            assert.equal(plan.nextActions.length, 3, name);
            assert.ok(plan.pace.message.length > 0, name);
            const ids = blockIds(plan);
            assert.equal(new Set(ids).size, ids.length, name);
            for (const phase of plan.phases) assert.ok(PHASE_IDS.includes(phase.id), name);
            if (time !== NOT_SURE && Number.isFinite(TIMELINE_WEEKS[time].max)) {
              const last = Number(plan.phases.at(-1)?.weeks.split(" ").at(-1));
              assert.ok(last <= TIMELINE_WEEKS[time].max, `${name} ended in week ${last}`);
            }
          }
        }
      }
    }
  }
  assert.equal(checked, 9 * 6 * 4 * 5 * 4);
});

test("a UK-only block carries its region into the plan, and others don't", () => {
  const plan = buildPlan(ANSWERS, [tagged("a-uk", ["delivery"], { region: "uk" }), tagged("b-anywhere", ["delivery"])]);
  assert.equal(allBlocks(plan).find((block) => block.id === "a-uk")?.region, "uk");
  assert.equal("region" in (allBlocks(plan).find((block) => block.id === "b-anywhere") ?? {}), false);
});

// ---- Phase 8b: the leader view ----

const DIRECTOR: IntakeAnswers = { ...ANSWERS, level: "director" };
const stripLeaderViews = (blocks: Block[]) =>
  blocks.map((block) => {
    const copy: Partial<Block> = { ...block };
    delete copy.leaderView;
    return copy as Block;
  });
const LEADER_BLOCKS = [tagged("a-plain", ["delivery"]), tagged("b-plain", ["delivery"]), tagged("c-plain", ["delivery"]), tagged("d-plain", ["delivery"])].map((block, index) =>
  ({ ...block, leaderView: { good: `Good ${index}.`, ask: [`Question ${index}a?`, `Question ${index}b?`], signs: ["Sign one.", "Sign two."] } }) as Block,
);

test("the view follows the level unless the link chooses one", () => {
  const viewOf = (level: IntakeAnswers["level"], view?: IntakeAnswers["view"]) => buildPlan({ ...ANSWERS, level, view }, LEADER_BLOCKS).view;
  for (const level of ["associate", "product-manager", "senior", "group", NOT_SURE] as const) assert.equal(viewOf(level), "hands-on", level);
  for (const level of ["director", "vp"] as const) assert.equal(viewOf(level), "leader", level);
  assert.equal(viewOf("director", "hands-on"), "hands-on");
  assert.equal(viewOf("group", "leader"), "leader");
  assert.equal(viewOf("product-manager", "leader"), "leader");
});

test("strategy and coaching plans never use the leader view, because their blocks are written for leaders already", () => {
  for (const work of ["strategy", "coaching"] as const) {
    assert.equal(buildPlan({ ...DIRECTOR, work, stage: work === "strategy" ? "strategy-none" : "coaching-new", phase: null, until: null, view: "leader" }, PLAN_BLOCKS).view, "hands-on");
  }
});

test("a leader's blocks carry what good looks like, two questions and two warning signs", () => {
  const plan = buildPlan(DIRECTOR, LEADER_BLOCKS);
  const first = allBlocks(plan)[0];
  assert.equal(first.leaderView?.good, "Good 0.");
  assert.deepEqual(first.leaderView?.ask.map((question) => question.text), ["Question 0a?", "Question 0b?"]);
  assert.deepEqual(first.leaderView?.signs, ["Sign one.", "Sign two."]);
  assert.ok(allBlocks(plan).every((block) => block.leaderView !== undefined));
  // Each question has its own tick id, which can't be mistaken for a step.
  const ids = allBlocks(plan).flatMap((block) => block.leaderView?.ask.map((question) => question.id) ?? []);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.every((id) => /\/ask\/[01]$/.test(id)));
});

test("a leader's next actions ask the PM, one question from each of the first three blocks", () => {
  const plan = buildPlan(DIRECTOR, LEADER_BLOCKS);
  assert.deepEqual(plan.nextActions.map((action) => action.text), ["Ask your PM: Question 0a?", "Ask your PM: Question 1a?", "Ask your PM: Question 2a?"]);
  assert.deepEqual(plan.nextActions.map((action) => action.blockId), ["a-plain", "b-plain", "c-plain"]);
});

test("a leader's next actions put the blocks that help with the challenge first", () => {
  const blocks = [...LEADER_BLOCKS.slice(0, 3), { ...tagged("e-data", ["data"]), leaderView: LEADER_BLOCKS[0].leaderView } as Block];
  const plan = buildPlan({ ...DIRECTOR, challenge: "measurement" }, blocks);
  assert.equal(plan.nextActions[0].blockId, "e-data");
  assert.equal(plan.nextActions[0].label, "challenge");
  assert.equal(plan.nextActions.length, 3);
});

test("asking a question moves the next action on, and asking both finishes the block", () => {
  const asked = (...ids: string[]) => ({ ...NO_ADJUSTMENTS, ticked: ids });
  const afterOne = buildPlan(DIRECTOR, LEADER_BLOCKS, asked("a-plain/ask/0"));
  assert.equal(afterOne.nextActions[0].text, "Ask your PM: Question 0b?");
  assert.equal(allBlocks(afterOne)[0].done, undefined);
  const afterBoth = buildPlan(DIRECTOR, LEADER_BLOCKS, asked("a-plain/ask/0", "a-plain/ask/1"));
  assert.equal(allBlocks(afterBoth)[0].done, true);
  assert.deepEqual(afterBoth.nextActions.map((action) => action.blockId), ["b-plain", "c-plain", "d-plain"]);
});

test("asking questions does nothing in the hands-on view", () => {
  const ticked = { ...NO_ADJUSTMENTS, ticked: ["a-plain/ask/0", "a-plain/ask/1"] };
  const plan = buildPlan({ ...DIRECTOR, view: "hands-on" }, LEADER_BLOCKS, ticked);
  assert.equal(allBlocks(plan)[0].done, undefined);
  assert.deepEqual(plan, buildPlan({ ...DIRECTOR, view: "hands-on" }, LEADER_BLOCKS));
});

test("the hands-on view is exactly today's plan, whatever the level", () => {
  const withoutViews = stripLeaderViews(PLAN_BLOCKS);
  for (const level of ["associate", "product-manager", "senior", "group", "director", "vp", NOT_SURE] as const) {
    const answers = { ...ANSWERS, level };
    const handsOn = { ...answers, view: "hands-on" as const };
    // Leader views in the content must not change anything the hands-on view shows.
    assert.deepEqual(buildPlan(handsOn, PLAN_BLOCKS), buildPlan(handsOn, withoutViews), level);
  }
});

test("a product manager with no view in the link gets the same plan as before the leader view", () => {
  assert.deepEqual(buildPlan(ANSWERS, PLAN_BLOCKS), buildPlan(ANSWERS, stripLeaderViews(PLAN_BLOCKS)));
  assert.equal(buildPlan(ANSWERS, PLAN_BLOCKS).view, "hands-on");
});

test("the leader view leaves out warnings about roles missing from the PM's team", () => {
  const answers = { ...DIRECTOR, team: ["qa"] as IntakeAnswers["team"] };
  const tasksOf = (plan: Plan) => allBlocks(plan).flatMap((block) => block.tasks);
  assert.ok(tasksOf(buildPlan({ ...answers, view: "hands-on" }, PLAN_BLOCKS)).some((task) => task.who.startsWith("No ")));
  const leader = tasksOf(buildPlan({ ...answers, view: "leader" }, PLAN_BLOCKS));
  assert.ok(leader.length > 0);
  assert.ok(leader.every((task) => !task.who.startsWith("No ") && task.note === undefined));
  // The task is still shown, as who usually helps.
  assert.ok(leader.some((task) => task.who === "Business Analyst"));
});

test("a plan rebuilt from only the blocks it needs is the same in the leader view", () => {
  const answers = { ...DIRECTOR, stage: "mid-build" as const, phase: "build" as const, until: "launch" as const, challenge: "measurement" as const };
  const plan = buildPlan(answers, REAL_BLOCKS_FOR_SUBSET);
  assert.ok(plan.view === "leader" && allBlocks(plan).every((block) => block.leaderView !== undefined));
  assert.deepEqual(buildPlan(answers, blocksForPlan(answers, plan, REAL_BLOCKS_FOR_SUBSET)), plan);
});

test("every real product-track timeline block has a leader view in the leader view", () => {
  for (const level of ["group", "director", "vp"] as const) {
    const plan = buildPlan({ ...ANSWERS, level, view: "leader", stage: "new", phase: NOT_SURE, until: "measure" }, REAL_BLOCKS_FOR_SUBSET);
    assert.ok(allBlocks(plan).length > 10);
    for (const block of allBlocks(plan)) assert.ok(block.leaderView, `${block.id} has none`);
  }
});

test("the strategy nudge shows for Group PM, Director and VP on the product track only", () => {
  const nudge = (level: IntakeAnswers["level"], work: IntakeAnswers["work"] = null) => buildPlan({ ...ANSWERS, level, work }, PLAN_BLOCKS).leaderNudge;
  for (const level of ["group", "director", "vp"] as const) assert.equal(nudge(level), true, level);
  for (const level of ["associate", "product-manager", "senior", NOT_SURE] as const) assert.equal(nudge(level), false, level);
});

test("reasons name the visitor's level, in words that read well mid-sentence", () => {
  const basics = fixture("define-basics", "define", "1 day", [], { appliesTo: { pmTypes: [], productTypes: [], stages: [], waysOfWorking: [], experience: ["beginner"] } });
  assert.equal(buildPlan({ ...ANSWERS, level: "senior" }, [basics]).refreshBasics[0].why, "Because, as a senior, staff or principal PM, you've moved past this level. It's here if you want to check the basics.");
  assert.equal(buildPlan({ ...ANSWERS, level: "vp" }, [basics]).refreshBasics[0].why, "Because, as a VP or CPO, you've moved past this level. It's here if you want to check the basics.");
});
