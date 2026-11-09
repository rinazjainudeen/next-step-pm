# Phase 8b: Plans for leaders (APPROVED by Rinaz on 9 November 2026)

Date: 9 November 2026. This comes from the site review (SITE-REVIEW-NOV-2026.md, finding 1). Directors and VPs currently get a hands-on PM timeline. This phase makes their plan about leading the work: making sure it's done well, not doing it themselves.

## 1. A leader view on every timeline block
- 86 product-track blocks get a new `leaderView` field, drafted by Claude in PHASE-8B-LEADER-VIEWS.json:
  - **What good looks like:** one sentence.
  - **Ask your PM:** two questions.
  - **Warning signs:** two.
- Strategy, coaching, craft, onboarding, ways-of-working and Lead your team blocks don't need it, because they're already written for the person doing them.
- validate:content checks that every product-track timeline block has a leader view with exactly 2 questions and 2 warning signs.

## 2. Two ways to see the plan: hands-on or leader
- A switch above the timeline: "Show steps as: Hands-on | Leader".
- **Defaults by level:**
  - Director and VP default to Leader.
  - Group PM defaults to Hands-on, because they still own product, but the switch is shown.
  - Other levels default to Hands-on, and the switch is shown in "Your answers", not above the timeline, so it doesn't distract.
- The choice is kept in the URL (`view=leader` or `view=hands-on`), so shared links match. With no parameter, the level default applies, and old links are unchanged.

## 3. What changes in Leader view
- **Block cards** show What good looks like, Ask your PM and Warning signs. A "See the hands-on steps" link opens the steps, collapsed.
- **Ticks:** each "Ask your PM" question can be ticked, saved in the browser like step ticks. The progress line reads "0 of N questions asked".
- **"Who can do this"** missing-role warnings are hidden, because they describe the PM's team, not the leader's.
- **Next 3 actions** become "Ask your PM: <question>". They take the first question from each of the first 3 blocks in the current phase, respecting the challenge order.
- **Headings:**
  - The timeline heading becomes "Your team's work, phase by phase".
  - "Your timing" becomes "Your team's timing".
  - The lead line becomes "Use these to check the work is on track. You don't need to do the steps yourself."
- **Lead your team** moves above the timeline, because it's the leader's own work.

## 4. A nudge towards strategy
For Group PM, Director and VP on the product track, add a small card after Lead your team:
- Heading: "Setting direction as well?"
- Text: "Build a strategy plan to diagnose the challenge, choose your bets and align leaders."
- Button: "Build a strategy plan". It opens the intake on the strategy track, with level, size and product type already filled in.

## Not in 8b
- Rewriting the "Experienced" steps so they're harder, not shorter, is in 8d (the content pass).

## Acceptance checks
- Every product-track timeline block has a valid leader view, and validate:content enforces it.
- A Director or VP plan opens in Leader view, with "Ask your PM" next actions and Lead your team above the timeline.
- Switching to Hands-on shows today's plan exactly. Switching back restores Leader view, and the URL reflects the choice.
- A product manager plan with no view parameter is identical to today's.
- Question ticks survive a refresh and don't appear in the URL.
- The strategy nudge appears for Group PM and above only, and opens the intake with level, size and product type filled in.
