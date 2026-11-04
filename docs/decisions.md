# Decision log

Newest first. Each entry gives the date, the decision and why.

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
- **Work in VS Code with Claude Code.** This file, `docs/plan.md` and `docs/content-model.md` are the hand-over between planning chats and building sessions.
