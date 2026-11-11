import { NextResponse } from "next/server";
import { FEEDBACK_LIMIT } from "@/lib/feedback-types";
import { sendFeedbackAlert } from "@/lib/feedback-mailer";
import { submitFeedback } from "@/lib/feedback-service";
import { saveFeedback } from "@/lib/feedback-store";
import { createRateLimiter } from "@/lib/rate-limit";
import { pageVersion, readJson, visitorKey } from "@/lib/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One limiter per running copy of the site. See lib/rate-limit.ts.
const limiter = createRateLimiter(FEEDBACK_LIMIT);

/** POST /api/feedback: a rating, an optional comment and the plan's answers. */
export async function POST(request: Request) {
  const body = await readJson(request);
  if (body === undefined) return NextResponse.json({ error: "Please send the feedback as JSON." }, { status: 400 });

  const result = await submitFeedback(body, {
    visitor: visitorKey(request),
    now: Date.now(),
    limiter,
    pageVersion: pageVersion(),
    save: saveFeedback,
    alert: sendFeedbackAlert,
    log: (message) => console.error(message),
  });

  switch (result.status) {
    case "saved":
    case "ignored":
      return NextResponse.json({ ok: true });
    case "invalid":
      return NextResponse.json({ error: "Please fix the following…", errors: result.errors }, { status: 400 });
    case "limited":
      return NextResponse.json({ error: "Thanks, you've sent a lot of feedback in the last hour. Please try again later." }, { status: 429 });
    case "disabled":
      return NextResponse.json({ error: "Feedback is switched off at the moment." }, { status: 503 });
    case "unavailable":
      return NextResponse.json({ error: "Couldn't send that just now. Please try again in a few minutes." }, { status: 503 });
  }
}
