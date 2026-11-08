# Next Step PM: working rules for Claude Code

Next Step PM is a free, single-use web tool. A product manager answers 9 questions (kind of work, PM type, what they own, product type, company size, starting point, biggest challenge, timeline, ways of working). Team and tools are optional, in "Tailor your plan" on the plan page. The site then builds a step-by-step curriculum from reusable **learning blocks**.

Rinaz built it as a **portfolio piece** for AI Product Manager and AI Builder roles. It needs to show that she can ship a working product to production that real people use. The audiences, in order: hiring managers, then product managers, then colleagues.

At the start of every session, read `docs/decisions.md`, `docs/plan.md` and `docs/content-model.md`. Summarise in a few lines where we are, then ask what we're doing today.

---

## 1. How to work with Rinaz

- She's a product manager and **not technical**. Explain every command, file and concept in plain English the first time it comes up. No jargon without a one-line explanation.
- **Be a partner, not an order-taker.** Challenge ideas, point out gaps, and give one recommendation rather than a list of options.
- **She owns every account** (GitHub, Vercel, Supabase, Resend, Anthropic). Walk her through each sign-up screen by screen. **Never ask her to paste a password or secret key into the chat.** Tell her where to put it: `.env.local`, Vercel settings or GitHub secrets.
- **Work in small phases she can test.** For each phase:
  1. Say what you'll build and why.
  2. Build it.
  3. Tell her exactly how to check it in the browser: which page, what to click, what she should see.
  4. Wait for her OK before committing.
- **Ask before** installing anything on her computer, changing settings, spending money, or doing anything hard to undo.
- **Never touch the production database** while developing. Use a separate Supabase project for development.
- **Be honest about status.** Say plainly when something is deferred, switched off or unfinished. If a test fails, show her.
- **Never put real personal data in code, tests or examples.** Use made-up data. Don't use content from her employer or clients: no internal links, initiative names or documents.
- Record each decision in `docs/decisions.md` (date, decision, why).

## 2. Tech stack

| Area | Choice |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript strict |
| Package manager | pnpm |
| Styling | Tailwind CSS v4 (`@tailwindcss/postcss`), `tw-animate-css` |
| UI | shadcn/ui, style `base-nova`, on Base UI (`@base-ui/react`); `class-variance-authority`, `clsx`, `tailwind-merge` via `cn()` in `lib/utils.ts` |
| Icons | lucide-react |
| Fonts | `next/font/google`: Inter (body), Ubuntu 400/500/700 (headings) |
| Theme | next-themes: class-based, default light, follows system, toggle in the header |
| Hosting | Vercel Hobby (free; allowed because this is a personal, non-commercial project). Address: `next-step-pm.vercel.app` until a domain is bought |
| Analytics | `@vercel/analytics`, production only |
| Database | **Supabase** (Postgres), free plan, via `@supabase/supabase-js`, server-side only. Holds feedback, ratings and anonymous plan counts only. **Content does not live in the database.** |
| Email | Resend: emails Rinaz when feedback arrives |
| AI | Anthropic API (Claude), server-side only, with a hard monthly spending cap |
| Scheduled job | A GitHub Actions weekly workflow (the content check opens pull requests) |
| Tests | `node --import tsx --test "lib/**/*.test.ts"` |

- Scripts: `dev`, `build`, `start`, `lint`, `test`, plus `validate:content`, which checks every block file.
- Path alias: `@/*` points to the project root.
- Build errors must fail the build; never set `ignoreBuildErrors`. ESLint from day one. Keep image optimisation on.

## 3. Project structure

```
app/
  layout.tsx            fonts, ThemeProvider, Analytics, metadata
  globals.css           Tailwind + design tokens
  page.tsx              home
  start/                the intake questions (client component, one question per step)
  plan/                 the generated plan; answers are read from the URL
  library/              browse all learning blocks
  how-i-built-this/     case study for hiring managers
  decisions/            public decision log (renders docs/decisions.md)
  privacy/              privacy notice
  api/feedback/         POST feedback/rating -> Supabase + Resend
  api/summary/          POST -> AI personal summary (later phase)
components/ui/ site/ intake/ plan/ library/
content/
  blocks/<phase>/<block-id>.json   one learning block per file (see docs/content-model.md)
  blocks/cross-phase/<block-id>.json   blocks whose phase is "any" or a list of phases
  taxonomy.ts                      the allowed values: PM types, product types, phases, roles, tools
lib/
  utils.ts  navigation.ts  supabase.ts (server-only)
  blocks-types.ts  blocks-validate.ts  blocks-load.ts
  intake-types.ts  intake-questions.ts  intake-phases.ts  intake-draft.ts  intake-validate.ts  intake-url.ts     answers <-> URL
  curriculum-engine.ts  plan-types.ts                      PURE: answers + blocks -> plan
  plan-ticks.ts                                            ticks saved in the browser
  feedback-types.ts  feedback-validate.ts  feedback-store.ts  feedback-service.ts
  *.test.ts
docs/
public/images/
.github/workflows/content-check.yml   (later phase)
.env.example
```

**Feature split:** `-types.ts` holds the shapes and on/off switches (e.g. `AI_SUMMARY_ENABLED = false`). `-validate.ts` checks input and returns friendly errors. Pure rules are kept apart from the database and fully tested. `-store.ts` does database reads and writes only and starts with `import "server-only"`. `-service.ts` joins them up.

**The curriculum engine must be pure and deterministic.** It runs with no database and no AI, and the same answers always give the same plan. It needs the most tests in the project.

**API routes:** `runtime = "nodejs"`, `dynamic = "force-dynamic"`. Read JSON safely (400). Validate, and on failure return `{ error: "Please fix the following…", errors: [...] }` with status 400. Rate-limit public routes and add a honeypot field to forms.

**Pages:** server components by default; `"use client"` only where something is interactive. Every page exports `metadata`. Reads never crash a page: if Supabase is down, the site still works.

## 4. Security and privacy

- Secrets go only in environment variables. Never put `NEXT_PUBLIC_` on a secret. `.env*.local` is git-ignored.
- The Supabase service-role key is used only on the server. Turn on Row Level Security for every table, with no public policies; writes go only through our API routes.
- **No names, emails or companies are collected from visitors.** Intake answers are roles and categories only. Feedback is a rating plus optional free text, with a warning not to include personal details. Email is optional and off by default.
- The privacy page explains, in plain UK English: what's stored, why, for how long, and how to ask for deletion.
- Any AI call must send only the visitor's category answers and the selected block content, and nothing they typed freely without a warning.
- Compare secrets in constant time. Cookies (if any): HTTP-only, `sameSite=lax`, `secure` in production.
- Footer line: "A personal project by Rinaz Jainudeen. Not affiliated with any employer."

## 5. Design system (keep this look and feel)

Colour tokens live in `app/globals.css` in `oklch`, mapped with `@theme inline`; dark mode uses the `.dark` class. **Palette:** navy and cyan, to match Rinaz's career profile.
- `--primary` is a strong blue-cyan (around #0a5f8a in light mode and #3fc1ea in dark).
- `--accent` is a vivid cyan for eyebrow labels.
- `--navy` is deep navy (#07142b) for bold bands and hero overlays.
- `--muted-foreground` must be **dark** slate, passing WCAG AA.
- Dark mode: a deep navy-tinted canvas (#07142b to #0b1d3d), cards a step lighter (#0f2449), white text, near-white muted text, and a brighter primary and accent.
- Also define `--background --foreground --card --popover --secondary --muted --destructive --success --border --input --ring --chart-1..5`, plus `--radius: 0.5rem`.
- Check contrast in both themes.

**Layout:**
- Sections use `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 md:py-28`.
- `.max-w-7xl` grows to about 108rem at ≥1600px and 120rem at ≥2000px.
- Section backgrounds alternate: plain, then `border-t bg-secondary/40`.
- Smooth scrolling with `scroll-padding-top`. Sections have `id` and `scroll-mt-20`.

**Components:**
- **Sticky header:** transparent over the home hero, solid after about 24px of scrolling. Desktop dropdowns; a mobile drawer with scroll locked while open. Current page highlighted, theme toggle, and a "Build my plan" button. Links come only from `lib/navigation.ts`.
- **Home hero:** a full-width image with a left-to-right navy gradient (about 90% → 55% → 15%). Inside:
  - a pill badge (uppercase, wide tracking, translucent white border, `backdrop-blur`)
  - a display-font H1 (`text-4xl sm:text-5xl`, tight leading, `text-balance`)
  - a subtitle (`text-lg text-white/90`)
  - a white `rounded-full` button with an arrow
  - optional jump-link pills

  The hero and the stats band together fill `min-h-svh`.
- **Page hero:** `min-h-[60vh]`, in a "plain" or "card" variant (the card variant is a navy-to-primary gradient box). **Tool pages (Library, Build my plan, Your plan) use a shorter hero of about 35% of the screen height (`min-h-[35vh]`, the `size="tool"` option), so the filters or the tool show straight away.**
- **Stats band:** a navy background with a 2/3/5-column grid of large display numbers and small uppercase labels.
- **Section heading:** an eyebrow (`text-sm font-bold uppercase tracking-[0.18em] text-accent`, optional numbered circle), an H2 (`text-3xl sm:text-4xl`, display font, `text-balance`), and an optional lead paragraph (`text-lg leading-relaxed text-muted-foreground max-w-3xl`).
- **Cards:** `rounded-2xl border border-border bg-card p-6 shadow-sm`, with an icon chip (`size-11 rounded-xl bg-primary/10 text-primary`). Linked cards use `rounded-3xl`, a hover lift (`hover:-translate-y-1 hover:shadow-xl hover:border-primary/40`) and a primary-to-accent gradient bar that sweeps across the top on hover.
- **Image + text split:** two columns on large screens, image in a `rounded-3xl` 4:3 box, image below the text on mobile.
- **Buttons:** shadcn Button. Main calls to action are `rounded-full`, size `lg`, with a trailing arrow. Links use `render={<Link href=… />}` with `nativeButton={false}`.
- **Reveal:** fade and slide up (1.5rem, 0.6s) the first time something scrolls into view, staggered `i * 80ms`. Off for people who prefer reduced motion.
- **Footer:** light and dark logos, name, one line about the site, copyright, and "On this page" links from `lib/navigation.ts`.
- **Theme-aware logos:** `dark:hidden` and `hidden dark:block`.

**Intake UX:**
- One question per screen, with numbered progress steps and Back and Next buttons that stay on screen. The hero shows on question 1 only.
- Every question has a "Not sure" option that comes with a one-line explanation.
- Answers are kept in the URL, so Back, refresh and sharing all work.
- Fully keyboard-usable, using native radio buttons and checkboxes styled as cards.

**Plan UX:**
- A summary at the top: who it's for, where you are, and the next 3 actions.
- Then a phase-by-phase timeline. Each block is an expandable card showing steps, "who can do this", tool examples and the definition of done.
- Visitors can tick tasks; the ticks are saved in their browser only, wrapped in try/catch.
- "Copy link to this plan" and "Print / save as PDF" buttons, with a print stylesheet.

**Typography:** `text-balance` on headings, `text-pretty` on paragraphs, `leading-relaxed` body text, `tracking-tight` on large headings.

**Accessibility (always):**
- A skip link, and one `<main id="main">`.
- Meaningful `alt` text on images. Decorative images and icons get `aria-hidden`.
- `aria-label` on every `<nav>`.
- Visible focus (`focus-visible:outline-2 outline-offset-2`).
- WCAG 2.2 AA in both themes, and keyboard-only use works.

**Responsive:** mobile-first. Check phone, tablet, laptop and big-monitor widths. No sideways scrolling.

**Writing:** UK English, plain and confident, short sentences, sentence-case headings, no exclamation marks. Every block cites its sources.

**SEO:** titles and descriptions, sitemap, robots, social image, favicon.

## 6. Git, GitHub and Vercel

- One branch per feature: `git switch -c feature/<name> origin/main --no-track`. VS Code then shows "Publish Branch" rather than "Sync Changes".
- Commit messages in plain English, describing what changes for the site's user.
- Commit only after Rinaz has checked the change and said OK. Run `pnpm test`, `pnpm validate:content` and `pnpm build` first, and report the results.
- One pull request per feature. She tests it on the Vercel preview link, then merges. Merging to `main` puts it live.
- If `gh` isn't installed, push with git and explain how to open the pull request on github.com.

## 7. Definition of done (every phase)

1. Works in light and dark mode.
2. Works on phone, tablet and desktop.
3. Keyboard and screen-reader friendly.
4. Page has a title and description.
5. Rules are tested; `pnpm test`, `pnpm validate:content` and `pnpm build` pass.
6. New environment variables are in `.env.example`, and Rinaz has been told where to set them in Vercel.
7. Anything switched off or deferred is flagged.
8. Outside services have a plain-English guide in `docs/`.
9. `docs/decisions.md` is updated.
