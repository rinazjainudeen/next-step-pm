import { ArrowRight, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { PageHero } from "@/components/site/page-hero";
import { Button } from "@/components/ui/button";
import { loadBlocks } from "@/lib/blocks-load";
import { LINKEDIN_URL, PORTFOLIO_URL, SOURCE_CODE_URL } from "@/lib/contact";
import { EXAMPLE_PLAN_HREF } from "@/lib/example-plan";
import { pageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = pageMetadata({
  path: "/how-i-built-this",
  title: "How I built this",
  description:
    "Why I built Next Step PM, how its rules engine and learning blocks make a plan, how the content is checked before it goes live, and what I learned directing Claude Code.",
});

// Counted from the real content, so the page can't drift from the Library.
const BLOCK_COUNT = loadBlocks().length;

function Part({ id, eyebrow, title, children }: { id: string; eyebrow: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-20">
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-accent">{eyebrow}</p>
      <h2 id={`${id}-title`} className="mt-3 text-2xl font-bold tracking-tight text-balance sm:text-3xl">
        {title}
      </h2>
      <div className="mt-4 space-y-4 text-pretty leading-relaxed">{children}</div>
    </section>
  );
}

const LIST = "list-disc space-y-3 pl-5 marker:text-primary";

function OutLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Button
      render={<a href={href} target="_blank" rel="noopener noreferrer" />}
      nativeButton={false}
      variant="outline"
      size="lg"
      className="h-11 rounded-full px-6"
    >
      {children}
      <ExternalLink aria-hidden="true" />
      <span className="sr-only">(opens in a new tab)</span>
    </Button>
  );
}

export default function HowIBuiltThisPage() {
  return (
    <>
      <PageHero
        eyebrow="How I built this"
        title="How I built Next Step PM"
        lead="I'm Rinaz Jainudeen, a product manager. I built this site by directing Claude Code, an AI coding agent, and testing every change myself before it went live."
      />
      <div className="border-t bg-secondary/40">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <div className="max-w-3xl space-y-14">
            <Part id="problem" eyebrow="The problem" title="Product managers learn on the job, with little structure">
              <p>
                Courses teach product management in the abstract. Most of us learn it on a real product, under a real deadline, picking up
                advice as we go. I wanted a plan that starts from the work in front of you: your role, your product, where it is now, your
                biggest challenge and how long you have.
              </p>
              <p>
                You answer a few questions and get a step-by-step plan to follow on that work, pitched at your level. There&apos;s no sign-up,
                and your answers live in the web address, so you can bookmark or share your plan.
              </p>
            </Part>

            <Part id="how-it-works" eyebrow="How it works" title="Learning blocks and a rules engine">
              <p>
                No one could write a curriculum for every mix of role, product, stage and level, so I didn&apos;t try. Instead, the site has{" "}
                {BLOCK_COUNT} learning blocks. Each one is a small, reusable activity, such as writing a problem statement. It has steps for
                three levels of experience, who in a team can help, what &ldquo;done&rdquo; looks like, common pitfalls and the sources its advice
                comes from.
              </p>
              <p>
                A rules engine picks the blocks that fit your answers, puts them in a sensible order, moves the ones that help with your
                challenge to the front and spreads them across your timeline. It&apos;s plain code with no AI and no database, so the same
                answers always give the same plan, and every block can say why it&apos;s in yours.
              </p>
            </Part>

            <Part id="checks" eyebrow="Quality" title="How the content is checked before it goes live">
              <ul className={LIST}>
                <li>
                  <span className="font-semibold">Every block is checked against the content rules.</span> A validator checks each block
                  file: only allowed values, steps for each level, real links between blocks and at least one source. A block that breaks a
                  rule fails the build, so it can&apos;t reach the live site.
                </li>
                <li>
                  <span className="font-semibold">Automated tests build real plans.</span> They try every route through the questions, at
                  every level and way of working, and check that each plan follows the rules: phases in order, earlier work first, sensible
                  timings and clean wording.
                </li>
                <li>
                  <span className="font-semibold">Plans are read as well.</span> Tests show that a plan is valid. Only reading it shows
                  whether it&apos;s useful. A usefulness check on 30 realistic profiles found every plan valid, but some too long and some
                  with advice that didn&apos;t fit, such as team rituals for a PM with no team. That led to the next round of fixes.
                </li>
                <li>
                  <span className="font-semibold">Every change gets a preview.</span> Each change is a pull request with its own preview
                  link. I test it there, and it only goes live when I merge it.
                </li>
              </ul>
            </Part>

            <Part id="learned" eyebrow="What I learned" title="What I learned directing Claude Code">
              <ul className={LIST}>
                <li>
                  <span className="font-semibold">Written rules beat clever prompts.</span> The working rules, design system and content
                  model live in files that Claude Code reads at the start of every session. Getting those right did more for quality than
                  any single instruction.
                </li>
                <li>
                  <span className="font-semibold">Small steps I can check.</span> I work in short phases. Claude Code builds one, tells me
                  exactly what to click, and nothing is committed until I&apos;ve seen it working.
                </li>
                <li>
                  <span className="font-semibold">Ask it to disagree.</span> I asked for a partner who challenges ideas. A review of the live
                  site found that a Director got the same hands-on plan as a PM. That led to a separate view for leaders and a path for
                  people exploring the role.
                </li>
                <li>
                  <span className="font-semibold">Keep a decision log.</span> Every decision is written down with its date and the reason
                  for it, so later sessions stay consistent and I can explain any choice.
                </li>
              </ul>
            </Part>

            <section aria-labelledby="about-me-title" className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
              <h2 id="about-me-title" className="text-2xl font-bold tracking-tight text-balance">
                About me
              </h2>
              <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">
                I&apos;m a product manager, and I built this as a portfolio piece for AI product manager and AI builder roles. You can see more
                of my work, or get in touch, below.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <OutLink href={PORTFOLIO_URL}>My portfolio</OutLink>
                <OutLink href={LINKEDIN_URL}>LinkedIn</OutLink>
                <OutLink href={SOURCE_CODE_URL}>The code on GitHub</OutLink>
              </div>
            </section>

            <p className="text-lg leading-relaxed text-pretty">
              Want to see the result?{" "}
              <Link href={EXAMPLE_PLAN_HREF} className="inline-flex items-center gap-1 font-semibold text-primary underline underline-offset-4">
                See an example plan
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
