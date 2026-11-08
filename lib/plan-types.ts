import type { KindId, PhaseId } from "../content/taxonomy";

/** The shapes of a finished plan. Plain data, so a page can pass it to the browser. */

export type PlanStep = {
  /** Stable, so a tick stays with its step. Includes the experience level. */
  id: string;
  text: string;
};

/** One delegable task, shaped to the visitor's team. */
export type PlanTask = {
  roleLabel: string;
  task: string;
  inTeam: boolean;
  /** For example "Ask your Business Analyst" or "No QA / Tester in your team". */
  who: string;
  /** What to do about a missing role. Absent when the role is in the team. */
  note?: string;
};

export type PlanToolExample = { toolLabel: string; tip: string };

export type PlanBlock = {
  id: string;
  title: string;
  summary: string;
  kind: KindId;
  /** A "Go further" block: extra, and not counted in the timing or next actions. */
  optional?: boolean;
  /** This matters more at the visitor's size of organisation, so it comes early. */
  movedUp?: boolean;
  /** Builds a skill the visitor's challenge favours, so it comes as early as its order allows. */
  helpsChallenge?: boolean;
  effort: string;
  /** The short "why you're seeing this". */
  why: string;
  steps: PlanStep[];
  tasks: PlanTask[];
  reviewers: string[];
  /** The visitor's tools only. Empty means `toolTip` is shown instead. */
  tools: PlanToolExample[];
  toolTip?: string;
  definitionOfDone: string[];
  pitfalls: string[];
  /** Earlier work this builds on that isn't an earlier task in this plan. */
  checkFirst: { id: string; title: string }[];
};

export type PlanPhase = {
  id: PhaseId;
  label: string;
  readyWhen: string;
  /** For example "Week 1" or "Weeks 2 to 4". */
  weeks: string;
  /** Something to know about how this phase's length was worked out. */
  note?: string;
  blocks: PlanBlock[];
};

export type PaceStatus = "tight" | "fits" | "spare" | "open";

export type PlanPace = { status: PaceStatus; message: string };

export type PlanAction = { blockId: string; blockTitle: string; text: string };

export type Plan = {
  who: string;
  where: string;
  nextActions: PlanAction[];
  /** Earlier work the next actions rely on, done before this plan's timeline reaches them. */
  checkBeforeActions: PlanBlock["checkFirst"];
  /** The words that introduce `checkBeforeActions`. */
  checkBeforeLabel: string;
  pace: PlanPace;
  /** Onboarding blocks, shown collapsed. They run alongside the timeline. */
  getUpToSpeed: PlanBlock[];
  phases: PlanPhase[];
  /** Ways-of-working blocks. Product track only, and only team-free ones with no team roles. */
  rhythm: PlanBlock[];
  /** Blocks for people leaders, outside the timeline. Never repeats a block on the timeline. */
  leadYourTeam: PlanBlock[];
  /** Suggests a strategy or coaching plan to people leaders on the product track. */
  leaderNudge: boolean;
  /** Two sentences for the top of the plan: the level, then the PM type or track. */
  openingLine: string;
  /** "I'm new" puts the new-to-product section first, and open. */
  newToProductFirst: boolean;
  /** "Grow into a bigger role" puts Grow your skills above the timeline. */
  skillsFirst: boolean;
  /** Basics for levels below the visitor's. A level never removes a block, so they're kept here. */
  refreshBasics: PlanBlock[];
  /** Craft blocks limited to the visitor's level, most specific first. Outside the timeline. */
  skillsForLevel: PlanBlock[];
  /** Craft blocks for every level. Their steps are still shaped to the visitor. */
  skillsAnyLevel: PlanBlock[];
};
