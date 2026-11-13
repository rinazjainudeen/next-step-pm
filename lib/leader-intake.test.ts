import assert from "node:assert/strict";
import { test } from "node:test";
import { CHALLENGE_IDS } from "../content/taxonomy";
import { loadBlocks } from "./blocks-load";
import { validateChallengeBlocks } from "./blocks-validate";
import { buildPlan } from "./curriculum-engine";
import { chooseSingle, tidyDraft } from "./intake-draft";
import { INTAKE_QUESTIONS, questionFor, summariseAnswers } from "./intake-questions";
import { NOT_SURE, type IntakeAnswers, type IntakeDraft } from "./intake-types";
import { parseDraft } from "./intake-url";
import { validateDraft } from "./intake-validate";
import { challengeDetails, challengeFits, challengeOptions, leadsPeople } from "./leader-intake";

const BLOCKS = loadBlocks();
const LEADERS = ["group", "director", "vp"] as const;
const OTHERS = ["associate", "product-manager", "senior", NOT_SURE, null] as const;
const LEADER_ONLY = ["team-performance", "hiring", "portfolio"];

const DIRECTOR: IntakeAnswers = {
  work: "product",
  pm: ["general"],
  level: "director",
  product: "b2b",
  size: "enterprise",
  stage: "live",
  phase: "measure",
  challenge: "team-performance",
  team: [],
  teamCounts: {},
  tools: [],
  time: "3-6m",
  until: "design",
  way: "hybrid",
};

const question = (id: string) => INTAKE_QUESTIONS.find((item) => item.id === id) as (typeof INTAKE_QUESTIONS)[number];
const ask = (id: string, level: IntakeDraft["level"], work: IntakeDraft["work"] = "product") => questionFor(question(id), { work, level });

// --- The questions ---

test("Group PM, Director and VP lead people, and nobody else does", () => {
  for (const level of LEADERS) assert.equal(leadsPeople(level), true, level);
  for (const level of OTHERS) assert.equal(leadsPeople(level), false, String(level));
});

test("what you own comes before the kind of PM, so the wording can follow it", () => {
  const order = INTAKE_QUESTIONS.map((item) => item.id);
  assert.ok(order.indexOf("level") < order.indexOf("pm"));
});

test("people leaders aren't asked what kind of product manager they are", () => {
  for (const level of LEADERS) {
    const pm = ask("pm", level);
    assert.doesNotMatch(pm.title, /product manager/i, level);
    assert.equal(pm.title, "What kind of product work do your teams do?");
    assert.equal(pm.shortLabel, "Kind of product work");
    // Same answers, so the add-ons and links don't change.
    assert.deepEqual(pm.options.map((option) => option.id), question("pm").options.map((option) => option.id));
    assert.equal(pm.options.find((option) => option.id === "general")?.description, "Your teams cover a bit of everything.");
    assert.equal(ask("product", level).title, "What kind of products do you look after?");
    assert.equal(ask("stage", level).title, "Where is your main product now?");
    assert.equal(ask("way", level).title, "How do your teams work?");
    assert.equal(ask("challenge", level).title, "What's your biggest challenge as a leader right now?");
  }
  for (const level of OTHERS) {
    assert.equal(ask("pm", level).title, "What kind of product manager are you?", String(level));
    assert.equal(ask("product", level).title, "What kind of product is it?");
    assert.equal(ask("stage", level).title, "Where is the product now?");
  }
});

test("leaders' strategy and coaching starting questions stay as they are", () => {
  assert.equal(ask("stage", "director", "strategy").title, "Is there a strategy today?");
  assert.equal(ask("stage", "vp", "coaching").title, "How mature is product practice where you work?");
});

test("leaders get their own challenges first, and nobody else sees them", () => {
  const leaderIds = challengeOptions("director").map((option) => option.id);
  assert.deepEqual(leaderIds.slice(0, 4), ["team-performance", "hiring", "alignment", "portfolio"]);
  assert.deepEqual([...leaderIds].sort(), [...CHALLENGE_IDS].sort());
  for (const level of OTHERS) {
    const ids = challengeOptions(level).map((option) => option.id);
    assert.ok(ids.every((id) => !LEADER_ONLY.includes(id)), String(level));
    assert.equal(ids.length, CHALLENGE_IDS.length - LEADER_ONLY.length);
  }
  assert.equal(challengeOptions("vp").find((option) => option.id === "alignment")?.label, "Getting execs and other teams behind the direction");
  assert.equal(challengeOptions("senior").find((option) => option.id === "alignment")?.label, "People aren't aligned on the direction");
  assert.deepEqual(ask("challenge", "group").options, challengeOptions("group"));
});

test("a leaders-only challenge is cleared when the level stops leading people, so the question is asked again", () => {
  for (const challenge of LEADER_ONLY) {
    assert.equal(challengeFits(challenge as IntakeDraft["challenge"], "director"), true);
    assert.equal(challengeFits(challenge as IntakeDraft["challenge"], "senior"), false);
    const changed = chooseSingle(DIRECTOR, "level", "senior");
    assert.equal(chooseSingle({ ...DIRECTOR, challenge: challenge as IntakeDraft["challenge"] }, "level", "senior").challenge, null);
    assert.equal(changed.challenge, null);
    assert.equal(validateDraft(changed).ok, false);
  }
  // Shared challenges survive any level change.
  assert.equal(chooseSingle({ ...DIRECTOR, challenge: "measurement" }, "level", "associate").challenge, "measurement");
  assert.equal(tidyDraft({ ...DIRECTOR, challenge: NOT_SURE, level: "associate" }).challenge, NOT_SURE);
});

test("a hand-edited link can't give a leaders-only challenge to someone who doesn't lead people", () => {
  const query = "work=product&pm=general&level=associate&product=b2b&size=scaling&stage=new&phase=discover&challenge=hiring&time=1-3m&until=discover&way=scrum";
  assert.equal(parseDraft(new URLSearchParams(query)).challenge, null);
  assert.equal(parseDraft(new URLSearchParams(query.replace("level=associate", "level=vp"))).challenge, "hiring");
});

test("Your answers use the leader's wording", () => {
  const rows = summariseAnswers(DIRECTOR);
  assert.deepEqual(rows.find((row) => row.label === "Kind of product work")?.value, "General");
  assert.equal(rows.find((row) => row.label === "Biggest challenge")?.value, "Getting the best from my PMs");
  assert.equal(summariseAnswers({ ...DIRECTOR, challenge: "alignment" }).find((row) => row.label === "Biggest challenge")?.value, "Getting execs and other teams behind the direction");
});

// --- The content ---

test("every block a leader's challenge names exists and builds a skill the challenge favours", () => {
  assert.deepEqual(validateChallengeBlocks(BLOCKS), []);
  assert.match(validateChallengeBlocks(BLOCKS.filter((block) => block.id !== "lead-one-to-ones")).join(), /names "lead-one-to-ones", but no block has that id/);
});

test("only people leaders' challenges name blocks", () => {
  assert.deepEqual(challengeDetails({ challenge: "alignment", level: "senior" })?.blocks, []);
  assert.deepEqual(challengeDetails({ challenge: "alignment", level: "director" })?.blocks, ["strat-align-leaders", "craft-exec-communication", "craft-influence"]);
  assert.equal(challengeDetails({ challenge: "hiring", level: "senior" }), undefined);
  assert.equal(challengeDetails({ challenge: NOT_SURE, level: "director" }), undefined);
});

// --- The plan ---

const labelled = (blocks: readonly { id: string; helpsChallenge?: boolean }[]) => blocks.filter((block) => block.helpsChallenge).map((block) => block.id);
const allLabelled = (plan: ReturnType<typeof buildPlan>) => [
  ...labelled(plan.leadYourTeam),
  ...labelled(plan.phases.flatMap((phase) => phase.blocks)),
  ...labelled([...plan.skillsStart, ...plan.skillsForLevel, ...plan.skillsAnyLevel]),
];

test("a Director who wants more from their PMs gets coaching and one-to-ones first in Lead your team", () => {
  const plan = buildPlan(DIRECTOR, BLOCKS);
  assert.deepEqual(plan.leadYourTeam.map((block) => block.id).slice(0, 3), ["lead-one-to-ones", "cap-coaching", "lead-delegate-ownership"]);
  assert.deepEqual(labelled(plan.leadYourTeam), ["lead-one-to-ones", "cap-coaching", "lead-delegate-ownership"]);
  assert.equal(plan.leadYourTeam[0].why, "Helps with: Getting the best from my PMs.");
  // Three labels at most, across the whole plan.
  assert.equal(allLabelled(plan).length, 3);
});

test("a Director who's hiring gets the hiring block first", () => {
  const plan = buildPlan({ ...DIRECTOR, challenge: "hiring" }, BLOCKS);
  assert.equal(plan.leadYourTeam[0].id, "cap-hiring-onboarding");
  assert.equal(plan.leadYourTeam[0].helpsChallenge, true);
  assert.ok(allLabelled(plan).length <= 3);
});

test("a VP deciding where people and budget go starts their skills with the business case and decisions", () => {
  const plan = buildPlan({ ...DIRECTOR, level: "vp", challenge: "portfolio" }, BLOCKS);
  assert.deepEqual(plan.skillsStart.map((block) => block.id).slice(0, 2), ["craft-business-case", "craft-decision-making"]);
  assert.ok(plan.skillsStart.slice(0, 2).every((block) => block.helpsChallenge && block.why === "Helps with: Deciding where people and budget go."));
  // On the strategy track, allocating people and budget is on the timeline. It comes as early as
  // it can: straight after the roadmap of bets it depends on.
  const strategy = buildPlan({ ...DIRECTOR, level: "vp", challenge: "portfolio", work: "strategy", stage: "strategy-ready", phase: null, until: null, time: NOT_SURE }, BLOCKS);
  const ids = strategy.phases.flatMap((item) => item.blocks.map((block) => block.id));
  assert.equal(ids.indexOf("strat-portfolio-allocation"), ids.indexOf("strat-roadmap-bets") + 1);
  assert.equal(strategy.phases.flatMap((item) => item.blocks).find((block) => block.id === "strat-portfolio-allocation")?.helpsChallenge, true);
});

test("a leader aligning execs gets the exec skills first, and a senior PM with the same answer doesn't get them pinned", () => {
  const leader = buildPlan({ ...DIRECTOR, challenge: "alignment" }, BLOCKS);
  assert.deepEqual(leader.skillsStart.map((block) => block.id).slice(0, 2), ["craft-exec-communication", "craft-influence"]);
  assert.match(leader.skillsStart[0].why, /Getting execs and other teams behind the direction/);
  const senior = buildPlan({ ...DIRECTOR, level: "senior", challenge: "alignment" }, BLOCKS);
  assert.ok(senior.skillsStart.every((block) => !block.helpsChallenge));
});

test("people leaders get no Refresh the basics, and the summary says product work, not PM type", () => {
  for (const level of LEADERS) {
    const plan = buildPlan({ ...DIRECTOR, level, challenge: NOT_SURE }, BLOCKS);
    assert.deepEqual(plan.refreshBasics, [], level);
    assert.match(plan.who, /Product work: General/);
  }
  const senior = buildPlan({ ...DIRECTOR, level: "senior", challenge: NOT_SURE }, BLOCKS);
  assert.ok(senior.refreshBasics.length > 0);
  assert.match(senior.who, /PM type: General/);
});
