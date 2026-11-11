import { NextResponse } from "next/server";
import { PLAN_COUNT_LIMIT } from "@/lib/feedback-types";
import { countPlan } from "@/lib/feedback-service";
import { addPlanCount } from "@/lib/feedback-store";
import { createRateLimiter } from "@/lib/rate-limit";
import { readJson, visitorKey } from "@/lib/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const limiter = createRateLimiter(PLAN_COUNT_LIMIT);

/** POST /api/plan-count: adds one to today's count for a kind of plan. No visitor details are stored. */
export async function POST(request: Request) {
  const body = await readJson(request, 500);
  if (body === undefined) return NextResponse.json({ error: "Please send the kind of plan as JSON." }, { status: 400 });

  const result = await countPlan(body, { visitor: visitorKey(request), now: Date.now(), limiter, add: addPlanCount, log: (message) => console.error(message) });
  if (result.status === "counted" || result.status === "disabled") return NextResponse.json({ ok: true });
  if (result.status === "invalid") return NextResponse.json({ error: "Please fix the following…", errors: [{ field: "work", message: "That isn't a kind of plan." }] }, { status: 400 });
  if (result.status === "limited") return NextResponse.json({ error: "Too many plans counted from here in the last hour." }, { status: 429 });
  return NextResponse.json({ error: "Couldn't count that just now." }, { status: 503 });
}
