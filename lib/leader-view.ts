import { EMPTY_DRAFT, type IntakeAnswers, type IntakeDraft, type ViewId } from "./intake-types";
import { firstUnansweredStep } from "./intake-validate";
import { startHref } from "./intake-url";
import { trackFor } from "./intake-phases";

/**
 * The rules for the leader view of a plan. Pure, so they're tested without a browser.
 * The leader view is for the product track only: strategy and coaching blocks are
 * already written for the person leading the work.
 */

/** Director and VP lead the work rather than do it, so they start in the leader view. */
const LEADER_BY_DEFAULT: readonly string[] = ["director", "vp"];

/** Group PM still owns product, so it starts hands-on, but the switch sits above the timeline for them. */
const SWITCH_UP_FRONT: readonly string[] = ["group", "director", "vp"];

/** The view the plan opens in when the link doesn't choose one. "Not sure" counts as a product manager. */
export function defaultView(answers: Pick<IntakeAnswers, "level">): ViewId {
  return LEADER_BY_DEFAULT.includes(answers.level) ? "leader" : "hands-on";
}

/** The view a plan uses: the visitor's choice, or else their level's default. Always hands-on off the product track. */
export function viewFor(answers: Pick<IntakeAnswers, "level" | "work" | "view">): ViewId {
  if (trackFor(answers.work) !== "product") return "hands-on";
  return answers.view ?? defaultView(answers);
}

/** True when the view switch sits above the timeline. Otherwise it's in "Your answers". */
export function switchAboveTimeline(answers: Pick<IntakeAnswers, "level" | "work">): boolean {
  return SWITCH_UP_FRONT.includes(answers.level);
}

/** Only the product track has leader views, so only it has a switch. */
export function hasViewSwitch(answers: Pick<IntakeAnswers, "work">): boolean {
  return trackFor(answers.work) === "product";
}

/** The words that change in the leader view. The hands-on wording is unchanged. */
export function viewWords(view: ViewId, isLoop: boolean) {
  if (view === "hands-on") {
    return {
      nextActions: "Your next 3 actions",
      goTo: "Go to this step",
      timing: "Your timing",
      timelineTitle: isLoop ? "Your improvement loop" : "Phase by phase",
      timelineLead: "Open a block to see its steps, who can help and what done looks like.",
    };
  }
  return {
    nextActions: "Your next 3 actions",
    goTo: "Go to this block",
    timing: "Your team's timing",
    timelineTitle: isLoop ? "Your team's improvement loop" : "Your team's work, phase by phase",
    timelineLead: "Use these to check the work is on track. You don't need to do the steps yourself.",
  };
}

/**
 * Where "Build a strategy plan" goes: the intake on the strategy track, with the answers
 * that still apply (level, size and product type) already filled in, at the first question left.
 */
export function strategyPlanHref(answers: Pick<IntakeAnswers, "level" | "size" | "product">): string {
  const draft: IntakeDraft = { ...EMPTY_DRAFT, work: "strategy", level: answers.level, size: answers.size, product: answers.product };
  return startHref(draft, firstUnansweredStep(draft) ?? 1);
}
