# Decision log

Newest first. Each entry gives the date, the decision and why.

## To decide later

- **Allow "weeks" in `estimatedEffort`.** The format accepts minutes, hours and days only, so long blocks read as "10-20 days". Adding weeks means updating the validator, its tests and `docs/content-model.md`, and the engine must agree how many days a week counts as when it adds up effort. Decide before the Phase 4 pacing work.
- **Does a block's `appliesTo` match if ANY list matches, or only if ALL match?** Rinaz prefers **any**, so an add-on tagged for AI PMs or AI products reaches both (for example `test-ai-model-evaluation`, tagged `ai` and `data-ai`). To settle in Phase 4, before the engine is built:
  - An empty list means "applies to all", so "any" must ignore empty lists. Otherwise a block tagged only for public sector products, with an empty `pmTypes`, would reach everyone.
  - Whether "any" covers only `pmTypes` and `productTypes`, with `stages` and `waysOfWorking` still having to match. Otherwise an add-on for mid-build could reach someone starting something new.
- **How the engine treats the new "Not sure" answers.** To settle in Phase 4. The intake already promises visitors these, so the engine must match or the wording must change: an unknown stage starts from the beginning (the same phases as "Starting something new"), an unknown timeline gets no tight-deadline warning, and an unknown team means tasks sit with the PM.
- **Blocks tagged by stage when a plan runs on.** A visitor starting something new can now extend through Build to Launch. A block tagged only `mid-build` for those phases would be left out unless the engine treats stage tags as a limit on onboarding blocks only. No current block has this problem, but it needs a rule before Phase 5.
- **How the plan uses team numbers.** The intake records them, but the content model's engine only checks whether a role exists. Phase 4 should use them at least for wording ("your 3 Backend Engineers"), and decide if they change anything else.

## 2026-11-04 (Phase 3)

- **Each answer on the answers page has its own Change link.** It opens that one question, and the button becomes "Save and return to my answers". Why: going back through up to seven questions to fix one answer was tedious. This is the "check your answers" pattern from the GOV.UK Design System. "Change my answers" is replaced by "Start again". The browser's Back button cancels a change.
- **The hero only shows on question 1 of the intake.** After that the question sits right under the header, with a small "Build my plan" heading. This narrows the tool-page hero rule in `CLAUDE.md`. Why: a hero on every question pushed each one down the page.
- **Back and Next stay on screen on long questions**, and the error message sits with them so it can't be missed. Each new question opens at the top of the page.
- **The progress bar is now numbered steps.** A visitor can click any question up to the first unanswered one, but not past a gap.
- **`/start` is rendered for each visit rather than ahead of time.** Why: a link to question 5 should open on question 5, with no flash of the question 1 layout.

- **A plan has a start and a finish, chosen with two optional follow-ups.** `phase` is where the visitor is now, on the stage screen. `until` is the phase to finish by the milestone, on the timeline screen. Why: a plan shouldn't squeeze four phases into a month when the milestone is the end of discovery. Milestones that match no phase, such as a contract ending, choose Not sure and get the usual phases.
- **Each stage now has a `journey` as well as its usual `phases`.** "Starting something new" usually stops at Plan and prioritise, but going live is one of the milestones we name, so a finish can go past the usual stopping point. New runs to Measure, mid-build runs to Measure, and live runs round to Launch. The usual phases stay the default.
- **A live product's phases follow working order: Measure first, then Discover, Define and Design.** The content model already said this. The first version of the intake listed them in lifecycle order by mistake, which would have made start and finish comparisons wrong.
- **One rule keeps start and finish consistent.** `tidyDraft` runs on every change and every web address. The start must belong to the stage, and the finish must be reachable from the start. Anything else is cleared rather than shown as an error. The finish question needs a real stage and a real date, because "finish by then" means nothing without them.
- **`phasesCovered` works out the plan's phases now, ahead of Phase 4.** The engine will use it, and the stand-in plan page shows the result so it can be checked by eye.
- **Every question has "Not sure", including experience, stage and timeline.** `CLAUDE.md` asks for this; the content model only listed it on some. Why: nobody should be stuck on a question. "Not sure" is kept out of `content/taxonomy.ts`, so a block can't be tagged with it.
- **On the team and tools questions, "Not sure" can't be ticked with anything else.** Ticking one clears the other, so an answer can't say both "QA" and "I don't know". It also covers "none of these", so a visitor with no team or tools isn't stuck.
- **The team question records how many of each role, from 1 to 20+.** Rinaz's call after testing, because a team may have 3 backend engineers. This replaces an earlier choice to drop the numbers. A ticked role shows a "How many" list, which can't be left blank. The address only shows numbers above 1, as in `team=ba,backend-engineer:3`.
- **Options explain themselves, in visible text.** PM types, product types, stages, phases, roles and ways of working each have a one-line description in `content/taxonomy.ts`. Why: terms like SaaS or Hybrid aren't obvious to everyone. Tooltips were ruled out because they're hard to use on phones and with screen readers. Tools have none, because they're product names under clear group headings.
- **A "tool that isn't listed" tick-box, with no text box.** It can sit beside real tools. Why: people using something else shouldn't have to choose "Not sure". Free text would put whatever someone typed into a shareable link, and the plan couldn't use it. We add a tool to the list only when blocks have examples for it.
- **One new PM type: Data.** It was on the parked list and is a real specialism. Hardware stays parked because the lifecycle blocks don't fit it. Founder or solo PM isn't a type, because the team question already covers it. Data has no add-on blocks yet; those come in Phase 5.
- **The timeline question explains what a milestone is and what the answer does.** It gives four examples: a small feature release, the end of discovery, going live and the end of a client contract. It also says the plan is spread across that time, week by week, with a warning if it looks tight.
- **The web address uses the taxonomy ids, plus a separate `phase` for the follow-up.** For example `stage=mid-build&phase=build` and `team=ux-designer`. The old example in the content model (`stage=build`, `ux`) didn't match the ids. Why: one set of ids everywhere.
- **The follow-up phase sits on the same screen as "Where is the product now?"** It's optional and only appears once a stage is picked, so the intake stays at eight screens.
- **`/start` updates the web address directly with the browser's history, not through the Next.js router.** Each tick replaces the address and each Next or Back adds a history entry. Why: it's instant, it doesn't ask the server for anything, and the browser's Back button steps through the questions.
- **`/plan` is a stand-in until Phase 4.** It shows the visitor's answers and says plainly that the plan isn't built yet. Why: otherwise the last button leads to a 404. It's kept out of search engines, because every set of answers is a different address. An incomplete link goes back to the first unanswered question.

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
