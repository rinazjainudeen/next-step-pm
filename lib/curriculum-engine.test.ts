import { test } from "node:test";
import assert from "node:assert/strict";
import { EXPERIENCE_IDS, PHASE_IDS, PM_TYPE_IDS, PRODUCT_TYPE_IDS, STAGES, TIMELINE_IDS, WAY_OF_WORKING_IDS } from "../content/taxonomy";
import { makeBlock } from "./blocks-fixture";
import { loadBlocks } from "./blocks-load";
import type { Block } from "./blocks-types";
import { MIN_PHASE_DAYS, TIMELINE_WEEKS, buildPlan, effortInDays } from "./curriculum-engine";
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
  pm: "general",
  product: "b2b",
  stage: "new",
  phase: NOT_SURE,
  exp: "intermediate",
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
  for (const stage of STAGES) {
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
  assert.equal(blockIds(buildPlan({ ...ANSWERS, pm: "ai" }, blocks)).length, 1);
  assert.equal(blockIds(buildPlan({ ...ANSWERS, product: "data-ai" }, blocks)).length, 1);
  assert.equal(blockIds(buildPlan(ANSWERS, blocks)).length, 0);
});

test("an empty list never counts as a match on its own", () => {
  const publicOnly = addOn({ appliesTo: { pmTypes: [], productTypes: ["public"], stages: [], waysOfWorking: [], experience: [] } });
  assert.equal(blockIds(buildPlan(ANSWERS, [publicOnly])).length, 0);
  assert.equal(blockIds(buildPlan({ ...ANSWERS, product: "public" }, [publicOnly])).length, 1);
});

test("Not sure on PM type and product leaves out add-ons aimed at one kind", () => {
  assert.equal(blockIds(buildPlan({ ...ANSWERS, pm: NOT_SURE, product: NOT_SURE }, [addOn()])).length, 0);
});

test("stage and way-of-working tags must still fit an add-on", () => {
  const midBuildOnly = addOn({ appliesTo: { pmTypes: ["ai"], productTypes: [], stages: ["mid-build"], waysOfWorking: [], experience: [] } });
  assert.equal(blockIds(buildPlan({ ...ANSWERS, pm: "ai" }, [midBuildOnly])).length, 0);
  const kanbanOnly = addOn({ appliesTo: { pmTypes: ["ai"], productTypes: [], stages: [], waysOfWorking: ["kanban"], experience: [] } });
  assert.equal(blockIds(buildPlan({ ...ANSWERS, pm: "ai" }, [kanbanOnly])).length, 0);
  assert.equal(blockIds(buildPlan({ ...ANSWERS, pm: "ai", way: "kanban" }, [kanbanOnly])).length, 1);
});

test("an add-on tagged for AI reaches AI PMs and AI products, and not others", () => {
  const id = "test-ai-evaluation";
  const base: IntakeAnswers = { ...ANSWERS, stage: "mid-build", phase: "test" };
  assert.ok(blockIds(buildPlan({ ...base, pm: "ai" }, PLAN_BLOCKS)).includes(id));
  assert.ok(blockIds(buildPlan({ ...base, product: "data-ai" }, PLAN_BLOCKS)).includes(id));
  assert.ok(!blockIds(buildPlan(base, PLAN_BLOCKS)).includes(id));
});

test("a block limited by experience only reaches those levels", () => {
  const forExperienced = makeBlock({ appliesTo: { pmTypes: [], productTypes: [], stages: [], waysOfWorking: [], experience: ["experienced"] } });
  const reached = (exp: IntakeAnswers["exp"]) => blockIds(buildPlan({ ...ANSWERS, exp }, [forExperienced])).length === 1;
  assert.equal(reached("experienced"), true);
  assert.equal(reached("beginner"), false);
  assert.equal(reached("intermediate"), false);
  assert.equal(reached(NOT_SURE), false);
});

test("Not sure on experience counts as intermediate for limits as well as steps", () => {
  const intermediateUp = makeBlock({ appliesTo: { pmTypes: [], productTypes: [], stages: [], waysOfWorking: [], experience: ["intermediate", "experienced"] } });
  assert.equal(blockIds(buildPlan({ ...ANSWERS, exp: NOT_SURE }, [intermediateUp])).length, 1);
  assert.equal(blockIds(buildPlan({ ...ANSWERS, exp: "beginner" }, [intermediateUp])).length, 0);
});

test("an empty experience list reaches every level", () => {
  for (const exp of [...EXPERIENCE_IDS, NOT_SURE] as const) assert.equal(blockIds(buildPlan({ ...ANSWERS, exp }, [makeBlock()])).length, 1, exp);
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
  const plan = buildPlan({ ...ANSWERS, pm: "ai" }, [fixture("z-core", "define", "1 day", []), addOn({ id: "y-add-on" }), goFurther({ id: "a-extra" })]);
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

const skillIds = (plan: Plan) => [...plan.skillsForLevel, ...plan.skillsAnyLevel].map((block) => block.id);

test("craft blocks go in Grow your skills, outside the timeline", () => {
  const plan = buildPlan(ANSWERS, [...PLAN_BLOCKS, craft("craft-a")]);
  assert.deepEqual(skillIds(plan), ["craft-a"]);
  assert.ok(!blockIds(plan).includes("craft-a"));
  assert.ok(!plan.rhythm.some((block) => block.id === "craft-a"));
  assert.ok(plan.nextActions.every((action) => action.blockId !== "craft-a"));
});

test("skills split into those picked for your level and those for any level", () => {
  const blocks = [craft("craft-all"), craft("craft-beginner", ["beginner"]), craft("craft-senior", ["experienced"])];
  const split = (exp: IntakeAnswers["exp"]) => {
    const plan = buildPlan({ ...ANSWERS, exp }, blocks);
    return [plan.skillsForLevel.map((block) => block.id), plan.skillsAnyLevel.map((block) => block.id)];
  };
  assert.deepEqual(split("beginner"), [["craft-beginner"], ["craft-all"]]);
  assert.deepEqual(split("experienced"), [["craft-senior"], ["craft-all"]]);
  assert.deepEqual(split("intermediate"), [[], ["craft-all"]]);
  assert.deepEqual(split(NOT_SURE), [[], ["craft-all"]]);
});

test("the most level-specific skills come first, whatever their names", () => {
  const blocks = [craft("craft-a-two-levels", ["intermediate", "experienced"]), craft("craft-z-one-level", ["experienced"])];
  const plan = buildPlan({ ...ANSWERS, exp: "experienced" }, blocks);
  assert.deepEqual(plan.skillsForLevel.map((block) => block.id), ["craft-z-one-level", "craft-a-two-levels"]);
});

test("craft blocks don't add to the plan's length", () => {
  const without = buildPlan(ANSWERS, PLAN_BLOCKS);
  const withCraft = buildPlan(ANSWERS, [...PLAN_BLOCKS, craft("craft-a"), craft("craft-b")]);
  assert.equal(withCraft.pace.message, without.pace.message);
});

test("craft blocks say why they're there", () => {
  const plan = buildPlan({ ...ANSWERS, exp: "beginner" }, [craft("craft-all"), craft("craft-beginner", ["beginner"])]);
  assert.equal(plan.skillsAnyLevel[0].why, "Because it's a useful skill at any level.");
  assert.equal(plan.skillsForLevel[0].why, "Because it suits your experience.");
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
  assert.deepEqual(blockIds(buildPlan({ ...ANSWERS, pm: "ai" }, [extra, core])), ["z-core", "a-extra"]);
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
  assert.deepEqual(blockIds(buildPlan({ ...ANSWERS, pm: "ai" }, blocks)), ["a-core", "b-core", "z-extra", "c-core", "d-core"]);
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
  for (const exp of EXPERIENCE_IDS) {
    const plan = buildPlan({ ...ANSWERS, exp }, PLAN_BLOCKS);
    assert.deepEqual(allBlocks(plan)[0].steps.map((step) => step.text), block.steps[exp]);
  }
});

test("Not sure on experience gets the intermediate steps", () => {
  const plan = buildPlan({ ...ANSWERS, exp: NOT_SURE }, PLAN_BLOCKS);
  assert.deepEqual(allBlocks(plan)[0].steps.map((step) => step.text), PLAN_BLOCKS[0].steps.intermediate);
});

test("step ids are unique across a plan, and differ between levels", () => {
  const beginner = allBlocks(buildPlan({ ...ANSWERS, exp: "beginner" }, PLAN_BLOCKS)).flatMap((block) => block.steps);
  assert.equal(new Set(beginner.map((step) => step.id)).size, beginner.length);
  const experienced = allBlocks(buildPlan({ ...ANSWERS, exp: "experienced" }, PLAN_BLOCKS)).flatMap((block) => block.steps);
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
  const missing = delegated({ role: "delivery-manager", ifMissing: "ask-around" }, ["ba"]);
  assert.match(missing.note ?? "", /Ask whoever knows this best/);
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
  const plan = buildPlan({ ...ANSWERS, exp: "beginner", time: NOT_SURE, until: null }, PLAN_BLOCKS);
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
  const plan = buildPlan({ ...ANSWERS, pm: "ai", stage: "mid-build" }, PLAN_BLOCKS);
  for (const block of [...allBlocks(plan), ...plan.getUpToSpeed, ...plan.rhythm]) assert.ok(block.why.startsWith("Because"), block.id);
});

test("reasons name what the visitor actually chose", () => {
  const both = allBlocks(buildPlan({ ...ANSWERS, pm: "ai", product: "data-ai" }, [addOn()]))[0];
  assert.equal(both.why, "Because you chose AI and innovation as your kind of PM and Data or AI product as your product.");
  const product = allBlocks(buildPlan({ ...ANSWERS, product: "data-ai" }, [addOn()]))[0];
  assert.equal(product.why, "Because you chose Data or AI product as your product.");
  assert.equal(allBlocks(buildPlan(ANSWERS, [makeBlock()]))[0].why, "Because your plan covers Define.");
  const rhythm = buildPlan(ANSWERS, [wow(["scrum"])]).rhythm[0];
  assert.equal(rhythm.why, "Because your team works with Scrum.");
});

// --- The summary ---

test("the next three actions are the first steps, in order", () => {
  const plan = buildPlan({ ...ANSWERS, exp: "beginner" }, PLAN_BLOCKS);
  assert.equal(plan.nextActions.length, 3);
  assert.deepEqual(plan.nextActions.map((action) => action.text), PLAN_BLOCKS[0].steps.beginner.slice(0, 3));
});

test("the next actions start from instructions at every experience level", () => {
  const plan = buildPlan({ ...ANSWERS, exp: "experienced" }, PLAN_BLOCKS);
  assert.deepEqual(plan.nextActions.map((action) => action.text), PLAN_BLOCKS.find((block) => block.id === plan.nextActions[0].blockId)?.steps.experienced.slice(0, 3));
});

test("earlier work the next actions rely on is called out", () => {
  const plan = buildPlan({ ...ANSWERS, stage: "mid-build", phase: "build" }, PLAN_BLOCKS);
  assert.deepEqual(plan.checkBeforeActions.map((check) => check.id), ["plan-roadmap"]);
  assert.deepEqual(buildPlan(ANSWERS, PLAN_BLOCKS).checkBeforeActions, []);
});

test("on a live product's loop, the work to look for comes from the last release", () => {
  const plan = buildPlan({ ...ANSWERS, stage: "live" }, PLAN_BLOCKS);
  assert.equal(plan.checkBeforeLabel, "From your last release, find");
  assert.equal(buildPlan({ ...ANSWERS, stage: "mid-build", phase: "build" }, PLAN_BLOCKS).checkBeforeLabel, "Make sure these are done first");
});

test("the next actions carry on into the next block if one runs out", () => {
  const short = makeBlock({ id: "a", steps: { beginner: ["x"], intermediate: ["one"], experienced: ["x"] } });
  const next = makeBlock({ id: "b", dependsOn: ["a"] });
  assert.deepEqual(buildPlan(ANSWERS, [short, next]).nextActions.map((action) => action.blockId), ["a", "b"]);
});

test("the summary reads properly with and without Not sure", () => {
  assert.equal(buildPlan(ANSWERS, PLAN_BLOCKS).who, "PM type: General · Product: Business software (B2B / SaaS) · Experience: Intermediate");
  assert.equal(buildPlan({ ...ANSWERS, pm: NOT_SURE, product: NOT_SURE, exp: NOT_SURE }, PLAN_BLOCKS).who, "Product manager");
  assert.equal(buildPlan({ ...ANSWERS, pm: NOT_SURE, exp: NOT_SURE }, PLAN_BLOCKS).who, "Product: Business software (B2B / SaaS)");
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
    { ...ANSWERS, pm: "general", stage: "new", exp: "beginner", team: [NOT_SURE], tools: [NOT_SURE], way: "kanban" },
    PLAN_BLOCKS,
  );
  const expert = buildPlan(
    { ...ANSWERS, pm: "ai", product: "data-ai", stage: "mid-build", phase: "test", exp: "experienced", team: ["qa"], tools: ["github"], until: "launch", way: "scrum" },
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
  for (const pm of withNotSure(PM_TYPE_IDS)) {
    for (const product of withNotSure(PRODUCT_TYPE_IDS)) {
      for (const stage of withNotSure(STAGES.map((item) => item.id))) {
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
  assert.equal(checked, 7 * 6 * 4 * 5 * 4);
});
