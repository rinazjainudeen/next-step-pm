import { test } from "node:test";
import assert from "node:assert/strict";
import { validateBlock, validateBlockSet, type BlockFile } from "./blocks-validate";
import { makeBlock } from "./blocks-fixture";
import type { Block } from "./blocks-types";

const TODAY = { today: "2026-11-04" };

/** Validates a block with one change, and returns the error messages (empty if valid). */
function errorsFor(change: Record<string, unknown>): string[] {
  const result = validateBlock({ ...makeBlock(), ...change }, TODAY);
  return result.ok ? [] : result.errors;
}

function mentions(errors: string[], text: string): boolean {
  return errors.some((error) => error.includes(text));
}

/** Wraps blocks as if they were files in the right folders. */
function files(...blocks: Block[]): BlockFile[] {
  return blocks.map((block) => ({
    path: `${block.id}.json`,
    fileId: block.id,
    folder: block.phase === "any" || Array.isArray(block.phase) ? "cross-phase" : block.phase,
    block,
  }));
}

// ---- One block on its own ----

test("a correct block passes", () => {
  assert.equal(validateBlock(makeBlock(), TODAY).ok, true);
});

test("something that isn't a block object is refused", () => {
  for (const input of [null, "text", 42, [], undefined]) {
    assert.equal(validateBlock(input, TODAY).ok, false);
  }
});

test("a missing title is reported", () => {
  assert.ok(mentions(errorsFor({ title: "" }), "title"));
});

test("an id must be lowercase words joined by hyphens", () => {
  assert.ok(mentions(errorsFor({ id: "Define Problem" }), "id:"));
  assert.deepEqual(errorsFor({ id: "define-problem-2" }), []);
});

test("an unknown field is reported, to catch typos", () => {
  assert.ok(mentions(errorsFor({ sumary: "typo" }), '"sumary" is not a field'));
});

test("the phase can be one phase, a list of phases, or any", () => {
  assert.deepEqual(errorsFor({ phase: "design" }), []);
  assert.deepEqual(errorsFor({ phase: ["design", "plan"] }), []);
  assert.deepEqual(errorsFor({ phase: "any" }), []);
});

test("a bad phase is reported in each of the three forms", () => {
  assert.ok(mentions(errorsFor({ phase: "building" }), "isn't a phase"));
  assert.ok(mentions(errorsFor({ phase: ["design", "building"] }), "isn't a phase"));
  assert.ok(mentions(errorsFor({ phase: undefined }), "phase: is missing"));
});

test("a list of phases needs at least two, with no repeats", () => {
  assert.ok(mentions(errorsFor({ phase: ["design"] }), "at least 2"));
  assert.ok(mentions(errorsFor({ phase: ["design", "design"] }), "listed twice"));
});

test("every kind is accepted, including ways-of-working", () => {
  for (const kind of ["core", "add-on", "onboarding", "ways-of-working"]) {
    assert.deepEqual(errorsFor({ kind }), [], kind);
  }
  assert.ok(mentions(errorsFor({ kind: "extra" }), "kind:"));
});

test("appliesTo needs all four lists, including waysOfWorking", () => {
  const without = { pmTypes: [], productTypes: [], stages: [] };
  assert.ok(mentions(errorsFor({ appliesTo: without }), "appliesTo.waysOfWorking: is missing"));
  assert.ok(mentions(errorsFor({ appliesTo: undefined }), "appliesTo: is missing"));
});

test("appliesTo values must come from the taxonomy", () => {
  const base = { pmTypes: [], productTypes: [], stages: [], waysOfWorking: [] };
  assert.ok(mentions(errorsFor({ appliesTo: { ...base, pmTypes: ["wizard"] } }), "appliesTo.pmTypes"));
  assert.ok(mentions(errorsFor({ appliesTo: { ...base, stages: ["later"] } }), "appliesTo.stages"));
  assert.ok(mentions(errorsFor({ appliesTo: { ...base, waysOfWorking: ["waterfall"] } }), "appliesTo.waysOfWorking"));
  assert.deepEqual(errorsFor({ appliesTo: { ...base, waysOfWorking: ["scrum", "kanban", "hybrid"] } }), []);
});

test("steps are needed for all three experience levels", () => {
  const steps = { beginner: ["a"], intermediate: ["b"] };
  assert.ok(mentions(errorsFor({ steps }), "steps.experienced: is missing"));
});

test("a step can't be empty", () => {
  const steps = { beginner: ["a", " "], intermediate: ["b"], experienced: ["c"] };
  assert.ok(mentions(errorsFor({ steps }), "steps.beginner[2]"));
});

test("roles must come from the taxonomy", () => {
  const roles = { owner: "wizard", canDelegateTo: [{ role: "robot", task: "x" }], reviewers: ["ghost"] };
  const errors = errorsFor({ roles });
  assert.ok(mentions(errors, "roles.owner"));
  assert.ok(mentions(errors, "roles.canDelegateTo[1].role"));
  assert.ok(mentions(errors, "roles.reviewers"));
});

test("a delegated task needs some text", () => {
  const roles = { owner: "pm", canDelegateTo: [{ role: "ba", task: "" }], reviewers: [] };
  assert.ok(mentions(errorsFor({ roles }), "roles.canDelegateTo[1].task"));
});

test("tool examples must use tools we list", () => {
  assert.ok(mentions(errorsFor({ toolExamples: { excel: "tip" } }), '"excel" isn\'t a tool'));
  assert.deepEqual(errorsFor({ toolExamples: {} }), []);
});

test("a block needs a definition of done, but pitfalls may be empty", () => {
  assert.ok(mentions(errorsFor({ definitionOfDone: [] }), "definitionOfDone"));
  assert.deepEqual(errorsFor({ pitfalls: [] }), []);
  assert.ok(mentions(errorsFor({ pitfalls: undefined }), "pitfalls"));
});

test("estimated effort must be a number or range plus a unit", () => {
  for (const good of ["30 minutes", "1 hour", "2-4 hours", "1 day", "2-3 days"]) {
    assert.deepEqual(errorsFor({ estimatedEffort: good }), [], good);
  }
  for (const bad of ["a while", "2-4", "two hours", "2 - 4 hours", ""]) {
    assert.ok(mentions(errorsFor({ estimatedEffort: bad }), "estimatedEffort"), bad);
  }
});

test("every block must cite at least one source with a real web address", () => {
  assert.ok(mentions(errorsFor({ sources: [] }), "at least one source"));
  assert.ok(mentions(errorsFor({ sources: [{ title: "x", url: "not a url" }] }), "sources[1].url"));
  assert.ok(mentions(errorsFor({ sources: [{ title: "x", url: "ftp://example.com" }] }), "sources[1].url"));
  assert.ok(mentions(errorsFor({ sources: [{ title: "", url: "https://example.com" }] }), "sources[1].title"));
});

test("freshness must be one of the allowed values", () => {
  assert.ok(mentions(errorsFor({ freshness: "sometimes" }), "freshness"));
});

test("lastReviewed must be a real date that isn't in the future", () => {
  assert.ok(mentions(errorsFor({ lastReviewed: "04/11/2026" }), "lastReviewed"));
  assert.ok(mentions(errorsFor({ lastReviewed: "2026-02-30" }), "lastReviewed"));
  assert.ok(mentions(errorsFor({ lastReviewed: "2026-11-05" }), "in the future"));
  assert.deepEqual(errorsFor({ lastReviewed: "2026-11-04" }), []);
});

test("placeholder may only be true", () => {
  assert.deepEqual(errorsFor({ placeholder: true }), []);
  assert.ok(mentions(errorsFor({ placeholder: false }), "placeholder"));
});

test("all the problems are reported together, not just the first", () => {
  const errors = errorsFor({ title: "", kind: "x", estimatedEffort: "soon" });
  assert.ok(errors.length >= 3);
});

// ---- Several blocks together ----

test("a good set of blocks passes", () => {
  const a = makeBlock({ id: "discover-a", phase: "discover" });
  const b = makeBlock({ id: "define-b", phase: "define", dependsOn: ["discover-a"] });
  assert.deepEqual(validateBlockSet(files(a, b)), []);
});

test("the file name must match the block id", () => {
  const set = files(makeBlock());
  set[0].fileId = "something-else";
  assert.ok(mentions(validateBlockSet(set), "file name must match"));
});

test("a single-phase block must be in its phase folder", () => {
  const set = files(makeBlock({ phase: "define" }));
  set[0].folder = "build";
  assert.ok(mentions(validateBlockSet(set), 'belongs in the "define" folder'));
});

test("a block for any phase or several phases must be in cross-phase", () => {
  const any = files(makeBlock({ id: "any-block", phase: "any", kind: "ways-of-working" }));
  const several = files(makeBlock({ id: "several-block", phase: ["design", "plan"] }));
  assert.deepEqual(validateBlockSet([...any, ...several]), []);
  any[0].folder = "define";
  assert.ok(mentions(validateBlockSet(any), '"cross-phase" folder'));
});

test("two blocks can't share an id", () => {
  const first = files(makeBlock())[0];
  const second = { ...first, path: "other/copy.json", fileId: "define-test-block" };
  assert.ok(mentions(validateBlockSet([first, second]), "already used"));
});

test("a dependency must exist", () => {
  const set = files(makeBlock({ dependsOn: ["no-such-block"] }));
  assert.ok(mentions(validateBlockSet(set), 'no block has that id'));
});

test("a block can't depend on itself", () => {
  const set = files(makeBlock({ dependsOn: ["define-test-block"] }));
  assert.ok(mentions(validateBlockSet(set), "depend on itself"));
});

test("a dependency on a later phase is reported", () => {
  const early = makeBlock({ id: "define-early", phase: "define", dependsOn: ["build-late"] });
  const late = makeBlock({ id: "build-late", phase: "build" });
  assert.ok(mentions(validateBlockSet(files(early, late)), "later phase"));
});

test("a block for any phase can depend on, and be depended on by, any other", () => {
  const wow = makeBlock({ id: "any-wow", phase: "any", kind: "ways-of-working", dependsOn: ["build-late"] });
  const late = makeBlock({ id: "build-late", phase: "build", dependsOn: ["any-wow"] });
  const errors = validateBlockSet(files(wow, late));
  assert.equal(mentions(errors, "later phase"), false);
});

test("a circular dependency is reported once", () => {
  const a = makeBlock({ id: "define-a", dependsOn: ["define-b"] });
  const b = makeBlock({ id: "define-b", dependsOn: ["define-a"] });
  const loops = validateBlockSet(files(a, b)).filter((error) => error.startsWith("Circular dependency"));
  assert.equal(loops.length, 1);
});

test("the same blocks always give the same messages", () => {
  const set = files(makeBlock({ dependsOn: ["missing-one"] }), makeBlock({ id: "define-other", dependsOn: ["missing-two"] }));
  assert.deepEqual(validateBlockSet(set), validateBlockSet(set));
});
