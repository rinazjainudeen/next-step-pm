# Next Step PM: plan

## First version (agreed 4 November 2026)

- **Goal:** a working, public product that shows hiring managers that Rinaz can ship an AI-assisted product to production, and that real PMs find useful.
- **Audience:** hiring managers for AI PM and AI Builder roles first, then product managers of every level, then colleagues.
- **Main action:** "Build my plan": answer about 8 questions and get a tailored, step-by-step curriculum.
- **Pages:** Home · Build my plan (intake) · Your plan · Library (all blocks) · How I built this · Decision log · Privacy.
- **Tier:** Standard, with no visitor accounts.
  - Content lives in the code.
  - Supabase stores feedback, ratings and anonymous plan counts.
  - Resend emails Rinaz when feedback arrives.
  - AI comes in phases 7 and 8.
- **Cost:** about £0 a month on Vercel Hobby, Supabase Free and Resend Free, plus AI usage capped at about £5 a month from phase 7. A domain (about £10 a year) is optional.
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
**Check:** answer every question, press Back, refresh the page, and confirm the answers are still there.

### Phase 4: The curriculum engine and plan page
Build `lib/curriculum-engine.ts` with full tests. The plan page shows a summary, the next 3 actions, a timeline by phase or week, block cards with delegation and tool examples, and "why you're seeing this". It also has tick-boxes saved in the browser, a copy-link button and a print/PDF view.
**Check:** create two very different profiles and confirm the plans differ in the expected ways.

### Phase 5: Full content
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

### Phase 6: Feedback, privacy and the case study
- **Feedback and storage:** a "Was this useful?" rating and an optional comment, stored in Supabase with RLS and rate limits, plus an anonymous count of plans generated (category answers only). Resend emails Rinaz when feedback arrives.
- **Pages:** a privacy page; a **How I built this** case study covering the problem, discovery, the block model, decisions, AI use, results so far and what's next; and a **Decision log** page.
- **Guides:** `docs/supabase-setup.md` and `docs/resend-setup.md`.

**Check:** submit feedback, see the email arrive, and see the row in Supabase.

### Phase 7: AI personal summary
A "Summarise my plan" button. Claude gets only the visitor's category answers and the selected blocks, and returns a short tailored briefing ("Your first two weeks", "What to delegate", "Risks for your situation"). It streams onto the page.
- Switched off by `AI_SUMMARY_ENABLED` until it's ready.
- The page works without it.
- The monthly spending cap is set in the Anthropic console.

**Check:** generate a summary for two profiles and confirm it only mentions steps that are in the plan.

### Phase 8: Weekly AI content check
A GitHub Actions workflow, as described in `docs/content-model.md` section 5. It opens a pull request with suggested block updates and sources, and also keeps Supabase active. A guide goes in `docs/content-check.md`.
**Check:** run the workflow by hand from GitHub and review the pull request it opens.

## Later (parked ideas)

- A custom domain (about £10 a year).
- "Email me my plan" (needs a domain for Resend, and consent).
- Saved progress across devices (needs accounts, which moves us up a tier).
- A team mode: a lead shares a plan with their team.
- "Review my PRD" AI feedback tool.
- Export a plan to Jira or Azure DevOps as epics and stories.
- More PM types, such as data PM or hardware.
- Linking from the portfolio website (website 1) as a featured case study.
