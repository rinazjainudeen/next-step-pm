import type { ExploreGoalId } from "./taxonomy";

/**
 * Which of the 18 explore blocks each goal gets. "Not sure" is the fifth entry.
 * The same lists are in docs/phase-8c-goal-map.json, and a test checks that they agree.
 * Four reused blocks (Build technical fluency, Write clearly, Answer your own questions
 * with data, Get up to speed on an existing product) join through `alsoIn` instead, as
 * "Go further", in whichever of their phases the goal covers.
 */
export const EXPLORE_GOAL_BLOCKS: Record<ExploreGoalId | "not-sure", readonly string[]> = {
  understand: ["xr-what-pms-do", "xr-is-pm-for-me", "xr-pm-types-companies", "xr-talk-to-pms", "xr-map-your-skills", "xr-product-process", "xr-numbers-for-pms", "xr-ai-tools-for-learning"],
  "work-with-pms": ["xr-what-pms-do", "xr-pm-types-companies", "xr-talk-to-pms", "xr-product-process", "xr-numbers-for-pms"],
  "internal-move": [
    "xr-what-pms-do", "xr-is-pm-for-me", "xr-pm-types-companies", "xr-talk-to-pms",
    "xr-map-your-skills", "xr-product-process", "xr-numbers-for-pms", "xr-ai-tools-for-learning",
    "xr-choose-practice-project", "xr-run-mini-discovery", "xr-brief-and-prioritise", "xr-define-success-test", "xr-portfolio-case-study", "xr-get-feedback",
    "xr-internal-move", "xr-find-entry-routes", "xr-product-cv", "xr-interview-prep",
  ],
  "first-job": [
    "xr-what-pms-do", "xr-is-pm-for-me", "xr-pm-types-companies", "xr-talk-to-pms",
    "xr-map-your-skills", "xr-product-process", "xr-numbers-for-pms", "xr-ai-tools-for-learning",
    "xr-choose-practice-project", "xr-run-mini-discovery", "xr-brief-and-prioritise", "xr-define-success-test", "xr-portfolio-case-study", "xr-get-feedback",
    "xr-find-entry-routes", "xr-product-cv", "xr-interview-prep",
  ],
  "not-sure": [
    "xr-what-pms-do", "xr-is-pm-for-me", "xr-pm-types-companies", "xr-talk-to-pms",
    "xr-map-your-skills", "xr-product-process", "xr-numbers-for-pms", "xr-ai-tools-for-learning",
    "xr-choose-practice-project", "xr-run-mini-discovery", "xr-brief-and-prioritise", "xr-define-success-test", "xr-portfolio-case-study", "xr-get-feedback",
  ],
};
