# Next Step PM: plan

## First version (agreed 4 November 2026)

- **Goal:** a working, public product that shows hiring managers that Rinaz can ship an AI-assisted product to production, and that real PMs find useful.
- **Audience:** hiring managers for AI PM and AI Builder roles first, then product managers of every level, then colleagues.
- **Main action:** "Build my plan": answer 9 questions and get a tailored, step-by-step curriculum.
- **Pages:** Home · Build my plan (intake) · Your plan · Library (all blocks) · How I built this · Decision log · Privacy.
- **Tier:** Standard, with no visitor accounts.
  - Content lives in the code.
  - Supabase stores feedback, ratings and anonymous plan counts.
  - Resend emails Rinaz when feedback arrives.
  - AI comes in phases 10 and 11.
- **Cost:** about £0 a month on Vercel Hobby, Supabase Free and Resend Free, plus AI usage capped at about £5 a month from phase 10. A domain (about £10 a year) is optional.
- **Not in this version:** visitor accounts, saved progress across devices, payments, a team or manager mode, editing content in an admin screen.

## How we'll know it works

- About 25 people complete the intake and get a plan.
- At least 10 rate their plan "useful" (one-click rating on the plan page).
- 5 people leave written feedback.
- The site stays live with no errors for a month.
- Hiring managers can understand the product and how it was built in under 2 minutes, from the home page plus "How I built this".

## Phases

Each phase ends with Rinaz testing it in the browser, then a pull request, a Vercel preview and a merge.

### Phase 1: Skeleton and first deploy
Set up accounts (GitHub repo `next-step-pm`, Vercel linked to it). Create the Next.js project with the full tech stack. Add the design tokens (navy and cyan, light and dark), header, footer, theme toggle, skip link and home page with hero, stats band and "how it works". Add `lib/navigation.ts`, the SEO basics and Vercel Analytics, then deploy to `next-step-pm.vercel.app`.
**Check:** open the live link on a phone and a laptop, switch to dark mode and tab through the page with the keyboard.

### Phase 2: Content model and first blocks
Build `content/taxonomy.ts`, `lib/blocks-types.ts`, `lib/blocks-validate.ts`, `pnpm validate:content` and their tests. Build a **Library** page to browse and filter blocks by phase, PM type, kind and way of working, with a page for each block.

**Change agreed 4 November 2026:** Rinaz drafts the first 12 blocks in a separate planning chat, so Claude Code does **not** write block content in Phase 2. Claude Code adds 2 clearly marked placeholder blocks so the Library can be tested. When Rinaz brings the 12 blocks, Claude Code adds them to `content/blocks/` and fixes anything the validator flags. The 12 should cover all 8 phases and include at least one ways-of-working block, so the engine has something real to work with.

**Also changed the same day:** the full library is now planned at about **90 blocks** (see Phase 5), and there is a new block kind, **ways-of-working**. Its `phase` can be one phase, a list or `"any"`, and blocks carry `appliesTo.waysOfWorking` (scrum, kanban, hybrid) to match the intake question "How does your team work?".

**Check:** filter the library by phase, PM type, kind and way of working, and open a block.

### Phase 3: The intake
Eight questions, one per screen, with a progress bar, Back and Next, and "Not sure" options. Answers are kept in the URL (`lib/intake-url.ts`, tested).

**Added 4 November 2026:** a stand-in `/plan` page that shows the visitor's answers and says the plan isn't built yet, so the last button doesn't lead to a 404. Phase 4 replaces it.

**Check:** answer every question, press Back, refresh the page, and confirm the answers are still there.

### Phase 4: The curriculum engine and plan page
Build `lib/curriculum-engine.ts` with full tests. The plan page shows a summary, the next 3 actions, a timeline by phase or week, block cards with delegation and tool examples, and "why you're seeing this". It also has tick-boxes saved in the browser, a copy-link button and a print/PDF view.
**Check:** create two very different profiles and confirm the plans differ in the expected ways.

**Not included:** the feedback rating (Phase 9).

### Phase 5: Full content

**Quality checks:** `lib/plan-logic.test.ts` checks every new block automatically. After each big batch of blocks, and fully before launch, a QA agent also reads sample plans in full, because tests can't judge whether a plan makes sense to a PM.
Research and draft the remaining blocks, to about **90 in total** (the plan said 40 to 50 until 4 November 2026). The target mix is:

| Kind | Blocks |
|---|---|
| Core lifecycle | about 40 |
| Ways of working | about 15 |
| PM-type add-ons | about 15 |
| Product-type add-ons | about 12 |
| Onboarding | about 8 |

Rinaz reviews them in batches. Roughly doubling the content also roughly doubles the research and review work, so this phase may be split into 5a and 5b (for example core lifecycle first, then the rest). We decide when we get there. Who drafts the remaining blocks is also decided then.
**Check:** Rinaz reads each batch of blocks in the library and approves them.

### Phase 6: Home page wording
Clear up the purpose on the home page: the headline, subtitle, search description, stats band, the "How it works" lead and the title of step 1. The stats band keeps "3 experience levels" until Phase 7 goes live, so the site never claims something it doesn't yet do.

**Check:** read the home page in light and dark mode, on a phone and a laptop.

### Phase 7a: Intake v2 and engine
The intake moves to the ten questions in the replan of 5 November 2026.
- Questions 2, 3 and 5 updated: PM types, what you own, and company size.
- The 20 blocks of batch 1 from Phase 7b, which need the new PM types and sizes.
- A Hardware / manufacturing engineer team role.
- Up to two PM types.
- The career-level mapping and the "leads people" flag.
- The fundamentals rule and the "Refresh the basics" section.
- Old links still work.
- Question 1 ("kind of work") is built but switched off, until the track content exists.
- The stats band updates to: 120 blocks, 6 career levels and 20 team roles. Only roles that exist are counted.
- "Lead your team" is built, and stays hidden until the 7b blocks exist.

**Check:** open an old shared plan link, then build a plan at each career level, with two PM types.

### Phase 7b: Strategy and coaching tracks
The strategy and coaching tracks, each with their own phases and starting-point question, and 33 new blocks, taking the library to 153:

| Content | New blocks |
|---|---|
| Strategy track | 15 |
| Executive communication craft block | 1 |
| Coaching track | 15 |
| Leads-people add-ons | 2 |
| **Total** | **33** |

Two new team roles: Senior leader or sponsor, and People or HR partner. Existing blocks are reused on the tracks with `alsoIn`. Question 1 is switched on, and the stats band updates to match.

**Check:** build a strategy plan and a coaching plan from each starting point, and read the new blocks in the library.

### Phase 7c: Usefulness check (done in chat, 6 November 2026)
The live engine was run on 30 realistic profiles across all three tracks, six levels, eight PM types, four sizes and every stage. Every plan was valid, but some weren't useful: plans were long (median about 45 items), everyone on a live or part-built product got onboarding, strategy and coaching plans listed Scrum rituals, solo PMs got team rituals, leaders lost "Lead your team" off the product track, and personalisation was thin. It produced the Phase 7d fixes and no code. Long plans and thin personalisation went to Phase 8a, and single-product steps for Directors and VPs to 8b.

### Phase 7d: Plan fixes
Five small fixes from the usefulness check of 6 November 2026: a collapsed "If you're new to this product" section, a rhythm section that only shows when it applies, "Lead your team" on every track, a nudge for people leaders, and two wording fixes.

**Check:** the acceptance list in the usefulness check.

### Phase 8a-1: Skills, your challenge and a shorter-feeling plan
Approved by Rinaz on 7 November 2026. The full spec is in `docs/phase-8a-spec.md`.
- Ten PM skills, with one to three tagged on every block, shown on block cards and filterable in the Library.
- A new intake question: "What's your biggest challenge right now?" Blocks that build the skills it favours move as early as their order allows, marked "Helps with your challenge", and the next 3 actions start there. "I'm new…" opens the new-to-product section and puts it first. "Grow into a bigger role" moves "Grow your skills" above the timeline.
- Only the current phase is open, with an "Open all phases" button. Print shows everything.
- A two-sentence opening line for the level, then the PM type or track.

**Check:** the 8a-1 acceptance list in the spec.

### Phase 8a-2: Focus the plan
Approved by Rinaz on 8 November 2026, after the site review in `docs/site-review-nov-2026.md`. The full spec is in `docs/phase-8a-2-spec.md`.
- At most 3 "Helps with your challenge" or self-check labels, each naming its reason.
- "Grow your skills" starts with 3, and the rest are folded away.
- Onboarding opens and comes first only for "I'm new". Otherwise it's one collapsed line.
- "Your team's rhythm" is collapsed to one line.
- An optional "How confident are you?" self-check, saved in the browser only.
- "Already done" and "Not relevant" on each timeline block, with "Set aside" and undo.
- Team and tools move out of the intake into "Tailor your plan", so the intake has 9 questions. Answers still go in the link.
- Plain-sentence lead-ins, and a live product's timeline reads as a loop.

**Check:** the acceptance list in the spec.

### Phase 8a-3: First impressions (done, 9 November 2026)
- [x] A fixed example plan (answers in `lib/example-plan.ts`), with a banner saying it's an example. Linked from a "See an example plan" pill in the home hero and from the end of "How it works".
- [x] A "Built for" section on the home page: start-ups, big tech and large enterprises, established companies, and the public sector.
- [x] Library filters fold behind a "Filters (N)" button on phones, with "Clear all". Desktop is unchanged.
- [x] An optional `region: "uk"` field on blocks, shown as a "UK guidance" label on Library cards, block pages and plan blocks.
- [x] Audited every block. One block is labelled UK guidance (secure firmware updates, which depends on PSTI), and one hardware pitfall is reworded to be global.

**Check:** open the home page and the Library on a phone, open the example plan, and find the UK labels.

### Phase 8b: Plans for leaders (done, 9 November 2026)
Approved by Rinaz on 9 November 2026. The full spec is in `docs/phase-8b-spec.md`.
- [x] A `leaderView` on all 86 product-track timeline blocks (what good looks like, two questions to ask your PM, two warning signs). `pnpm validate:content` requires it.
- [x] A "Show steps as: Hands-on | Leader" switch. Director and VP start in Leader view, and everyone else starts Hands-on. The choice is kept in the link (`view=`).
- [x] Leader view: block cards with "See the hands-on steps", questions to tick as asked (saved in the browser), "Ask your PM" next actions, no missing-role warnings, new headings, and Lead your team above the timeline.
- [x] A "Setting direction as well?" card that opens the strategy intake with level, size and product type filled in.
- [x] "If you lead the team" on each block's Library page.

**Check:** build a plan at Group PM, Director and VP level, and compare it with a PM's.

### Phase 8c: Learn the role
"I'm exploring the role" as an answer to question 1. About 4 questions, then a short path: what PMs do, the core skills, a practice project, and how to get a first PM role.

- Add a "New to product" card to the home page's "Built for" section, linking to this path. It was left out in Phase 8a-3 because the path didn't exist yet.

**Check:** follow the path as someone who isn't a PM yet.

### Phase 9a: Feedback and privacy
"Was this plan useful? Yes / No", plus an optional comment with a warning not to include personal details. Saved to Supabase with RLS and rate limits, emailed via Resend, with a privacy page. Needs Rinaz to set up her Supabase and Resend accounts. Guides go in `docs/supabase-setup.md` and `docs/resend-setup.md`.

**Check:** submit feedback, see the email arrive, and see the row in Supabase.

### Phase 8d: Content pass
- Rewrite the "Experienced" steps so they're harder, not shorter.
- More Design-skill blocks (only 12 today).
- "Next level" notes: one sentence per block on what the next level does differently.
- "In your context" lines on core blocks, and practice scenarios on craft blocks, per level.

**Check:** Rinaz reads each batch in the library and approves it.

### Phase 9b: Case study
The "How I built this" case study, the public decision log, and SEO polish.

**Check:** a hiring manager can understand the product and how it was built in under 2 minutes.

### Phase 10: AI personal summary
A "Summarise my plan" button. Claude gets only the visitor's category answers and the selected blocks, and returns a short tailored briefing. It streams onto the page.
- Switched off by `AI_SUMMARY_ENABLED` until it's ready.
- The page works without it.
- The monthly spending cap is set in the Anthropic console.
- The AI only explains blocks the engine has already chosen. It never picks them.

**Check:** generate a summary for two profiles and confirm it only mentions steps that are in the plan.

### Phase 11: Weekly AI content check
A GitHub Actions workflow, as described in `docs/content-model.md` section 5. It opens a pull request with suggested block updates and sources, and also keeps Supabase active. A guide goes in `docs/content-check.md`.
**Check:** run the workflow by hand from GitHub and review the pull request it opens.

## Later (parked ideas)

- A custom domain (about £10 a year).
- "Email me my plan" (needs a domain for Resend, and consent).
- Saved progress across devices (needs accounts, which moves us up a tier).
- A team mode: a lead shares a plan with their team.
- "Review my PRD" AI feedback tool.
- Export a plan to Jira or Azure DevOps as epics and stories.
- Linking from the portfolio website (website 1) as a featured case study.
