import "server-only";
import type { FeedbackRecord, PlanCountKind } from "./feedback-types";
import { supabaseServer } from "./supabase";

/** Database reads and writes for feedback and plan counts. Nothing else. Every function throws if it can't finish. */

export async function saveFeedback(record: FeedbackRecord): Promise<void> {
  const db = supabaseServer();
  if (!db) throw new Error("Supabase isn't set up: SUPABASE_URL or SUPABASE_SECRET_KEY is missing.");
  const { error } = await db.from("feedback").insert({
    rating: record.rating,
    comment: record.comment,
    plan_summary: record.planSummary,
    page_version: record.pageVersion,
  });
  if (error) throw new Error(`Couldn't save feedback: ${error.message}`);
}

/** Adds one to today's count for this kind of plan, in a single step in the database. */
export async function addPlanCount(day: string, kind: PlanCountKind): Promise<void> {
  const db = supabaseServer();
  if (!db) throw new Error("Supabase isn't set up: SUPABASE_URL or SUPABASE_SECRET_KEY is missing.");
  const { error } = await db.rpc("increment_plan_count", { p_day: day, p_work_kind: kind });
  if (error) throw new Error(`Couldn't count the plan: ${error.message}`);
}
