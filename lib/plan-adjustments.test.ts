import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ADJUSTMENTS_KEY,
  NO_SAVED_ADJUSTMENTS,
  clearSelfCheck,
  growingSkills,
  markDone,
  putBack,
  readAdjustments,
  setAside,
  setConfidence,
  undoDone,
  writeAdjustments,
  type AdjustmentStorage,
} from "./plan-adjustments";

function memoryStorage(initial?: string): AdjustmentStorage & { value: string | null } {
  const store = { value: initial ?? null } as AdjustmentStorage & { value: string | null };
  store.getItem = () => store.value;
  store.setItem = (_key: string, value: string) => {
    store.value = value;
  };
  return store;
}

test("saved adjustments survive a round trip", () => {
  const storage = memoryStorage();
  const saved = setAside(setConfidence(NO_SAVED_ADJUSTMENTS, "data", "getting-started"), "define-problem-statement");
  assert.equal(writeAdjustments(storage, saved), true);
  assert.deepEqual(readAdjustments(storage), saved);
});

test("anything unrecognised in storage is ignored", () => {
  const storage = memoryStorage(JSON.stringify({ selfCheck: { data: "getting-started", juggling: "strong", design: "expert" }, setAside: ["a", 7, "a", null] }));
  assert.deepEqual(readAdjustments(storage), { selfCheck: { data: "getting-started" }, setAside: ["a"] });
});

test("broken or blocked storage never throws", () => {
  assert.deepEqual(readAdjustments(memoryStorage("{not json")), NO_SAVED_ADJUSTMENTS);
  assert.deepEqual(readAdjustments(memoryStorage("null")), NO_SAVED_ADJUSTMENTS);
  const throwing: AdjustmentStorage = {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("full");
    },
  };
  assert.deepEqual(readAdjustments(throwing), NO_SAVED_ADJUSTMENTS);
  assert.equal(writeAdjustments(throwing, NO_SAVED_ADJUSTMENTS), false);
});

test("a confidence can be set, changed and left blank", () => {
  const rated = setConfidence(NO_SAVED_ADJUSTMENTS, "data", "getting-started");
  assert.deepEqual(setConfidence(rated, "data", "strong").selfCheck, { data: "strong" });
  assert.deepEqual(setConfidence(rated, "data", null).selfCheck, {});
  assert.deepEqual(clearSelfCheck(setConfidence(rated, "design", "comfortable")).selfCheck, {});
});

test("only Getting started counts as a skill to grow, in the order of the ten", () => {
  assert.deepEqual(growingSkills({ technical: "getting-started", data: "getting-started", design: "strong" }), ["data", "technical"]);
});

test("set aside and put back undo each other, with no repeats", () => {
  const once = setAside(NO_SAVED_ADJUSTMENTS, "a");
  assert.deepEqual(setAside(once, "a").setAside, ["a"]);
  assert.deepEqual(putBack(once, "a").setAside, []);
});

test("Already done ticks every step, and undo unticks them", () => {
  const steps = ["b/x/0", "b/x/1"];
  const done = markDone(["a/x/0", "b/x/0"], steps);
  assert.deepEqual(done, ["a/x/0", "b/x/0", "b/x/1"]);
  assert.deepEqual(undoDone(done, steps), ["a/x/0"]);
});

test("adjustments have their own storage key, separate from the link and ticks", () => {
  assert.equal(ADJUSTMENTS_KEY, "next-step-pm:adjustments");
});
