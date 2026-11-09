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

test("every kind is accepted, including ways-of-working and craft", () => {
  for (const kind of ["core", "add-on", "onboarding", "ways-of-working"]) {
    assert.deepEqual(errorsFor({ kind }), [], kind);
  }
  assert.deepEqual(errorsFor({ kind: "craft", phase: "any" }), []);
  assert.ok(mentions(errorsFor({ kind: "extra" }), "kind:"));
});

test("a craft block sits outside the timeline, so its phase must be any", () => {
  assert.ok(mentions(errorsFor({ kind: "craft", phase: "define" }), "a craft block must use"));
});

test("only timeline blocks can be Go further, and the flag must be true", () => {
  assert.deepEqual(errorsFor({ optional: true }), []);
  assert.deepEqual(errorsFor({ optional: true, kind: "add-on" }), []);
  assert.ok(mentions(errorsFor({ optional: true, kind: "onboarding" }), "only core and add-on"));
  assert.ok(mentions(errorsFor({ optional: true, kind: "craft", phase: "any" }), "only core and add-on"));
  assert.ok(mentions(errorsFor({ optional: false }), "optional:"));
});

test("appliesTo needs all five lists, including experience", () => {
  const without = { pmTypes: [], productTypes: [], stages: [], waysOfWorking: [] };
  assert.ok(mentions(errorsFor({ appliesTo: without }), "appliesTo.experience: is missing"));
  assert.ok(mentions(errorsFor({ appliesTo: undefined }), "appliesTo: is missing"));
});

test("appliesTo values must come from the taxonomy", () => {
  const base = { pmTypes: [], productTypes: [], stages: [], waysOfWorking: [], experience: [] };
  assert.ok(mentions(errorsFor({ appliesTo: { ...base, experience: ["guru"] } }), "appliesTo.experience"));
  assert.deepEqual(errorsFor({ appliesTo: { ...base, experience: ["beginner", "experienced"] } }), []);
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
  const roles = { owner: "pm", canDelegateTo: [{ role: "ba", task: "", ifMissing: "pm" }], reviewers: [] };
  assert.ok(mentions(errorsFor({ roles }), "roles.canDelegateTo[1].task"));
});

test("a delegated task must say what happens if nobody can do it", () => {
  const roles = { owner: "pm", canDelegateTo: [{ role: "ba", task: "x" }], reviewers: [] };
  assert.ok(mentions(errorsFor({ roles }), "roles.canDelegateTo[1].ifMissing"));
  const wrong = { owner: "pm", canDelegateTo: [{ role: "ba", task: "x", ifMissing: "shrug" }], reviewers: [] };
  assert.ok(mentions(errorsFor({ roles: wrong }), "roles.canDelegateTo[1].ifMissing"));
});

test("other roles for a task must be real, and different from the main role", () => {
  const task = { role: "ba", task: "x", ifMissing: "pm" };
  const valid = { owner: "pm", canDelegateTo: [{ ...task, orRoles: ["qa", "architect"] }], reviewers: [] };
  assert.deepEqual(errorsFor({ roles: valid }), []);
  const unknown = { owner: "pm", canDelegateTo: [{ ...task, orRoles: ["robot"] }], reviewers: [] };
  assert.ok(mentions(errorsFor({ roles: unknown }), "roles.canDelegateTo[1].orRoles"));
  const repeated = { owner: "pm", canDelegateTo: [{ ...task, orRoles: ["ba"] }], reviewers: [] };
  assert.ok(mentions(errorsFor({ roles: repeated }), "already the main role"));
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

test("region is optional, and only a known region is allowed", () => {
  assert.deepEqual(errorsFor({}), []);
  assert.deepEqual(errorsFor({ region: "uk" }), []);
  assert.ok(mentions(errorsFor({ region: "UK" }), "region"));
  assert.ok(mentions(errorsFor({ region: "us" }), "region"));
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

test("the visitor can't be given a task or asked to review", () => {
  const task = { owner: "pm", canDelegateTo: [{ role: "pm", task: "x", ifMissing: "pm" }], reviewers: [] };
  assert.ok(mentions(errorsFor({ roles: task }), "can't be handed"));
  const orRole = { owner: "pm", canDelegateTo: [{ role: "ba", orRoles: ["pm"], task: "x", ifMissing: "pm" }], reviewers: [] };
  assert.ok(mentions(errorsFor({ roles: orRole }), "can't be handed"));
  assert.ok(mentions(errorsFor({ roles: { owner: "pm", canDelegateTo: [], reviewers: ["pm"] } }), "can't review"));
});

test("company sizes and moves must use real sizes", () => {
  const base = { pmTypes: [], productTypes: [], stages: [], waysOfWorking: [], experience: [] };
  assert.deepEqual(errorsFor({ appliesTo: { ...base, companySizes: ["scaling", "enterprise"] } }), []);
  assert.ok(mentions(errorsFor({ appliesTo: { ...base, companySizes: ["huge"] } }), "appliesTo.companySizes"));
  assert.deepEqual(errorsFor({ movesUpFor: ["enterprise"] }), []);
  assert.ok(mentions(errorsFor({ movesUpFor: ["huge"] }), "movesUpFor"));
});

test("leadsPeople is true or left out", () => {
  const base = { pmTypes: [], productTypes: [], stages: [], waysOfWorking: [], experience: [] };
  assert.deepEqual(errorsFor({ appliesTo: { ...base, leadsPeople: true } }), []);
  assert.ok(mentions(errorsFor({ appliesTo: { ...base, leadsPeople: false } }), "appliesTo.leadsPeople"));
});

test("alsoIn must name a strategy or coaching phase and an after list", () => {
  assert.deepEqual(errorsFor({ alsoIn: [{ phase: "choose", after: ["define-x"], forEveryone: true }] }), []);
  assert.ok(mentions(errorsFor({ alsoIn: [] }), "alsoIn:"));
  assert.ok(mentions(errorsFor({ alsoIn: [{ phase: "define", after: [] }] }), "alsoIn[1].phase"));
  assert.ok(mentions(errorsFor({ alsoIn: [{ phase: "nowhere", after: [] }] }), "alsoIn[1].phase"));
  assert.ok(mentions(errorsFor({ alsoIn: [{ phase: "choose" }] }), "alsoIn[1].after"));
  assert.ok(mentions(errorsFor({ alsoIn: [{ phase: "choose", after: [], forEveryone: false }] }), "forEveryone"));
});

test("alsoIn must follow a real block on that track", () => {
  const strat = makeBlock({ id: "strat-a", phase: "choose" });
  const good = makeBlock({ id: "define-a", alsoIn: [{ phase: "choose", after: ["strat-a"] }] });
  assert.deepEqual(validateBlockSet(files(strat, good)), []);
  assert.ok(mentions(validateBlockSet(files(makeBlock({ id: "define-a", alsoIn: [{ phase: "choose", after: ["strat-gone"] }] }))), "no block has that id"));
  const other = makeBlock({ id: "define-b" });
  assert.ok(mentions(validateBlockSet(files(other, makeBlock({ id: "define-a", alsoIn: [{ phase: "choose", after: ["define-b"] }] }))), "isn't on the strategy track"));
});

test("a block can't depend on a block from another track", () => {
  const product = makeBlock({ id: "define-a" });
  const strategy = makeBlock({ id: "strat-a", phase: "choose", dependsOn: ["define-a"] });
  assert.ok(mentions(validateBlockSet(files(product, strategy)), "different track"));
});

test("order within a track uses that track's phases", () => {
  const first = makeBlock({ id: "strat-a", phase: "understand" });
  const later = makeBlock({ id: "strat-b", phase: "review", dependsOn: ["strat-a"] });
  assert.deepEqual(validateBlockSet(files(first, later)), []);
  const wrong = makeBlock({ id: "strat-c", phase: "understand", dependsOn: ["strat-d"] });
  const after = makeBlock({ id: "strat-d", phase: "review" });
  assert.ok(mentions(validateBlockSet(files(wrong, after)), "later phase"));
});

test("every block needs one to three real skills", () => {
  assert.deepEqual(errorsFor({ skills: ["data", "strategy", "delivery"] }), []);
  assert.ok(mentions(errorsFor({ skills: [] }), "skills:"));
  assert.ok(mentions(errorsFor({ skills: ["data", "strategy", "delivery", "design"] }), "skills:"));
  assert.ok(mentions(errorsFor({ skills: ["juggling"] }), "skills:"));
  assert.ok(mentions(errorsFor({ skills: ["data", "data"] }), "listed twice"));
  assert.ok(mentions(errorsFor({ skills: undefined }), "skills:"));
});

test("titleWhenLive must be some text", () => {
  assert.deepEqual(errorsFor({ titleWhenLive: "Review your latest release" }), []);
  assert.ok(mentions(errorsFor({ titleWhenLive: "" }), "titleWhenLive"));
});

test("only ways-of-working blocks can work without a team", () => {
  assert.deepEqual(errorsFor({ worksWithoutTeam: true, kind: "ways-of-working" }), []);
  assert.ok(mentions(errorsFor({ worksWithoutTeam: true }), "worksWithoutTeam"));
  assert.ok(mentions(errorsFor({ worksWithoutTeam: false, kind: "ways-of-working" }), "worksWithoutTeam"));
});

test("inLeadYourTeam is true or left out", () => {
  assert.deepEqual(errorsFor({ inLeadYourTeam: true }), []);
  assert.ok(mentions(errorsFor({ inLeadYourTeam: false }), "inLeadYourTeam"));
});

test("comesAfter must be a list of block ids", () => {
  assert.deepEqual(errorsFor({ comesAfter: ["define-other"] }), []);
  assert.ok(mentions(errorsFor({ comesAfter: [] }), "comesAfter:"));
  assert.ok(mentions(errorsFor({ comesAfter: "define-other" }), "comesAfter:"));
  assert.ok(mentions(errorsFor({ comesAfter: ["Not An Id"] }), "isn't a block id"));
  assert.ok(mentions(errorsFor({ comesAfter: ["define-a", "define-a"] }), "listed twice"));
});

test("comesAfter must point at a real block in a shared phase", () => {
  const define = makeBlock({ id: "define-a", comesAfter: ["define-b"] });
  const sameLater = makeBlock({ id: "define-b" });
  assert.deepEqual(validateBlockSet(files(define, sameLater)), []);
  assert.ok(mentions(validateBlockSet(files(makeBlock({ id: "define-a", comesAfter: ["define-gone"] }))), "no block has that id"));
  assert.ok(mentions(validateBlockSet(files(makeBlock({ id: "define-a", comesAfter: ["define-a"] }))), "come after itself"));
  const other = makeBlock({ id: "build-b", phase: "build" });
  assert.ok(mentions(validateBlockSet(files(makeBlock({ id: "define-a", comesAfter: ["build-b"] }), other)), "shares no phase"));
});

test("a loop through comesAfter is reported", () => {
  const a = makeBlock({ id: "define-a", comesAfter: ["define-b"] });
  const b = makeBlock({ id: "define-b", dependsOn: ["define-a"] });
  assert.ok(mentions(validateBlockSet(files(a, b)), "Circular dependency"));
});

test("required work can't depend on a Go further block", () => {
  const extra = makeBlock({ id: "define-extra", optional: true });
  const required = makeBlock({ id: "define-required", dependsOn: ["define-extra"] });
  assert.ok(mentions(validateBlockSet(files(extra, required)), "Go further"));
  const alsoExtra = makeBlock({ id: "define-also-extra", optional: true, dependsOn: ["define-extra"] });
  assert.deepEqual(validateBlockSet(files(extra, alsoExtra)), []);
});

test("a block can't depend on work some of its experience levels never see", () => {
  const limits = (experience: Block["appliesTo"]["experience"]) => ({ appliesTo: { pmTypes: [], productTypes: [], stages: [], waysOfWorking: [], experience } });
  const senior = makeBlock({ id: "define-senior", ...limits(["experienced"]) });
  const forAll = makeBlock({ id: "define-all", dependsOn: ["define-senior"] });
  assert.ok(mentions(validateBlockSet(files(senior, forAll)), "experience levels"));
  const midUp = makeBlock({ id: "define-mid-up", dependsOn: ["define-senior"], ...limits(["intermediate", "experienced"]) });
  assert.ok(mentions(validateBlockSet(files(senior, midUp)), "experience levels"));
  const sameLevel = makeBlock({ id: "define-same", dependsOn: ["define-senior"], ...limits(["experienced"]) });
  assert.deepEqual(validateBlockSet(files(senior, sameLevel)), []);
  const reachesAll = makeBlock({ id: "define-open" });
  const limited = makeBlock({ id: "define-limited", dependsOn: ["define-open"], ...limits(["beginner"]) });
  assert.deepEqual(validateBlockSet(files(reachesAll, limited)), []);
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
