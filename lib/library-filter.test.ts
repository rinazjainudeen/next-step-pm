import { test } from "node:test";
import assert from "node:assert/strict";
import { NO_FILTERS, activeFilterCount, filterBlocks, filtersToQuery, hasFilters, parseLibraryFilters, type LibraryFilters } from "./library-filter";
import { makeBlock } from "./blocks-fixture";
import { toSummary } from "./blocks-types";

const define = toSummary(makeBlock({ id: "define-core", phase: "define" }));
const designPlan = toSummary(makeBlock({ id: "design-plan-core", phase: ["design", "plan"] }));
const aiAddOn = toSummary(
  makeBlock({
    id: "define-ai",
    phase: "define",
    kind: "add-on",
    appliesTo: { pmTypes: ["ai"], productTypes: [], stages: [], waysOfWorking: [], experience: [] },
  }),
);
const scrumAny = toSummary(
  makeBlock({
    id: "any-scrum",
    phase: "any",
    kind: "ways-of-working",
    appliesTo: { pmTypes: [], productTypes: [], stages: [], waysOfWorking: ["scrum"], experience: [] },
  }),
);
const kanbanAny = toSummary(
  makeBlock({
    id: "any-kanban",
    phase: "any",
    kind: "ways-of-working",
    appliesTo: { pmTypes: [], productTypes: [], stages: [], waysOfWorking: ["kanban"], experience: [] },
  }),
);
const all = [define, designPlan, aiAddOn, scrumAny, kanbanAny];

function ids(filters: Partial<LibraryFilters>): string[] {
  return filterBlocks(all, { ...NO_FILTERS, ...filters }).map((block) => block.id);
}

test("with no filters, every block is shown", () => {
  assert.equal(ids({}).length, all.length);
});

test("the phase filter matches single phases, lists of phases and any-phase blocks", () => {
  assert.deepEqual(ids({ phase: "define" }), ["define-core", "define-ai", "any-scrum", "any-kanban"]);
  assert.deepEqual(ids({ phase: "plan" }), ["design-plan-core", "any-scrum", "any-kanban"]);
  assert.deepEqual(ids({ phase: "measure" }), ["any-scrum", "any-kanban"]);
});

test("the PM type filter shows blocks for that type and blocks for everyone", () => {
  assert.ok(ids({ pm: "ai" }).includes("define-ai"));
  assert.equal(ids({ pm: "general" }).includes("define-ai"), false);
  assert.ok(ids({ pm: "general" }).includes("define-core"));
});

test("the kind filter shows only that kind", () => {
  assert.deepEqual(ids({ kind: "ways-of-working" }), ["any-scrum", "any-kanban"]);
  assert.deepEqual(ids({ kind: "add-on" }), ["define-ai"]);
});

test("the way-of-working filter shows blocks for that way and blocks for every way", () => {
  assert.deepEqual(ids({ way: "scrum" }), ["define-core", "design-plan-core", "define-ai", "any-scrum"]);
  assert.deepEqual(ids({ way: "kanban", kind: "ways-of-working" }), ["any-kanban"]);
});

test("filters combine, and can leave nothing", () => {
  assert.deepEqual(ids({ phase: "define", pm: "ai", kind: "add-on" }), ["define-ai"]);
  assert.deepEqual(ids({ phase: "build", kind: "add-on" }), []);
});

test("filters are read from the web address, ignoring anything unrecognised", () => {
  const filters = parseLibraryFilters(new URLSearchParams("phase=define&pm=wizard&kind=ways-of-working&way=scrum&junk=1"));
  assert.deepEqual(filters, { phase: "define", pm: null, kind: "ways-of-working", way: "scrum", skill: null });
});

test("filters turn back into a web address and round-trip", () => {
  const filters: LibraryFilters = { phase: "plan", pm: "ai", kind: null, way: "hybrid", skill: null };
  const query = filtersToQuery(filters);
  assert.equal(query, "phase=plan&pm=ai&way=hybrid");
  assert.deepEqual(parseLibraryFilters(new URLSearchParams(query)), filters);
  assert.equal(filtersToQuery(NO_FILTERS), "");
});

test("hasFilters tells whether anything is chosen", () => {
  assert.equal(hasFilters(NO_FILTERS), false);
  assert.equal(hasFilters({ ...NO_FILTERS, kind: "core" }), true);
});

test("activeFilterCount counts the chosen filters", () => {
  assert.equal(activeFilterCount(NO_FILTERS), 0);
  assert.equal(activeFilterCount({ ...NO_FILTERS, kind: "core", phase: "define" }), 2);
});

test("a reused block shows under its track phase as well as its own", () => {
  const reused = [{ phase: "discover", kind: "core", appliesTo: { pmTypes: [], productTypes: [], stages: [], waysOfWorking: [], experience: [] }, alsoIn: [{ phase: "understand", after: [] }] }] as const;
  const shown = (phase: "understand" | "choose") => filterBlocks([...reused] as never, { phase, pm: null, kind: null, way: null } as never).length;
  assert.equal(shown("understand"), 1);
  assert.equal(shown("choose"), 0);
});

test("the skills filter works alongside the others", () => {
  const blocks = [
    toSummary(makeBlock({ id: "define-data", skills: ["data"] })),
    toSummary(makeBlock({ id: "define-strategy", skills: ["strategy", "data"] })),
    toSummary(makeBlock({ id: "build-data", phase: "build", skills: ["data"] })),
  ];
  const ids = (filters: Partial<LibraryFilters>) => filterBlocks(blocks, { ...NO_FILTERS, ...filters }).map((block) => block.id);
  assert.deepEqual(ids({ skill: "data" }), ["define-data", "define-strategy", "build-data"]);
  assert.deepEqual(ids({ skill: "strategy" }), ["define-strategy"]);
  assert.deepEqual(ids({ skill: "data", phase: "build" }), ["build-data"]);
  assert.deepEqual(ids({ skill: "design" }), []);
});

test("the skills filter lives in the web address", () => {
  assert.equal(parseLibraryFilters(new URLSearchParams("skill=data")).skill, "data");
  assert.equal(parseLibraryFilters(new URLSearchParams("skill=juggling")).skill, null);
  assert.equal(filtersToQuery({ ...NO_FILTERS, skill: "data", pm: "ai" }), "pm=ai&skill=data");
});
