# Phase 8a-2: Focus the plan (approved by Rinaz, 8 November 2026)

This replaces the earlier "Phase 8a-2: your own adjustments" section. See SITE-REVIEW-NOV-2026.md for why. Everything stays in the URL or the browser: no accounts, no database and no AI.

## 1. Fewer, clearer "Helps with your challenge" labels
- Mark at most 3 blocks across the whole timeline: the first 3 favoured blocks in timeline order, starting from the current phase.
- The reason line names the challenge, for example "Helps with: We ship, but can't tell if it's working." It replaces "Because your plan covers…".
- Ordering is unchanged: favoured blocks still move up within their phase.

## 2. Grow your skills: 3 to start with, the rest folded away
- "Start with these" shows 3 skills, picked in this order:
  1. skills that match the challenge
  2. skills rated "Getting started" in the self-check
  3. the current level picks
- Everything else sits under "See all N skills", collapsed and grouped as today (picked for your level, useful at any level).

## 3. Onboarding only when you're new
- "If you're new to this product" opens and comes first only when the challenge is "I'm new and need to get up to speed".
- Otherwise it's one collapsed line, "New to this product? N blocks to get up to speed", which opens on click.

## 4. Team rhythm collapsed by default
It shows one line, such as "Your team's rhythm: 7 repeating activities for Scrum", and opens on click. Print shows it in full.

## 5. An optional skill self-check
- It's a "How confident are you?" panel on the plan page, collapsed by default.
- It lists the ten skills. Each has Getting started, Comfortable and Strong, and can be left blank.
- Skills rated "Getting started" move their blocks up, using the same mechanism as the challenge. Those blocks get "Builds a skill you want to grow". The challenge takes priority, and this label also counts toward the 3-label limit, after the challenge.
- It also feeds "Start with these" (section 2).
- It's saved in this browser only (localStorage, wrapped in try/catch) and never goes in the URL. There's a "Clear my answers" link.

## 6. "Already done" and "Not relevant" on each block
- **Already done:** ticks every step and marks the block done. Blocks that depend on it treat it as done. The current phase moves on when everything in it is done or set aside.
- **Not relevant:** moves the block into a collapsed "Set aside" section at the end, with "Put back". Blocks that depend on it show the existing "check first" note.
- Both have undo, are saved in the browser, and never change the shared link.

## 7. Team and tools move to "Tailor your plan"
- Remove the team and tools questions from the intake, which goes from 11 questions to 9.
- Add a "Tailor your plan" panel on the plan page, collapsed by default, with the same two questions. The answers still go in the URL (the team and tools parameters), so shared links keep them.
- **When team isn't answered:** show each block's roles as "Who usually helps", with no "No X in your team" warnings. "Not sure / no team", when chosen, keeps today's behaviour, where tasks sit with you.
- **When tools aren't answered:** show the tool-neutral tip.
- Old links that include team and tools still work exactly as before.

## 8. Wording and live-product fixes
- Rewrite the next-actions lead-in "From your last release, find: <block title>" as a natural sentence. Do the same for any similar templated lead-ins, such as "Make sure these are done first:".
- **For a live product,** title the timeline "Your improvement loop". After the last phase, add "Then start the loop again with what you've learned." Keep the week ranges.

## Acceptance checks
- No more than 3 challenge or self-check labels appear in any plan, and each names the reason.
- "Grow your skills" shows 3 skills, then "See all N".
- A mid-build PM whose challenge isn't "I'm new" sees onboarding as one collapsed line. With "I'm new", it's open and first.
- The intake has 9 questions. Old links with team and tools give the same plan as before.
- With no team answer, there are no "No X in your team" warnings.
- The self-check, "Already done" and "Not relevant" survive a refresh and never appear in the URL. "Put back" and undo work.
- The live-product timeline reads as a loop. No templated lead-in reads awkwardly.
- With no self-check and nothing set aside, the order of blocks is identical to today's (only labels and folding change).
