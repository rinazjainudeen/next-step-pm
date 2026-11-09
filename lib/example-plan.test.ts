import assert from "node:assert/strict";
import { test } from "node:test";
import { loadBlocks } from "./blocks-load";
import { buildPlan } from "./curriculum-engine";
import { EXAMPLE_DRAFT, EXAMPLE_PLAN_HREF, isExamplePlan } from "./example-plan";
import { parseDraft } from "./intake-url";
import { validateDraft } from "./intake-validate";

const fromHref = (href: string) => parseDraft(new URLSearchParams(href.split("?")[1]));

test("the example plan is a complete set of answers, so its link opens a plan", () => {
  const result = validateDraft(EXAMPLE_DRAFT);
  assert.ok(result.ok, "the example answers should pass the intake checks");
});

test("the example link reads back as the example", () => {
  assert.ok(EXAMPLE_PLAN_HREF.startsWith("/plan?"));
  assert.deepEqual(fromHref(EXAMPLE_PLAN_HREF), EXAMPLE_DRAFT);
  assert.equal(isExamplePlan(fromHref(EXAMPLE_PLAN_HREF)), true);
});

test("the example leaves team and tools unanswered", () => {
  assert.deepEqual(EXAMPLE_DRAFT.team, []);
  assert.deepEqual(EXAMPLE_DRAFT.tools, []);
  assert.ok(!EXAMPLE_PLAN_HREF.includes("team="));
  assert.ok(!EXAMPLE_PLAN_HREF.includes("tools="));
});

test("a tailored or changed plan is no longer the example", () => {
  assert.equal(isExamplePlan({ ...EXAMPLE_DRAFT, team: ["backend-engineer"] }), false);
  assert.equal(isExamplePlan({ ...EXAMPLE_DRAFT, level: "senior" }), false);
});

test("the example runs from Build to Measure, fits its timeline and shows three challenge labels", () => {
  const result = validateDraft(EXAMPLE_DRAFT);
  assert.ok(result.ok);
  const plan = buildPlan(result.answers, loadBlocks());
  assert.deepEqual(plan.phases.map((phase) => phase.id), ["build", "test", "launch", "measure"]);
  assert.equal(plan.phases.flatMap((phase) => phase.blocks).filter((block) => block.helpsChallenge).length, 3);
  assert.equal(plan.nextActions[0]?.label, "challenge");
  assert.equal(plan.teamAnswered, false);
  assert.ok(plan.nextActions.length > 0);
});
