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

## 2. Intake questions (the taxonomy)

The allowed values live in `content/taxonomy.ts`, so blocks and questions can't drift apart.

1. **What kind of PM are you?** General · AI and innovation · Technical / platform · Product transformation · Growth / commercial · Not sure.
2. **What kind of product?** Consumer digital product · Business software (B2B / SaaS) · Public sector service · Internal tool or platform · Data or AI product · Not sure.
3. **Where is the product now?** Starting something new · Mid-build · Live. Then an optional follow-up for the exact phase.
4. **Your experience as a PM:** Beginner (under 1 year) · Intermediate (1 to 4 years) · Experienced (5+ years).
5. **Who is in your team?** Multi-select with counts. Options: Delivery Manager, Scrum Master, BA, User Researcher, UX Designer, Content Designer, Frontend Engineer, Backend Engineer, Full-stack Engineer, Architect, DevOps / SRE, QA / Tester, Data Analyst, Data Scientist / ML Engineer, Performance Analyst, Policy / Legal / Compliance, Product Owner.
6. **Which tools do you use?** Grouped as: tracking (Jira, Azure DevOps, Linear, Trello), docs (Confluence, Notion, SharePoint/Word, Google Docs), design (Figma, Miro, Mural), code and hosting (GitHub, GitLab, AWS, Azure, GCP, Vercel), analytics (GA4, Amplitude, Mixpanel, Power BI, Looker), and AI assistants (Claude, ChatGPT, Copilot, Gemini).
7. **Your timeline to the next milestone:** under 1 month · 1 to 3 months · 3 to 6 months · 6+ months. This sets how deep each step goes and gives the plan a week-by-week rhythm.
8. **How does your team work?** Scrum · Kanban · Hybrid / stage gates · Not sure.

Answers are encoded in the URL, for example `/plan?pm=ai&product=public&stage=build&exp=beginner&team=ba,qa,ux&tools=jira,confluence,figma&time=1-3m&way=scrum`. That way a plan can be shared and refreshed with no database.

## 3. A learning block

One JSON file per block in `content/blocks/<phase>/<id>.json`. The file is validated by `lib/blocks-validate.ts`; a bad block fails `pnpm validate:content` and the build.

```jsonc
{
  "id": "define-problem-statement",
  "title": "Write a problem statement and hypothesis",
  "phase": "define",
  "kind": "core",                       // core | add-on | onboarding
  "summary": "One or two sentences on why this matters.",
  "appliesTo": {                        // empty list = applies to all
    "pmTypes": [],
    "productTypes": [],
    "stages": ["new", "mid-build"]
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
}
```

**Kinds of block:**
- **core**: every PM in that phase gets it.
- **add-on**: only for certain PM or product types. Examples: "Evaluate model quality" for AI products, "Prepare for a service assessment" for public sector services, "Map the current process" for transformation.
- **onboarding**: for people joining mid-build or a live product. Examples: "Read the decision trail", "1:1s with each role", "Find the live dashboards".

## 4. The curriculum engine (`lib/curriculum-engine.ts`)

A pure function, `buildPlan(answers, blocks) -> Plan`, with no database, no AI and no randomness.

1. **Select** core blocks for the phases in the visitor's starting point. Add onboarding blocks if they're joining mid-build or live, and add-ons that match their PM type and product type.
2. **Order** by phase, then by `dependsOn`. If a dependency comes from an earlier phase, show it as "check this exists" rather than as a task.
3. **Shape** the steps to the visitor's experience level. If "Not sure" was chosen, use intermediate.
4. **Assign** roles. For each delegable task, if the role is in the team, show "Ask your BA to…". If not, give the task to the PM with a note, e.g. "No QA in your team: agree who tests, and add time for it". Use the team list to suggest who reviews.
5. **Tools.** Show tool examples only for the tools the visitor picked. If none match, show a short tool-agnostic tip.
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

- **First release:** about 40 to 50 blocks: 3 to 5 core blocks per phase, the two onboarding packs, and 1 to 2 add-ons for each PM type and product type.
- **Drafting:** Claude researches each block from reputable public sources (for example the GOV.UK Service Manual, Atlassian guides, Nielsen Norman Group, Marty Cagan / SVPG, Teresa Torres, Reforge essays and vendor docs for tool steps) and writes it in our own words, with citations. No copied text.
- **Review:** Rinaz edits blocks in batches, one phase at a time.
