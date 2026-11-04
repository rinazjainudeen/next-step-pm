import { test } from "node:test";
import assert from "node:assert/strict";
import { PHASE_IDS, ROLES, STAGES, TIMELINE_IDS, TOOLS } from "../content/taxonomy";
import { choosePhase, chooseSingle, setTeamCount, toggleMulti } from "./intake-draft";
import { finishOptions, phasesCovered, phasesForStage } from "./intake-phases";
import { INTAKE_QUESTIONS, TEAM_ROLE_IDS, TOOL_ANSWER_IDS, TOTAL_STEPS, summariseAnswers } from "./intake-questions";
import { EMPTY_DRAFT, MAX_TEAM_COUNT, NOT_SURE, OTHER_TOOL, type IntakeAnswers, type IntakeDraft } from "./intake-types";
import { draftToQuery, parseDraft, parseEditing, parseStep, planHref, readerFromRecord, startHref } from "./intake-url";
import { canJumpTo, firstUnansweredStep, questionError, validateDraft } from "./intake-validate";

const FULL: IntakeAnswers = {
  pm: "ai",
  product: "public",
  stage: "mid-build",
  phase: "build",
  exp: "beginner",
  team: ["ba", "ux-designer", "qa"],
  teamCounts: {},
  tools: ["jira", "confluence", "figma"],
  time: "1-3m",
  until: "launch",
  way: "scrum",
};

const FULL_QUERY =
  "pm=ai&product=public&stage=mid-build&phase=build&exp=beginner&team=ba,ux-designer,qa&tools=jira,confluence,figma&time=1-3m&until=launch&way=scrum";

const ids = (phases: readonly { id: string }[]) => phases.map((phase) => phase.id);
const parse = (query: string) => parseDraft(new URLSearchParams(query));

// --- The questions ---

test("there are eight questions, in the agreed order", () => {
  assert.deepEqual(
    INTAKE_QUESTIONS.map((question) => question.id),
    ["pm", "product", "stage", "exp", "team", "tools", "time", "way"],
  );
  assert.equal(TOTAL_STEPS, 8);
});

test("every question explains why it's asked and what Not sure means", () => {
  for (const question of INTAKE_QUESTIONS) {
    assert.ok(question.why, `${question.id} needs a why line`);
    assert.ok(question.notSure, `${question.id} needs a Not sure line`);
  }
});

test("the team question offers every role except the PM", () => {
  assert.equal(TEAM_ROLE_IDS.length, ROLES.length - 1);
  assert.ok(!(TEAM_ROLE_IDS as string[]).includes("pm"));
});

test("the grouped tools question shows every tool exactly once", () => {
  const question = INTAKE_QUESTIONS.find((item) => item.id === "tools");
  assert.ok(question?.kind === "multi" && question.groups);
  const grouped = question.groups.flatMap((group) => group.options.map((option) => option.id));
  assert.deepEqual(grouped.toSorted(), TOOLS.map((tool) => tool.id).toSorted());
});

// --- Answers and the web address ---

test("answers survive a round trip through the web address", () => {
  assert.equal(draftToQuery(FULL), FULL_QUERY);
  assert.deepEqual(parse(FULL_QUERY), FULL);
});

test("Not sure survives a round trip on every question", () => {
  const draft: IntakeDraft = {
    pm: NOT_SURE,
    product: NOT_SURE,
    stage: NOT_SURE,
    phase: null,
    exp: NOT_SURE,
    team: [NOT_SURE],
    teamCounts: {},
    tools: [NOT_SURE],
    time: NOT_SURE,
    until: null,
    way: NOT_SURE,
  };
  assert.deepEqual(parse(draftToQuery(draft)), draft);
});

test("an empty address gives an empty draft", () => {
  assert.deepEqual(parse(""), EMPTY_DRAFT);
  assert.equal(draftToQuery(EMPTY_DRAFT), "");
});

test("unrecognised values are ignored", () => {
  assert.deepEqual(parse("pm=wizard&exp=&team=ba,pm,nobody&tools=hammer&way=scrum&evil=1"), {
    ...EMPTY_DRAFT,
    team: ["ba"],
    way: "scrum",
  });
});

test("the visitor's own role can't be added to the team", () => {
  assert.deepEqual(parse("team=pm").team, []);
});

test("a hand-edited list is put in order, without duplicates, and Not sure gives way", () => {
  assert.deepEqual(parse("team=qa,ba,qa").team, ["ba", "qa"]);
  assert.deepEqual(parse("team=not-sure,qa").team, ["qa"]);
});

test("commas that a browser has encoded still work", () => {
  assert.deepEqual(parse("team=ba%2Cqa").team, ["ba", "qa"]);
});

test("a phase outside the chosen stage is ignored", () => {
  assert.equal(parse("stage=new&phase=launch").phase, null);
  assert.equal(parse("phase=build").phase, null);
  assert.equal(parse("stage=not-sure&phase=build").phase, null);
  assert.equal(parse("stage=new&phase=define").phase, "define");
});

test("the step is read safely", () => {
  const step = (query: string) => parseStep(new URLSearchParams(query));
  assert.equal(step(""), 1);
  assert.equal(step("step=5"), 5);
  assert.equal(step("step=8"), 8);
  for (const bad of ["step=0", "step=9", "step=-1", "step=2.5", "step=abc"]) {
    assert.equal(step(bad), 1, bad);
  }
});

test("addresses carry the step and the answers", () => {
  assert.equal(startHref(EMPTY_DRAFT, 1), "/start");
  assert.equal(startHref(EMPTY_DRAFT, 3), "/start?step=3");
  assert.equal(startHref({ ...EMPTY_DRAFT, pm: "ai" }, 2), "/start?step=2&pm=ai");
  assert.equal(startHref({ ...EMPTY_DRAFT, pm: "ai" }, 1), "/start?pm=ai");
  assert.equal(planHref(FULL), `/plan?${FULL_QUERY}`);
});

test("the plan address leaves out the step, so a shared link is the same however it was reached", () => {
  assert.equal(planHref(parse(`step=8&${FULL_QUERY}`)), planHref(parse(FULL_QUERY)));
});

test("server pages read answers the same way as the browser", () => {
  const reader = readerFromRecord({ pm: "ai", team: ["ba,qa", "ignored"], way: undefined });
  assert.deepEqual(parseDraft(reader), { ...EMPTY_DRAFT, pm: "ai", team: ["ba", "qa"] });
});

// --- Changing answers ---

test("choosing an answer doesn't change the old draft", () => {
  const before = { ...EMPTY_DRAFT };
  const after = chooseSingle(before, "pm", "ai");
  assert.equal(after.pm, "ai");
  assert.equal(before.pm, null);
});

test("changing stage keeps a phase that still fits and clears one that doesn't", () => {
  const onDesign: IntakeDraft = { ...EMPTY_DRAFT, stage: "new", phase: "design" };
  assert.equal(chooseSingle(onDesign, "stage", "mid-build").phase, "design");
  const onDiscover: IntakeDraft = { ...EMPTY_DRAFT, stage: "new", phase: "discover" };
  assert.equal(chooseSingle(onDiscover, "stage", "mid-build").phase, null);
  assert.equal(chooseSingle(onDesign, "stage", NOT_SURE).phase, null);
});

test("each stage offers its own phases in working order, and Not sure offers none", () => {
  for (const stage of STAGES) {
    assert.equal(phasesForStage(stage.id).length, stage.phases.length);
  }
  assert.deepEqual(ids(phasesForStage("live")), ["measure", "discover", "define", "design"]);
  assert.deepEqual(phasesForStage(NOT_SURE), []);
  assert.deepEqual(phasesForStage(null), []);
});

test("ticking adds to a list and ticking again removes", () => {
  const once = toggleMulti(EMPTY_DRAFT, "team", "ba");
  assert.deepEqual(once.team, ["ba"]);
  assert.deepEqual(toggleMulti(once, "team", "ba").team, []);
});

test("the list order doesn't depend on the order of ticking", () => {
  let draft = toggleMulti(EMPTY_DRAFT, "tools", "figma");
  draft = toggleMulti(draft, "tools", "jira");
  assert.deepEqual(draft.tools, ["jira", "figma"]);
});

test("Not sure and real answers can't be ticked together", () => {
  const withRole = toggleMulti(EMPTY_DRAFT, "team", "ba");
  const notSure = toggleMulti(withRole, "team", NOT_SURE);
  assert.deepEqual(notSure.team, [NOT_SURE]);
  assert.deepEqual(toggleMulti(notSure, "team", "qa").team, ["qa"]);
  assert.deepEqual(toggleMulti(notSure, "team", NOT_SURE).team, []);
});

test("team numbers survive a round trip, and one is left out", () => {
  const query = "team=ba,backend-engineer:3,qa";
  const draft = parse(query);
  assert.deepEqual(draft.team, ["ba", "backend-engineer", "qa"]);
  assert.deepEqual(draft.teamCounts, { "backend-engineer": 3 });
  assert.equal(draftToQuery(draft), query);
  assert.deepEqual(parse("team=backend-engineer%3A3").teamCounts, { "backend-engineer": 3 });
});

test("hand-edited team numbers are made safe", () => {
  assert.deepEqual(parse("team=ba:0,qa:abc,architect:1.5,devops:-2").teamCounts, {});
  assert.deepEqual(parse("team=ba:0").team, ["ba"]);
  assert.deepEqual(parse("team=ba:500").teamCounts, { ba: MAX_TEAM_COUNT });
  assert.deepEqual(parse("team=pm:3,nobody:2").teamCounts, {});
  assert.deepEqual(parse("team=not-sure:4"), { ...EMPTY_DRAFT, team: [NOT_SURE] });
});

test("a number can only be set on a ticked role, and is capped", () => {
  const draft = toggleMulti(EMPTY_DRAFT, "team", "ba");
  assert.deepEqual(setTeamCount(draft, "ba", 3).teamCounts, { ba: 3 });
  assert.deepEqual(setTeamCount(draft, "ba", 99).teamCounts, { ba: MAX_TEAM_COUNT });
  assert.deepEqual(setTeamCount(setTeamCount(draft, "ba", 3), "ba", 1).teamCounts, {});
  assert.deepEqual(setTeamCount(draft, "qa", 3).teamCounts, {});
});

test("unticking a role or choosing Not sure clears its number, and leaves others", () => {
  let draft = toggleMulti(toggleMulti(EMPTY_DRAFT, "team", "ba"), "team", "qa");
  draft = setTeamCount(setTeamCount(draft, "ba", 3), "qa", 2);
  assert.deepEqual(toggleMulti(draft, "team", "ba").teamCounts, { qa: 2 });
  assert.deepEqual(toggleMulti(draft, "team", NOT_SURE).teamCounts, {});
  assert.deepEqual(toggleMulti(draft, "team", "architect").teamCounts, { ba: 3, qa: 2 });
});

test("a tool that isn't listed can sit beside real tools, but not beside Not sure", () => {
  let draft = toggleMulti(EMPTY_DRAFT, "tools", OTHER_TOOL);
  draft = toggleMulti(draft, "tools", "jira");
  assert.deepEqual(draft.tools, ["jira", OTHER_TOOL]);
  assert.deepEqual(parse(draftToQuery(draft)).tools, ["jira", OTHER_TOOL]);
  assert.deepEqual(toggleMulti(draft, "tools", NOT_SURE).tools, [NOT_SURE]);
});

// --- Where the plan starts and finishes ---

test("a stage's usual phases are the start of its journey, and every phase is reachable once", () => {
  for (const stage of STAGES) {
    assert.deepEqual(stage.journey.slice(0, stage.phases.length), [...stage.phases], stage.id);
    assert.equal(new Set(stage.journey).size, stage.journey.length, stage.id);
  }
});

test("starting something new can aim for go-live", () => {
  const draft: IntakeDraft = { ...EMPTY_DRAFT, stage: "new", time: "6m-plus" };
  assert.ok(ids(finishOptions(draft)).includes("launch"));
  assert.deepEqual(ids(phasesCovered({ ...draft, until: "launch" })), [
    "discover", "define", "design", "plan", "build", "test", "launch",
  ]);
});

test("finishing discovery stops the plan at Discover", () => {
  assert.deepEqual(ids(phasesCovered({ stage: "new", phase: null, until: "discover" })), ["discover"]);
});

test("with no finish chosen, a plan covers the stage's usual phases", () => {
  for (const stage of STAGES) {
    assert.deepEqual(ids(phasesCovered({ stage: stage.id, phase: null, until: null })), [...stage.phases]);
  }
});

test("a start phase narrows the plan from the front", () => {
  assert.deepEqual(ids(phasesCovered({ stage: "mid-build", phase: "build", until: null })), ["build", "test", "launch"]);
});

test("a live product starts at Measure and loops back", () => {
  assert.deepEqual(ids(phasesCovered({ stage: "live", phase: null, until: "define" })), ["measure", "discover", "define"]);
  const options = ids(finishOptions({ stage: "live", phase: "discover", time: "1-3m" }));
  assert.equal(options[0], "discover");
  assert.ok(!options.includes("measure"), "Measure comes before Discover on this route");
});

test("not knowing the stage covers the same phases as starting something new", () => {
  assert.deepEqual(ids(phasesCovered({ stage: NOT_SURE, phase: null, until: null })), [...STAGES[0].phases]);
});

test("no finish can be chosen without a real stage and a real timeline", () => {
  assert.deepEqual(finishOptions({ stage: NOT_SURE, phase: null, time: "1-3m" }), []);
  assert.deepEqual(finishOptions({ stage: null, phase: null, time: "1-3m" }), []);
  assert.deepEqual(finishOptions({ stage: "new", phase: null, time: NOT_SURE }), []);
  assert.deepEqual(finishOptions({ stage: "new", phase: null, time: null }), []);
});

test("a finish that an earlier answer rules out is cleared", () => {
  const draft: IntakeDraft = { ...EMPTY_DRAFT, stage: "new", phase: "discover", time: "1-3m", until: "define" };
  // Moving the start past the finish.
  assert.equal(choosePhase(draft, "phase", "plan").until, null);
  // Moving the start up to the finish is allowed: finish the phase you're in.
  assert.equal(choosePhase(draft, "phase", "define").until, "define");
  // No longer having a date.
  assert.equal(chooseSingle(draft, "time", NOT_SURE).until, null);
  // Changing to a timeline with a date keeps it.
  assert.equal(chooseSingle(draft, "time", "3-6m").until, "define");
  // Moving to a stage that can't reach it, and to not knowing the stage.
  assert.equal(chooseSingle(draft, "stage", "mid-build").until, null);
  assert.equal(chooseSingle(draft, "stage", NOT_SURE).until, null);
});

test("a hand-edited address can't finish before it starts", () => {
  assert.equal(parse("stage=new&phase=plan&time=1-3m&until=define").until, null);
  assert.equal(parse("stage=new&until=define").until, null);
  assert.equal(parse("stage=new&time=not-sure&until=define").until, null);
  assert.equal(parse("stage=not-sure&time=1-3m&until=define").until, null);
  assert.equal(parse("stage=mid-build&time=1-3m&until=discover").until, null);
  assert.equal(parse("stage=new&time=1-3m&until=nowhere").until, null);
});

test("every combination of stage, start, timeline and finish makes sense", () => {
  let checked = 0;
  const stages: IntakeDraft["stage"][] = [...STAGES.map((item) => item.id), NOT_SURE, null];
  for (const stage of stages) {
    for (const phase of [...PHASE_IDS, null]) {
      for (const time of [...TIMELINE_IDS, NOT_SURE, null]) {
        for (const until of [...PHASE_IDS, null]) {
          checked += 1;
          const name = `stage=${stage} phase=${phase} time=${time} until=${until}`;
          const draft = chooseSingle({ ...EMPTY_DRAFT, stage, phase, until }, "time", time as string);
          // Whatever was asked for, the result can be turned into an address and back unchanged.
          assert.deepEqual(parse(draftToQuery(draft)), draft, name);
          // A plan always has at least one phase, with no repeats.
          const covered = ids(phasesCovered(draft));
          assert.ok(covered.length > 0, name);
          assert.equal(new Set(covered).size, covered.length, name);
          // It starts and finishes where the visitor said.
          if (draft.phase) assert.equal(covered[0], draft.phase, name);
          if (draft.until) assert.equal(covered.at(-1), draft.until, name);
          // Someone with a real stage and date always has a finish to choose, starting where they are.
          if (draft.stage && draft.stage !== NOT_SURE && time && time !== NOT_SURE) {
            const options = ids(finishOptions(draft));
            assert.ok(options.length > 1, name);
            if (draft.phase) assert.equal(options[0], draft.phase, name);
          }
        }
      }
    }
  }
  assert.equal(checked, 5 * 9 * 6 * 9);
});

test("the longest possible address stays well within browser limits", () => {
  const draft = parse(
    `pm=transformation&product=data-ai&stage=mid-build&phase=build&exp=intermediate&team=${TEAM_ROLE_IDS.map((id) => `${id}:20`).join(",")}&tools=${TOOL_ANSWER_IDS.join(",")}&time=6m-plus&until=measure&way=hybrid`,
  );
  assert.equal(draft.team.length, TEAM_ROLE_IDS.length);
  assert.ok(planHref(draft).length < 2000);
});

// --- Checking answers ---

test("a blank question gets a friendly message and an answered one doesn't", () => {
  const [pm] = INTAKE_QUESTIONS;
  assert.match(questionError(EMPTY_DRAFT, pm) ?? "", /choose an option/);
  assert.equal(questionError({ ...EMPTY_DRAFT, pm: NOT_SURE }, pm), null);
  const team = INTAKE_QUESTIONS[4];
  assert.match(questionError(EMPTY_DRAFT, team) ?? "", /tick at least one/);
  assert.equal(questionError({ ...EMPTY_DRAFT, team: [NOT_SURE] }, team), null);
});

test("complete answers pass, and the optional phase isn't required", () => {
  assert.deepEqual(validateDraft(FULL), { ok: true, answers: FULL });
  assert.equal(validateDraft({ ...FULL, phase: null }).ok, true);
});

test("incomplete answers list every missing question", () => {
  const result = validateDraft({ ...FULL, product: null, tools: [] });
  assert.equal(result.ok, false);
  assert.ok(!result.ok);
  assert.deepEqual(result.errors.map((error) => error.question), ["product", "tools"]);
});

test("the first unanswered step is found", () => {
  assert.equal(firstUnansweredStep(EMPTY_DRAFT), 1);
  assert.equal(firstUnansweredStep({ ...FULL, exp: null, way: null }), 4);
  assert.equal(firstUnansweredStep(FULL), null);
});

test("a visitor can jump back anywhere, and forward only as far as the first gap", () => {
  assert.equal(canJumpTo(EMPTY_DRAFT, 1), true);
  assert.equal(canJumpTo(EMPTY_DRAFT, 2), false);
  const gap = { ...FULL, exp: null };
  assert.equal(canJumpTo(gap, 3), true);
  assert.equal(canJumpTo(gap, 4), true);
  assert.equal(canJumpTo(gap, 5), false);
  assert.equal(canJumpTo(FULL, 8), true);
});

test("changing one answer has its own address, which never reaches the plan link", () => {
  assert.equal(startHref(FULL, 5, true), `/start?step=5&edit=1&${FULL_QUERY}`);
  assert.equal(startHref(FULL, 1, true), `/start?edit=1&${FULL_QUERY}`);
  const params = new URLSearchParams(`step=5&edit=1&${FULL_QUERY}`);
  assert.equal(parseEditing(params), true);
  assert.equal(parseStep(params), 5);
  assert.equal(parseEditing(new URLSearchParams(FULL_QUERY)), false);
  assert.equal(parseEditing(new URLSearchParams("edit=yes")), false);
  assert.equal(planHref(parseDraft(params)), planHref(FULL));
});

// --- Showing answers ---

test("each answer links to its own question, and the worked-out row doesn't", () => {
  const summary = summariseAnswers(FULL);
  assert.deepEqual(summary.slice(0, 8).map((row) => row.step), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(summary[8].step, undefined);
});


test("answers are summarised in readable words", () => {
  assert.deepEqual(summariseAnswers(FULL).map(({ label, value }) => ({ label, value })), [
    { label: "Kind of PM", value: "AI and innovation" },
    { label: "Kind of product", value: "Public sector service" },
    { label: "Where the product is", value: "Joining mid-build (Build)" },
    { label: "Experience", value: "Beginner (under 1 year)" },
    { label: "Team", value: "Business Analyst, UX Designer, QA / Tester" },
    { label: "Tools", value: "Jira, Confluence, Figma" },
    { label: "Timeline", value: "1 to 3 months, finishing Launch" },
    { label: "Way of working", value: "Scrum" },
    { label: "Phases your plan covers", value: "Build, Test, Launch" },
  ]);
});

test("team numbers and an unlisted tool read as words", () => {
  const summary = summariseAnswers({ ...FULL, teamCounts: { "ux-designer": 2 }, tools: ["jira", OTHER_TOOL] });
  assert.equal(summary[4].value, "Business Analyst, UX Designer (2), QA / Tester");
  assert.match(summariseAnswers({ ...FULL, teamCounts: { ba: MAX_TEAM_COUNT } })[4].value, /Business Analyst \(20\+\)/);
  assert.equal(summary[5].value, "Jira, A tool that isn't listed");
});

test("every option a visitor might not know has an explanation", () => {
  for (const id of ["pm", "product", "stage", "team", "way"]) {
    const question = INTAKE_QUESTIONS.find((item) => item.id === id);
    for (const option of question?.options ?? []) {
      assert.ok(option.description, `${id}: ${option.id} needs an explanation`);
    }
  }
  for (const phase of phasesForStage("mid-build")) assert.ok(phase.description, phase.id);
});

test("the milestone question says what a milestone is and what the answer does", () => {
  const { why } = INTAKE_QUESTIONS[6];
  assert.match(why, /milestone is/);
  assert.match(why, /week by week/);
});

test("Not sure reads as words, not an id", () => {
  const summary = summariseAnswers({ ...FULL, pm: NOT_SURE, stage: NOT_SURE, phase: null, team: [NOT_SURE] });
  assert.equal(summary[0].value, "Not sure");
  assert.equal(summary[2].value, "Not sure");
  assert.equal(summary[4].value, "Not sure");
});
