# Site review and revised roadmap (8 November 2026)

Claude reviewed the live site after Phase 8a-1 was merged. It walked through the intake, generated plans for four contrasting PMs, and checked a block page, the home page, the Library and phone layouts. Rinaz approved every recommendation on 8 November 2026.

## What works
- The site is fast, clean and accessible. There is no sign-up, and answers live in the URL.
- The blocks are strong. They cite sources and have steps for three levels, "who can do this" with what to do if a role is missing, a definition of done and common pitfalls.
- Every question has a "Not sure" option that explains what happens if you choose it.

## Findings (most important first)
1. **Seniority barely changes the plan.** A Director in a large public-sector organisation got the same hands-on timeline as a PM: set up a dashboard, run A/B tests, write the PRD, test a prototype. The "Experienced" steps are mostly shorter versions of the beginner steps, not harder ones.
2. **There is nothing for people who aren't PMs yet.** Answering "Not sure" everywhere gives an 87-step plan pitched at product manager level.
3. **Plans are long, and the new labels mean little.** Plans run to 30 to 87 timeline steps, plus 7 rituals, plus 9 to 16 skills. "Helps with your challenge" appeared on every Discover block, and its reason line still said "Because your plan covers Discover".
4. **Onboarding blocks appear for every mid-build or live product,** even when the challenge isn't "I'm new".
5. **The team and tools questions are the heaviest to answer** (22 roles and 26 tools) but change the plan the least.
6. **Smaller fixes:**
   - The next-actions line "From your last release, find: <block title>" reads badly.
   - A live product's timeline runs "from Measure and improve to Design" in a straight line, when the work is really a loop.
   - On a phone, the Library's five filters fill the first screen.
   - The home page shows neither an example plan nor who the site is for.
   - Some add-ons are UK-specific but aren't labelled as UK guidance.
7. **There is no feedback,** so we can't tell whether plans are useful.

## Decisions (approved by Rinaz, 8 November 2026)
- People exploring the role are in scope. They get a new "Learn the role" path.
- For Group PM, Director and VP levels, plans are about leading the work, not doing it. They get a "leader view" of each timeline block.
- The team and tools questions move out of the intake into an optional "Tailor your plan" panel on the plan page. The intake goes from 11 questions to 9.
- UK-specific blocks are labelled "UK guidance" now. A country question comes later, and only if feedback asks for it.
- Feedback comes earlier, before the big content work.

## Revised roadmap
| Phase | What it covers |
|---|---|
| 8a-2: Focus the plan | Fewer, clearer labels. The top 3 skills, with "See more". Onboarding only when you're new. Team rhythm collapsed. The self-check. "Already done" and "Not relevant". The "Tailor your plan" panel. The wording and live-loop fixes. |
| 8a-3: First impressions | A home page "See an example plan" link and a "Built for" strip. Library filters folded away on phones. "UK guidance" labels. |
| 8b: Plans for leaders | A leader view of each timeline block for Group PM and above: what good looks like, questions to ask your PM, and warning signs. Timeline blocks become "make sure this is done well". |
| 8c: Learn the role | "I'm exploring the role" as an answer to question 1. About 4 questions, then a short path: what PMs do, the core skills, a practice project, and how to get a first PM role. |
| 9a: Feedback and privacy | "Was this plan useful? Yes / No", plus an optional comment with a warning not to include personal details. Saved to Supabase, emailed via Resend, with a privacy page. Needs Rinaz to set up her accounts. |
| 8d: Content pass | Rewrite "Experienced" steps so they are harder, not shorter. Add more Design-skill blocks (only 12 today). Add next-level notes. |
| 9b: Case study | How I built this, the public decision log, and SEO polish. |
| 10 | AI personal summary, as before. |
| 11 | Weekly AI content check, as before. |
