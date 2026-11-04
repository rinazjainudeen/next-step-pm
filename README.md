# Next Step PM

A free tool that builds a step-by-step learning plan for product managers, based on their PM type, product, lifecycle stage, experience, team and tools. It's a personal portfolio project by Rinaz Jainudeen.

## Run it on your computer

1. Install the building blocks: `pnpm install`
2. Copy `.env.example` to `.env.local` and fill in **test** values only.
3. Start it: `pnpm dev`, then open http://localhost:3000

## Checks before every commit

`pnpm test` · `pnpm validate:content` · `pnpm build`

## Environment variables

See `.env.example`. Real values go in `.env.local` on your computer and in Vercel → Project → Settings → Environment Variables. Never put them in the code.

## Where to read more

- `CLAUDE.md`: working rules and the design system
- `docs/plan.md`: what we're building, phase by phase
- `docs/content-model.md`: how learning blocks become a plan
- `docs/decisions.md`: what we decided and why
