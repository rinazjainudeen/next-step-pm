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

**Starting points** shown to the visitor:
- **Starting something new**: phases 1 to 4.
- **Joining mid-build**: phases 3 to 7, plus an "onboarding onto an existing product" pack.
- **Running a live product**: phases 8 and then 1 to 3 again, plus a "taking over a live product" pack.

These are the usual phases. If a visitor's milestone is further on, their plan can run past them, along the stage's `journey` in `content/taxonomy.ts`: new and mid-build can continue to phase 8, and live can continue round to phase 7. If the stage is "Not sure", the plan covers the same phases as "Starting something new". `lib/intake-phases.ts` works this out.

## 2. Intake questions (the taxonomy)

The allowed values live in `content/taxonomy.ts`, so blocks and questions can't drift apart.

1. **What kind of PM are you?** General · AI and innovation · Data · Technical / platform · Product transformation · Growth / commercial · Not sure.
2. **What kind of product?** Consumer digital product · Business software (B2B / SaaS) · Public sector service · Internal tool or platform · Data or AI product · Not sure.
3. **Where is the product now?** Starting something new · Mid-build · Live. Then an optional follow-up for the exact phase.
4. **Your experience as a PM:** Beginner (under 1 year) · Intermediate (1 to 4 years) · Experienced (5+ years).
5. **Who is in your team?** Multi-select, with how many of each role (1 to 20+). Options: Delivery Manager, Scrum Master, BA, User Researcher, UX Designer, Content Designer, Tech Lead, Frontend Engineer, Backend Engineer, Full-stack Engineer, Architect, DevOps / SRE, QA / Tester, Data Analyst, Data Scientist / ML Engineer, Performance Analyst, Policy / Legal / Compliance, Product Owner.
6. **Which tools do you use?** Grouped as: tracking (Jira, Azure DevOps, Linear, Trello), docs (Confluence, Notion, SharePoint/Word, Google Docs), design (Figma, Miro, Mural), code and hosting (GitHub, GitLab, AWS, Azure, GCP, Vercel), analytics (GA4, Amplitude, Mixpanel, Power BI, Looker), and AI assistants (Claude, ChatGPT, Copilot, Gemini). There is also "A tool that isn't listed", with no text box, which leads to tool-agnostic tips.
7. **Your timeline to the next milestone:** under 1 month · 1 to 3 months · 3 to 6 months · 6+ months. A milestone is the next point that matters to the visitor, such as a small feature release, the end of discovery, going live or the end of a client contract. The answer sets how long the plan runs: blocks are spread across that time week by week, with a warning if it looks tight. An optional follow-up, "Which phase do you want to finish by then?", sets where the plan ends. It needs a real stage and a real date, and offers the phases from where the visitor is to the end of the stage's journey.
8. **How does your team work?** Scrum · Kanban · Hybrid / stage gates · Not sure.

Every question also has a **Not sure** option, with a one-line explanation of what it means for the plan. Its value is `not-sure`. It's an intake answer only, so it isn't in `content/taxonomy.ts` and blocks can't use it. On the team and tools questions it can't be ticked alongside anything else.

Answers are encoded in the URL using the taxonomy ids, for example `/plan?pm=ai&product=public&stage=mid-build&phase=build&exp=beginner&team=ba,backend-engineer:3,ux-designer&tools=jira,confluence,figma&time=1-3m&until=launch&way=scrum`. `phase` is the optional follow-up to question 3 (where the plan starts), and `until` is the optional follow-up to question 7 (where it finishes). A number after a role is how many; no number means one. That way a plan can be shared and refreshed with no database. While the visitor is answering, `/start` adds `step=3` to show which question they're on.

## 3. A learning block

One JSON file per block. A block with a single phase lives in `content/blocks/<phase>/<id>.json`. A block with `"phase": "any"` or a list of phases lives in `content/blocks/cross-phase/<id>.json`. The file name must match the block's `id`. The file is validated by `lib/blocks-validate.ts`; a bad block fails `pnpm validate:content` and the build.

```jsonc
{
  "id": "define-problem-statement",
  "title": "Write a problem statement and hypothesis",
  "phase": "define",                    // one phase | a list, e.g. ["design", "plan"] | "any"
  "kind": "core",                       // core | add-on | onboarding | ways-of-working
  "summary": "One or two sentences on why this matters.",
  "appliesTo": {                        // empty list = applies to all
    "pmTypes": [],
    "productTypes": [],
    "stages": ["new", "mid-build"],
    "waysOfWorking": []                 // scrum | kanban | hybrid
  },
  "steps": {
    "beginner":    ["Detailed step with guidance…", "…"],
    "intermediate":["Shorter step…", "…"],
    "experienced": ["Checklist item…", "…"]
  },
  "roles": {
    "owner": "pm",
    "canDelegateTo": [
      { "role": "ba", "task": "Draft the problem statement from research notes" },
      { "role": "user-researcher", "task": "Supply the evidence and quotes" }
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
  "freshness": "evergreen",             // evergreen | changes-yearly | fast-moving
  "sources": [{ "title": "…", "url": "https://…" }],
  "lastReviewed": "2026-11-04"
  // "placeholder": true               // optional. Only for dummy blocks used to test the site
}
```

**Kinds of block:**
- **core**: every PM in that phase gets it.
- **add-on**: only for certain PM or product types. Examples: "Evaluate model quality" for AI products, "Prepare for a service assessment" for public sector services, "Map the current process" for transformation.
- **onboarding**: for people joining mid-build or a live product. Examples: "Read the decision trail", "1:1s with each role", "Find the live dashboards".
- **ways-of-working**: how the team works, rather than what it produces. Examples: sprint planning, refinement, the daily stand-up, review, retrospective, Kanban flow and WIP limits, stage-gate reviews, roadmaps and estimation. These blocks often belong to several phases or to none in particular, so their `phase` can be a list or `"any"`. They are picked by the visitor's answer to "How does your team work?", using `appliesTo.waysOfWorking`.

**The `phase` field** takes one of three forms: a single phase (`"define"`), a list of two or more phases (`["design", "plan"]`), or `"any"` (every phase).

**Placeholder blocks** carry `"placeholder": true` and the word PLACEHOLDER in the title. They are dummy content for testing the Library. The site marks them, keeps them out of search engines and the sitemap, and `pnpm validate:content` warns until they are removed.

### What `pnpm validate:content` checks

Each block on its own:
- `id` is lowercase words joined by hyphens, and matches the file name.
- Every field is present, and no unknown fields appear (this catches typos).
- `phase`, `kind`, PM types, product types, stages, ways of working, roles, tools and freshness all use values from `content/taxonomy.ts`.
- `appliesTo` has all four lists. An empty list means "applies to all".
- `steps` has at least one step for each of `beginner`, `intermediate` and `experienced`.
- `definitionOfDone` has at least one item. `pitfalls` must be present but may be empty.
- `estimatedEffort` is a number or range and a unit: `30 minutes`, `2-4 hours`, `1 day`, `2-3 days`.
- `sources` has at least one entry with a full `http(s)` address. Every block cites its sources.
- `lastReviewed` is a real date written `YYYY-MM-DD`, and not in the future.

Across all blocks:
- Ids are unique, and each file is in the right folder for its phase.
- Every `dependsOn` id exists, is not the block itself, and is not in a later phase.
- There are no circular dependencies.

Role ids: `pm`, `delivery-manager`, `scrum-master`, `ba`, `user-researcher`, `ux-designer`, `content-designer`, `tech-lead`, `frontend-engineer`, `backend-engineer`, `fullstack-engineer`, `architect`, `devops`, `qa`, `data-analyst`, `data-scientist`, `performance-analyst`, `policy-legal`, `product-owner`. Tool ids are listed in `content/taxonomy.ts`.

## 4. The curriculum engine (`lib/curriculum-engine.ts`)

A pure function, `buildPlan(answers, blocks) -> Plan`, with no database, no AI and no randomness.

1. **Select** core blocks for the phases from `phasesCovered` in `lib/intake-phases.ts`. Add onboarding blocks if they're joining mid-build or live, and add-ons that match their PM type and product type. Add **ways-of-working** blocks that match the answer to "How does your team work?": a block is picked when its `waysOfWorking` list is empty or contains the visitor's answer. For "Not sure", only blocks with an empty list are picked. A block whose phase is `"any"` or a list is picked if any of its phases is in the visitor's starting point (the exact rule is settled in Phase 4).
2. **Order** by phase, then by `dependsOn`. If a dependency comes from an earlier phase, show it as "check this exists" rather than as a task.
3. **Shape** the steps to the visitor's experience level. If "Not sure" was chosen, use intermediate.
4. **Assign** roles. For each delegable task, if the role is in the team, show "Ask your BA to…". If not, give the task to the PM with a note, e.g. "No QA in your team: agree who tests, and add time for it". Use the team list to suggest who reviews.
5. **Tools.** Show tool examples only for the tools the visitor picked. `other` (a tool that isn't listed) matches no examples. If none match, show a short tool-agnostic tip.
6. **Pace.** Group blocks into weeks according to the timeline answer, and flag the plan as tight if the total effort is more than the time available.
7. **Explain.** Every block in the plan carries a short "why you're seeing this", e.g. "Because you're an AI PM in Build".

**Tests must cover:** each starting point, each experience level, missing roles, an empty tools list, "Not sure" answers, conflicting dependencies, and that the same answers always give the same plan.

## 5. Keeping content up to date (later phase)

A **GitHub Actions** workflow runs weekly and does three things:
1. It picks blocks that are `fast-moving` and overdue for review (more than 30 days since `lastReviewed`), plus `changes-yearly` blocks more than 365 days old.
2. For each one, it asks Claude to check the block's sources and the current state of the field, and to suggest edits with reasons and new sources. Claude must say "no change needed" when that's the honest answer.
3. If there are changes, it opens **one pull request** with the edited block files and a plain-English summary. The edits must still pass `validate:content`.

Rinaz reviews the pull request on the Vercel preview link and merges it, or closes it. **Nothing changes on the live site without her approval.** The workflow also makes a harmless call to the Supabase project, so the free plan doesn't pause it for inactivity. It has a hard cap on blocks per run, to control AI cost.

## 6. Content production

- **First release:** about **90 blocks** (planned 4 November 2026, up from 40 to 50). The target mix:

  | Kind | Blocks |
  |---|---|
  | Core lifecycle | about 40 |
  | Ways of working | about 15 |
  | PM-type add-ons | about 15 |
  | Product-type add-ons | about 12 |
  | Onboarding | about 8 |

- **Phase 2 starts with about 12 blocks**, drafted by Rinaz in a separate planning chat and added to `content/blocks/` by Claude Code, which fixes anything the validator flags. Claude Code does not write block content in Phase 2. Two clearly marked placeholder blocks stand in until then.
- **Drafting:** Claude researches each block from reputable public sources (for example the GOV.UK Service Manual, Atlassian guides, Nielsen Norman Group, Marty Cagan / SVPG, Teresa Torres, Reforge essays and vendor docs for tool steps) and writes it in our own words, with citations. No copied text.
- **Review:** Rinaz edits blocks in batches, one phase at a time.
