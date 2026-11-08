> Copied from the planning chat. Approved by Rinaz on 7 November 2026. Phase 8a-1 is built on the branch `feature/phase-8a-skills-challenge`.

# Phase 8a: make plans personal and manageable (DRAFT for Rinaz to approve)

Date: 7 November 2026. This replaces the Phase 8a section in docs/plan.md. It draws on the approved additions (REPLAN-INTAKE-V2.md section 5) and the usefulness check (PHASE-7C-USEFULNESS-CHECK.md).

It is split into two branches so each can be tested on its own. Everything is saved in the URL or the browser: no accounts, no database and no AI.

---

## Phase 8a-1: skills, challenge and a shorter-feeling plan

### 1. Ten PM skills, tagged on every block
Each block gets `skills`: one to three of these ids. Claude drafts the tags for all 153 blocks, and Claude Code applies and validates them.

| id | Skill | One line shown on the site |
|---|---|---|
| discovery | Discovery and research | Finding out what users need and what's worth solving. |
| strategy | Strategy and vision | Deciding where to play, what to bet on and what to stop. |
| prioritisation | Prioritisation and roadmapping | Choosing what comes first and saying no well. |
| data | Data and measurement | Knowing whether it's working, with numbers you trust. |
| design | Design and user experience | Shaping solutions people can use and want. |
| delivery | Delivery and execution | Getting good work shipped, steadily. |
| technical | Technical and AI fluency | Understanding how the product is built and where it can fail. |
| communication | Communication and influence | Bringing people with you, at every level. |
| commercial | Commercial and business sense | Making it work for the business as well as users. |
| leadership | Leadership and coaching | Growing the people and teams around you. |

The Library gets a skills filter. Each block card shows its skills as small labels.

### 2. A new intake question: "What's your biggest challenge right now?"
It is asked after "Where are you starting from?" and is required, with a "Not sure" option.

| Option | Hint | Skills it favours | Extra effect |
|---|---|---|---|
| We're not sure what to build next | Lots of ideas, little evidence. | discovery, prioritisation | none |
| Too many requests, and it's hard to say no | Everything feels urgent. | prioritisation, communication | none |
| We ship, but can't tell if it's working | Little or no measurement. | data | none |
| People aren't aligned on the direction | Leaders or teams pull different ways. | strategy, communication | none |
| Delivery is slow or unpredictable | Dates slip, and work gets stuck. | delivery, technical | none |
| I'm new and need to get up to speed | A new role, product or team. | none | opens "If you're new to this product" by default and puts it first |
| I want to grow into a bigger role | Getting ready for the next level. | leadership, strategy | "Grow your skills" moves above the timeline |
| Not sure | We'll keep your plan balanced. | none | none |

**Rule:** in each phase, blocks tagged with a favoured skill move as early as their dependencies allow (the same rule as `movesUpFor`). They are marked "Helps with your challenge". The next 3 actions come from the first marked block when there is one.

### 3. Open only the phase you're in
- The current phase is the first one with blocks not yet ticked. It opens, and later phases are collapsed with a block count. Earlier phases stay collapsed, marked done.
- An "Open all phases" button sits above the timeline.
- Print / save as PDF always shows everything.

### 4. A plan opening line
Two short sentences above "Your next 3 actions": one for the level, then one for the first PM type, or the track. Draft wording:

**Levels**
- Associate or junior PM: "You're building your craft, so this plan explains each step and why it matters."
- Product manager: "You own a feature or module end to end, so this plan focuses on the decisions that are yours to make."
- Senior, staff or principal PM: "You own a product line or a hard problem, so this plan focuses on trade-offs, evidence and influence."
- Group PM or product lead: "You lead PMs while owning product, so this plan pairs your own work with growing your team."
- Director or head of product: "You run a portfolio and the people in it, so this plan focuses on direction, investment and capability."
- VP or CPO: "You set product direction for the company, so this plan focuses on strategy, alignment and the organisation you're building."
- Not sure: "We've pitched this at product manager level. Change it in Your answers at any time."

**PM types (product track)**
- General: "It covers the whole lifecycle, so nothing important is missed."
- Growth: "Growth steps focus on activation, retention and experiments."
- AI: "AI steps focus on data, evaluation and designing for uncertain output."
- Data: "Data steps focus on decisions, quality and trust."
- Technical: "Technical steps treat developers as your users."
- Platform: "Platform steps treat other teams as your customers."
- Transformation: "Transformation steps focus on people and process as much as systems."
- Hardware or IoT: "Hardware steps cover cost, manufacturing and certification."

**Tracks**
- Strategy: "This plan takes you from understanding the situation to a strategy people act on."
- Coaching: "This plan takes you from assessing practice to making it run without you."

---

## Phase 8a-2: your own adjustments (saved in your browser)

### 5. An optional skill self-check
- It sits on the plan page as "How confident are you?", with ten skills. Each has three choices (Getting started, Comfortable, Strong) and can be left blank.
- Blocks for "Getting started" skills move up, using the same rule as the challenge, and are marked "Builds a skill you want to grow". Your challenge's marks take priority.
- It is saved in this browser only, never in the link. It is wrapped in try/catch, like ticks.
- Copy-link and print say "Your self-check isn't included in shared links."

### 6. "Already done" and "Not relevant" on each block
- **Already done:** ticks every step and marks the block done. Later blocks that depend on it treat it as done.
- **Not relevant:** moves the block into a collapsed "Set aside" section at the end, with "Put back". Blocks that depend on it show the existing "check first" note.
- Both are saved in the browser like ticks, with undo. They don't change the shared link.

### Not in 8a
- "Next level" notes are moved to 8b, because they are content (153 sentences).
- The separate "pick two skills" filter on the plan page is dropped. The self-check does the same job better.

---

## Acceptance checks

**8a-1**
- Every block has 1 to 3 valid skills, and validate:content enforces it.
- The challenge question appears, has "Not sure", and is kept in the URL. Old links without it still open, as Not sure.
- With "We ship, but can't tell if it's working", data blocks are marked and come first where dependencies allow.
- With "I'm new…", the new-to-product section is open and first.
- Only the current phase is open, and "Open all phases" and print show everything.
- The opening line matches the level and the PM type or track.
- The Library skills filter works.

**8a-2**
- Rating "data" as Getting started moves data blocks up, and the rating survives a refresh.
- "Already done" ticks the block and counts as done for blocks that depend on it.
- "Not relevant" moves the block to "Set aside", and "Put back" restores it.
- Nothing from 8a-2 appears in the URL.
