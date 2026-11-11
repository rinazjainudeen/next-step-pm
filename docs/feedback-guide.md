# Feedback: set-up, reading it and deleting it

Written for Rinaz. Phase 9a added a feedback form to every plan, an alert email, anonymous counts of plans built and a privacy page. This guide covers the two outside services (Supabase and Resend), how to read feedback, and the one job that is **not automated yet**: deleting feedback after 12 months.

## What goes where

| Thing | Where it lives |
|---|---|
| Ratings, comments, plan answers | Supabase, table `feedback` |
| Plans built per day, by kind | Supabase, table `plan_counts` |
| Alert email | Resend sends it to `FEEDBACK_ALERT_EMAIL` |
| Settings and keys | `.env.local` on your laptop, and Vercel's Environment Variables for the live site |

No names, emails, companies or network addresses are stored. The rate limit uses a scrambled network address held in the server's memory for up to an hour.

## 1. Supabase (the database)

You have two projects: **dev** for your laptop and, later, **live** for the real site. Never point your laptop at the live project.

### Create the tables (once per project)
1. Open supabase.com, sign in and choose the project (dev first).
2. In the left menu, choose **SQL Editor**, then **New query**.
3. Open `docs/supabase-tables.sql` in VS Code, copy all of it and paste it into the editor.
4. Press **Run**. You should see "Success. No rows returned".

### Check public access is off
Your project has "Automatically expose new tables" ticked, which gives the public roles access to new tables. The SQL takes it away again. To check:
1. In SQL Editor, choose **New query** again, paste all of `docs/supabase-check.sql` and press **Run**.
2. You should see three results:
   - **A:** both tables with `rls_on` = true.
   - **B:** no rows. Any row here means the public can still reach a table: run `docs/supabase-tables.sql` again.
   - **C:** both columns false.
3. In **Table Editor**, both tables should show a padlock or "RLS enabled".

For a second check from the laptop, add `SUPABASE_PUBLISHABLE_KEY` to `.env.local` (Project Settings > API Keys > Publishable key; it's public by design) and run `pnpm check:supabase`. Every line should say OK.

### Settings
In `.env.local` (and later in Vercel), set `SUPABASE_URL` and `SUPABASE_SECRET_KEY`. Both come from Project Settings in Supabase. The secret key can do anything in the database, so it only ever goes in `.env.local` or Vercel, never in the chat, the code or GitHub.

## 2. Resend (the alert email)

1. At resend.com, open **API Keys** and create a key with "Sending access" only. Put it in `RESEND_API_KEY`.
2. Put your own address in `FEEDBACK_ALERT_EMAIL`.
3. Until you verify a domain, Resend only delivers to the address you signed up to Resend with. Use that address. The emails come from `onboarding@resend.dev`.
4. If an email doesn't arrive, check **Emails** in Resend: it shows each send and any error. The feedback is still saved even when the email fails.

## 3. Reading feedback

There's no admin screen yet. In Supabase, open **Table Editor** > `feedback`. Each row has the date, rating, comment, the plan's answers (`plan_summary`) and the site version. You can sort by `created_at` or `rating`, or filter by rating. `plan_counts` has one row per day and kind of plan.

## 4. Deleting feedback after 12 months: NOT automated

The privacy page promises feedback is deleted after 12 months. **Nothing does this automatically yet.** Set a monthly reminder, then:
1. Open the **live** project's SQL Editor.
2. Run:
   ```sql
   delete from public.feedback where created_at < now() - interval '12 months';
   ```
3. It reports how many rows were deleted.

This will move to the weekly workflow or a scheduled database job later.

### A deletion request
If someone asks on LinkedIn, find their row in Table Editor by the date and words they give you, tick it and choose **Delete**. Reply to say it's done.

## 5. Going live (later)
1. Create the live Supabase project in Frankfurt and run `docs/supabase-tables.sql` and `docs/supabase-check.sql` there.
2. In Vercel > Project > Settings > Environment Variables, add `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (from the **live** project), `RESEND_API_KEY` and `FEEDBACK_ALERT_EMAIL`, for Production only. Don't add `SUPABASE_PUBLISHABLE_KEY`.
3. Redeploy, send one piece of feedback and check the row and the email arrive.

## Switching it off
`FEEDBACK_ENABLED` and `PLAN_COUNTS_ENABLED` in `lib/feedback-types.ts` turn each part off. With feedback off, the form disappears and `/api/feedback` refuses everything. If the settings are missing, the form shows "Couldn't send that just now" and the plan still works.
