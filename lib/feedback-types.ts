/**
 * The shapes and switches for feedback and anonymous plan counts (Phase 9a).
 * No names, emails or companies: a rating, an optional comment, and the plan's
 * category answers. See docs/feedback-guide.md and the privacy page.
 */

/** Turn off to hide the feedback form and make /api/feedback refuse everything. */
export const FEEDBACK_ENABLED = true;

/** Turn off to stop counting plans built. */
export const PLAN_COUNTS_ENABLED = true;

/** The longest comment we accept. */
export const MAX_COMMENT_LENGTH = 1000;

/** At this rating or below, the comment prompt asks what was missing. */
export const LOW_RATING = 3;

/** Feedback each visitor can send in a window, and the window's length. */
export const FEEDBACK_LIMIT = { count: 5, windowMs: 60 * 60 * 1000 };

/** Plan counts each visitor can add in a window. Generous, because it's one count per plan built. */
export const PLAN_COUNT_LIMIT = { count: 30, windowMs: 60 * 60 * 1000 };

/** The hidden field bots fill in and people never see. Named like a real field so bots take the bait. */
export const HONEYPOT_FIELD = "website";

export type Rating = 1 | 2 | 3 | 4 | 5;

/** The plan's category answers only, keyed by question, such as { work: "product", level: "senior" }. Never free text. */
export type PlanSummary = Record<string, string | string[]>;

/** What we save: one row in the `feedback` table. */
export type FeedbackRecord = {
  rating: Rating;
  /** Trimmed. Null when left blank. */
  comment: string | null;
  planSummary: PlanSummary;
  /** Which version of the site the visitor used, such as a short commit id. */
  pageVersion: string;
};

/** A field a visitor needs to fix, with a friendly message. */
export type FeedbackError = { field: "rating" | "comment"; message: string };

/** The kinds of plan we count. */
export type PlanCountKind = "product" | "strategy" | "coaching" | "explore";

/** The prompt above the comment box, which changes for a low rating. */
export function commentPrompt(rating: number | null): string {
  return rating !== null && rating <= LOW_RATING ? "What was missing?" : "Anything else you'd like to tell us? (optional)";
}
