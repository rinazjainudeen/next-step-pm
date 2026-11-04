# Decision log

Newest first. Each entry gives the date, the decision and why.

## To decide later

- **Allow "weeks" in `estimatedEffort`.** The format accepts minutes, hours and days only, so long blocks read as "10-20 days". Adding weeks means updating the validator, its tests and `docs/content-model.md`, and the engine must agree how many days a week counts as when it adds up effort. Decide before the Phase 4 pacing work.
- **Does a block's `appliesTo` match if ANY list matches, or only if ALL match?** Rinaz prefers **any**, so an add-on tagged for AI PMs or AI products reaches both (for example `test-ai-model-evaluation`, tagged `ai` and `data-ai`). To settle in Phase 4, before the engine is built:
  - An empty list means "applies to all", so "any" must ignore empty lists. Otherwise a block tagged only for public sector products, with an empty `pmTypes`, would reach everyone.
  - Whether "any" covers only `pmTypes` and `productTypes`, with `stages` and `waysOfWorking` still having to match. Otherwise an add-on for mid-build could reach someone starting something new.

## 2026-11-04 (Phase 2)

- **The first 12 real blocks replace the 2 placeholders.** Rinaz's planning chat wrote them into `content/blocks/`. Support for `"placeholder": true` stays in the code for future testing.
- **Rinaz drafts the first 12 learning blocks in a separate planning chat; Claude Code doesn't write block content in Phase 2.** Claude Code builds the taxonomy, validator, `pnpm validate:content`, Library page and tests, adds 2 placeholder blocks, and later adds Rinaz's 12 blocks and fixes anything the validator flags. Why: Rinaz wants to control the content and its voice, and the validator is what keeps content drafted elsewhere consistent.
- **The full library is planned at about 90 blocks, not 40 to 50.** Mix: core lifecycle about 40, ways of working about 15, PM-type add-ons about 15, product-type add-ons about 12, onboarding about 8. Why: it covers the real range of PM situations. Cost: more research and review, so Phase 5 may be split.
- **New block kind: `ways-of-working`**, for sprint planning, refinement, stand-ups, review, retrospectives, Kanban flow and WIP limits, stage-gate reviews, roadmaps and estimation. Why: how a team works is separate from what phase it is in, and these blocks apply across phases.
- **A block's `phase` can be one phase, a list of phases, or `"any"`.** Single-phase blocks live in `content/blocks/<phase>/`; blocks with a list or `"any"` live in `content/blocks/cross-phase/`. Why: ways-of-working blocks don't belong to one phase. How the engine orders multi-phase blocks is settled in Phase 4.
- **New `appliesTo.waysOfWorking` field** (scrum, kanban, hybrid; an empty list means all), matching the intake question "How does your team work?". The curriculum engine will pick ways-of-working blocks using that answer. The Library has a filter for it. It is a required field, like the other `appliesTo` lists, so nothing is left blank by accident.
- **Added `tech-lead` to the allowed roles and the team question.** The content model already used it in its example and as the lead for Build, but it wasn't in the team list. Without it, the validator would reject the blocks that name a Tech Lead.
- **Blocks may carry `"placeholder": true`.** Placeholder blocks show a red "Placeholder" label, are left out of the sitemap and search engines, and make `pnpm validate:content` warn (not fail) until they are removed.
- **`estimatedEffort` must be a number or range plus a unit** (`30 minutes`, `2-4 hours`, `1 day`). Why: the engine needs to add up effort to flag a tight timeline, and free text can't be added up.
- **Tool pages use a shorter hero, about 35% of the screen height.** This covers Library, Build my plan and Your plan. Why: at 60% the filters started below the first screen on a laptop, and on a tool page the tool should show straight away. Other inner pages keep the 60% hero. Recorded in `CLAUDE.md`, along with the `cross-phase` folder.
- **Bad blocks stop the build.** The Library reads the blocks at build time, and throws if any is invalid, so Vercel can't publish a broken block.

## 2026-11-04

- **Name: Next Step PM.** The first idea, "The Product Teacher", is too close to Product Teacher, an established PM education company. A quick search found no PM learning brand called "Next Step PM". (A Next.js onboarding library called "NextStep" exists; it's a different field and there's no conflict.)
- **Build website 3 (PM learning and development) first**, out of three portfolio sites. It best shows AI product and building skills.
- **Purpose: portfolio, not a business.** Hiring managers first, then PMs, then colleagues. It's a free, personal, non-commercial project.
- **Single-use tool, no visitor accounts.** Answers are kept in the URL, and ticks are saved in the visitor's browser only. This keeps privacy simple and costs at zero.
- **Learning blocks plus a pure rules engine, not hand-written curricula.** There are too many combinations to write by hand. Blocks are reusable, testable and easy for AI to keep up to date. The rules engine makes plans predictable.
- **AI comes later and is grounded.** The personal summary uses only the selected blocks, so it can't invent steps. Content updates are proposed by AI as pull requests and approved by Rinaz. Nothing goes live automatically.
- **Generic lifecycle phases from public best practice**, not from any employer's internal process. The employer's process was used only as inspiration for the idea of owners plus a definition of ready.
- **Hosting: Vercel Hobby (free).** It's allowed for personal, non-commercial projects. We'd move to Pro (about $20 a month) only if the site ever earns money.
- **Database: Supabase (free), not MongoDB.** This differs from the starter pack; Rinaz prefers Supabase. Content isn't stored there, so a free-plan pause after 7 days of inactivity can't break the site. The weekly workflow also keeps it active.
- **Weekly job on GitHub Actions, not Vercel Cron.** It needs to open pull requests on GitHub, which GitHub Actions can do directly.
- **No custom domain yet.** `next-step-pm.vercel.app` is enough. Resend can email Rinaz without a domain.
- **Design:** the starter-pack design system with a navy and cyan palette, to match Rinaz's career profile.
- **GitHub repo: `rinazjainudeen/next-step-pm`, public.** Hiring managers need to see the code, and it holds no secrets. The work GitHub account (`rinazdeen`) is not used for this project.
- **Tailwind via `@tailwindcss/postcss`, and no `cacheComponents`.** The Next.js starter defaults to a newer Turbopack plugin and a caching mode that clashes with the `force-dynamic` setting our API routes need. We stay with the stack in `CLAUDE.md`.
- **`cn()` is written in `lib/utils.ts` from `clsx` and `tailwind-merge`.** The shadcn installer tried to use an outside package called `cn` instead. We don't depend on it, to keep the dependency list small and known.
- **Theme always starts in light, with a toggle in the header.** We first made it follow the visitor's phone or computer setting, but that meant a phone in dark mode opened the site dark. Starting in light means every visitor, including hiring managers, sees the main look first. The toggle remembers their choice. Browsers that force dark mode on all websites can still recolour the site; that is outside our control.
- **Links to pages that don't exist yet are hidden** (`available: false` in `lib/navigation.ts`), so nobody lands on a 404. `/start` is a "coming soon" page until Phase 3.
- **Home page stats are facts about the design, not usage numbers** (8 questions, 0 accounts and so on). We don't show visitor numbers until real ones exist.
- **Logo is a simple three-steps mark drawn in code** (so it follows light and dark mode). The hero uses a navy gradient and a drawing of rising steps until Rinaz chooses a photo.
- **Work in VS Code with Claude Code.** This file, `docs/plan.md` and `docs/content-model.md` are the hand-over between planning chats and building sessions.
