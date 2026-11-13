import { test } from "node:test";
import assert from "node:assert/strict";
import { CAREER_LEVELS, CHALLENGE_IDS, PHASE_IDS, PM_TYPE_IDS, ROLES, STAGES, TIMELINE_IDS, TOOLS } from "../content/taxonomy";
import { choosePhase, chooseSingle, setTeamCount, toggleMulti } from "./intake-draft";
import { finishOptions, phaseChoices, phaseLabelFor, phasesCovered, phasesForStage, stagesFor, trackFor } from "./intake-phases";
import { INTAKE_QUESTIONS, TAILOR_QUESTIONS, TEAM_ROLE_IDS, TOOL_ANSWER_IDS, TOTAL_STEPS, questionFor, questionsFor, summariseAnswers } from "./intake-questions";
import { EMPTY_DRAFT, KIND_OF_WORK_ENABLED, MAX_PM_TYPES, MAX_TEAM_COUNT, NOT_SURE, OTHER_TOOL, type IntakeAnswers, type IntakeDraft } from "./intake-types";
import { draftToQuery, parseDraft, parseEditing, parseStep, planHref, readerFromRecord, startHref, withOldLinkDefaults } from "./intake-url";
import { canJumpTo, firstUnansweredStep, questionError, validateDraft } from "./intake-validate";

const FULL: IntakeAnswers = {
  work: "product",
  pm: ["ai"],
  level: "associate",
  product: "public",
  size: "scaling",
  stage: "mid-build",
  phase: "build",
  challenge: "measurement",
  team: ["ba", "ux-designer", "qa"],
  teamCounts: {},
  tools: ["jira", "confluence", "figma"],
  time: "1-3m",
  until: "launch",
  way: "scrum",
};

const FULL_QUERY =
  "work=product&pm=ai&level=associate&product=public&size=scaling&stage=mid-build&phase=build&challenge=measurement&team=ba,ux-designer,qa&tools=jira,confluence,figma&time=1-3m&until=launch&way=scrum";

const ids = (phases: readonly { id: string }[]) => phases.map((phase) => phase.id);
const parse = (query: string) => parseDraft(new URLSearchParams(query));

// --- The questions ---

const CORE_ORDER = ["pm", "level", "product", "size", "stage", "challenge", "time", "way"];

test("there are nine questions, with the kind of work first", () => {
  assert.equal(KIND_OF_WORK_ENABLED, true);
  assert.deepEqual(INTAKE_QUESTIONS.map((question) => question.id), ["work", ...CORE_ORDER]);
  assert.equal(TOTAL_STEPS, 9);
  // Exploring product management is the fourth kind of work, after the three that lead to the long path.
  assert.deepEqual(INTAKE_QUESTIONS[0].options.map((option) => option.id), ["product", "strategy", "coaching", "explore"]);
});

test("the kind of work question can still be switched off", () => {
  assert.deepEqual(questionsFor(false).map((question) => question.id), CORE_ORDER);
});

// --- Tracks ---

const stageQuestion = () => INTAKE_QUESTIONS[5];

test("each track asks its own starting-point question", () => {
  const ask = (work: IntakeDraft["work"]) => questionFor(stageQuestion(), { work });
  assert.equal(ask("product").title, "Where is the product now?");
  assert.equal(ask("strategy").title, "Is there a strategy today?");
  assert.equal(ask("coaching").title, "How mature is product practice where you work?");
  assert.deepEqual(ask("strategy").options.map((option) => option.id), ["strategy-none", "strategy-stale", "strategy-ready"]);
  assert.deepEqual(ask("coaching").options.map((option) => option.id), ["coaching-new", "coaching-some", "coaching-established"]);
});

test("Not sure on the kind of work means building a product", () => {
  assert.equal(trackFor(NOT_SURE), "product");
  assert.equal(trackFor(null), "product");
  assert.equal(questionFor(stageQuestion(), { work: NOT_SURE }).title, "Where is the product now?");
});

test("each starting point opens the plan at its phase", () => {
  const first = (work: IntakeDraft["work"], stage: IntakeDraft["stage"]) => ids(phasesCovered({ work, stage, phase: null, until: null }))[0];
  assert.equal(first("strategy", "strategy-none"), "understand");
  assert.equal(first("strategy", "strategy-stale"), "diagnose");
  assert.equal(first("strategy", "strategy-ready"), "strategy-plan");
  assert.equal(first("coaching", "coaching-new"), "assess");
  assert.equal(first("coaching", "coaching-some"), "pilot");
  assert.equal(first("coaching", "coaching-established"), "scale");
});

test("the tracks follow their agreed phases", () => {
  assert.deepEqual(ids(phasesCovered({ work: "strategy", stage: "strategy-none", phase: null, until: null })), ["understand", "diagnose", "choose", "strategy-plan", "align", "review"]);
  assert.deepEqual(ids(phasesCovered({ work: "coaching", stage: "coaching-new", phase: null, until: null })), ["assess", "coaching-design", "pilot", "scale", "sustain"]);
});

test("Not sure on the starting point begins at the start of that track", () => {
  assert.equal(ids(phasesCovered({ work: "strategy", stage: NOT_SURE, phase: null, until: null }))[0], "understand");
  assert.equal(ids(phasesCovered({ work: "coaching", stage: NOT_SURE, phase: null, until: null }))[0], "assess");
  assert.equal(finishOptions({ work: "coaching", stage: NOT_SURE, phase: null, time: "1-3m" })[0].id, "assess");
});

test("tracks have no phase follow-up, and do have a finish question", () => {
  assert.deepEqual(phasesForStage("strategy-none"), []);
  assert.equal(finishOptions({ work: "strategy", stage: "strategy-ready", phase: null, time: "1-3m" }).length, 3);
  const plan = ids(phasesCovered({ work: "strategy", stage: "strategy-none", phase: null, until: "choose" }));
  assert.deepEqual(plan, ["understand", "diagnose", "choose"]);
});

test("changing the kind of work clears a starting point from another track", () => {
  const onStrategy: IntakeDraft = { ...EMPTY_DRAFT, work: "strategy", stage: "strategy-none", time: "1-3m", until: "choose" };
  const moved = chooseSingle(onStrategy, "work", "coaching");
  assert.equal(moved.stage, null);
  assert.equal(moved.until, null);
  assert.equal(chooseSingle({ ...onStrategy, stage: NOT_SURE }, "work", "coaching").stage, NOT_SURE);
});

test("a hand-edited link can't mix a track with another track's starting point", () => {
  assert.equal(parse("work=strategy&stage=live").stage, null);
  assert.equal(parse("work=product&stage=coaching-new").stage, null);
});

test("a change of kind of work sends the visitor back to the starting point", () => {
  const changed = chooseSingle(FULL, "work", "strategy");
  assert.equal(firstUnansweredStep(changed), 6);
});

test("every question has a Not sure line", () => {
  for (const question of questionsFor(true)) assert.ok(question.notSure.length > 0, question.id);
});

// --- Old shared links ---

const OLD_LINK = "pm=ai&product=public&stage=mid-build&phase=build&exp=beginner&team=ba,ux-designer,qa&tools=jira,confluence,figma&time=1-3m&until=launch&way=scrum";

test("old experience answers map onto the new levels", () => {
  const level = (exp: string) => parse(OLD_LINK.replace("exp=beginner", `exp=${exp}`)).level;
  assert.equal(level("beginner"), "associate");
  assert.equal(level("intermediate"), "product-manager");
  assert.equal(level("experienced"), "senior");
  assert.equal(level(NOT_SURE), NOT_SURE);
});

test("an old link still opens as a finished plan, with no new question to answer", () => {
  const result = validateDraft(withOldLinkDefaults(parse(OLD_LINK)));
  assert.ok(result.ok);
  assert.deepEqual(result.answers, { ...FULL, size: NOT_SURE, challenge: NOT_SURE });
});

test("a link from Phase 7a, with no kind of work, opens as a product plan", () => {
  const result = validateDraft(withOldLinkDefaults(parse(FULL_QUERY.replace("work=product&", "").replace("challenge=measurement&", ""))));
  assert.ok(result.ok);
  assert.deepEqual(result.answers, { ...FULL, challenge: NOT_SURE });
});

// --- The challenge question ---

test("the challenge question comes straight after the starting point, with seven answers and Not sure", () => {
  const index = INTAKE_QUESTIONS.findIndex((question) => question.id === "challenge");
  assert.equal(INTAKE_QUESTIONS[index - 1].id, "stage");
  const question = INTAKE_QUESTIONS[index];
  assert.equal(question.title, "What's your biggest challenge right now?");
  assert.equal(question.options.length, 7);
  assert.equal(question.notSure, "We'll keep your plan balanced.");
});

test("every challenge survives a round trip through the web address", () => {
  for (const challenge of [...CHALLENGE_IDS, NOT_SURE] as const) {
    const draft = { ...FULL, challenge };
    assert.deepEqual(parse(draftToQuery(draft)), draft, challenge);
  }
});

test("the challenge must be answered, and the intake never assumes Not sure", () => {
  const blank = { ...FULL, challenge: null };
  assert.equal(validateDraft(blank).ok, false);
  assert.equal(parse(FULL_QUERY.replace("challenge=measurement&", "")).challenge, null);
  assert.equal(firstUnansweredStep(blank), 7);
});

test("old-link defaults only fill the challenge, and only when it's missing", () => {
  assert.equal(withOldLinkDefaults({ ...FULL, challenge: null }).challenge, NOT_SURE);
  assert.equal(withOldLinkDefaults(FULL).challenge, "measurement");
  assert.equal(withOldLinkDefaults(EMPTY_DRAFT).level, null);
});

test("an unknown challenge in a link is ignored", () => {
  assert.equal(parse(FULL_QUERY.replace("challenge=measurement", "challenge=wizard")).challenge, null);
});

test("an old link carries on as a new link once it's changed", () => {
  const address = planHref(parse(OLD_LINK));
  assert.ok(address.includes("level=associate&"));
  assert.ok(address.includes("size=not-sure"));
  assert.ok(!address.includes("exp="));
});

test("a level beats an old experience answer, and nonsense counts as neither", () => {
  assert.equal(parse("level=vp&exp=beginner").level, "vp");
  assert.equal(parse("level=vp&exp=beginner").size, null);
  for (const value of ["constructor", "__proto__", "toString", "wizard"]) {
    assert.equal(parse(`exp=${value}`).level, null, value);
    assert.equal(parse(`exp=${value}`).size, null, value);
  }
});

// --- Up to two PM types ---

test("two PM types survive a round trip, in a fixed order", () => {
  assert.deepEqual(parse("pm=hardware,ai").pm, ["ai", "hardware"]);
  assert.equal(draftToQuery({ ...EMPTY_DRAFT, pm: ["ai", "hardware"] }), "pm=ai,hardware");
});

test("a hand-edited link can't pick more than two PM types", () => {
  assert.equal(parse(`pm=${PM_TYPE_IDS.join(",")}`).pm.length, MAX_PM_TYPES);
});

test("a third PM type can't be ticked until one is unticked", () => {
  const two = toggleMulti(toggleMulti(EMPTY_DRAFT, "pm", "ai"), "pm", "data");
  assert.deepEqual(two.pm, ["ai", "data"]);
  assert.deepEqual(toggleMulti(two, "pm", "growth").pm, ["ai", "data"]);
  assert.deepEqual(toggleMulti(toggleMulti(two, "pm", "data"), "pm", "growth").pm, ["growth", "ai"]);
});

test("Not sure replaces PM types, and real types replace Not sure", () => {
  const two = toggleMulti(toggleMulti(EMPTY_DRAFT, "pm", "ai"), "pm", "data");
  assert.deepEqual(toggleMulti(two, "pm", NOT_SURE).pm, [NOT_SURE]);
  assert.deepEqual(toggleMulti({ ...EMPTY_DRAFT, pm: [NOT_SURE] }, "pm", "ai").pm, ["ai"]);
});

test("there are six career levels, and the top three lead people", () => {
  assert.deepEqual(CAREER_LEVELS.map((level) => level.leadsPeople), [false, false, false, true, true, true]);
  assert.deepEqual(CAREER_LEVELS.map((level) => level.steps), ["beginner", "intermediate", "experienced", "experienced", "experienced", "experienced"]);
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
  const question = TAILOR_QUESTIONS.find((item) => item.id === "tools");
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
    work: NOT_SURE,
    pm: [NOT_SURE],
    level: NOT_SURE,
    product: NOT_SURE,
    size: NOT_SURE,
    stage: NOT_SURE,
    phase: null,
    challenge: NOT_SURE,
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
  assert.deepEqual(parse("pm=wizard&level=&team=ba,pm,nobody&tools=hammer&way=scrum&evil=1"), {
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
  assert.equal(parse("stage=new&phase=not-sure").phase, NOT_SURE);
  assert.equal(parse("stage=not-sure&phase=not-sure").phase, null);
  assert.equal(parse("stage=new&time=1-3m&until=not-sure").until, NOT_SURE);
  assert.equal(parse("stage=new&time=not-sure&until=not-sure").until, null);
});

test("the step is read safely", () => {
  const step = (query: string) => parseStep(new URLSearchParams(query));
  assert.equal(step(""), 1);
  assert.equal(step("step=5"), 5);
  assert.equal(step("step=9"), 9);
  for (const bad of ["step=0", "step=10", "step=-1", "step=2.5", "step=abc"]) {
    assert.equal(step(bad), 1, bad);
  }
});

test("addresses carry the step and the answers", () => {
  assert.equal(startHref(EMPTY_DRAFT, 1), "/start");
  assert.equal(startHref(EMPTY_DRAFT, 3), "/start?step=3");
  assert.equal(startHref({ ...EMPTY_DRAFT, pm: ["ai"] }, 2), "/start?step=2&pm=ai");
  assert.equal(startHref({ ...EMPTY_DRAFT, pm: ["ai"] }, 1), "/start?pm=ai");
  assert.equal(planHref(FULL), `/plan?${FULL_QUERY}`);
});

test("the plan address leaves out the step, so a shared link is the same however it was reached", () => {
  assert.equal(planHref(parse(`step=8&${FULL_QUERY}`)), planHref(parse(FULL_QUERY)));
});

test("server pages read answers the same way as the browser", () => {
  const reader = readerFromRecord({ pm: "ai", team: ["ba,qa", "ignored"], way: undefined });
  assert.deepEqual(parseDraft(reader), { ...EMPTY_DRAFT, pm: ["ai"], team: ["ba", "qa"] });
});

// --- Changing answers ---

test("choosing an answer doesn't change the old draft", () => {
  const before = { ...EMPTY_DRAFT };
  const after = chooseSingle(before, "product", "b2b");
  assert.equal(after.product, "b2b");
  assert.equal(before.product, null);
});

test("changing stage keeps a phase that still fits and clears one that doesn't", () => {
  const onDesign: IntakeDraft = { ...EMPTY_DRAFT, stage: "new", phase: "design" };
  assert.equal(chooseSingle(onDesign, "stage", "mid-build").phase, "design");
  const onDiscover: IntakeDraft = { ...EMPTY_DRAFT, stage: "new", phase: "discover" };
  assert.equal(chooseSingle(onDiscover, "stage", "mid-build").phase, null);
  assert.equal(chooseSingle(onDesign, "stage", NOT_SURE).phase, null);
  const notSure: IntakeDraft = { ...EMPTY_DRAFT, stage: "new", phase: NOT_SURE };
  assert.equal(chooseSingle(notSure, "stage", "live").phase, NOT_SURE);
});

test("each stage offers its own phases in working order, and Not sure offers none", () => {
  for (const stage of STAGES) {
    assert.deepEqual(ids(phasesForStage(stage.id)), [...stage.startPhases]);
  }
  assert.deepEqual(ids(phasesForStage("live")).slice(0, 2), ["measure", "discover"]);
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

test("a live product can be building its next release", () => {
  assert.deepEqual(ids(phasesForStage("live")), [...STAGES[2].journey]);
  assert.equal(chooseSingle({ ...EMPTY_DRAFT, stage: "new", phase: "plan" }, "stage", "live").phase, "plan");
  assert.equal(parse("stage=live&phase=build").phase, "build");
});

test("a live product at or past its usual end runs on to Launch, unless a finish is chosen", () => {
  assert.deepEqual(ids(phasesCovered({ stage: "live", phase: "build", until: null })), ["build", "test", "launch"]);
  assert.deepEqual(ids(phasesCovered({ stage: "live", phase: "build", until: NOT_SURE })), ["build", "test", "launch"]);
  assert.deepEqual(ids(phasesCovered({ stage: "live", phase: "build", until: "test" })), ["build", "test"]);
  assert.deepEqual(ids(phasesCovered({ stage: "live", phase: "design", until: null })), ["design", "plan", "build", "test", "launch"]);
  assert.deepEqual(ids(phasesCovered({ stage: "live", phase: "design", until: "design" })), ["design"]);
  assert.deepEqual(ids(phasesCovered({ stage: "live", phase: "define", until: null })), ["define", "design"]);
});

test("other stages stop at their usual end when no finish is chosen", () => {
  assert.deepEqual(ids(phasesCovered({ stage: "new", phase: "plan", until: null })), ["plan"]);
  assert.deepEqual(ids(phasesCovered({ stage: "mid-build", phase: "launch", until: null })), ["launch"]);
});

test("the finish question isn't asked when only one phase is left", () => {
  assert.deepEqual(finishOptions({ stage: "live", phase: "launch", time: "1-3m" }), []);
  assert.equal(validateDraft({ ...FULL, stage: "live", phase: "launch", until: null }).ok, true);
  assert.deepEqual(ids(phasesCovered({ stage: "live", phase: "launch", until: null })), ["launch"]);
});

test("not knowing the stage covers the same phases as starting something new", () => {
  assert.deepEqual(ids(phasesCovered({ stage: NOT_SURE, phase: null, until: null })), [...STAGES[0].phases]);
});

test("not knowing the stage still asks for a finish, using the route from the beginning", () => {
  assert.deepEqual(ids(finishOptions({ stage: NOT_SURE, phase: null, time: "1-3m" })), [...STAGES[0].journey]);
  assert.deepEqual(ids(phasesCovered({ stage: NOT_SURE, phase: null, until: "discover" })), ["discover"]);
});

test("no finish can be chosen without a stage answer and a real timeline", () => {
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
  // Moving to a stage that can't reach it.
  assert.equal(chooseSingle(draft, "stage", "mid-build").until, null);
  // Not knowing the stage starts from the beginning, so it can still be reached.
  assert.equal(chooseSingle(draft, "stage", NOT_SURE).until, "define");
});

test("a hand-edited address can't finish before it starts", () => {
  assert.equal(parse("stage=new&phase=plan&time=1-3m&until=define").until, null);
  assert.equal(parse("stage=new&until=define").until, null);
  assert.equal(parse("stage=new&time=not-sure&until=define").until, null);
  assert.equal(parse("stage=not-sure&time=1-3m&until=define").until, "define");
  assert.equal(parse("stage=mid-build&time=1-3m&until=discover").until, null);
  assert.equal(parse("stage=new&time=1-3m&until=nowhere").until, null);
});

test("every combination of stage, start, timeline and finish makes sense", () => {
  let checked = 0;
  const phaseAnswers: IntakeDraft["phase"][] = [...PHASE_IDS, NOT_SURE, null];
  const tracks = ["product", "strategy", "coaching"] as const;
  for (const work of tracks) for (const stage of [...stagesFor(work).map((item) => item.id), NOT_SURE, null] as IntakeDraft["stage"][]) {
    for (const phase of phaseAnswers) {
      for (const time of [...TIMELINE_IDS, NOT_SURE, null]) {
        for (const until of phaseAnswers) {
          checked += 1;
          const name = `work=${work} stage=${stage} phase=${phase} time=${time} until=${until}`;
          const draft = chooseSingle({ ...EMPTY_DRAFT, work, stage, phase, until }, "time", time as string);
          // Whatever was asked for, the result can be turned into an address and back unchanged.
          assert.deepEqual(parse(draftToQuery(draft)), draft, name);
          // A plan always has at least one phase, with no repeats.
          const covered = ids(phasesCovered(draft));
          assert.ok(covered.length > 0, name);
          assert.equal(new Set(covered).size, covered.length, name);
          // It starts and finishes where the visitor said.
          if (draft.phase && draft.phase !== NOT_SURE) assert.equal(covered[0], draft.phase, name);
          if (draft.until && draft.until !== NOT_SURE) assert.equal(covered.at(-1), draft.until, name);
          // A follow-up is required exactly when it's shown, and only then.
          const followUpBlank =
            (phasesForStage(draft.stage).length > 0 && draft.phase === null) ||
            (finishOptions(draft).length > 0 && draft.until === null);
          const { stage: s, phase: p, time: t, until: u } = draft;
          const complete = { ...FULL, stage: s, phase: p, time: t, until: u };
          if (draft.stage && draft.time) assert.equal(validateDraft(complete).ok, !followUpBlank, name);
          // With a stage and a date there's a finish to choose, starting where they are,
          // unless they're already in the last phase of the route.
          if (draft.stage && time && time !== NOT_SURE) {
            const options = ids(finishOptions(draft));
            if (draft.stage === "live" && draft.phase === "launch") assert.deepEqual(options, [], name);
            else assert.ok(options.length > 1, name);
            if (options.length > 0 && draft.phase && draft.phase !== NOT_SURE) assert.equal(options[0], draft.phase, name);
          }
        }
      }
    }
  }
  assert.equal(checked, 3 * 5 * phaseAnswers.length * 6 * phaseAnswers.length);
});

test("the longest possible address stays well within browser limits", () => {
  const draft = parse(
    `pm=transformation,hardware&level=product-manager&product=data-ai&size=enterprise&stage=mid-build&phase=build&team=${TEAM_ROLE_IDS.map((id) => `${id}:20`).join(",")}&tools=${TOOL_ANSWER_IDS.join(",")}&time=6m-plus&until=measure&way=hybrid`,
  );
  assert.equal(draft.team.length, TEAM_ROLE_IDS.length);
  assert.ok(planHref(draft).length < 2000);
});

// --- Checking answers ---

test("a blank question gets a friendly message and an answered one doesn't", () => {
  const product = INTAKE_QUESTIONS[3];
  assert.match(questionError(EMPTY_DRAFT, product) ?? "", /choose an option/);
  assert.equal(questionError({ ...EMPTY_DRAFT, product: NOT_SURE }, product), null);
  const pm = INTAKE_QUESTIONS[1];
  assert.match(questionError(EMPTY_DRAFT, pm) ?? "", /tick at least one/);
  assert.equal(questionError({ ...EMPTY_DRAFT, pm: [NOT_SURE] }, pm), null);
  const team = TAILOR_QUESTIONS[0];
  assert.match(questionError(EMPTY_DRAFT, team) ?? "", /tick at least one/);
  assert.equal(questionError({ ...EMPTY_DRAFT, team: [NOT_SURE] }, team), null);
});

test("complete answers pass", () => {
  assert.deepEqual(validateDraft(FULL), { ok: true, answers: FULL });
  assert.equal(validateDraft({ ...FULL, phase: NOT_SURE, until: NOT_SURE }).ok, true);
});

test("a follow-up on screen must be answered, and Not sure is never assumed", () => {
  const [stage, time] = [INTAKE_QUESTIONS[5], INTAKE_QUESTIONS[7]];
  assert.match(questionError({ ...FULL, phase: null }, stage) ?? "", /phase you're in/);
  assert.match(questionError({ ...FULL, until: null }, time) ?? "", /phase to finish/);
  assert.equal(questionError({ ...FULL, until: NOT_SURE }, time), null);
  assert.equal(firstUnansweredStep({ ...FULL, until: null }), 8);
  assert.equal(firstUnansweredStep({ ...FULL, phase: null }), 6);
});

test("a follow-up that isn't shown isn't required", () => {
  const noStage: IntakeDraft = { ...FULL, stage: NOT_SURE, phase: null, until: NOT_SURE };
  assert.equal(validateDraft(noStage).ok, true);
  assert.equal(firstUnansweredStep({ ...noStage, until: null }), 8);
  const noDate: IntakeDraft = { ...FULL, time: NOT_SURE, until: null };
  assert.equal(validateDraft(noDate).ok, true);
});

test("a change that rules out a later answer sends the visitor back to it", () => {
  const changed = chooseSingle({ ...FULL, stage: "new", phase: NOT_SURE, until: "discover" }, "stage", "mid-build");
  assert.equal(changed.until, null);
  assert.equal(firstUnansweredStep(changed), 8);
});

test("incomplete answers list every missing question", () => {
  const result = validateDraft({ ...FULL, product: null, way: null, tools: [] });
  assert.equal(result.ok, false);
  assert.ok(!result.ok);
  assert.deepEqual(result.errors.map((error) => error.question), ["product", "way"]);
});

test("the first unanswered step is found", () => {
  assert.equal(firstUnansweredStep(EMPTY_DRAFT), 1);
  assert.equal(firstUnansweredStep({ ...FULL, level: null, way: null }), 3);
  assert.equal(firstUnansweredStep(FULL), null);
});

test("going back to change an answer never locks the visitor out of later answers", () => {
  // Stage changes from Not sure, so the phase follow-up is now a gap at question 6.
  const changed = chooseSingle({ ...FULL, stage: NOT_SURE, phase: null }, "stage", "new");
  assert.equal(firstUnansweredStep(changed), 6);
  assert.equal(canJumpTo(changed, 7), true);
  assert.equal(canJumpTo(changed, 9), true);
});

test("a visitor can jump to any answered question or to the first gap", () => {
  assert.equal(canJumpTo(EMPTY_DRAFT, 1), true);
  assert.equal(canJumpTo(EMPTY_DRAFT, 2), false);
  const gap = { ...FULL, level: null };
  assert.equal(canJumpTo(gap, 3), true);
  assert.equal(canJumpTo(gap, 4), true);
  assert.equal(canJumpTo(FULL, 9), true);
  assert.equal(canJumpTo({ ...EMPTY_DRAFT, pm: ["ai"] }, 3), false);
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
  assert.deepEqual(summary.slice(0, 9).map((row) => row.step), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.equal(summary[9].step, undefined);
});


test("answers are summarised in readable words", () => {
  assert.deepEqual(summariseAnswers(FULL).map(({ label, value }) => ({ label, value })), [
    { label: "Kind of work", value: "Building or improving a product" },
    { label: "Kind of PM", value: "AI" },
    { label: "What you own", value: "Features someone else has shaped" },
    { label: "Kind of product", value: "Public sector service" },
    { label: "Size of organisation", value: "Scaling" },
    { label: "Where the product is", value: "Partway through a build (Build)" },
    { label: "Biggest challenge", value: "We ship, but can't tell if it's working" },
    { label: "Timeline", value: "1 to 3 months, finishing Launch" },
    { label: "Way of working", value: "Scrum" },
    { label: "Phases your plan covers", value: "Build, Test, Launch" },
  ]);
});

test("team and tools aren't in the answers summary, because they're tailored on the plan", () => {
  const labels = summariseAnswers({ ...FULL, teamCounts: { "ux-designer": 2 }, tools: ["jira", OTHER_TOOL] }).map((row) => row.label);
  assert.ok(!labels.includes("Team"));
  assert.ok(!labels.includes("Tools"));
});

test("team and tools are optional, and stay in the link when given", () => {
  const without = { ...FULL, team: [], teamCounts: {}, tools: [] };
  assert.equal(validateDraft(without).ok, true);
  assert.ok(!draftToQuery(without).includes("team="));
  assert.ok(!draftToQuery(without).includes("tools="));
  assert.deepEqual(parse(draftToQuery({ ...FULL, teamCounts: { qa: 3 } })).teamCounts, { qa: 3 });
  assert.deepEqual(parse(FULL_QUERY).tools, ["jira", "confluence", "figma"]);
});

test("the team and tools questions live in Tailor your plan", () => {
  assert.deepEqual(TAILOR_QUESTIONS.map((question) => question.id), ["team", "tools"]);
  assert.ok(!INTAKE_QUESTIONS.some((question) => question.id === "team" || question.id === "tools"));
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
  const { why } = INTAKE_QUESTIONS[7];
  assert.match(why, /milestone is/);
  assert.match(why, /week by week/);
});

test("Not sure reads as words, not an id", () => {
  const summary = summariseAnswers({ ...FULL, pm: [NOT_SURE], stage: NOT_SURE, phase: null, team: [NOT_SURE] });
  const value = (label: string) => summary.find((row) => row.label === label)?.value;
  assert.equal(value("Kind of PM"), "Not sure");
  assert.equal(value("Where the product is"), "Not sure");
});

test("a live product sees Launch worded as its next release", () => {
  const live = phaseChoices(finishOptions({ stage: "live", phase: null, time: "3-6m" }), "live");
  assert.equal(live.at(-1)?.label, "Launch the next release");
  assert.equal(phaseLabelFor("launch", "live"), "Launch the next release");
  const building = phaseChoices(finishOptions({ stage: "mid-build", phase: null, time: "3-6m" }), "mid-build");
  assert.ok(building.some((phase) => phase.label === "Launch"));
  assert.equal(phaseLabelFor("launch", "new"), "Launch");
});
