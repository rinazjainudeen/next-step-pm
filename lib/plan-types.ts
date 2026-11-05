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
  /** Onboarding blocks. They run alongside the timeline. */
  getUpToSpeed: PlanBlock[];
  phases: PlanPhase[];
  /** Ways-of-working blocks. They recur, so they sit outside the timeline. */
  rhythm: PlanBlock[];
  /** Craft blocks limited to the visitor's level, most specific first. Outside the timeline. */
  skillsForLevel: PlanBlock[];
  /** Craft blocks for every level. Their steps are still shaped to the visitor. */
  skillsAnyLevel: PlanBlock[];
};
