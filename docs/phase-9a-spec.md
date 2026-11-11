# Phase 9a: Feedback and privacy (APPROVED by Rinaz, 11 November 2026)

## Why
The site has no way to learn whether plans are useful. Phase 9a adds a short feedback form, stores the answers safely, emails Rinaz when feedback arrives, and adds a privacy page. It is the first phase that uses outside services (Supabase and Resend), so it also proves the site can run a real back end.

## Decisions already made
- Rating: 1 to 5 stars for "How useful was this plan?", plus one optional comment box. If the rating is 3 or lower, the prompt becomes "What was missing?".
- Position: at the bottom of the plan page, and shown again after the visitor copies the link or prints the plan.
- Retention: feedback is kept for 12 months, then deleted.
- No names, emails or companies are collected. The form warns visitors not to include personal details.
- Content stays in the code. The database holds only feedback and anonymous plan counts.

## What visitors see
1. **Feedback form** on the plan page: five stars (native radio buttons, keyboard usable, light and dark), an optional comment (max 1,000 characters, with a live count and the warning "Please don't include names, emails or anything that identifies you or your employer"), and a Send button. A hidden honeypot field catches bots.
2. **Thank-you state** after sending. If the service is down, a friendly "Couldn't send that just now" message, and the plan still works.
3. **Privacy page** at /privacy in plain UK English: what is stored (rating, comment, the plan's category answers, date), why, for how long (12 months), who can see it (Rinaz only), which services process it (Supabase in Frankfurt, Resend for the alert email, Vercel for hosting and analytics), and how to ask for deletion (a contact route Rinaz chooses). Link it from the footer.

## What is stored (table: feedback)
id, created_at, rating (1 to 5), comment (optional), plan_summary (the category answers only, such as work kind, level and phase, never free text), page_version. Row Level Security on, no public policies. Writes only through our API route using the secret key.
Anonymous plan counts (table: plan_counts): a counter per day of plans built, by work kind. No visitor identifier.

## How it works
- `POST /api/feedback`: reads JSON safely (400), checks the honeypot, rate-limits (for example 5 per hour per visitor, using a hashed network address held only in memory, never stored), validates, saves to Supabase, sends the alert email through Resend. Validation failures return `{ error: "Please fix the following…", errors: [...] }` with 400.
- If the email fails, the feedback is still saved and the visitor still sees thanks. If the database fails, the visitor sees the friendly error.
- Files follow the project pattern: feedback-types.ts (with FEEDBACK_ENABLED switch), feedback-validate.ts, feedback-store.ts (server-only), feedback-service.ts, tests.
- Deletion after 12 months: a database job or the later weekly workflow. For 9a, document the manual step in docs/ and flag it as NOT automated.

## Environment variables
SUPABASE_URL, SUPABASE_SECRET_KEY, RESEND_API_KEY, FEEDBACK_ALERT_EMAIL (the address that receives alerts, read from the environment, never in code). All server-only, none with NEXT_PUBLIC_. Add them to .env.example with comments. Rinaz sets the same names in Vercel when the live project exists.

## Not in 9a
Email-back option, AI summary, an admin screen for reading feedback (read it in the Supabase table view for now), automated 12-month deletion.

## Acceptance checks
1. Submitting a 5-star rating with no comment saves a row in the dev database and sends an alert email to Rinaz.
2. A rating of 2 shows "What was missing?".
3. A filled honeypot is rejected silently. A sixth submission within the hour is refused politely.
4. A comment over 1,000 characters or an empty rating shows friendly errors.
5. With Supabase unreachable, the plan page still loads and the form shows a friendly error.
6. The form works by keyboard and screen reader, in light and dark, on phone and desktop.
7. The privacy page exists, has a title and description, and is linked from the footer.
8. Row Level Security is on for both tables, and the browser can't read them with the public key.
9. The secret key never appears in browser code or the build output.
10. pnpm test, pnpm validate:content and pnpm build pass.

## Rinaz's set-up before building
Done: Supabase dev project, .env.local with Supabase values, Resend account and API key (confirm saved).
Later, before going live: Supabase live project, Resend live key if needed, Vercel environment variables.

## Addendum: deletion requests
The privacy page tells people to ask for deletion by sending Rinaz a message on LinkedIn (no personal email address on the site). Claude Code asks Rinaz for her LinkedIn profile address while building, and keeps it in one named constant so it is easy to change.
