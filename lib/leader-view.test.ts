import assert from "node:assert/strict";
import { test } from "node:test";
import { parseDraft } from "./intake-url";
import { defaultView, hasViewSwitch, strategyPlanHref, switchAboveTimeline, viewFor, viewWords } from "./leader-view";

const params = (href: string) => new URLSearchParams(href.split("?")[1]);

test("Director and VP default to the leader view, everyone else to hands-on", () => {
  assert.equal(defaultView({ level: "director" }), "leader");
  assert.equal(defaultView({ level: "vp" }), "leader");
  for (const level of ["associate", "product-manager", "senior", "group", "not-sure"] as const) assert.equal(defaultView({ level }), "hands-on", level);
});

test("a chosen view wins over the level's default, on the product track", () => {
  assert.equal(viewFor({ level: "director", work: "product", view: "hands-on" }), "hands-on");
  assert.equal(viewFor({ level: "senior", work: "product", view: "leader" }), "leader");
  assert.equal(viewFor({ level: "director", work: "product" }), "leader");
  assert.equal(viewFor({ level: "director", work: null }), "leader");
});

test("strategy and coaching plans have no leader view or switch", () => {
  for (const work of ["strategy", "coaching"] as const) {
    assert.equal(viewFor({ level: "vp", work, view: "leader" }), "hands-on");
    assert.equal(hasViewSwitch({ work }), false);
  }
  assert.equal(hasViewSwitch({ work: "product" }), true);
});

test("the switch sits above the timeline for Group PM and above, and in Your answers for the rest", () => {
  for (const level of ["group", "director", "vp"] as const) assert.equal(switchAboveTimeline({ level, work: "product" }), true, level);
  for (const level of ["associate", "product-manager", "senior", "not-sure"] as const) assert.equal(switchAboveTimeline({ level, work: "product" }), false, level);
});

test("only the leader view changes the headings, and the hands-on words stay as they were", () => {
  assert.equal(viewWords("hands-on", false).timelineTitle, "Phase by phase");
  assert.equal(viewWords("hands-on", true).timelineTitle, "Your improvement loop");
  assert.equal(viewWords("hands-on", false).timing, "Your timing");
  assert.equal(viewWords("hands-on", false).timelineLead, "Open a block to see its steps, who can help and what done looks like.");
  const leader = viewWords("leader", false);
  assert.equal(leader.timelineTitle, "Your team's work, phase by phase");
  assert.equal(leader.timing, "Your team's timing");
  assert.equal(leader.timelineLead, "Use these to check the work is on track. You don't need to do the steps yourself.");
  assert.equal(viewWords("leader", true).timelineTitle, "Your team's improvement loop");
});

test("the view is kept in the link only when it was chosen", () => {
  const base = "/plan?work=product&pm=general&level=director&product=b2b&size=scaling&stage=new&phase=discover&challenge=not-sure&time=1-3m&until=discover&way=scrum";
  assert.equal(parseDraft(params(base)).view, undefined);
  assert.equal(parseDraft(params(`${base}&view=hands-on`)).view, "hands-on");
  assert.equal(parseDraft(params(`${base}&view=leader`)).view, "leader");
  // Anything else is ignored, so an edited link can't break the plan.
  assert.equal(parseDraft(params(`${base}&view=boss`)).view, undefined);
  assert.equal(parseDraft(params(`${base}&view=`)).view, undefined);
});

test("the strategy plan link keeps level, size and product type, and opens at the first question left", () => {
  const href = strategyPlanHref({ level: "director", size: "enterprise", product: "public" });
  assert.ok(href.startsWith("/start?step=2&"), href);
  const draft = parseDraft(params(href));
  assert.equal(draft.work, "strategy");
  assert.equal(draft.level, "director");
  assert.equal(draft.size, "enterprise");
  assert.equal(draft.product, "public");
  assert.deepEqual(draft.pm, []);
  assert.equal(draft.stage, null);
  assert.equal(draft.view, undefined);
});
