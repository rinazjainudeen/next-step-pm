import assert from "node:assert/strict";
import { test } from "node:test";
import { loadBlocks } from "./blocks-load";
import { buildPlan } from "./curriculum-engine";
import { EXAMPLE_DRAFT, EXAMPLE_PLAN_HREF } from "./example-plan";
import { summariseAnswers } from "./intake-questions";
import { EMPTY_DRAFT, type IntakeDraft } from "./intake-types";
import { parseDraft, planHref, startHref, withOldLinkDefaults } from "./intake-url";
import { validateDraft } from "./intake-validate";
import { INTRO_KEY, MAX_BARS, SKIP_KEYS, introModel, introTimings, markIntro, takeIntro, type IntroStorage } from "./plan-intro";
import type { PlanPhase } from "./plan-types";

const BLOCKS = loadBlocks();

/** A stand-in for the browser's session storage. */
function memoryStorage(): IntroStorage & { items: Map<string, string> } {
  const items = new Map<string, string>();
  return {
    items,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
    removeItem: (key) => void items.delete(key),
  };
}

/** Storage that a browser has blocked: every call throws. */
const BLOCKED: IntroStorage = {
  getItem: () => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("blocked");
  },
  removeItem: () => {
    throw new Error("blocked");
  },
};

/** The address the plan page works out for itself, as in app/plan/page.tsx. */
const pageHref = (href: string) => planHref(withOldLinkDefaults(parseDraft(new URLSearchParams(href.split("?")[1]))));

const answersFor = (draft: IntakeDraft) => {
  const result = validateDraft(draft);
  assert.ok(result.ok);
  return result.answers;
};

// --- When it plays ---

test("the intro plays right after the questions, for the plan they built", () => {
  const storage = memoryStorage();
  markIntro(storage, EXAMPLE_PLAN_HREF);
  assert.equal(takeIntro(storage, EXAMPLE_PLAN_HREF, false), true);
});

test("the intro plays once: a refresh or coming back doesn't replay it", () => {
  const storage = memoryStorage();
  markIntro(storage, EXAMPLE_PLAN_HREF);
  assert.equal(takeIntro(storage, EXAMPLE_PLAN_HREF, false), true);
  assert.equal(takeIntro(storage, EXAMPLE_PLAN_HREF, false), false);
  assert.equal(storage.items.size, 0);
});

test("a shared link, the example plan or a new tab has no note, so no intro", () => {
  assert.equal(takeIntro(memoryStorage(), EXAMPLE_PLAN_HREF, false), false);
});

test("a note for a different plan doesn't play, and is cleared", () => {
  const storage = memoryStorage();
  markIntro(storage, planHref({ ...EXAMPLE_DRAFT, way: "kanban" }));
  assert.equal(takeIntro(storage, EXAMPLE_PLAN_HREF, false), false);
  assert.equal(storage.items.has(INTRO_KEY), false);
});

test("with reduce motion on, the plan shows straight away and the note is still cleared", () => {
  const storage = memoryStorage();
  markIntro(storage, EXAMPLE_PLAN_HREF);
  assert.equal(takeIntro(storage, EXAMPLE_PLAN_HREF, true), false);
  assert.equal(storage.items.has(INTRO_KEY), false);
});

test("blocked or missing storage means no intro, and nothing throws", () => {
  assert.doesNotThrow(() => markIntro(BLOCKED, EXAMPLE_PLAN_HREF));
  assert.doesNotThrow(() => markIntro(null, EXAMPLE_PLAN_HREF));
  assert.equal(takeIntro(BLOCKED, EXAMPLE_PLAN_HREF, false), false);
  assert.equal(takeIntro(null, EXAMPLE_PLAN_HREF, false), false);
});

test("the address the questions note is the one the plan page reads back", () => {
  const drafts: IntakeDraft[] = [
    EXAMPLE_DRAFT,
    { ...EXAMPLE_DRAFT, pm: ["ai", "growth"], level: "director", team: ["ba", "backend-engineer"], teamCounts: { "backend-engineer": 3 }, tools: ["jira"] },
    { ...EMPTY_DRAFT, work: "explore", background: "engineering", goal: "first-job", hours: "3-6" },
  ];
  for (const draft of drafts) {
    // The questions always read their answers back from the address, as here.
    const fromIntake = parseDraft(new URLSearchParams(startHref(draft, 9).split("?")[1]));
    assert.equal(pageHref(planHref(fromIntake)), planHref(fromIntake));
  }
});

// --- What it shows ---

test("the intro shows the real answers and the real phases, blocks and steps", () => {
  const answers = answersFor(EXAMPLE_DRAFT);
  const plan = buildPlan(answers, BLOCKS);
  const steps = (phase: PlanPhase) => phase.blocks.filter((block) => !block.optional).reduce((sum, block) => sum + block.steps.length, 0);
  const model = introModel(answers, plan.phases, steps);

  // Every answer the visitor gave, and not the "Phases your plan covers" result.
  const rows = summariseAnswers(answers);
  assert.deepEqual(model.chips, rows.slice(0, -1).map((row) => row.value));
  assert.equal(model.chips.length, 9);

  assert.deepEqual(model.lanes.map((lane) => lane.label), plan.phases.map((phase) => phase.label));
  assert.deepEqual(model.lanes.map((lane) => lane.weeks), plan.phases.map((phase) => phase.weeks));
  for (const [index, lane] of model.lanes.entries()) {
    const required = plan.phases[index].blocks.filter((block) => !block.optional);
    assert.equal(lane.blocks, required.length);
    assert.equal(lane.steps, steps(plan.phases[index]));
    assert.equal(lane.bars, Math.min(required.length, MAX_BARS));
    assert.ok(lane.blocks > 0);
  }
  assert.equal(model.blocks, model.lanes.reduce((sum, lane) => sum + lane.blocks, 0));
  assert.equal(model.steps, model.lanes.reduce((sum, lane) => sum + lane.steps, 0));
});

test("someone exploring product management sees their four answers", () => {
  const answers = answersFor({ ...EMPTY_DRAFT, work: "explore", background: "engineering", goal: "first-job", hours: "3-6" });
  const plan = buildPlan(answers, BLOCKS);
  const model = introModel(answers, plan.phases, () => 0);
  assert.equal(model.chips.length, 4);
  assert.equal(model.lanes.length, plan.phases.length);
});

test("a phase with more blocks than bars still shows its exact count", () => {
  const block = buildPlan(answersFor(EXAMPLE_DRAFT), BLOCKS).phases[0].blocks[0];
  const phase: PlanPhase = { id: "build", label: "Build", readyWhen: "", weeks: "Weeks 1 to 6", blocks: Array.from({ length: 14 }, () => block) };
  const [lane] = introModel(answersFor(EXAMPLE_DRAFT), [phase], () => 99).lanes;
  assert.equal(lane.blocks, 14);
  assert.equal(lane.bars, MAX_BARS);
  assert.equal(lane.steps, 99);
});

// --- How long it takes, and how to skip it ---

test("the intro lasts between 1.2 and 2 seconds whatever the number of phases", () => {
  for (let lanes = 1; lanes <= 10; lanes += 1) {
    const timings = introTimings(lanes);
    assert.ok(timings.total >= 1200 && timings.total <= 2000, `${lanes} phases took ${timings.total}ms`);
    // The last lane has finished counting before the plan shows.
    assert.ok(timings.lanesAt + timings.laneStagger * (lanes - 1) + timings.countFor <= timings.revealAt);
    assert.equal(timings.total, timings.revealAt + timings.fadeFor);
  }
});

test("Esc skips the intro, and so do keys that would scroll the page", () => {
  for (const key of ["Escape", "Enter", " ", "PageDown", "ArrowDown"]) assert.ok(SKIP_KEYS.includes(key));
  // Tab moves to the button rather than skipping.
  assert.equal(SKIP_KEYS.includes("Tab"), false);
});
