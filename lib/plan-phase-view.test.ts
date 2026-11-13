import assert from "node:assert/strict";
import { test } from "node:test";
import { loadBlocks } from "./blocks-load";
import { buildPlan } from "./curriculum-engine";
import type { IntakeAnswers } from "./intake-types";
import { ONLY_CURRENT, isPhaseOpen, openAll, openFor, phaseAnchor, phaseForTarget, phaseOverview, plural, type PhaseOutline } from "./plan-phase-view";

const PHASES: PhaseOutline[] = [
  { id: "discover", label: "Discover", weeks: "Weeks 1 to 3", blockIds: ["d-one", "d-two"], stepIds: ["d-one/x/0", "d-one/x/1", "d-two/x/0"], done: true },
  { id: "define", label: "Define", weeks: "Weeks 4 to 5", blockIds: ["f-one"], stepIds: ["f-one/x/0", "f-one/x/1"], done: false },
  { id: "design", label: "Design", weeks: "Week 6", blockIds: ["g-one", "g-two"], stepIds: ["g-one/x/0"], done: false },
];

test("on first view only the phase you're in is open", () => {
  assert.deepEqual(PHASES.map((phase) => isPhaseOpen(phase.id, ONLY_CURRENT, "define")), [false, true, false]);
  // A finished plan has no current phase, so everything starts closed.
  assert.deepEqual(PHASES.map((phase) => isPhaseOpen(phase.id, ONLY_CURRENT, null)), [false, false, false]);
});

test("a visitor's own choice wins, and Open all opens every phase", () => {
  assert.equal(isPhaseOpen("define", { define: false }, "define"), false);
  assert.equal(isPhaseOpen("design", { design: true }, "define"), true);
  const all = openAll(PHASES);
  assert.ok(PHASES.every((phase) => isPhaseOpen(phase.id, all, "define")));
});

test("a link to a block or a phase finds the phase that holds it", () => {
  assert.equal(phaseForTarget("#g-two", PHASES), "design");
  assert.equal(phaseForTarget("f-one", PHASES), "define");
  assert.equal(phaseForTarget(`#${phaseAnchor("discover")}`, PHASES), "discover");
  // Anything outside the timeline, such as a skill or the feedback form, isn't in a phase.
  assert.equal(phaseForTarget("#feedback", PHASES), null);
  assert.equal(phaseForTarget("#", PHASES), null);
  assert.equal(phaseForTarget("", PHASES), null);
  assert.equal(phaseForTarget("#%E0%A4%A", PHASES), null);
});

test("following a link opens its phase and keeps every other choice", () => {
  const choices = { discover: true, define: false };
  assert.deepEqual(openFor("design", choices, "define"), { discover: true, define: false, design: true });
  // Already open, or not in a phase: nothing changes, so nothing re-renders.
  assert.equal(openFor("discover", choices, "define"), choices);
  assert.equal(openFor(null, choices, "define"), choices);
  assert.equal(openFor("define", ONLY_CURRENT, "define"), ONLY_CURRENT);
});

test("the overview counts blocks and ticked steps for each phase", () => {
  const rows = phaseOverview(PHASES, "define", ["d-one/x/0", "d-one/x/1", "d-two/x/0", "f-one/x/1", "elsewhere"]);
  assert.deepEqual(
    rows.map(({ id, blocks, steps, ticked, status }) => ({ id, blocks, steps, ticked, status })),
    [
      { id: "discover", blocks: 2, steps: 3, ticked: 3, status: "done" },
      { id: "define", blocks: 1, steps: 2, ticked: 1, status: "current" },
      { id: "design", blocks: 2, steps: 1, ticked: 0, status: "later" },
    ],
  );
  assert.equal(plural(1, "block"), "1 block");
  assert.equal(plural(8, "phase"), "8 phases");
});

test("every block in a long real plan can be found from a link", () => {
  const answers: IntakeAnswers = {
    work: "product",
    pm: ["general"],
    level: "product-manager",
    product: "b2b",
    size: "scaling",
    stage: "new",
    phase: "discover",
    challenge: "measurement",
    team: [],
    teamCounts: {},
    tools: [],
    time: "6m-plus",
    until: "measure",
    way: "scrum",
  };
  const plan = buildPlan(answers, loadBlocks());
  const outline = plan.phases.map((phase) => ({ id: phase.id, blockIds: phase.blocks.map((block) => block.id) }));
  assert.equal(outline.length, 8);
  for (const phase of plan.phases) for (const block of phase.blocks) assert.equal(phaseForTarget(`#${block.id}`, outline), phase.id, block.id);
  for (const action of plan.nextActions) assert.notEqual(phaseForTarget(`#${action.blockId}`, outline), null);
});
