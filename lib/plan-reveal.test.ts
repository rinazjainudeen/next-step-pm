import assert from "node:assert/strict";
import { test } from "node:test";
import { EXAMPLE_DRAFT, EXAMPLE_PLAN_HREF } from "./example-plan";
import { EMPTY_DRAFT, type IntakeDraft } from "./intake-types";
import { parseDraft, planHref, startHref, withOldLinkDefaults } from "./intake-url";
import { REVEAL_KEY, countAt, markReveal, revealTimings, takeReveal, type RevealStorage } from "./plan-reveal";

/** A stand-in for the browser's session storage. */
function memoryStorage(): RevealStorage & { items: Map<string, string> } {
  const items = new Map<string, string>();
  return {
    items,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
    removeItem: (key) => void items.delete(key),
  };
}

/** Storage that a browser has blocked: every call throws. */
const BLOCKED: RevealStorage = {
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

// --- When it plays ---

test("the reveal plays right after the questions, for the plan they built", () => {
  const storage = memoryStorage();
  markReveal(storage, EXAMPLE_PLAN_HREF);
  assert.equal(takeReveal(storage, EXAMPLE_PLAN_HREF, false), true);
});

test("the reveal plays once: a refresh or coming back doesn't replay it", () => {
  const storage = memoryStorage();
  markReveal(storage, EXAMPLE_PLAN_HREF);
  assert.equal(takeReveal(storage, EXAMPLE_PLAN_HREF, false), true);
  assert.equal(takeReveal(storage, EXAMPLE_PLAN_HREF, false), false);
  assert.equal(storage.items.size, 0);
});

test("a shared link, the example plan or a new tab has no note, so no reveal", () => {
  assert.equal(takeReveal(memoryStorage(), EXAMPLE_PLAN_HREF, false), false);
});

test("a note for a different plan doesn't play, and is cleared", () => {
  const storage = memoryStorage();
  markReveal(storage, planHref({ ...EXAMPLE_DRAFT, way: "kanban" }));
  assert.equal(takeReveal(storage, EXAMPLE_PLAN_HREF, false), false);
  assert.equal(storage.items.has(REVEAL_KEY), false);
});

test("with reduce motion on, there is no reveal and the note is still cleared", () => {
  const storage = memoryStorage();
  markReveal(storage, EXAMPLE_PLAN_HREF);
  assert.equal(takeReveal(storage, EXAMPLE_PLAN_HREF, true), false);
  assert.equal(storage.items.has(REVEAL_KEY), false);
});

test("blocked or missing storage means no reveal, and nothing throws", () => {
  assert.doesNotThrow(() => markReveal(BLOCKED, EXAMPLE_PLAN_HREF));
  assert.doesNotThrow(() => markReveal(null, EXAMPLE_PLAN_HREF));
  assert.equal(takeReveal(BLOCKED, EXAMPLE_PLAN_HREF, false), false);
  assert.equal(takeReveal(null, EXAMPLE_PLAN_HREF, false), false);
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

// --- How long it takes ---

test("phases arrive 60 to 90ms apart, and it's all over in under 1.2 seconds", () => {
  for (let phases = 1; phases <= 8; phases++) {
    const timings = revealTimings(phases);
    assert.ok(timings.stagger >= 60 && timings.stagger <= 90, `${phases} phases: ${timings.stagger}ms apart`);
    assert.ok(timings.total < 1200, `${phases} phases: ${timings.total}ms`);
  }
});

test("more phases than the lifecycle has still finish in under 1.2 seconds", () => {
  for (const phases of [9, 12, 20]) assert.ok(revealTimings(phases).total < 1200);
});

test("the timeline settles in after the last phase has started to arrive", () => {
  for (let phases = 1; phases <= 8; phases++) {
    const timings = revealTimings(phases);
    assert.ok(timings.timelineAt > timings.stagger * (phases - 1));
  }
});

test("a step count starts at 0, eases up and rests on the real number", () => {
  assert.equal(countAt(12, 0, 400), 0);
  assert.equal(countAt(12, -50, 400), 0);
  assert.equal(countAt(12, 400, 400), 12);
  assert.equal(countAt(12, 5000, 400), 12);
  let before = 0;
  for (let elapsed = 0; elapsed <= 400; elapsed += 20) {
    const shown = countAt(12, elapsed, 400);
    assert.ok(shown >= before && shown <= 12);
    before = shown;
  }
  assert.equal(countAt(0, 200, 400), 0);
});
