import { FEEDBACK_ENABLED, PLAN_COUNTS_ENABLED, type FeedbackError, type FeedbackRecord, type PlanCountKind } from "./feedback-types";
import { planCountKind, validateFeedback } from "./feedback-validate";
import type { RateLimiter } from "./rate-limit";

/**
 * Joins the rules to the database and email. The database, email, limiter and
 * clock are passed in, so every path is tested with stand-ins, and the route
 * passes the real ones.
 */

export type FeedbackDeps = {
  enabled?: boolean;
  /** A hashed network address, held in memory only. */
  visitor: string;
  now: number;
  limiter: RateLimiter;
  pageVersion: string;
  save: (record: FeedbackRecord) => Promise<void>;
  alert: (record: FeedbackRecord) => Promise<void>;
  /** Where problems are noted for Rinaz. Never shown to visitors. */
  log?: (message: string) => void;
};

export type FeedbackResult =
  | { status: "saved"; emailed: boolean }
  /** The honeypot was filled in. The visitor sees thanks, but nothing is saved. */
  | { status: "ignored" }
  | { status: "invalid"; errors: FeedbackError[] }
  | { status: "limited" }
  | { status: "unavailable" }
  | { status: "disabled" };

export async function submitFeedback(input: unknown, deps: FeedbackDeps): Promise<FeedbackResult> {
  if (!(deps.enabled ?? FEEDBACK_ENABLED)) return { status: "disabled" };
  const checked = validateFeedback(input);
  // A bot is turned away before the limit, so it can't use up a real visitor's allowance.
  if (checked.ok === "bot") return { status: "ignored" };
  if (!checked.ok) return { status: "invalid", errors: checked.errors };
  if (!deps.limiter.allow(deps.visitor, deps.now)) return { status: "limited" };

  const record: FeedbackRecord = { ...checked.value, pageVersion: deps.pageVersion };
  try {
    await deps.save(record);
  } catch (error) {
    deps.log?.(`Feedback not saved: ${(error as Error).message}`);
    return { status: "unavailable" };
  }
  // Saved is what matters. If the email fails, the feedback is still in the table.
  try {
    await deps.alert(record);
    return { status: "saved", emailed: true };
  } catch (error) {
    deps.log?.(`Feedback saved, but the alert email failed: ${(error as Error).message}`);
    return { status: "saved", emailed: false };
  }
}

export type PlanCountDeps = {
  enabled?: boolean;
  visitor: string;
  now: number;
  limiter: RateLimiter;
  add: (day: string, kind: PlanCountKind) => Promise<void>;
  log?: (message: string) => void;
};

export type PlanCountResult = { status: "counted" } | { status: "invalid" } | { status: "limited" } | { status: "unavailable" } | { status: "disabled" };

/** The day in UTC, such as "2026-11-11", so counts don't depend on the server's time zone. */
export const dayOf = (now: number) => new Date(now).toISOString().slice(0, 10);

export async function countPlan(input: unknown, deps: PlanCountDeps): Promise<PlanCountResult> {
  if (!(deps.enabled ?? PLAN_COUNTS_ENABLED)) return { status: "disabled" };
  const kind = planCountKind(input);
  if (!kind) return { status: "invalid" };
  if (!deps.limiter.allow(deps.visitor, deps.now)) return { status: "limited" };
  try {
    await deps.add(dayOf(deps.now), kind);
    return { status: "counted" };
  } catch (error) {
    deps.log?.(`Plan not counted: ${(error as Error).message}`);
    return { status: "unavailable" };
  }
}
