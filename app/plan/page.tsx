import { ArrowRight, CalendarClock, RotateCcw, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PlanActions } from "@/components/plan/plan-actions";
import { PlanBlockCard } from "@/components/plan/plan-block-card";
import { PlanProgress } from "@/components/plan/plan-progress";
import { PageHero } from "@/components/site/page-hero";
import { SectionHeading } from "@/components/site/section-heading";
import { Button } from "@/components/ui/button";
import { loadBlocks } from "@/lib/blocks-load";
import { buildPlan } from "@/lib/curriculum-engine";
import { summariseAnswers } from "@/lib/intake-questions";
import type { IntakeAnswers, IntakeDraft } from "@/lib/intake-types";
import { parseDraft, readerFromRecord, startHref } from "@/lib/intake-url";
import { firstUnansweredStep, validateDraft } from "@/lib/intake-validate";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Your plan",
  description: "Your step-by-step learning plan, built from your answers.",
  // Every set of answers is a different address, so search engines stay out.
  robots: { index: false, follow: false },
};

// Read once per server start, not on every visit.
const BLOCKS = loadBlocks();

const CONTAINER = "mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16 lg:px-8";

function YourAnswers({ answers, draft }: { answers: IntakeAnswers; draft: IntakeDraft }) {
  return (
    <details className="no-print rounded-2xl border border-border bg-card shadow-sm">
      <summary className="cursor-pointer rounded-2xl p-5 font-semibold sm:p-6">Your answers</summary>
      <div className="border-t border-border p-5 sm:p-6">
        <dl className="divide-y divide-border">
          {summariseAnswers(answers).map((row) => (
            <div key={row.label} className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 py-3 sm:grid-cols-[14rem_1fr_auto]">
              <dt className="font-semibold">{row.label}</dt>
              <dd className="col-start-1 row-start-2 text-pretty text-muted-foreground sm:col-start-2 sm:row-start-1">{row.value}</dd>
              {row.step && (
                <dd className="col-start-2 row-start-1 text-right sm:col-start-3">
                  <Link href={startHref(draft, row.step, true)} className="font-medium text-primary underline underline-offset-4">
                    Change<span className="sr-only"> {row.label}</span>
                  </Link>
                </dd>
              )}
            </div>
          ))}
        </dl>
        <Button render={<Link href="/start" />} nativeButton={false} variant="outline" size="lg" className="mt-6 h-11 rounded-full px-6">
          <RotateCcw aria-hidden="true" />
          Start again
        </Button>
      </div>
    </details>
  );
}

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const draft = parseDraft(readerFromRecord(await searchParams));
  const result = validateDraft(draft);
  // An incomplete or hand-edited link goes back to the first gap, keeping what's there.
  if (!result.ok) redirect(startHref(draft, firstUnansweredStep(draft) ?? 1));

  const plan = buildPlan(result.answers, BLOCKS);
  // Progress follows the timeline. Onboarding can be skipped, and rhythm blocks repeat.
  const stepIds = plan.phases.flatMap((phase) => phase.blocks).flatMap((block) => block.steps.map((step) => step.id));
  const tight = plan.pace.status === "tight";
  const PaceIcon = tight ? TriangleAlert : CalendarClock;

  return (
    <>
      <PageHero size="tool" eyebrow="Your plan" title="Your step-by-step plan" lead={`${plan.who}. ${plan.where}`} />

      <section aria-label="Summary" className="border-t bg-secondary/40">
        <div className={cn(CONTAINER, "space-y-6")}>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm lg:col-span-2">
              <h2 className="text-2xl font-bold tracking-tight">Your next 3 actions</h2>
              {(plan.checkBeforeActions.length > 0 || plan.getUpToSpeed.length > 0) && (
                <div className="mt-3 space-y-2 rounded-xl bg-secondary/60 p-4 text-pretty leading-relaxed">
                  {plan.checkBeforeActions.length > 0 && (
                    <p>
                      <span className="font-semibold">{plan.checkBeforeLabel}:</span> {plan.checkBeforeActions.map((check) => check.title).join("; ")}.
                    </p>
                  )}
                  {plan.getUpToSpeed.length > 0 && (
                    <p>
                      <span className="font-semibold">New to this product?</span> Start{" "}
                      <a href="#get-up-to-speed" className="text-primary underline underline-offset-4">
                        getting up to speed
                      </a>{" "}
                      alongside these actions.
                    </p>
                  )}
                </div>
              )}
              <ol className="mt-4 space-y-3">
                {plan.nextActions.map((action, index) => (
                  <li key={action.text} className="flex gap-3">
                    <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {index + 1}
                    </span>
                    <span className="min-w-0 text-pretty leading-relaxed">
                      {action.text}{" "}
                      <a href={`#${action.blockId}`} className="no-print inline-flex items-center gap-1 text-sm font-medium text-primary underline underline-offset-4">
                        Go to this step
                        <ArrowRight className="size-3.5" aria-hidden="true" />
                      </a>
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="flex flex-col gap-6">
              <div className={cn("rounded-2xl border bg-card p-6 shadow-sm", tight ? "border-destructive/50" : "border-border")}>
                <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
                  <PaceIcon className={cn("size-5", tight ? "text-destructive" : "text-primary")} aria-hidden="true" />
                  Your timing
                </h2>
                <p className="mt-2 text-pretty leading-relaxed">{plan.pace.message}</p>
              </div>
              <div className="no-print rounded-2xl border border-border bg-card p-6 shadow-sm">
                <PlanProgress stepIds={stepIds} />
              </div>
            </div>
          </div>

          <PlanActions />
          <YourAnswers answers={result.answers} draft={draft} />
        </div>
      </section>

      {plan.getUpToSpeed.length > 0 && (
        <section id="get-up-to-speed" aria-label="Get up to speed">
          <div className={CONTAINER}>
            <SectionHeading
              eyebrow="Alongside your plan"
              title="Get up to speed"
              lead="This runs alongside the timeline below, so it doesn't add to your weeks. It can take longer than a short plan, so allow for it."
            />
            <div className="mt-8 space-y-4">
              {plan.getUpToSpeed.map((block) => (
                <PlanBlockCard key={block.id} block={block} heading="h3" />
              ))}
            </div>
          </div>
        </section>
      )}

      <section id="timeline" aria-label="Your timeline" className={cn(plan.getUpToSpeed.length > 0 && "border-t bg-secondary/40")}>
        <div className={CONTAINER}>
          <SectionHeading eyebrow="Your timeline" title="Phase by phase" lead="Open a block to see its steps, who can help and what done looks like." />
          <div className="mt-10 space-y-12">
            {plan.phases.map((phase, phaseIndex) => (
              <section key={phase.id} aria-labelledby={`phase-${phase.id}`}>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-accent">{phase.weeks}</p>
                <h3 id={`phase-${phase.id}`} className="mt-2 text-2xl font-bold tracking-tight">
                  {phase.label}
                </h3>
                <p className="mt-1 max-w-3xl text-pretty leading-relaxed text-muted-foreground">
                  <span className="font-medium text-foreground">Ready to move on when:</span> {phase.readyWhen}
                </p>
                {phase.note && <p className="mt-2 max-w-3xl text-pretty leading-relaxed text-muted-foreground">{phase.note}</p>}
                <div className="mt-4 space-y-4">
                  {phase.blocks.map((block, blockIndex) => (
                    <PlanBlockCard key={block.id} block={block} heading="h4" open={phaseIndex === 0 && blockIndex === 0} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </section>

      {plan.rhythm.length > 0 && (
        <section id="rhythm" aria-label="Your team's rhythm" className="border-t bg-secondary/40">
          <div className={CONTAINER}>
            <SectionHeading eyebrow="All the way through" title="Your team's rhythm" lead="These repeat throughout your work, so they sit outside the timeline." />
            <div className="mt-8 space-y-4">
              {plan.rhythm.map((block) => (
                <PlanBlockCard key={block.id} block={block} heading="h3" />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
