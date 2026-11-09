import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { EXPLORE_GOAL_BLOCKS } from "../content/explore-goal-map";
import { BACKGROUNDS, BACKGROUND_IDS, EXPLORE_GOAL_IDS, HOURS_IDS, PHASES, STAGES, WORK_KINDS } from "../content/taxonomy";
import { loadBlocks } from "./blocks-load";
import { isExploreBlock, phaseName, type Block } from "./blocks-types";
import { blocksForPlan, buildPlan } from "./curriculum-engine";
import { ALL_EXPLORE_BLOCK_IDS, completeExploreAnswers, explorePhaseIds, exploreBlockIds, hoursPerWeek } from "./explore";
import { chooseSingle } from "./intake-draft";
import { EXPLORE_QUESTIONS, INTAKE_QUESTIONS, questionsForWork, summariseAnswers, totalStepsFor } from "./intake-questions";
import { EMPTY_DRAFT, NOT_SURE, type IntakeAnswers, type IntakeDraft } from "./intake-types";
import { draftToQuery, parseDraft, planHref, startHref } from "./intake-url";
import { canJumpTo, firstUnansweredStep, validateDraft } from "./intake-validate";
import { NEW_TO_PRODUCT_HREF } from "./navigation";
import { NO_ADJUSTMENTS } from "./plan-adjustments";
import { OPENING_LINES } from "./plan-wording";
import type { Plan, PlanBlock } from "./plan-types";

const BLOCKS = loadBlocks();
const byId = new Map(BLOCKS.map((block) => [block.id, block]));

const explorer = (background: IntakeDraft["background"], goal: IntakeDraft["goal"], hours: IntakeDraft["hours"]): IntakeAnswers =>
  completeExploreAnswers({ ...EMPTY_DRAFT, work: "explore", background, goal, hours });

const planFor = (...args: Parameters<typeof explorer>) => buildPlan(explorer(...args), BLOCKS);
const everyBlock = (plan: Plan): PlanBlock[] => plan.phases.flatMap((phase) => phase.blocks);
const ids = (plan: Plan) => everyBlock(plan).map((block) => block.id);
const required = (plan: Plan) => everyBlock(plan).filter((block) => !block.optional);
const REUSED = ["craft-technical-fluency", "craft-product-writing", "craft-sql-basics"];
const parse = (href: string) => parseDraft(new URLSearchParams(href.split("?")[1]));

// ---- The taxonomy ----

test("exploring is a fourth kind of work, with its own phases and one starting point", () => {
  assert.deepEqual(WORK_KINDS.map((kind) => kind.id), ["product", "strategy", "coaching", "explore"]);
  assert.equal(WORK_KINDS[3].label, "I'm exploring product management");
  assert.equal(WORK_KINDS[3].description, "You're curious about the role, learning it, or aiming for your first PM job.");
  const phases = PHASES.filter((phase) => phase.track === "explore");
  assert.deepEqual(phases.map((phase) => [phase.id, phase.label]), [
    ["explore-role", "Explore the role"],
    ["explore-foundations", "Build foundations"],
    ["explore-practise", "Practise"],
    ["explore-apply", "Apply"],
  ]);
  assert.deepEqual(phases.map((phase) => phase.readyWhen), [
    "You know what PMs do, which kind suits you, and whether you want to carry on.",
    "You can explain the product process, read basic numbers and use AI tools sensibly.",
    "You've done a small real project and have a case study to show.",
    "You've applied, or taken on PM work, with a clear story.",
  ]);
  assert.deepEqual(STAGES.filter((stage) => stage.track === "explore").map((stage) => stage.id), ["explore-new"]);
});

test("the library names the explore phases so they can't be mistaken for another track's", () => {
  assert.equal(phaseName("explore-role"), "New to product: Explore the role");
  assert.equal(phaseName("explore-apply"), "New to product: Apply");
  assert.equal(phaseName("discover"), "Discover");
  assert.equal(phaseName("pilot"), "Coaching: Pilot");
});

// ---- The intake ----

test("the explore path asks four questions: kind of work, background, goal and time each week", () => {
  assert.deepEqual(EXPLORE_QUESTIONS.map((question) => question.id), ["work", "background", "goal", "hours"]);
  assert.equal(totalStepsFor("explore"), 4);
  assert.equal(questionsForWork("explore"), EXPLORE_QUESTIONS);
  // Every other kind of work, and no answer, keeps the nine questions.
  for (const work of ["product", "strategy", "coaching", NOT_SURE, null] as const) {
    assert.equal(totalStepsFor(work), 9, String(work));
    assert.equal(questionsForWork(work), INTAKE_QUESTIONS);
  }
});

test("the background, goal and time questions use the agreed words", () => {
  const [, background, goal, hours] = EXPLORE_QUESTIONS;
  assert.equal(background.title, "Where are you coming from?");
  assert.deepEqual(background.options.map((option) => [option.label, option.description]), [
    ["Software engineering", "You build or test software."],
    ["Design, UX or research", "You design or research how people use things."],
    ["Data or analytics", "You work with data, reports or models."],
    ["Business, operations or consulting", "You run processes, projects or client work."],
    ["Marketing, sales or customer success", "You work closely with customers or markets."],
    ["Student or recent graduate", "You're early in your career."],
    ["Something else", "Another background."],
  ]);
  assert.equal(background.notSure, "We'll cover the foundations evenly.");
  assert.equal(goal.title, "What do you want from this?");
  assert.deepEqual(goal.options.map((option) => [option.label, option.description]), [
    ["Understand what the role involves", "You want to know what PMs do before deciding."],
    ["Move into a PM role where I work now", "You want an internal move."],
    ["Get my first PM job somewhere new", "You're aiming to apply elsewhere."],
    ["Work better with product managers", "You work alongside PMs and want to understand them."],
  ]);
  assert.equal(goal.notSure, "We'll start with understanding the role, then practising.");
  assert.equal(hours.title, "How much time can you give each week?");
  assert.deepEqual(hours.options.map((option) => option.label), ["Under 3 hours", "3 to 6 hours", "7 hours or more"]);
  assert.equal(hours.notSure, "We'll assume 3 to 6 hours.");
});

test("a finished explore draft needs only four answers, and the rest is filled in at beginner level", () => {
  const result = validateDraft({ ...EMPTY_DRAFT, work: "explore", background: "engineering", goal: "first-job", hours: "3-6" });
  assert.ok(result.ok);
  assert.equal(result.answers.level, "associate");
  assert.equal(result.answers.stage, "explore-new");
  for (const key of ["product", "size", "challenge", "time", "way"] as const) assert.equal(result.answers[key], NOT_SURE, key);
  assert.deepEqual(result.answers.team, []);
  assert.deepEqual(result.answers.tools, []);
});

test("the explore path reports only its own missing answers, and steps count from 1 to 4", () => {
  const draft: IntakeDraft = { ...EMPTY_DRAFT, work: "explore" };
  const result = validateDraft(draft);
  assert.ok(!result.ok);
  assert.deepEqual(result.errors.map((error) => error.question), ["background", "goal", "hours"]);
  assert.equal(firstUnansweredStep(draft), 2);
  assert.equal(firstUnansweredStep({ ...draft, background: NOT_SURE }), 3);
  assert.equal(firstUnansweredStep({ ...draft, background: NOT_SURE, goal: NOT_SURE }), 4);
  assert.equal(firstUnansweredStep({ ...draft, background: NOT_SURE, goal: NOT_SURE, hours: NOT_SURE }), null);
  assert.equal(canJumpTo(draft, 2), true);
  assert.equal(canJumpTo(draft, 3), false);
  assert.equal(canJumpTo({ ...draft, background: NOT_SURE, goal: NOT_SURE, hours: NOT_SURE }, 5), false);
});

test("Not sure is a real answer on every explore question", () => {
  const result = validateDraft({ ...EMPTY_DRAFT, work: "explore", background: NOT_SURE, goal: NOT_SURE, hours: NOT_SURE });
  assert.ok(result.ok);
  assert.equal(result.answers.goal, NOT_SURE);
});

test("the answers can be chosen one at a time, like every other question", () => {
  let draft: IntakeDraft = { ...EMPTY_DRAFT };
  draft = chooseSingle(draft, "work", "explore");
  draft = chooseSingle(draft, "background", "design");
  draft = chooseSingle(draft, "goal", "internal-move");
  draft = chooseSingle(draft, "hours", "7-plus");
  assert.ok(validateDraft(draft).ok);
});

test("the explore answers go in the link, and come back out of it", () => {
  const draft: IntakeDraft = { ...EMPTY_DRAFT, work: "explore", background: "data", goal: "work-with-pms", hours: "under-3" };
  assert.equal(draftToQuery(draft), "work=explore&background=data&goal=work-with-pms&hours=under-3");
  assert.deepEqual(parse(planHref(draft)), draft);
  assert.deepEqual(parse(startHref({ ...draft, hours: undefined }, 4)), { ...EMPTY_DRAFT, work: "explore", background: "data", goal: "work-with-pms" });
  const notSure: IntakeDraft = { ...EMPTY_DRAFT, work: "explore", background: NOT_SURE, goal: NOT_SURE, hours: NOT_SURE };
  assert.deepEqual(parse(planHref(notSure)), notSure);
});

test("a bad value for an explore answer is ignored, and old links have none", () => {
  const draft = parse("/plan?work=explore&background=pilot&goal=&hours=forever");
  assert.equal(draft.background, undefined);
  assert.equal(draft.goal, undefined);
  assert.equal(draft.hours, undefined);
  const old = parse("/plan?pm=ai&level=senior&product=b2b&size=scaling&stage=mid-build&phase=build&challenge=measurement&time=1-3m&until=launch&way=scrum&work=product");
  assert.equal("background" in old, false);
  assert.equal("goal" in old, false);
  assert.equal("hours" in old, false);
  assert.ok(!draftToQuery(old).includes("background"));
});

test("the home page's New to product links open the intake with exploring chosen, at the next question", () => {
  assert.equal(NEW_TO_PRODUCT_HREF, startHref({ ...EMPTY_DRAFT, work: "explore" }, 2));
  assert.equal(parse(NEW_TO_PRODUCT_HREF).work, "explore");
});

test("the answers page lists the four explore answers, each with its own step to change", () => {
  const rows = summariseAnswers(explorer("engineering", "first-job", "3-6"));
  assert.deepEqual(rows.map((row) => [row.label, row.value, row.step]), [
    ["Kind of work", "I'm exploring product management", 1],
    ["Background", "Software engineering", 2],
    ["Goal", "Get my first PM job somewhere new", 3],
    ["Time each week", "3 to 6 hours", 4],
    ["Phases your plan covers", "Explore the role, Build foundations, Practise, Apply", undefined],
  ]);
  assert.equal(summariseAnswers(explorer(NOT_SURE, NOT_SURE, NOT_SURE))[3].value, "Not sure");
});

// ---- The blocks ----

test("the 18 new blocks are beginner-only, tagged for the explore stage and carry their sources", () => {
  const explore = BLOCKS.filter((block) => block.id.startsWith("xr-"));
  assert.equal(explore.length, 18);
  for (const block of explore) {
    assert.ok(isExploreBlock(block), block.id);
    assert.deepEqual(Object.keys(block.steps), ["beginner"], block.id);
    assert.deepEqual(block.appliesTo.stages, ["explore-new"], block.id);
    assert.equal(block.roles.canDelegateTo.length, 0, block.id);
    assert.ok(block.sources.length > 0 && block.definitionOfDone.length > 0 && block.pitfalls.length > 0, block.id);
  }
});

test("each goal's block list matches the goal map in docs, and every block is real and in the right phase", () => {
  const file = JSON.parse(fs.readFileSync(new URL("../docs/phase-8c-goal-map.json", import.meta.url), "utf8")) as Record<string, unknown>;
  for (const key of [...EXPLORE_GOAL_IDS, NOT_SURE] as const) assert.deepEqual(EXPLORE_GOAL_BLOCKS[key], file[key], key);
  for (const key of [...EXPLORE_GOAL_IDS, NOT_SURE] as const) {
    const phases = explorePhaseIds(key);
    const listed = EXPLORE_GOAL_BLOCKS[key].map((id) => byId.get(id) as Block);
    assert.ok(listed.every((block) => block !== undefined), key);
    for (const phase of phases) assert.ok(listed.some((block) => block.phase === phase), `${key} has no block in ${phase}`);
    for (const block of listed) assert.ok(phases.includes(block.phase as never), `${key}: ${block.id} is outside its phases`);
  }
  assert.equal(ALL_EXPLORE_BLOCK_IDS.size, 18);
});

test("reused blocks join the explore path through alsoIn as Go further, not as copies", () => {
  for (const id of REUSED) {
    const place = byId.get(id)?.alsoIn?.find((item) => item.phase === "explore-foundations");
    assert.ok(place?.optional, id);
  }
  assert.equal(byId.get("onboarding-existing-product")?.alsoIn?.[0].phase, "explore-apply");
  assert.equal(BLOCKS.length, 171);
});

// ---- The plan: which blocks each goal gets ----

test("understanding the role gets Explore the role and Build foundations, with 8 blocks", () => {
  const plan = planFor("engineering", "understand", "3-6");
  assert.deepEqual(plan.phases.map((phase) => phase.id), ["explore-role", "explore-foundations"]);
  assert.deepEqual(required(plan).map((block) => block.id).sort(), [...EXPLORE_GOAL_BLOCKS.understand].sort());
});

test("working better with PMs gets no Practise or Apply phase, and 5 blocks", () => {
  const plan = planFor("design", "work-with-pms", "3-6");
  assert.deepEqual(plan.phases.map((phase) => phase.id), ["explore-role", "explore-foundations"]);
  assert.deepEqual(required(plan).map((block) => block.id).sort(), [...EXPLORE_GOAL_BLOCKS["work-with-pms"]].sort());
});

test("an internal move gets all four phases, 18 blocks and the internal-move block", () => {
  const plan = planFor("business", "internal-move", "3-6");
  assert.deepEqual(plan.phases.map((phase) => phase.id), ["explore-role", "explore-foundations", "explore-practise", "explore-apply"]);
  assert.equal(required(plan).length, 18);
  assert.ok(ids(plan).includes("xr-internal-move"));
});

test("a first job elsewhere gets all four phases and 17 blocks, without the internal-move block", () => {
  const plan = planFor("business", "first-job", "3-6");
  assert.deepEqual(plan.phases.map((phase) => phase.id), ["explore-role", "explore-foundations", "explore-practise", "explore-apply"]);
  assert.equal(required(plan).length, 17);
  assert.ok(!ids(plan).includes("xr-internal-move"));
  for (const id of ["xr-find-entry-routes", "xr-product-cv", "xr-interview-prep"]) assert.ok(ids(plan).includes(id), id);
});

test("Not sure on every question gives Explore the role, Build foundations and Practise", () => {
  const plan = planFor(NOT_SURE, NOT_SURE, NOT_SURE);
  assert.deepEqual(plan.phases.map((phase) => phase.id), ["explore-role", "explore-foundations", "explore-practise"]);
  assert.equal(required(plan).length, 14);
  assert.ok(!ids(plan).includes("xr-internal-move") && !ids(plan).includes("xr-product-cv"));
});

test("reused blocks are Go further: last in their phase, and Apply's only for the two job goals", () => {
  for (const goal of ["understand", "work-with-pms", "internal-move", "first-job", NOT_SURE] as const) {
    const foundations = planFor("data", goal, "3-6").phases.find((phase) => phase.id === "explore-foundations");
    const tail = foundations?.blocks.slice(-3) ?? [];
    assert.deepEqual(tail.map((block) => block.id).sort(), [...REUSED].sort(), goal);
    assert.ok(tail.every((block) => block.optional === true), goal);
    assert.ok(foundations?.blocks.slice(0, -3).every((block) => !block.optional), goal);
  }
  for (const [goal, has] of [["internal-move", true], ["first-job", true], ["understand", false], ["work-with-pms", false], [NOT_SURE, false]] as const) {
    assert.equal(ids(planFor("data", goal, "3-6")).includes("onboarding-existing-product"), has, goal);
  }
});

test("a goal's plan doesn't tell you to check a block it left out", () => {
  for (const goal of ["understand", "work-with-pms", "internal-move", "first-job", NOT_SURE] as const) {
    for (const block of everyBlock(planFor("data", goal, "3-6"))) assert.deepEqual(block.checkFirst, [], `${goal}: ${block.id}`);
  }
});

test("the steps are always the beginner ones, and the new blocks have nobody to ask", () => {
  for (const block of everyBlock(planFor("engineering", "first-job", "3-6"))) {
    assert.ok(block.steps.length > 0 && block.steps.every((step) => step.id.includes("/beginner/")), block.id);
    assert.equal(block.leaderView, undefined, block.id);
    if (block.id.startsWith("xr-")) {
      assert.deepEqual(block.tasks, [], block.id);
      assert.deepEqual(block.reviewers, [], block.id);
    }
  }
});

// ---- The plan: time, wording and labels ----

test("hours each week change the 'about N weeks' line, and Not sure means 3 to 6 hours", () => {
  const weeks = (hours: IntakeDraft["hours"]) => Number(/about (\d+) weeks? at your pace\.$/.exec(planFor("engineering", "first-job", hours).pace.message)?.[1]);
  assert.ok(weeks("under-3") > weeks("3-6") && weeks("3-6") > weeks("7-plus"), "more hours should be fewer weeks");
  assert.equal(weeks(NOT_SURE), weeks("3-6"));
  assert.equal(hoursPerWeek(NOT_SURE), hoursPerWeek("3-6"));
  assert.match(planFor("engineering", "first-job", "3-6").pace.message, /^This plan takes about \d+ weeks at your pace\.$/);
  assert.equal(planFor("engineering", "first-job", "3-6").pace.status, "open");
});

test("the weeks line is the last week shown on the timeline, and weeks run on from one phase to the next", () => {
  for (const goal of EXPLORE_GOAL_IDS) {
    for (const hours of HOURS_IDS) {
      const plan = planFor("student", goal, hours);
      const labels = plan.phases.map((phase) => phase.weeks.match(/\d+/g)?.map(Number) as number[]);
      const lastWeek = labels.at(-1)?.at(-1);
      assert.equal(Number(/about (\d+) weeks?/.exec(plan.pace.message)?.[1]), lastWeek, `${goal} ${hours}`);
      labels.forEach(([first, last], index) => {
        assert.ok(last >= first, `${goal} ${hours}`);
        if (index > 0) assert.ok(first >= (labels[index - 1].at(-1) ?? 0) && first <= (labels[index - 1].at(-1) ?? 0) + 1, `${goal} ${hours}`);
      });
    }
  }
});

test("Go further blocks add nothing to the weeks", () => {
  const withReused = planFor("engineering", "first-job", "3-6");
  const without = buildPlan(explorer("engineering", "first-job", "3-6"), BLOCKS.filter((block) => !REUSED.includes(block.id) && block.id !== "onboarding-existing-product"));
  assert.equal(withReused.pace.message, without.pace.message);
});

test("the plan opens with the agreed line and has no team, tools, challenge or leader view", () => {
  const plan = planFor("engineering", "first-job", "3-6");
  assert.equal(plan.openingLine, "You're exploring product management, so this plan helps you learn what the job is, build foundations, practise on a real problem and, if you want, apply.");
  assert.equal(plan.openingLine, OPENING_LINES.tracks.explore);
  assert.equal(plan.track, "explore");
  assert.equal(plan.view, "hands-on");
  assert.equal(plan.leaderNudge, false);
  assert.equal(plan.teamAnswered, false);
  assert.deepEqual(plan.leadYourTeam, []);
  assert.deepEqual(plan.getUpToSpeed, []);
  assert.deepEqual(plan.rhythm, []);
  assert.equal(plan.newToProductFirst, false);
  assert.equal(plan.skillsFirst, false);
  assert.equal(plan.checkBeforeSentence, "");
});

test("the next actions come from the first block, whether or not it carries a label", () => {
  for (const [background, goal] of [["engineering", "first-job"], ["design", "internal-move"], ["student", NOT_SURE], [NOT_SURE, "understand"]] as const) {
    const plan = planFor(background, goal, "3-6");
    assert.equal(plan.nextActions.length, 3, `${background} ${goal}`);
    assert.ok(plan.nextActions.every((action) => action.blockId === "xr-what-pms-do"), `${background} ${goal}`);
  }
});

test("an engineer and a graduate get different 'common gap' labels, at most 3, each naming the reason", () => {
  const labelled = (plan: Plan) => everyBlock(plan).filter((block) => block.helpsChallenge);
  const engineer = labelled(planFor("engineering", "first-job", "3-6"));
  const graduate = labelled(planFor("student", "first-job", "3-6"));
  assert.ok(engineer.length > 0 && engineer.length <= 3);
  assert.ok(graduate.length > 0 && graduate.length <= 3);
  assert.notDeepEqual(engineer.map((block) => block.id), graduate.map((block) => block.id));
  for (const block of engineer) assert.equal(block.why, "Helps close a common gap for people coming from engineering.");
  for (const block of graduate) assert.equal(block.why, "Helps close a common gap for students and recent graduates.");
  assert.equal(planFor("engineering", "first-job", "3-6").challengePill, "Helps close a common gap");
});

test("every background favours the skills in the spec, and 'Something else' and Not sure favour none", () => {
  const favours = (id: string) => BACKGROUNDS.find((item) => item.id === id)?.favours;
  assert.deepEqual(favours("engineering"), ["commercial", "discovery", "communication"]);
  assert.deepEqual(favours("design"), ["data", "commercial", "technical"]);
  assert.deepEqual(favours("data"), ["discovery", "communication", "commercial"]);
  assert.deepEqual(favours("business"), ["technical", "discovery", "design"]);
  assert.deepEqual(favours("marketing"), ["data", "technical", "delivery"]);
  assert.deepEqual(favours("student"), ["discovery", "communication", "data"]);
  assert.deepEqual(favours("other"), []);
  for (const background of ["other", NOT_SURE] as const) {
    assert.deepEqual(everyBlock(planFor(background, "first-job", "3-6")).filter((block) => block.helpsChallenge), [], background);
    assert.ok(everyBlock(planFor(background, "first-job", "3-6")).every((block) => !block.why.includes("common gap")), background);
  }
});

test("the self-check still labels blocks on the explore path, after the background and within the same three", () => {
  const rated = { ...NO_ADJUSTMENTS, selfCheck: { data: "getting-started" } } as const;
  // With no background favouring anything, the self-check has room for its labels.
  const open = buildPlan(explorer(NOT_SURE, "first-job", "3-6"), BLOCKS, rated);
  const grows = everyBlock(open).filter((block) => block.growsSkill);
  assert.deepEqual(grows.map((block) => block.id), ["xr-numbers-for-pms", "xr-define-success-test"]);
  assert.ok(grows.every((block) => block.why.startsWith("Builds a skill you want to grow")));
  // An engineer's background already fills the three labels, so the self-check adds none.
  const full = buildPlan(explorer("engineering", "first-job", "3-6"), BLOCKS, rated);
  assert.equal(everyBlock(full).filter((block) => block.helpsChallenge || block.growsSkill).length, 3);
  assert.equal(everyBlock(full).filter((block) => block.growsSkill).length, 0);
});

test("'Map your skills to product management' gets a line for the visitor's background, and no other block does", () => {
  const plan = planFor("engineering", "first-job", "3-6");
  assert.equal(
    everyBlock(plan).find((block) => block.id === "xr-map-your-skills")?.backgroundLine,
    "Engineers already know how products get built. Spend your time on users and the business.",
  );
  assert.ok(everyBlock(plan).filter((block) => block.id !== "xr-map-your-skills").every((block) => block.backgroundLine === undefined));
  for (const background of BACKGROUND_IDS.filter((id) => id !== "other")) {
    assert.ok(everyBlock(planFor(background, "first-job", "3-6")).find((block) => block.id === "xr-map-your-skills")?.backgroundLine, background);
  }
  for (const background of ["other", NOT_SURE] as const) {
    assert.equal(everyBlock(planFor(background, "first-job", "3-6")).find((block) => block.id === "xr-map-your-skills")?.backgroundLine, undefined, background);
  }
});

test("ticks, 'Already done' and 'Not relevant' work on the explore path", () => {
  const answers = explorer("engineering", "first-job", "3-6");
  const first = everyBlock(buildPlan(answers, BLOCKS))[0];
  const allTicked = { ...NO_ADJUSTMENTS, ticked: first.steps.map((step) => step.id) };
  const done = buildPlan(answers, BLOCKS, allTicked);
  assert.equal(everyBlock(done)[0].done, true);
  assert.notEqual(done.nextActions[0].blockId, first.id);
  const aside = buildPlan(answers, BLOCKS, { ...NO_ADJUSTMENTS, setAside: [first.id] });
  assert.ok(!ids(aside).includes(first.id));
  assert.deepEqual(aside.setAside.map((block) => block.id), [first.id]);
});

test("the browser can rebuild an explore plan from only the blocks it needs", () => {
  const answers = explorer("engineering", "first-job", "3-6");
  const plan = buildPlan(answers, BLOCKS);
  assert.deepEqual(buildPlan(answers, blocksForPlan(answers, plan, BLOCKS)), plan);
});

test("every route through the explore questions gives a sound plan", () => {
  for (const background of [...BACKGROUND_IDS, NOT_SURE] as const) {
    for (const goal of [...EXPLORE_GOAL_IDS, NOT_SURE] as const) {
      for (const hours of [...HOURS_IDS, NOT_SURE] as const) {
        const where = `${background} ${goal} ${hours}`;
        const answers = explorer(background, goal, hours);
        const plan = buildPlan(answers, BLOCKS);
        assert.deepEqual(plan.phases.map((phase) => phase.id), explorePhaseIds(goal), where);
        assert.deepEqual(required(plan).map((block) => block.id).filter((id) => id.startsWith("xr-")).sort(), [...exploreBlockIds(goal)].sort(), where);
        assert.ok(plan.phases.every((phase) => phase.blocks.some((block) => !block.optional)), where);
        assert.ok(everyBlock(plan).filter((block) => block.helpsChallenge || block.growsSkill).length <= 3, where);
        assert.ok(plan.nextActions.length === 3, where);
        assert.ok(everyBlock(plan).every((block) => block.steps.length > 0 && block.definitionOfDone.length > 0), where);
        assert.equal(plan.who.startsWith("Work: I'm exploring product management"), true, where);
        assert.ok(!JSON.stringify(plan).includes("No ") || !/No [A-Za-z ]+ in your team/.test(JSON.stringify(plan)), where);
        assert.deepEqual(buildPlan(answers, [...BLOCKS].reverse()), plan, `${where}: block order changed the plan`);
      }
    }
  }
});

// ---- Nothing else changes ----

test("product, strategy and coaching plans are exactly as they were without the explore content", () => {
  const withoutExplore = BLOCKS.filter((block) => !isExploreBlock(block)).map((block) => {
    if (!block.alsoIn?.some((place) => PHASES.find((phase) => phase.id === place.phase)?.track === "explore")) return block;
    const copy: Block = { ...block, alsoIn: block.alsoIn.filter((place) => PHASES.find((phase) => phase.id === place.phase)?.track !== "explore") };
    if (copy.alsoIn?.length === 0) delete copy.alsoIn;
    return copy;
  });
  assert.equal(withoutExplore.length, 153);
  const base = { pm: ["general"], product: "b2b", size: "scaling", challenge: "measurement", team: ["ba"], teamCounts: {}, tools: ["jira"], time: "1-3m", way: "scrum" } satisfies Partial<IntakeAnswers>;
  const routes: IntakeAnswers[] = [];
  for (const level of ["associate", "product-manager", "senior", "group", "director", "vp", NOT_SURE] as const) {
    routes.push({ ...base, work: "product", level, stage: "new", phase: NOT_SURE, until: NOT_SURE });
    routes.push({ ...base, work: "product", level, stage: "live", phase: "measure", until: null });
    routes.push({ ...base, work: "product", level, stage: "mid-build", phase: "build", until: "measure" });
    routes.push({ ...base, work: "strategy", level, stage: "strategy-none", phase: null, until: null });
    routes.push({ ...base, work: "coaching", level, stage: "coaching-new", phase: null, until: null });
  }
  assert.equal(routes.length, 35);
  for (const answers of routes) assert.deepEqual(buildPlan(answers, BLOCKS), buildPlan(answers, withoutExplore), `${answers.work} ${answers.level} ${answers.stage}`);
});

// ---- The library ----

test("the library's phase filter finds the explore blocks, and the filter accepts the four new phases", async () => {
  const { NO_FILTERS, filterBlocks, parseLibraryFilters } = await import("./library-filter");
  const { toSummary } = await import("./blocks-types");
  const summaries = BLOCKS.map(toSummary);
  const inPhase = (phase: string) => filterBlocks(summaries, { ...NO_FILTERS, phase: phase as never }).map((block) => block.id);
  assert.deepEqual(inPhase("explore-role").filter((id) => id.startsWith("xr-")).sort(), ["xr-is-pm-for-me", "xr-pm-types-companies", "xr-talk-to-pms", "xr-what-pms-do"]);
  assert.equal(inPhase("explore-practise").filter((id) => id.startsWith("xr-")).length, 6);
  // A reused block shows under the explore phase it joins.
  assert.ok(inPhase("explore-foundations").includes("craft-sql-basics"));
  assert.ok(inPhase("explore-apply").includes("onboarding-existing-product"));
  assert.equal(parseLibraryFilters(new URLSearchParams("phase=explore-apply")).phase, "explore-apply");
  assert.equal(inPhase("discover").some((id) => id.startsWith("xr-")), false);
});

test("an incomplete explore link goes back to its first gap without picking up a challenge answer", async () => {
  const { withOldLinkDefaults } = await import("./intake-url");
  const draft = withOldLinkDefaults(parse("/plan?work=explore&background=student"));
  assert.equal(draft.challenge, null);
  assert.equal(startHref(draft, firstUnansweredStep(draft) ?? 1), "/start?step=3&work=explore&background=student");
  // Old product links still get the default.
  assert.equal(withOldLinkDefaults(parse("/plan?work=product&pm=ai")).challenge, NOT_SURE);
});
