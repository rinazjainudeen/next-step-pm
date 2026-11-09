# Phase 8c: Learn the role (spec APPROVED by Rinaz on 9 November 2026; the 18 blocks are in review)

Date: 9 November 2026. This comes from the site review (SITE-REVIEW-NOV-2026.md, finding 2) and Rinaz's decision that people exploring the role are in scope. Today, someone who isn't a PM yet has to answer "Not sure" to almost everything and gets an 87-step plan pitched at a working PM. This phase gives them their own short path.

## 1. A fourth kind of work
Question 1 ("What kind of product work are you doing right now?") gets a fourth option, last before "Not sure":
- **I'm exploring product management** — "You're curious about the role, learning it, or aiming for your first PM job."

It leads to a short intake: 4 questions in total, including question 1.

## 2. The three questions that follow
**Q2. Where are you coming from?** (one answer)
| Option | Hint |
|---|---|
| Software engineering | You build or test software. |
| Design, UX or research | You design or research how people use things. |
| Data or analytics | You work with data, reports or models. |
| Business, operations or consulting | You run processes, projects or client work. |
| Marketing, sales or customer success | You work closely with customers or markets. |
| Student or recent graduate | You're early in your career. |
| Something else | Another background. |
| Not sure | We'll cover the foundations evenly. |

**Q3. What do you want from this?** (one answer)
| Option | Hint | Plan covers |
|---|---|---|
| Understand what the role involves | You want to know what PMs do before deciding. | Explore the role, Build foundations |
| Move into a PM role where I work now | You want an internal move. | All four phases, with the internal-move route |
| Get my first PM job somewhere new | You're aiming to apply elsewhere. | All four phases, with the job-search route |
| Work better with product managers | You work alongside PMs and want to understand them. | Explore the role, Build foundations (shorter) |
| Not sure | We'll start with understanding the role, then practising. | Explore the role, Build foundations, Practise |

**Q4. How much time can you give each week?** (one answer)
Under 3 hours · 3 to 6 hours · 7 hours or more · Not sure ("We'll assume 3 to 6 hours.")
The plan says "This plan takes about N weeks at your pace", using each block's time estimate.

Skipped for this track: level (set to Associate steps), product type, company size, stage, challenge, team, tools, milestone and way of working. The plan page's "Tailor your plan" panel is not shown. Leader view doesn't apply.

## 3. Four phases, 18 new blocks
| Phase | Ready to move on when | New blocks |
|---|---|---|
| **Explore the role** | You know what PMs do, which kind suits you, and whether you want to carry on. | xr-what-pms-do · xr-is-pm-for-me · xr-pm-types-companies · xr-talk-to-pms |
| **Build foundations** | You can explain the product process, read basic numbers and use AI tools sensibly. | xr-map-your-skills · xr-product-process · xr-numbers-for-pms · xr-ai-tools-for-learning |
| **Practise** | You've done a small real project and have a case study to show. | xr-choose-practice-project · xr-run-mini-discovery · xr-brief-and-prioritise · xr-define-success-test · xr-portfolio-case-study · xr-get-feedback |
| **Apply** | You've applied, or taken on PM work, with a clear story. | xr-internal-move · xr-product-cv · xr-find-entry-routes · xr-interview-prep |

- **Reused existing blocks:** Build technical fluency, Write clearly, Answer your own questions with data (as a "Go further" block) and Get up to speed on an existing product (as the first-90-days block after an offer). They appear through the existing `alsoIn` mechanism, not as copies.
- **A real exit ramp:** "Check whether product management is right for you" ends with three honest outcomes: carry on, aim for a neighbouring role (product owner, business analyst, delivery manager, designer, product marketing), or stop.
- **Apply phase by goal:** the internal-move block only appears for "Move into a PM role where I work now". "Find entry routes", "Write a product-focused CV" and "Prepare for PM interviews" appear for both job goals.
- Block rules stay as they are: three levels of steps (explorer blocks need only beginner steps, with the intermediate and experienced steps left out), sources cited, definition of done, pitfalls, a leader view not required, and skills tagged. Blocks are drafted here in two batches for your review, then added by Claude Code.

## 4. Your background shapes the plan
Using the same mechanism as the challenge, the background favours the skills where people from that background usually have gaps:
| Background | Skills favoured |
|---|---|
| Software engineering | Commercial sense, discovery, communication |
| Design, UX or research | Data, commercial sense, technical |
| Data or analytics | Discovery, communication, commercial sense |
| Business, operations or consulting | Technical, discovery, design |
| Marketing, sales or customer success | Data, technical, delivery |
| Student or recent graduate | Discovery, communication, data |
| Something else, or Not sure | None, so the plan stays balanced |

Labels read, for example, "Helps close a common gap for people coming from engineering." The 3-label limit applies. "Map your skills to product management" gets a background-specific opening line, such as "Engineers already know how products get built. Spend your time on users and the business."

## 5. Opening line and the plan page
- Opening line: "You're exploring product management, so this plan helps you learn what the job is, build foundations, practise on a real problem and, if you want, apply."
- The first phase is open, the rest are collapsed, as today. Ticks, copy link, print and the self-check all work.
- Next 3 actions come from the first block, as today.

## 6. Home page and Library
- Add the "New to product" card to the "Built for" section: "Learn what the job is, build the basics and practise on a real problem." It links to the intake with the exploring option chosen.
- Add a "New to product?" pill to the home hero's jump links.
- Update the stat counts (blocks and phases). The Library's phase filter includes the four new phases.

## Not in 8c
- A PM-type interest question (it can go in a later "Tailor your plan" panel for explorers).
- Paid courses or bootcamp recommendations. We cite free, reputable sources only.

## Acceptance checks
- The intake for "exploring" has 4 questions, and old links are unchanged.
- An engineer and a graduate get different "Helps close a common gap" labels, with at most 3.
- "Work better with PMs" gets no Practise or Apply phase. "Move into a PM role where I work now" gets the internal-move block and no job-search-only blocks. "Get my first PM job somewhere new" gets the reverse.
- "Not sure" on every question gives Explore, Build foundations and Practise.
- Hours per week change the "about N weeks" line.
- The plan has no team, tools, challenge or leader-view controls.
- Every new block has sources, a definition of done and pitfalls, and validate:content passes.
- Product, strategy and coaching plans are unchanged.

## Addendum (9 November 2026): decisions made while writing the blocks
- **Beginner steps only.** The blocks have only beginner steps, because the path is written for people who aren't PMs yet. The block validator currently needs all three levels, so it must accept a beginner-only block when the block's phase is on the explore track.
- **No "Who can do this" section for explorers.** The visitor does the work themselves, and the blocks have no delegated tasks or reviewers. The plan page hides that section on this track.
- **Goal to blocks:** see PHASE-8C-GOAL-MAP.json. "Understand" gets 8 blocks, "Work better with PMs" gets 5, "Move into a PM role where I work now" gets 18, "Get my first PM job somewhere new" gets 17 (no internal-move block), and "Not sure" gets 14 (no Apply blocks).
- **Reused blocks as "Go further":** Build technical fluency and Write clearly join the Build foundations phase through `alsoIn` (optional). Answer your own questions with data joins it too. Get up to speed on an existing product joins the Apply phase, for those with an offer or an internal move. `alsoIn` currently only accepts strategy and coaching phases, so the validator needs to accept explore phases too.
- **New stage:** one stage, `explore-new`, on the explore track. All the new blocks use it.
- **Skills favoured by background:** the new blocks' skill tags are already set so the existing mechanism works. Background chooses the favoured skills, as in section 4.
