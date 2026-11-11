import { WORK_KIND_IDS, isOneOf } from "../content/taxonomy";
import { trackFor } from "./intake-phases";
import { draftToQuery, parseDraft } from "./intake-url";
import {
  HONEYPOT_FIELD,
  MAX_COMMENT_LENGTH,
  type FeedbackError,
  type PlanCountKind,
  type PlanSummary,
  type Rating,
} from "./feedback-types";

/**
 * Checks what a visitor sends, and returns friendly messages. Pure: no
 * database, no email, no clock, so every rule is tested on its own.
 */

/** A plan's answers are a short query string. Anything longer is not one of ours. */
const MAX_PLAN_LENGTH = 2000;

export type FeedbackValidation =
  | { ok: true; value: { rating: Rating; comment: string | null; planSummary: PlanSummary } }
  | { ok: false; errors: FeedbackError[] }
  /** The honeypot was filled in. Treated as sent, so a bot learns nothing, but never saved. */
  | { ok: "bot" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * The plan's category answers, from its web address. They're read with the same
 * rules as the plan page, so only known ids survive: free text can't get in.
 */
export function summarisePlan(query: unknown): PlanSummary {
  if (typeof query !== "string" || query.length > MAX_PLAN_LENGTH) return {};
  const draft = parseDraft(new URLSearchParams(query.replace(/^.*\?/, "")));
  const summary: PlanSummary = {};
  // draftToQuery writes back only the known answers, in a fixed order.
  for (const [key, value] of new URLSearchParams(draftToQuery(draft))) {
    summary[key] = value.includes(",") ? value.split(",") : value;
  }
  return summary;
}

/** Counts characters as people see them, so an emoji counts as one. */
export function commentLength(comment: string): number {
  return [...comment].length;
}

export function validateFeedback(input: unknown): FeedbackValidation {
  if (!isRecord(input)) return { ok: false, errors: [{ field: "rating", message: "Please choose a rating from 1 to 5 stars." }] };

  const trap = input[HONEYPOT_FIELD];
  if (typeof trap === "string" ? trap.trim() !== "" : trap !== undefined && trap !== null) return { ok: "bot" };

  const errors: FeedbackError[] = [];
  const { rating } = input;
  const validRating = typeof rating === "number" && Number.isInteger(rating) && rating >= 1 && rating <= 5;
  if (!validRating) errors.push({ field: "rating", message: "Please choose a rating from 1 to 5 stars." });

  let comment: string | null = null;
  if (input.comment !== undefined && input.comment !== null) {
    if (typeof input.comment !== "string") {
      errors.push({ field: "comment", message: "Please write your comment as text." });
    } else {
      const trimmed = input.comment.trim();
      const length = commentLength(trimmed);
      if (length > MAX_COMMENT_LENGTH) {
        errors.push({
          field: "comment",
          message: `Please keep your comment to ${MAX_COMMENT_LENGTH.toLocaleString("en-GB")} characters or fewer. It's ${length.toLocaleString("en-GB")} at the moment.`,
        });
      }
      comment = trimmed === "" ? null : trimmed;
    }
  }

  if (errors.length > 0 || !validRating) return { ok: false, errors };
  return { ok: true, value: { rating: rating as Rating, comment, planSummary: summarisePlan(input.plan) } };
}

/** The kind of plan to count. Anything unknown, or "Not sure", counts as a product plan, as the plan page does. */
export function planCountKind(input: unknown): PlanCountKind | null {
  if (!isRecord(input)) return null;
  const { work } = input;
  if (work !== undefined && typeof work !== "string") return null;
  return trackFor(isOneOf(WORK_KIND_IDS, work) ? work : null);
}
