# Content model: learning blocks and the curriculum engine

This is the core idea of Next Step PM. Read it before working on content, the intake or the plan page.

## The idea in one paragraph

We never write a whole curriculum. We write **learning blocks**: small, reusable activities like "Write a problem statement", each tagged with when and for whom it applies. When a visitor answers the intake questions, the **curriculum engine** picks the right blocks, puts them in order, shapes them to the visitor's experience and assigns tasks to the roles in their team. It works like a design system: a small set of components that combine into many different pages.

```
intake answers ─┐
                ├─► curriculum engine (pure code, tested) ─► plan
learning blocks ┘                                             │
                                                              └─► (later) AI writes a short personal summary
                                                                  using ONLY the selected blocks
```

## 1. Lifecycle phases

These are generic phases drawn from common industry practice, such as the UK Government Service Manual (discovery, alpha, beta, live) and typical double-diamond and agile delivery. They are not taken from any employer.

| # | Phase | Typical lead | Ready to move on when… |
|---|---|---|---|
| 1 | Discover | PM, User Researcher | The problem, the users and the evidence are clear, and the opportunity is sized |
| 2 | Define | PM, BA | The problem statement, hypothesis, measures of success and constraints are agreed |
| 3 | Design | UX / Content Designer, PM | A solution has been tested with users and judged feasible by engineering |
| 4 | Plan and prioritise | PM, Delivery Manager | Scope is set, estimates exist, the work is on the roadmap and epics are created |
| 5 | Build | Tech Lead, Engineers | Stories meet acceptance criteria, code is reviewed and tests pass |
| 6 | Test | QA, PM | Acceptance criteria, accessibility, security and performance are checked |
| 7 | Launch | Delivery Manager, DevOps, PM | Release plan, monitoring, support and comms are ready |
| 8 | Measure and improve | PM, Analyst | Results are measured against the hypothesis and the next iteration is chosen |

There are two more tracks, each with its own phases. **Strategy:** `understand`, `diagnose`, `choose`, `strategy-plan` (shown as Plan), `align`, `review`. **Coaching:** `assess`, `coaching-design` (shown as Design), `pilot`, `scale`, `sustain`. Every phase and starting point belongs to one track in `content/taxonomy.ts`, and the Build and Measure minimums only apply to the product track.

**Starting points** shown to the visitor on the product track:
- **Starting something new**: phases 1 to 4.
- **Partway through a build**: phases 3 to 7, plus an "onboarding onto an existing product" pack.
- **Running a live product**: phases 8 and then 1 to 3 again, plus a "taking over a live product" pack.

These are the usual phases. A live product can also say it's in any phase, because it may be building its next release. If a visitor's milestone is further on, their plan can run past them, along the stage's `journey` in `content/taxonomy.ts`: new and mid-build can continue to phase 8, and live can continue round to phase 7. If the stage is "Not sure", the plan covers the same phases as "Starting something new", and can run on along the same journey. `lib/intake-phases.ts` works this out.

## 2. Intake questions (the taxonomy)

The allowed values live in `content/taxonomy.ts`, so blocks and questions can't drift apart.

There are nine questions in the intake. Team and tools (6 and 7 below) moved to an optional "Tailor your plan" panel on the plan page in Phase 8a-2. Their answers still go in the link. The first sets the track, and `KIND_OF_WORK_ENABLED` can switch it off.

0. **What kind of product work are you doing right now?** Building or improving a product · Setting product strategy · Building a team's skills or coaching · Not sure, which means product.
1. **What kind of product manager are you?** Pick up to two: General · Growth · AI · Data · Technical · Platform · Transformation · Hardware or IoT · Not sure.
2. **What best describes what you own?** Six career levels, from "Features someone else has shaped" to "Product strategy for the whole company". Each points to the beginner, intermediate or experienced steps, and the top three count as leading people.
3. **What kind of product is it?** Consumer digital product · Business software (B2B / SaaS) · Public sector service · Internal tool or platform · Data or AI product · Not sure.
4. **How big is your organisation?** Early start-up · Scaling · Established · Large enterprise · Not sure.
5. **Where is the product now?** Starting something new · Partway through a build · Live. Then a follow-up for the exact phase. The strategy track asks "Is there a strategy today?" (No strategy yet · Strategy out of date · Strategy needs turning into plans). The coaching track asks "How mature is product practice where you work?" (Just starting · Some teams do it well · Well established, needs scaling).
5b. **What's your biggest challenge right now?** Seven answers, each favouring one or two skills, and Not sure. Blocks that build a favoured skill move as early as their order allows. Old links without it open as Not sure.
6. **Who is in your team?** (in "Tailor your plan") Multi-select, with how many of each role (1 to 20+). Options: Delivery Manager, Scrum Master, BA, User Researcher, UX Designer, Content Designer, Tech Lead, Frontend Engineer, Backend Engineer, Full-stack Engineer, Architect, DevOps / SRE, QA / Tester, Data Analyst, Data Scientist / ML Engineer, Performance Analyst, Policy / Legal / Compliance, Product Owner, Hardware / manufacturing engineer, Senior leader / sponsor, People / HR partner.
7. **Which tools do you use?** (in "Tailor your plan") Grouped as: tracking (Jira, Azure DevOps, Linear, Trello), docs (Confluence, Notion, SharePoint/Word, Google Docs), design (Figma, Miro, Mural), code and hosting (GitHub, GitLab, AWS, Azure, GCP, Vercel), analytics (GA4, Amplitude, Mixpanel, Power BI, Looker), and AI assistants (Claude, ChatGPT, Copilot, Gemini). There is also "A tool that isn't listed", with no text box, which leads to tool-agnostic tips.
8. **Your timeline to the next milestone:** under 1 month · 1 to 3 months · 3 to 6 months · 6+ months. A milestone is the next point that matters to the visitor, such as a small feature release, the end of discovery, going live or the end of a client contract. The answer sets how long the plan runs: blocks are spread across that time week by week, with a warning if it looks tight. A follow-up, "Which phase do you want to finish by then?", sets where the plan ends. It's shown when there's a real date, must be answered when shown, and offers the phases from where the visitor is to the end of the stage's journey.
9. **How does your team work?** Scrum · Kanban · Hybrid / stage gates · Not sure.

Every question also has a **Not sure** option, with a one-line explanation of what it means for the plan. Its value is `not-sure`. It's an intake answer only, so it isn't in `content/taxonomy.ts` and blocks can't use it. On the team and tools questions it can't be ticked alongside anything else.

Answers are encoded in the URL using the taxonomy ids, for example `/plan?pm=ai,growth&level=senior&product=public&size=established&stage=mid-build&phase=build&team=ba,backend-engineer:3,ux-designer&tools=jira,confluence,figma&time=1-3m&until=launch&way=scrum`. Links from before Phase 7a use `exp` and have no `size`: they still open, with `exp` mapped onto a career level and the size counted as Not sure. `phase` is the follow-up to question 3 (where the plan starts), and `until` is the follow-up to question 7 (where it finishes). Both can be `not-sure`. A number after a role is how many; no number means one. That way a plan can be shared and refreshed with no database. While the visitor is answering, `/start` adds `step=3` to show which question they're on.

## 3. A learning block

One JSON file per block. A block with a single phase lives in `content/blocks/<phase>/<id>.json`. A block with `"phase": "any"` or a list of phases lives in `content/blocks/cross-phase/<id>.json`. The file name must match the block's `id`. The file is validated by `lib/blocks-validate.ts`; a bad block fails `pnpm validate:content` and the build.

```jsonc
{
  "id": "define-problem-statement",
  "title": "Write a problem statement and hypothesis",
  "phase": "define",                    // one phase | a list, e.g. ["design", "plan"] | "any"
  "kind": "core",                       // core | add-on | onboarding | ways-of-working
  "summary": "One or two sentences on why this matters.",
  "skills": ["discovery", "data"],      // one to three of the ten PM skills
  "appliesTo": {                        // empty list = applies to all
    "pmTypes": [],
    "productTypes": [],
    "stages": ["new", "mid-build"],
    "waysOfWorking": [],                // scrum | kanban | hybrid
    "experience": [],                   // beginner | intermediate | experienced
    "companySizes": [],                 // optional. early-startup | scaling | established | enterprise
    "leadsPeople": true                 // optional. Only for people leaders, in "Lead your team"
  },
  "steps": {
    "beginner":    ["Detailed step with guidance…", "…"],
    "intermediate":["Shorter step…", "…"],
    "experienced": ["Checklist item…", "…"]
  },
  "roles": {
    "owner": "pm",
    "canDelegateTo": [
      { "role": "ba", "task": "Draft the problem statement from research notes", "ifMissing": "pm" },
      { "role": "data-analyst", "orRoles": ["performance-analyst"], "task": "Find baselines for the measures", "ifMissing": "find-someone" }
    ],
    "reviewers": ["tech-lead", "ux-designer"]
  },
  "toolExamples": {
    "confluence": "Create a page from the 'Product requirements' template…",
    "notion": "…",
    "claude": "Paste your research notes and ask for three problem statements…"
  },
  "definitionOfDone": ["Problem, evidence and measure of success agreed with the team"],
  "pitfalls": ["Writing the solution into the problem statement"],
  "estimatedEffort": "2-4 hours",
  "dependsOn": ["discover-user-research-plan"],
  // "comesAfter": ["define-success-metrics"], // optional. Order only, within a phase
  // "movesUpFor": ["enterprise"],             // optional. Goes early for these sizes
  "freshness": "evergreen",             // evergreen | changes-yearly | fast-moving
  "sources": [{ "title": "…", "url": "https://…" }],
  "lastReviewed": "2026-11-04"
  // "optional": true                  // optional. Marks a "Go further" block
  // "placeholder": true               // optional. Only for dummy blocks used to test the site
}
```

**Writing steps:** every step at every experience level is an instruction that starts with a verb, such as "Verify tracking", not a finished state, such as "Tracking verified". The first steps become the visitor's next 3 actions.

**Delegable tasks:** `ifMissing` is required and says what happens if nobody in the team can do the task:
- `pm`: the PM can do this themselves.
- `find-someone`: it needs specialist skills, so the PM should find someone. Use this for anything a PM shouldn't be doing alone, such as setting up monitoring.
- `ask-around`: it needs someone who knows the product, such as a walkthrough.

`orRoles` is optional and lists other roles who could do the task, best first. Use it rather than repeating a task under two roles, and list the people who could realistically step in, because teams vary. A full-stack engineer already covers frontend and backend tasks.

**Kinds of block:**
- **core**: every PM in that phase gets it, unless `appliesTo.experience` limits it.
- **add-on**: only for certain PM or product types. Examples: "Evaluate model quality" for AI products, "Prepare for a service assessment" for public sector services, "Map the current process" for transformation.
- **onboarding**: for people joining mid-build or a live product. Examples: "Read the decision trail", "1:1s with each role", "Find the live dashboards".
- **ways-of-working**: how the team works, rather than what it produces. Examples: sprint planning, refinement, the daily stand-up, review, retrospective, Kanban flow and WIP limits, stage-gate reviews, roadmaps and estimation. These blocks often belong to several phases or to none in particular, so their `phase` can be a list or `"any"`. They are picked by the visitor's answer to "How does your team work?", using `appliesTo.waysOfWorking`.

- **craft**: skills that grow over time, such as strategy or influencing. These blocks use phase `"any"` and go in "Grow your skills", outside the timeline. They're filtered by experience. Blocks with an experience limit go under "Picked for your level", most specific first, and the rest go under "Useful at any level".

**The `phase` field** takes one of three forms: a single phase (`"define"`), a list of two or more phases (`["design", "plan"]`), or `"any"` (every phase).

**"Go further" blocks** carry `"optional": true`. They show in their phase, marked "Go further", after the required blocks. They're left out of the timing, the next 3 actions and the progress count. Only core and add-on blocks can use it. Nothing required can depend on one.

**`comesAfter`** is an order-only link. The block comes after the listed blocks when they're in the same phase of the plan. Unlike `dependsOn`, a missing block is ignored and never becomes "check this exists". Use `dependsOn` for work a block really needs, and `comesAfter` for the order to read in. Every add-on must name the core block it extends, and it then sits straight after that block. Decision blocks list everything that must come first.

**`movesUpFor`** lists company sizes for which the block matters more. It goes as early as its `dependsOn` allows, ignores its `comesAfter`, and is marked "Priority at your size of organisation".

**`appliesTo.companySizes`** limits a block to certain sizes. "Not sure" counts as established. **`appliesTo.leadsPeople`** limits a block to Group PMs, Directors and VPs, and puts it in "Lead your team".

**`alsoIn`** places an existing block on another track, such as `[{ "phase": "choose", "after": ["strat-diagnose-challenge"] }]`. On that track the block joins the timeline, leaves "Grow your skills", and `after` replaces its usual `dependsOn` and `comesAfter`. `"forEveryone": true` drops its PM type, product type, starting-point and experience limits on that track only. `"optional": true` makes the block "Go further" on that track only, which is how the reused blocks join the explore track. The phase can be a strategy, coaching or explore phase.

**The explore track** is for people who aren't PMs yet ("I'm exploring product management"). Its four phases are `explore-role`, `explore-foundations`, `explore-practise` and `explore-apply`, and its one starting point is `explore-new`. Its blocks live in the folder named after their phase, have beginner steps only, no delegated tasks or reviewers, and use `"stages": ["explore-new"]`. Which blocks each goal gets is in `content/explore-goal-map.ts`, which matches `docs/phase-8c-goal-map.json`. A block with an explore phase that isn't on a goal's list is left out of that goal's plan.

**`inLeadYourTeam`** also shows a block in "Lead your team" to people leaders on any track, unless it's already on their timeline. Use it rather than `leadsPeople` when the block must stay available to others elsewhere.

**`leaderView`** is what a leader sees instead of the steps: `{ "good": "one sentence", "ask": ["question", "question"], "signs": ["warning sign", "warning sign"] }`. Every product-track timeline block must have one, meaning a core or add-on block in a product phase that isn't `inLeadYourTeam`. Strategy, coaching, craft, onboarding, ways-of-working and Lead your team blocks don't need it. `pnpm validate:content` checks that it has exactly 2 questions and 2 warning signs. It shows on the plan page in the leader view, and on the block's Library page under "If you lead the team".

**`region`** is `"uk"` only when a block's steps depend on UK-only law, processes or bodies. Citing a UK source is not enough. It shows a "UK guidance" label. Leave it out for guidance that works anywhere.

**`titleWhenLive`** gives a block a different name on a live product, where the usual title would mislead.

**`worksWithoutTeam`** marks a ways-of-working block that still applies with no team roles picked. Other ways-of-working blocks are left out of that plan.

**`appliesTo.experience`** limits a block to certain levels. An empty list means every level. "Not sure" counts as intermediate. Nothing can depend on a block that some of its own visitors won't get.

**Placeholder blocks** carry `"placeholder": true` and the word PLACEHOLDER in the title. They are dummy content for testing the Library. The site marks them, keeps them out of search engines and the sitemap, and `pnpm validate:content` warns until they are removed.

### What `pnpm validate:content` checks

Each block on its own:
- `id` is lowercase words joined by hyphens, and matches the file name.
- Every field is present, and no unknown fields appear (this catches typos).
- `phase`, `kind`, PM types, product types, stages, ways of working, roles, tools and freshness all use values from `content/taxonomy.ts`.
- `appliesTo` has all five lists. An empty list means "applies to all".
- A craft block uses phase `"any"`.
- `titleWhenLive` is some text, and only ways-of-working blocks use `worksWithoutTeam`.
- `companySizes` and `movesUpFor` use real sizes, and `leadsPeople` is `true` or left out.
- `pm` is never given a task or asked to review, because the PM is the visitor.
- `optional` is `true` or left out, and only appears on core and add-on blocks.
- `steps` has at least one step for each of `beginner`, `intermediate` and `experienced`. The exception is a block whose phases are all on the explore track: it has `beginner` steps only, and the validator refuses the other two.
- `skills` has one to three of the ten skills in `content/taxonomy.ts`, with no repeats.
- Every delegable task has a valid `ifMissing`, and any `orRoles` are real roles other than the main one.
- `definitionOfDone` has at least one item. `pitfalls` must be present but may be empty.
- `estimatedEffort` is a number or range and a unit: `30 minutes`, `2-4 hours`, `1 day`, `2-3 days`.
- `sources` has at least one entry with a full `http(s)` address. Every block cites its sources.
- `lastReviewed` is a real date written `YYYY-MM-DD`, and not in the future.

Across all blocks:
- Ids are unique, and each file is in the right folder for its phase.
- Every `dependsOn` id exists, is not the block itself, and is not in a later phase.
- There are no circular dependencies.
- Required work doesn't depend on a "Go further" block, and no block depends on a block some of its experience levels never see.
- A block can only depend on blocks from its own track, and phase order is compared within a track.
- Every `alsoIn` phase is a strategy, coaching or explore phase, and its `after` ids exist on that track.
- Every `comesAfter` id exists, shares a phase with the block and isn't the block itself, and loops are caught across `dependsOn` and `comesAfter`.

Role ids: `pm`, `delivery-manager`, `scrum-master`, `ba`, `user-researcher`, `ux-designer`, `content-designer`, `tech-lead`, `frontend-engineer`, `backend-engineer`, `fullstack-engineer`, `architect`, `devops`, `qa`, `data-analyst`, `data-scientist`, `performance-analyst`, `policy-legal`, `product-owner`, `hardware-engineer`, `senior-leader`, `people-partner`. Tool ids are listed in `content/taxonomy.ts`.

## 4. The curriculum engine (`lib/curriculum-engine.ts`)

A pure function, `buildPlan(answers, blocks) -> Plan`, with no database, no AI and no randomness.

1. **Select** core blocks for the phases from `phasesCovered` in `lib/intake-phases.ts`. A block's experience limit must always fit. Add onboarding blocks if they're joining mid-build or live, and add-ons that match their PM type or product type (an empty list never counts as a match). A block's stage and way-of-working tags must always fit. Add **ways-of-working** blocks that match the answer to "How does your team work?": a block is picked when its `waysOfWorking` list is empty or contains the visitor's answer. For "Not sure", only blocks with an empty list are picked. A block whose phase is `"any"` or a list is picked if any of its phases is in the visitor's starting point (the exact rule is settled in Phase 4).
2. **Order** by the plan's phases, then by `dependsOn` within a phase. If a dependency isn't earlier in the plan, show it as "check this exists" rather than as a task. A block written only for levels below the visitor's isn't dropped: it goes in "Refresh the basics". Within a phase, `dependsOn` and `comesAfter` set the order. Add-ons sit straight after the block they extend, and "Go further" blocks come last. Onboarding, ways-of-working and craft blocks sit outside the timeline, in a collapsed "If you're new to this product" section, "Your team's rhythm" and "Grow your skills". "Your team's rhythm" only shows on the product track.
3. **Shape** the steps to the visitor's experience level. If "Not sure" was chosen, use intermediate.
4. **Assign** roles. If the team isn't answered, each task shows its roles as "Who usually helps", with no warnings and no suggested reviewers. For each delegable task, the first person in the team from `role`, then `orRoles`, gets it, as in "Ask your BA" or "Ask your 3 Backend Engineers". A full-stack engineer covers frontend and backend tasks. If nobody can do it, `ifMissing` sets the note. Use the team list to suggest who reviews.
5. **Tools.** Show tool examples only for the tools the visitor picked. `other` (a tool that isn't listed) matches no examples. If none match, show a short tool-agnostic tip.
6. **Pace.** Blocks in a phase overlap, so a phase is its longest required block plus a quarter of the rest. `estimatedEffort` means start-to-finish working time, not PM hours. Blocks only count the PM's part of Build, so Build counts as at least 4 weeks. Measure also counts as at least 4 weeks, because results need time to build up after launch. The plan is then fitted to the timeline's length to plan across (9, 20 or 26 weeks; "Under 1 month" isn't stretched). Build gets two-thirds of the spare time, and the other phases share the rest in proportion. With no Build, the phases stretch evenly to at most 3 times what the work usually takes. Longer than the timeline's longest length is tight, and the plan is squeezed to end on time. A tight plan under 1 month also says what to do: narrow to the smallest valuable release, finish one phase first, or both. A "Not sure" timeline isn't fitted to anything.
7. **Explain.** Every block in the plan carries a short "why you're seeing this", e.g. "Because you're an AI PM in Build".

**Tests must cover:** each starting point, each experience level, missing roles, an empty tools list, "Not sure" answers, conflicting dependencies, and that the same answers always give the same plan. `lib/plan-logic.test.ts` holds the rules that must be true of every plan and runs them across a wide spread of answers, using the real blocks.

**Checking plans make sense:** tests can't judge whether a plan reads well to a PM. After each big batch of blocks, and fully before launch, a QA agent reads sample plans in full.

## 5. Keeping content up to date (later phase)

A **GitHub Actions** workflow runs weekly and does three things:
1. It picks blocks that are `fast-moving` and overdue for review (more than 30 days since `lastReviewed`), plus `changes-yearly` blocks more than 365 days old.
2. For each one, it asks Claude to check the block's sources and the current state of the field, and to suggest edits with reasons and new sources. Claude must say "no change needed" when that's the honest answer.
3. If there are changes, it opens **one pull request** with the edited block files and a plain-English summary. The edits must still pass `validate:content`.

Rinaz reviews the pull request on the Vercel preview link and merges it, or closes it. **Nothing changes on the live site without her approval.** The workflow also makes a harmless call to the Supabase project, so the free plan doesn't pause it for inactivity. It has a hard cap on blocks per run, to control AI cost.

## 6. Content production

- **Now:** **153 blocks** (5 November 2026):

  | Kind | Blocks |
  |---|---|
  | Core (all tracks) | 69 |
  | Add-ons | 49 |
  | Craft | 17 |
  | Ways of working | 13 |
  | Onboarding | 5 |

- **Phase 2 starts with about 12 blocks**, drafted by Rinaz in a separate planning chat and added to `content/blocks/` by Claude Code, which fixes anything the validator flags. Claude Code does not write block content in Phase 2. Two clearly marked placeholder blocks stand in until then.
- **Drafting:** Claude researches each block from reputable public sources (for example the GOV.UK Service Manual, Atlassian guides, Nielsen Norman Group, Marty Cagan / SVPG, Teresa Torres, Reforge essays and vendor docs for tool steps) and writes it in our own words, with citations. No copied text.
- **Review:** Rinaz edits blocks in batches, one phase at a time.
