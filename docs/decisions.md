# Decision log

Newest first. Each entry gives the date, the decision and why.

## To decide later

- **Does a stage tag belong on a core block?** A visitor starting something new can extend through Build to Launch, and stage tags must still fit. So a block tagged only `mid-build` would be left out of that plan. No current block has this problem. When writing blocks in Phase 5, use stage tags only for things that really are limited to a stage, such as onboarding.
- **Review the effort estimates in Phase 5.** The engine reads them as start-to-finish time. Build now has its own minimum, so "Write user stories" at 2 to 4 hours no longer sets how long Build lasts, but the estimates still decide when a plan is tight. Rinaz to check when reviewing blocks.
- **Should `estimatedEffort` allow weeks?** The blocks use days only, so nothing needs it yet.

## 2026-11-09 (Phase 8b)

From the site review (finding 1), approved by Rinaz on 9 November 2026. The spec is in `docs/phase-8b-spec.md`.

- **The view follows the level.** Director and VP open in Leader view, because they lead the work rather than do it. Group PM opens Hands-on, because they still own product, but the switch is above the timeline for them. Associate, Product manager, Senior and "Not sure" open Hands-on, with the switch inside "Your answers". A `view=` in the link always wins, so shared links open the way they were shared. Old links have no `view`, so they open as before.
- **The rule for a leader view:** one sentence on what good looks like, exactly two questions to ask the PM and exactly two warning signs. Every product-track timeline block has one (a core or add-on block in a product phase that isn't in "Lead your team"). Strategy, coaching, craft, onboarding, ways-of-working and Lead your team blocks don't, because they're already written for the person doing them. The check is in `pnpm validate:content`, so a new block can't be added without one.
- **Leader view is for the product track only.** A Director on the strategy or coaching track always sees Hands-on, because those blocks have no leader view, and the switch is hidden.
- **The strategy nudge** appears for Group PM, Director and VP on the product track, after Lead your team, as a card with a "Build a strategy plan" button. It opens the intake on the strategy track at the first question left, with level, size and product type filled in. It replaces the old one-line note above the timeline.
- **Asked questions count as done.** A leader's block is done when both questions are ticked as asked, or when it's marked "Already done". In Leader view, "Already done" ticks the questions as well as the steps. This keeps the current phase and the next actions moving as a leader works through the questions.
- **Next actions in Leader view** are one question from each block, taking the blocks that help with the challenge first and then the rest in plan order. The question is the first one not yet asked. Hands-on next actions are unchanged.
- **Question ticks are stored with step ticks,** under ids like `block-id/ask/0`, so they can't clash with step ids. They stay in the browser and never go in the link.

## 2026-11-09 (Phase 8a-3)

- **The example plan is a product manager in a growing B2B software company,** partway through a build in the Build phase, whose challenge is "We ship, but can't tell if it's working", with 1 to 3 months, Scrum, and no team or tools. It's the most common kind of visitor we expect, and leaving team and tools blank shows the plan most people will see. The answers live in one constant, `lib/example-plan.ts`.
- **The example finishes at "Measure and improve", not Launch.** The brief didn't set the finish. Finishing at Launch showed only one "Helps with your challenge" label, because measurement work sits after launch. Finishing at Measure still fits 1 to 3 months (about 13 weeks) and shows all three labels, which is the point of a measurement challenge.
- **The example banner shows only when the link matches the example exactly.** Once a visitor tailors team or tools, or changes an answer, it's their own plan and the banner goes.
- **"Built for" names four kinds of organisation:** start-ups, big tech and large enterprises, established companies, and the public sector. They match how plans really change (organisation size and public-sector add-ons). "New to product" waits for the "Learn the role" path in Phase 8c, so the card doesn't promise something the site can't do yet.
- **Library filters fold away on phones only.** Below the `md` breakpoint they sit behind a "Filters (N)" button, a real button with `aria-expanded`, so blocks show on the first screen. Desktop is unchanged.
- **The rule for the "UK guidance" label:** a block gets `region: "uk"` only when its steps depend on UK-only law, processes or bodies. Citing a UK source is not enough. Blocks used by everyone that mention UK law in passing are reworded to be global rather than labelled. The label reads "Written for the UK. Check the equivalent rules where you work."
- **After the audit, only one block is labelled: "Plan secure firmware updates after launch".** Its steps depend on the UK PSTI rules. The three public-sector add-ons (service assessment, spend controls, assisted digital) are based on UK government guidance but worded so they work anywhere, so they stay unlabelled. Safety certification covers every market, so it stays unlabelled too, with its Northern Ireland pitfall reworded to be global. No core block mentioned UK law in its text, so none needed rewording. Rinaz approved the list on 9 November 2026.

## 2026-11-08 (Phase 8a-2)

From the site review of 8 November 2026, approved by Rinaz. The review is in `docs/site-review-nov-2026.md`, and the spec in `docs/phase-8a-2-spec.md`.

- **People exploring the role are in scope.** They get a new "Learn the role" path in Phase 8c. Why: answering "Not sure" everywhere gave an 87-step plan pitched at product manager level.
- **Plans for Group PM, Director and VP are about leading the work, not doing it.** They get a "leader view" of each timeline block in Phase 8b. Why: a Director got the same hands-on timeline as a PM.
- **Team and tools move out of the intake into an optional "Tailor your plan" panel, so the intake has 9 questions.** Why: they were the heaviest questions to answer, with 22 roles and 26 tools, and changed the plan the least. The answers still go in the link, so shared links keep them.
- **UK-specific blocks will be labelled "UK guidance" in Phase 8a-3.** A country question comes later, and only if feedback asks for it.
- **Feedback comes before the content pass.** The roadmap is now 8a-2, 8a-3, 8b, 8c, 9a (feedback and privacy), 8d (content pass), 9b (case study), 10 and 11.

Decisions made while building 8a-2:

- **The visitor's own adjustments are an input to the pure engine.** `buildPlan` takes the self-check, the set-aside blocks and the ticks, so every rule stays in one place and is tested. The browser rebuilds the plan with them, using only the blocks that plan needs, and a test proves those give an identical plan. Nothing from them goes in the link.
- **"Already done" ticks every step.** A block is done when all its steps are ticked, so there's one source of truth, and undo unticks them. The current phase is the first with a required block that isn't done.
- **Labels follow progress.** The 3 labels start from the current phase and skip finished blocks, so they move on as the visitor works through the plan. The next 3 actions start at the first label, or else the first unfinished block in the current phase.
- **The label also shows in "Your next 3 actions".** In testing, Rinaz couldn't find "Helps with your challenge": the first labelled block was about three screens down, below a long open card. The same pill now sits on the first action from a labelled block (once per block, not on every step), so the reason is visible on the first screen.
- **Self-check blocks rank just after challenge blocks when ordering,** so "the challenge takes priority" holds for order as well as labels.
- **With no team answer, each task shows its roles as "Who usually helps"** and reviewers aren't suggested. "Not sure / no team" keeps the old wording, where tasks sit with you.
- **"See N more skills", not "See all N skills".** Why: the folded section shows the skills not already in "Start with these", so "all" would mislead.
- **"Already done" and "Not relevant" are on timeline blocks only.** The other sections are already optional or folded.
- **The lead-in is one sentence,** such as "Before you start, check that “Agree the scope” has been done." On a live product: "Before you start, look back at what your last release did for …".
- **The tests now rebuild real plans from the smaller block set and with adjustments,** to prove both give the right plan.

## 2026-11-08 (Phase 8a-1)

Rinaz approved the Phase 8a spec on 7 November 2026. It's in `docs/phase-8a-spec.md`.

- **The intake grows to 11 questions, with "What's your biggest challenge right now?"** Rinaz's call. It comes after the starting point, is required and has "Not sure". Each answer favours one or two skills. Why: the usefulness check found about 85% of timeline blocks were the same across profiles at the same stage.
- **"Next level" notes moved to Phase 8b.** Rinaz's call. Why: they're content, at one sentence per block.
- **The plan-page skills filter is dropped, in favour of the 8a-2 self-check.** Rinaz's call. Why: the self-check does the same job better, and keeps the intake at 11 questions.
- **Every block builds one to three of ten skills.** `skills` is required, and the tags were applied by script from `PHASE-8A-SKILL-TAGS.json`. Design and user experience has only 12 blocks, so it's thin and goes to the 8b content pass.
- **Blocks that help with the challenge move as early as both their dependencies and order links allow.** This differs from the spec, which said "the same rule as `movesUpFor`". That rule ignores `comesAfter`, and with "delivery" alone tagging 40 blocks, it would break the agreed order: the discovery decision could come before the add-ons, and the pilot before security. The acceptance check, "come first where dependencies allow", still holds. An add-on still sits straight after what it extends, and "Go further" blocks are never marked.
- **Only timeline blocks are marked "Helps with your challenge".** Rhythm and skills sections keep their order.
- **The next 3 actions start at the first marked block, then carry on in plan order.**
- **"I'm new and need to get up to speed" only changes plans that have a new-to-product section,** which means a live or part-built product. On other plans it changes nothing.
- **Old links with no challenge open with it as Not sure, on the plan page only.** Why: the intake must never pre-select an answer, so someone halfway through the questions still has to choose. Answers in progress only live on `/start`, so a plan link without one is always an old or hand-edited link, and an old link missing another answer goes to that question, not the challenge.
- **The current phase is worked out in the browser, from ticks.** The first view opens the first phase, and the visitor's choice wins once they open or close one. The phase view sits on top of the block cards, which don't change.
- **The opening line lives in `lib/plan-wording.ts`**, so the wording can be edited in one place. It uses the first PM type in taxonomy order, because two picks are stored in a fixed order.
- **Skills show on Library block cards and block pages, not on plan cards.** Plan cards show "Helps with your challenge" instead, to keep them short.

## 2026-11-06 (Phase 7d)

A usefulness check of 30 realistic profiles found plans that were valid but not always useful. Rinaz approved five small fixes. Longer plans and thin personalisation wait for Phase 8a, and single-product steps for Directors and VPs wait for 8b.

- **"Get up to speed" is now a collapsed "If you're new to this product" section.** Why: everyone on a live or part-built product got 4 or 5 onboarding blocks, even a VP who has run the product for years. It was already left out of the timing, the next actions and progress.
- **"Your team's rhythm" only shows on the product track.** Why: strategy and coaching plans listed Scrum rituals for work that doesn't use them. This replaces keeping the section on those tracks.
- **With no team roles picked, the rhythm shows only `wow-stakeholder-updates`.** Why: a solo PM was told to run stand-ups and retrospectives. `worksWithoutTeam` marks the blocks that still apply. "Not sure" on the team counts as no roles, because that answer also covers having no team.
- **People leaders get "Lead your team" on every track, minus anything on their timeline.** This replaces "product track only". The whole set follows one rule, so a Director on strategy also gets `cap-coaching` and `cap-hiring-onboarding`, and on coaching they only appear if the plan doesn't reach them.
- **Group PMs, Directors and VPs on the product track see a nudge above the timeline:** "Leading strategy or building your team's skills? Build a plan for that instead." It opens the kind of work question and keeps their other answers. It doesn't print.
- **The fallback for a missing role no longer mentions "the product" when there isn't one yet.** It says "Ask a colleague who knows this area." The approved fix named the "new" stage. It also covers "Not sure" and the strategy and coaching tracks, because the old wording was wrong for them in the same way.
- **On a live product, `measure-post-launch-review` is called "Review your latest release".** `titleWhenLive` holds the name. The Library keeps the usual title.

## 2026-11-05 (Phase 7b)

- **Three tracks: product, strategy and coaching.** Rinaz's call. The "kind of work" question is switched on, so visitors see all ten questions. Strategy runs Understand, Diagnose, Choose, Plan, Align and Review. Coaching runs Assess, Design, Pilot, Scale and Sustain. "Not sure" means product.
- **A track's starting answers are stages, each with its own route.** Why: the existing start, finish and timing rules then work on every track with no new engine code. Each answer's route begins at its starting phase, so there's no "which phase?" follow-up on these tracks. Changing the kind of work clears a starting answer from the old track.
- **`alsoIn` places an existing block on a track.** Why: it's the simplest way to reuse a block without copying it. On that track the block takes the track phase, joins the timeline, and `after` replaces its usual dependencies, so strategy visitors aren't asked to check for product work. It's replaced, not copied, so it can't also appear in "Grow your skills". The earlier idea of adding phases to the block's `phase` list wouldn't have allowed that. Validator rules keep this honest.
- **`forEveryone` lifts a reused block's limits on that track only.** Why: the vision, strategy and north star blocks are for intermediate and above in "Grow your skills", but the approved strategy list has them at every level. `addon-transformation-change` is a Transformation add-on on the product track and core on the coaching track, the same way.
- **`inLeadYourTeam` shows a block in "Lead your team".** Why: `leadsPeople` would hide `cap-coaching` and `cap-hiring-onboarding` from coaching-track visitors who don't manage people. Group PMs, Directors and VPs on the product track now get all four blocks.
- **"Lead your team" is for the product track only.** On the coaching track these blocks are in the timeline, so showing them again would repeat them. As a result, leaders on the strategy and coaching tracks don't see `lead-one-to-ones` or `lead-delegate-ownership`.
- **Two new team roles:** Senior leader / sponsor, and People / HR partner. The stats band shows 153 blocks and 22 team roles, and still counts 8 lifecycle phases, which are the product track's.
- **`strat-portfolio-allocation` is for experienced PMs only**, not "Go further" for others. This changes the approved list, because the alternative needed a new rule for one block. The Library still shows it to everyone.
- **A block can't depend on a block from another track**, and phase order is compared within a track.
- **The AI strategy add-ons also reach Data or AI products**, like the other AI add-ons. Why: `addon-ai-data-readiness` reaches those products, and it follows `addon-aistrat-opportunities`, so they'd have been told to check for a block they never get.
- **Order within the tracks is set with `comesAfter`**, following the approved "After" column. The business case follows OKRs, to match the listed order.
- **Links with no kind of work open as product plans**, so plans shared before this change keep working.

## 2026-11-05 (Phase 7a)

Decisions from the replan:

- **Experience is asked by scope, not title.** There are six career levels, with job titles (and years, where they help) shown as hints. Why: titles mean different things at different companies.
- **Blocks keep three versions of their steps** (beginner, intermediate, experienced). Each career level points to one of them.
- **People leaders get extra blocks automatically.** Group PM, Director and VP count as "leads people", which adds coaching and team blocks in "Lead your team". The full coaching track stays for anyone whose main work right now is building a team.
- **Fundamentals stay in every plan.** No block is removed because of someone's level. Beginner-only basics move to a collapsed "Refresh the basics" section for product manager level and above. This rule covers basics only: blocks limited to higher levels still don't reach lower ones, and the Library shows every block to everyone.
- **New PM types: Platform, and Hardware or IoT.** Visitors can pick up to two PM types.
- **New question: company size**, with four options. "Not sure" assumes an established organisation.
- **The "kind of work" question stays.** A level is not the same as the kind of work someone is doing.
- **Ten questions in total**, each with a "Not sure" option. The first was built but switched off by `KIND_OF_WORK_ENABLED` until the strategy and coaching tracks existed, in Phase 7b.

Decisions made while building, on Rinaz's instructions:

- **The first 20 Phase 7b blocks moved into 7a.** Rinaz's call. The library grows from 100 to 120 blocks, covering hardware, platform, company size and the gaps found. Why: they need the new PM types and sizes to reach anyone, and those arrive here.
- **"Lead your team" shows nothing until its blocks exist.** Rinaz's call. The section is built, and stays hidden with no blocks, so no content is faked.
- **New team role: Hardware / manufacturing engineer.** Rinaz's call. The hardware blocks ask this role first, then a Tech Lead or Architect.
- **The stats band counts only what exists:** 120 blocks, 6 career levels and 20 team roles. Rinaz's call. A test checks these against the real content. This replaces "21 team roles" in the replan, because the other two new roles arrive in Phase 7b.
- **Old links keep working.** Rinaz's call. `exp` maps beginner to associate, intermediate to product manager and experienced to senior. A link with `exp` and no size counts the size as Not sure, so nobody is sent back to answer a question. Ticks carry over, because each career level uses the same steps as before.
- **`movesUpFor` moves a block as early as its dependencies allow**, for the listed sizes, and marks it "Priority at your size of organisation". Why: the replan moves blocks up for bigger organisations. A move ignores `comesAfter` but never `dependsOn`, so `test-security-privacy` goes first in Test for a large enterprise, while `define-stakeholder-alignment` still follows the product brief and is only marked. `wow-raid-log` only reaches hybrid teams, as before.
- **Every add-on in the 20 blocks has a `comesAfter`,** following the order rules from Phase 5. The pilot still comes last in Test, after hardware certification.
- **A PM can't be given a task or asked to review.** The validator now rejects both. Why: `hw-prototype-builds` would have told visitors "No Product manager in your team". Its tasks went to the Hardware / manufacturing engineer, and its owner is now the PM.
- **At two PM types, the other options are disabled** until one is unticked, so no answer disappears unnoticed.

## 2026-11-05 (Phase 6)

- **The home page leads with learning on your real work.** Rinaz's call. The new headline is "Learn product management on the product you're building", with a matching subtitle, search description and "How it works" lead. Why: the old wording said what the tool does, not why it's different from a course.
- **The stats band shows what's in the product.** Rinaz's call. It now shows 100 learning blocks, 8 lifecycle phases, 3 experience levels, 19 team roles, and that every block cites its sources. It keeps "3 experience levels" until Phase 7 goes live, so the site never claims something it doesn't yet do.
- **The hero has less padding, and stats show the number above the label.** The longer headline pushed the stats band off a 1280 by 800 laptop screen, which breaks the rule that the hero and stats band fill one screen. Reading "Every" before "Block cites its sources" also needs the number first. The code meant to do this, but a class was missing.
- **The home page says "a few questions", not "eight".** Why: the intake is moving to ten.
- **The plan is replanned from Phase 6 onwards.** Rinaz's call. Phases are now 6 (wording), 7a (intake v2), 7b (new content), 8a (skills and growth), 8b (content pass), 9 (feedback, privacy and the case study), 10 (AI summary) and 11 (weekly content check). The old Phases 6, 7 and 8 became 9, 10 and 11. The replan's own decisions are added to this log when Phase 7a starts.

## 2026-11-05 (Phase 5)

- **The library now has 100 blocks.** 12 existing and 88 new, drafted in a separate planning chat and approved by Rinaz: 41 core, 27 add-on, 5 onboarding, 13 ways-of-working and 14 craft. This fills the gaps for hybrid teams, Data PMs and every listed tool.
- **`appliesTo.experience` limits a block to certain levels.** An empty list means every level. A level outside a non-empty list doesn't get the block. "Not sure" counts as intermediate, the same as for steps. It's required on every block, so the 12 originals gained an empty list. Why: some blocks only suit certain levels, such as "Understand what a product manager does". Required, like the other `appliesTo` lists, so it can't be forgotten.
- **`"optional": true` marks a "Go further" block.** It shows in its phase, marked "Go further", after the required blocks. It's left out of the timing, the next 3 actions and the progress count. Only core and add-on blocks can use it. Two blocks do: `discover-opportunity-tree` and `define-working-backwards`.
- **A new kind, `craft`, fills a "Grow your skills" section.** Craft blocks use phase `"any"` and sit outside the timeline, like "Your team's rhythm". They're filtered by experience and left out of the timing. Why: skills such as strategy or influencing grow over time and don't belong to one phase.
- **A block can't depend on work some of its visitors won't get.** The validator now rejects a dependency on a "Go further" block from required work, and on a block limited to fewer experience levels. Why: those visitors would lose the block's order, or be told to check for work they were never given.
- **Four original blocks follow the new ones.** `discover-user-research`, `design-test-prototype`, `build-user-stories` and `measure-results-hypothesis` have new `dependsOn` lists, so each phase reads in order.
- **Engine tests use made-up blocks.** They now check the rules, so new content can't break them. `lib/plan-logic.test.ts` checks the real blocks.
- **Blocks in a phase overlap: a phase is its longest block plus a quarter of the rest.** Rinaz's call. This replaces adding every block one after another. Why: with 100 blocks the old sum made a phase of 5 blocks look like 5 jobs in a row. 85% of "Under 1 month" routes and 48% of "1 to 3 months" routes were flagged as tight in one profile, and Test ran longer than Build.
- **Build counts as at least 4 weeks.** Rinaz's call. This replaces the 2-week minimum set on 5 November in the Phase 4 QA review. Why: with the full library, 2 weeks left Build far shorter than Test.
- **"Grow your skills" has two groups: "Picked for your level" and "Useful at any level".** Rinaz's call. The most level-specific skills come first. The second group says its steps are written for the visitor's experience. Why: as one list, a beginner's and an experienced PM's skills looked almost the same, because the 6 shared blocks hide their different steps until opened.
- **Measure counts as at least 4 weeks, like Build.** Rinaz's call. Why: results need time to build up after launch.
- **A tight plan under 1 month says what to do about it.** Rinaz's call. It suggests narrowing to the smallest valuable release, finishing one phase first, or both, depending on what's possible for that plan. Why: three in four under-1-month routes are still tight, and a warning with no way forward doesn't help. Longer timelines keep the shorter warning.
- **Test and Launch orders.** Rinaz's call. Test runs: acceptance and accessibility, performance, security, enterprise readiness, then the pilot last. Launch runs: go-to-market, release plan, support and operations, then incident response. `lib/plan-logic.test.ts` enforces both.
- **`comesAfter` is an order-only link.** Rinaz's call. A block comes after the listed blocks when they're in the same phase of the plan. Unlike `dependsOn`, a block that's missing is ignored and never becomes "check this exists". Why: `discover-decision` should follow sizing for those who get it, but beginners don't get sizing. The validator checks that the ids are real, share a phase and don't form a loop.
- **Order rules within a phase.** Rinaz's call. Decision blocks are last: `discover-decision` is the last required block, then Go further blocks, and `measure-next-decision` is last of all. Add-ons sit straight after the core block they extend, not at the end of the phase, and every add-on must name one. Measure runs: dashboard, user feedback, results, experiments, post-launch review, next decision. `lib/plan-logic.test.ts` enforces these.
- **Add-ons match on PM type OR product type.** This was already settled in Phase 4. `content-drafts/README.md` lists it as open, which is out of date.

## 2026-11-05 (Phase 4, after the QA review)

An independent QA agent tested about 21 million answer combinations and read sample plans as a PM would. Phase order and block choice held up. Timing and "who does this" didn't, so these changes followed. Rinaz approved them.

- **Plans are spread across the visitor's timeline, and Build takes two-thirds of the spare time.** Rinaz's call. This replaces "a plan shorter than its timeline isn't stretched". Each answer has a length to plan across: 9 weeks for 1 to 3 months and 20 for 3 to 6 months, the middle of each range so there's room for slippage, and 26 for "6 months or more". "Under 1 month" isn't stretched, because the milestone could be days away. Why: block estimates only count the PM's part of Build, so a whole lifecycle looked like 7 weeks and 3 to 6 months was identical to 6 months or more. The question already promised "we'll spread your plan across this time". We can't know a team's real build time, so the plan says so beside Build. The other phases share the last third, because giving Build all of it put Test and Launch in the same final week.
- **Build counts as at least 2 weeks.** Why: it could otherwise read as "less than a day", including on plans with no date. 2 weeks is one typical sprint and is a starting point, not an estimate. A tight plan is squeezed along with everything else, so Build can be shorter there, and the plan says it's tight.
- **A plan with no Build stretches evenly, to at most 3 times what the work usually takes.** Rinaz's call, after a second QA pass found "Plan a release", a 1 to 2 day job, running Weeks 1 to 26. Past that limit the plan says there's time to spare, so small plans can end well before the milestone. 3 to 6 months and 6 months or more can then look the same on a small plan, which is honest because the work is no longer.
- **Tasks reach the closest person.** More `orRoles` were added after the second QA pass. A UX Designer can cover content and research tasks, a Product Owner can cover BA backlog tasks, and a Delivery Manager can facilitate. An Architect reviews in place of a missing Tech Lead, and nobody reviews work they stepped in to do. With no tester, testing stories sits with the PM, because the block's own steps say so.
- **A live product's loop says "From your last release, find" above the next actions**, because that work can also come up later as a task.
- **On a tight plan, Measure says it will finish after the milestone.** Why: results take time to appear.
- **A third QA agent run was skipped.** Rinaz's call. QA agents use a lot of tokens and the plans will change once the remaining blocks arrive, so these last fixes were checked with the permanent tests, the browser walkthroughs and by reading sample plans. A QA agent next runs after a big batch of blocks.
- **A plan is only "tight" past the longest length of its range.** A plan can run past the middle of its range and still fit.
- **Lengths are rounded up to match the timeline.** Why: a plan said "about 5 weeks" but ended in week 6, and a tight plan said "about 4 weeks, and you have up to 4 weeks".
- **Every delegable task says what happens if nobody can do it.** `ifMissing` is required: `pm` (it sits with you), `find-someone` (specialist skills) or `ask-around` (needs product knowledge). Why: one fallback told PMs to set up monitoring themselves, and to walk themselves through the delivery plan.
- **A task can name other roles with `orRoles`, and a full-stack engineer covers frontend and backend.** The first person in the team gets the task. Why: analyst tasks repeated or contradicted each other, and engineers were ignored. Technical tasks for a Tech Lead now fall to an Architect or engineers.
- **Experienced steps are written as instructions.** They read as finished states, such as "Team synthesis done", which made poor next actions. Their meaning hasn't changed. Rinaz to review, as these are her blocks.
- **The next actions show what comes first.** Prerequisites the next actions rely on are listed above them, and people new to a product are pointed to "Get up to speed".
- **A live product in Design runs on to Launch** when no finish is chosen, like Plan beside it. Why: Design gave one phase and Plan gave four.
- **Progress counts timeline steps only.** Why: onboarding can be skipped and rhythm blocks repeat, so progress could never reach 100%.
- **The QA rules are now permanent tests**, in `lib/plan-logic.test.ts`, and run with `pnpm test`. They use a well-chosen spread of more than 10,000 plans rather than every combination, and they read the block files, so new blocks are covered automatically. Tests can't judge whether a plan makes sense to a PM, so a QA agent reviews sample plans after each big batch of blocks, and fully before launch.

## 2026-11-04 (Phase 4)

- **Block estimates are read as start-to-finish time, not PM hours.** Rinaz's call. Blocks are added up in working days (8 hours a day, 5 days a week, using the middle of a range) and compared with the timeline, so no question about hours is needed. Why: research takes 10 to 20 days because of recruiting and sessions, not 20 full days of PM work. Read as PM hours, nearly everyone would be warned that their plan was tight. This also means `estimatedEffort` doesn't need "weeks" as a unit.
- **Each timeline answer has a shortest and longest length.** Under 1 month is up to 4 weeks, 1 to 3 months is 4 to 13, 3 to 6 months is 13 to 26, and 6 months or more is 26 upwards. A plan longer than the longest is "tight": it's squeezed to end on time and says so. A plan shorter than the shortest has "time to spare" and isn't stretched. Anything between fits. 6 months or more is never tight. A "Not sure" timeline gets a steady pace and no warning.
- **Add-ons match on PM type OR product type, and stage and way-of-working tags must still fit.** Rinaz's call. An empty list never counts as a match on its own, but a block with both lists empty is for everyone. "Not sure" matches neither.
- **Onboarding and ways-of-working blocks sit outside the timeline.** Rinaz's call. Onboarding goes in "Get up to speed" and is marked "skip this if you already know the product". It's for people partway through a build or running a live product. Ways-of-working blocks go in "Your team's rhythm". Why: they run alongside other work or repeat, so adding them up would make plans look much longer than they are.
- **The next 3 actions are the first three steps of the plan, in order.** Why: taking the first step of three blocks would jump ahead of work that isn't done.
- **A dependency that isn't earlier in the plan becomes "check this exists", not a task.** This also covers a live product's loop: Measure comes first but depends on Launch, which has already happened.
- **Team numbers change the wording**, as in "Ask your 3 Backend Engineers". They don't change what's delegated. "Not sure" on the team never says someone is missing.
- **The plan page reads block files for each visitor.** It can't be pre-built, because every set of answers is different. `next.config.ts` ships the block files with the page, and they're read once when the server starts.
- **Ticks are shared across plans in one browser.** A step ticked in one plan stays ticked in another, if it's the same step at the same experience level. Each plan only counts its own steps.
- **Printing opens every block first**, because closed blocks wouldn't print.
- **Your answers sit in a closed section on the plan page**, with the Change links, so the plan comes first.

## 2026-11-04 (Phase 3)

- **Each answer on the answers page has its own Change link.** It opens that one question, and the button becomes "Save and return to my answers". Why: going back through up to seven questions to fix one answer was tedious. This is the "check your answers" pattern from the GOV.UK Design System. "Change my answers" is replaced by "Start again". The browser's Back button cancels a change.
- **The hero only shows on question 1 of the intake.** After that the question sits right under the header, with a small "Build my plan" heading. This narrows the tool-page hero rule in `CLAUDE.md`. Why: a hero on every question pushed each one down the page.
- **Back and Next stay on screen on long questions**, and the error message sits with them so it can't be missed. Each new question opens at the top of the page.
- **The progress bar is now numbered steps.** A visitor can click any question they've answered, or the first unanswered one.
- **`/start` is rendered for each visit rather than ahead of time.** Why: a link to question 5 should open on question 5, with no flash of the question 1 layout.

- **Follow-up questions must be answered, and nothing is chosen for the visitor.** Rinaz found that Next worked on the milestone question with only one answer, because "Not sure" was ticked in advance. Both follow-ups now start blank and Next asks for an answer. "Not sure" is still there but must be chosen. This replaces the earlier choice to make them optional. If a change on the answers page rules out a later answer, the visitor is taken to that question rather than the answer vanishing silently. A follow-up is only required when it's shown.
- **A live product can say it's in any phase.** Live teams are often building their next release, so question 3 offers all eight phases for a live product. If they start past the usual end and choose no finish, the plan runs on to Launch. Each stage has a new `startPhases` list for this. The finish question is skipped if only one phase is left.
- **"Joining mid-build" is now "Partway through a build".** The old name excluded PMs who'd been on the project from the start, and they had no other option that fitted. The id stays `mid-build`.
- **The finish question shows whenever there's a real timeline, even if the stage is "Not sure".** Rinaz picked a timeline after "Not sure" on question 3 and got no second question. Not knowing the stage already means starting from the beginning, so it now offers the same finish phases as "Starting something new". A "Not sure" timeline still hides it, because "by then" has no meaning without a date.
- **A follow-up that appears, or is missing, is brought into view.** It could appear behind the Back and Next bar, so Next showed an error about a question the visitor couldn't see. The page now scrolls to it when it appears, and Next scrolls to it and focuses it if it's unanswered.
- **The numbered steps can reach any answered question.** Before, they stopped at the first gap, so changing question 3 could lock a visitor out of questions they'd already answered. The last button still catches gaps. This replaces the "not past a gap" rule below.
- **The intake uses the full page width.** The card is no longer capped, and options sit three to a row on laptops. The last card stretches to fill its row. Why: on a laptop the card stopped halfway across the screen, and questions were taller than they needed to be.
- **A plan has a start and a finish, chosen with two follow-ups.** `phase` is where the visitor is now, on the stage screen. `until` is the phase to finish by the milestone, on the timeline screen. Why: a plan shouldn't squeeze four phases into a month when the milestone is the end of discovery. Milestones that match no phase, such as a contract ending, choose Not sure and get the usual phases.
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
- **The follow-up phase sits on the same screen as "Where is the product now?"** It only appears once a stage is picked, so the intake stays at eight screens.
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
