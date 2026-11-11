import assert from "node:assert/strict";
import { test } from "node:test";
import { DELETION_CONTACT_IS_PLACEHOLDER, DELETION_CONTACT_URL } from "./contact";
import { feedbackAlertEmail } from "./feedback-alert";
import { countPlan, dayOf, submitFeedback, type FeedbackDeps, type PlanCountDeps } from "./feedback-service";
import { FEEDBACK_LIMIT, HONEYPOT_FIELD, LOW_RATING, MAX_COMMENT_LENGTH, commentPrompt, type FeedbackRecord, type PlanCountKind } from "./feedback-types";
import { commentLength, planCountKind, summarisePlan, validateFeedback } from "./feedback-validate";
import { FOOTER_LINKS, PAGE_LINKS } from "./navigation";
import { createRateLimiter } from "./rate-limit";

const PLAN = "work=product&pm=general&level=senior&product=b2b&size=scaling&stage=mid-build&phase=build&challenge=measurement&time=1-3m&until=measure&way=scrum";
const HOUR = 60 * 60 * 1000;

/** Stand-ins for the database and email, which record what they were asked to do. */
function fakes(overrides: Partial<FeedbackDeps> = {}) {
  const saved: FeedbackRecord[] = [];
  const emailed: FeedbackRecord[] = [];
  const logged: string[] = [];
  const deps: FeedbackDeps = {
    visitor: "visitor-a",
    now: 0,
    limiter: createRateLimiter(FEEDBACK_LIMIT),
    pageVersion: "test",
    save: async (record) => void saved.push(record),
    alert: async (record) => void emailed.push(record),
    log: (message) => void logged.push(message),
    ...overrides,
  };
  return { deps, saved, emailed, logged };
}

// ---- Checking what a visitor sends ----

test("a rating from 1 to 5 is accepted, with or without a comment", () => {
  for (const rating of [1, 2, 3, 4, 5]) {
    const result = validateFeedback({ rating });
    assert.ok(result.ok === true && result.value.rating === rating && result.value.comment === null, String(rating));
  }
  const result = validateFeedback({ rating: 4, comment: "  Clear and useful.  " });
  assert.ok(result.ok === true);
  assert.equal(result.value.comment, "Clear and useful.");
});

test("a missing or impossible rating gets a friendly message", () => {
  for (const rating of [undefined, null, 0, 6, 2.5, "5", Number.NaN]) {
    const result = validateFeedback({ rating });
    assert.ok(result.ok === false, String(rating));
    assert.deepEqual(result.errors, [{ field: "rating", message: "Please choose a rating from 1 to 5 stars." }]);
  }
  assert.equal(validateFeedback(null).ok, false);
  assert.equal(validateFeedback("five stars").ok, false);
  assert.equal(validateFeedback([5]).ok, false);
});

test("a comment over 1,000 characters is refused with the count, and exactly 1,000 is fine", () => {
  assert.equal(MAX_COMMENT_LENGTH, 1000);
  assert.equal(validateFeedback({ rating: 3, comment: "a".repeat(1000) }).ok, true);
  const result = validateFeedback({ rating: 3, comment: "a".repeat(1001) });
  assert.ok(result.ok === false);
  assert.deepEqual(result.errors, [{ field: "comment", message: "Please keep your comment to 1,000 characters or fewer. It's 1,001 at the moment." }]);
  // Spaces at either end don't count, and an emoji counts as one character, as people see it.
  assert.equal(validateFeedback({ rating: 3, comment: `  ${"a".repeat(1000)}  ` }).ok, true);
  assert.equal(commentLength("👍🏽"), 2);
  assert.equal(commentLength("é"), 1);
});

test("both problems are reported together", () => {
  const result = validateFeedback({ comment: "a".repeat(1200) });
  assert.ok(result.ok === false);
  assert.deepEqual(result.errors.map((error) => error.field), ["rating", "comment"]);
});

test("a comment must be text, and a blank one counts as none", () => {
  const notText = validateFeedback({ rating: 5, comment: { text: "hi" } });
  assert.ok(notText.ok === false && notText.errors[0].field === "comment");
  const blank = validateFeedback({ rating: 5, comment: "   " });
  assert.ok(blank.ok === true && blank.value.comment === null);
});

test("a filled-in honeypot is treated as a bot, whatever else is sent", () => {
  assert.equal(HONEYPOT_FIELD, "website");
  assert.deepEqual(validateFeedback({ rating: 5, website: "https://spam.example" }), { ok: "bot" });
  assert.deepEqual(validateFeedback({ rating: 99, website: "x" }), { ok: "bot" });
  assert.equal(validateFeedback({ rating: 5, website: "" }).ok, true);
  assert.equal(validateFeedback({ rating: 5, website: "   " }).ok, true);
});

test("the plan summary keeps category answers only, so free text can never get in", () => {
  const summary = summarisePlan(PLAN);
  assert.deepEqual(summary, {
    work: "product",
    pm: "general",
    level: "senior",
    product: "b2b",
    size: "scaling",
    stage: "mid-build",
    phase: "build",
    challenge: "measurement",
    time: "1-3m",
    until: "measure",
    way: "scrum",
  });
  // Unknown fields and made-up values are dropped.
  const sneaky = summarisePlan("level=senior&comment=Jane+at+Acme&email=jane@example.com&pm=ai,growth,Jane&product=Acme");
  assert.deepEqual(sneaky, { pm: ["growth", "ai"], level: "senior" });
  // A full address works too, and junk gives an empty summary.
  assert.deepEqual(summarisePlan(`https://next-step-pm.vercel.app/plan?${PLAN}`), summary);
  assert.deepEqual(summarisePlan(undefined), {});
  assert.deepEqual(summarisePlan(42), {});
  assert.deepEqual(summarisePlan(`level=senior&x=${"a".repeat(3000)}`), {});
});

test("an explore plan's answers are kept too", () => {
  assert.deepEqual(summarisePlan("work=explore&background=engineering&goal=first-job&hours=3-6"), { work: "explore", background: "engineering", goal: "first-job", hours: "3-6" });
});

test("a rating of 3 or lower asks what was missing", () => {
  assert.equal(LOW_RATING, 3);
  for (const rating of [1, 2, 3]) assert.equal(commentPrompt(rating), "What was missing?");
  for (const rating of [4, 5, null]) assert.equal(commentPrompt(rating), "Anything else you'd like to tell us? (optional)");
});

// ---- The limit on how often one visitor can send ----

test("five sends an hour are allowed, the sixth is refused, and the window moves on", () => {
  const limiter = createRateLimiter({ count: 5, windowMs: HOUR });
  for (let i = 0; i < 5; i += 1) assert.equal(limiter.allow("a", i * 1000), true);
  assert.equal(limiter.allow("a", 10_000), false);
  // Someone else isn't affected.
  assert.equal(limiter.allow("b", 10_000), true);
  // An hour after the first send, one more is allowed.
  assert.equal(limiter.allow("a", HOUR), true);
  assert.equal(limiter.allow("a", HOUR + 1), false);
});

test("a refused attempt doesn't count against the visitor", () => {
  const limiter = createRateLimiter({ count: 1, windowMs: HOUR });
  assert.equal(limiter.allow("a", 0), true);
  for (let i = 1; i < 10; i += 1) assert.equal(limiter.allow("a", i), false);
  assert.equal(limiter.allow("a", HOUR), true);
});

// ---- Sending feedback ----

test("5 stars with no comment is saved and emailed", async () => {
  const { deps, saved, emailed } = fakes();
  const result = await submitFeedback({ rating: 5, website: "", plan: PLAN }, deps);
  assert.deepEqual(result, { status: "saved", emailed: true });
  assert.equal(saved.length, 1);
  assert.deepEqual(saved[0], { rating: 5, comment: null, planSummary: summarisePlan(PLAN), pageVersion: "test" });
  assert.deepEqual(emailed, saved);
});

test("a bot is thanked but nothing is saved, emailed or counted against the limit", async () => {
  const { deps, saved, emailed } = fakes({ limiter: createRateLimiter({ count: 1, windowMs: HOUR }) });
  assert.deepEqual(await submitFeedback({ rating: 5, website: "spam" }, deps), { status: "ignored" });
  assert.deepEqual(saved, []);
  assert.deepEqual(emailed, []);
  assert.equal((await submitFeedback({ rating: 5 }, deps)).status, "saved");
});

test("a sixth send within the hour is refused politely", async () => {
  const { deps, saved } = fakes();
  for (let i = 0; i < 5; i += 1) assert.equal((await submitFeedback({ rating: 4 }, { ...deps, now: i })).status, "saved");
  assert.deepEqual(await submitFeedback({ rating: 4 }, { ...deps, now: 10 }), { status: "limited" });
  assert.equal(saved.length, 5);
});

test("mistakes are reported, and don't use up the limit", async () => {
  const { deps, saved } = fakes({ limiter: createRateLimiter({ count: 1, windowMs: HOUR }) });
  const result = await submitFeedback({ comment: "a".repeat(1001) }, deps);
  assert.equal(result.status, "invalid");
  assert.ok(result.status === "invalid" && result.errors.length === 2);
  assert.equal(saved.length, 0);
  assert.equal((await submitFeedback({ rating: 2 }, deps)).status, "saved");
});

test("if the database is down, the visitor sees the friendly error and no email is sent", async () => {
  const { deps, emailed, logged } = fakes({ save: async () => Promise.reject(new Error("connection refused")) });
  assert.deepEqual(await submitFeedback({ rating: 5 }, deps), { status: "unavailable" });
  assert.deepEqual(emailed, []);
  assert.match(logged[0], /connection refused/);
});

test("if only the email fails, the feedback is still saved and the visitor still sees thanks", async () => {
  const { deps, saved, logged } = fakes({ alert: async () => Promise.reject(new Error("bad key")) });
  assert.deepEqual(await submitFeedback({ rating: 1, comment: "Too long" }, deps), { status: "saved", emailed: false });
  assert.equal(saved.length, 1);
  assert.match(logged[0], /saved, but the alert email failed: bad key/);
});

test("switched off, feedback is refused before anything else happens", async () => {
  const { deps, saved } = fakes({ enabled: false });
  assert.deepEqual(await submitFeedback({ rating: 5 }, deps), { status: "disabled" });
  assert.equal(saved.length, 0);
});

test("the alert email shows the rating, comment and plan answers as plain text", () => {
  const email = feedbackAlertEmail({ rating: 2, comment: "Missing <b>examples</b>", planSummary: { work: "product", pm: ["ai", "growth"] }, pageVersion: "abc1234" });
  assert.equal(email.subject, "New feedback: 2 out of 5");
  assert.match(email.text, /Rating: ★★☆☆☆ \(2 out of 5\)/);
  assert.match(email.text, /Missing <b>examples<\/b>/);
  assert.match(email.text, / {2}pm: ai, growth/);
  assert.match(email.text, /Site version: abc1234/);
  const empty = feedbackAlertEmail({ rating: 5, comment: null, planSummary: {}, pageVersion: "local" });
  assert.match(empty.text, /Comment:\n\(none\)/);
  assert.match(empty.text, /Plan answers:\n {2}\(none\)/);
});

// ---- Counting plans ----

test("plans are counted by kind, with Not sure and unknown kinds as product plans", () => {
  assert.equal(planCountKind({ work: "explore" }), "explore");
  assert.equal(planCountKind({ work: "strategy" }), "strategy");
  assert.equal(planCountKind({ work: "coaching" }), "coaching");
  assert.equal(planCountKind({ work: "product" }), "product");
  assert.equal(planCountKind({ work: "not-sure" }), "product");
  assert.equal(planCountKind({}), "product");
  assert.equal(planCountKind({ work: "<script>" }), "product");
  assert.equal(planCountKind({ work: 3 }), null);
  assert.equal(planCountKind("explore"), null);
});

test("a plan built adds one to today's count, in UTC", async () => {
  const added: [string, PlanCountKind][] = [];
  const deps: PlanCountDeps = { visitor: "a", now: Date.UTC(2026, 10, 11, 23, 30), limiter: createRateLimiter({ count: 2, windowMs: HOUR }), add: async (day, kind) => void added.push([day, kind]) };
  assert.deepEqual(await countPlan({ work: "explore" }, deps), { status: "counted" });
  assert.deepEqual(added, [["2026-11-11", "explore"]]);
  assert.equal(dayOf(Date.UTC(2026, 0, 1)), "2026-01-01");
  assert.deepEqual(await countPlan({ work: 7 }, deps), { status: "invalid" });
  assert.deepEqual(await countPlan({ work: "product" }, deps), { status: "counted" });
  assert.deepEqual(await countPlan({ work: "product" }, deps), { status: "limited" });
  assert.deepEqual(await countPlan({ work: "product" }, { ...deps, enabled: false }), { status: "disabled" });
  assert.deepEqual(await countPlan({ work: "product" }, { ...deps, visitor: "b", add: async () => Promise.reject(new Error("down")) }), { status: "unavailable" });
});

// ---- The privacy page ----

test("the privacy page is linked from the footer only, and its deletion route is one LinkedIn address", (t) => {
  assert.ok(FOOTER_LINKS.some((link) => link.href === "/privacy" && link.available));
  assert.ok(!PAGE_LINKS.some((link) => link.href === "/privacy"));
  assert.match(DELETION_CONTACT_URL, /^https:\/\/www\.linkedin\.com\/in\//);
  if (DELETION_CONTACT_IS_PLACEHOLDER) t.diagnostic("REMINDER: lib/contact.ts still has a placeholder LinkedIn address.");
});
