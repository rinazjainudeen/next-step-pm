"use client";

import { ArrowRight, CalendarClock, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { PlanActions } from "@/components/plan/plan-actions";
import { LabelPill, PlanBlockCard } from "@/components/plan/plan-block-card";
import { PlanPhases } from "@/components/plan/plan-phases";
import { PlanProgress } from "@/components/plan/plan-progress";
import { SelfCheckPanel } from "@/components/plan/self-check-panel";
import { TailorPanel } from "@/components/plan/tailor-panel";
import { useAdjustments } from "@/components/plan/use-adjustments";
import { useTicks } from "@/components/plan/use-ticks";
import { SectionHeading } from "@/components/site/section-heading";
import { Button } from "@/components/ui/button";
import type { Block } from "@/lib/blocks-types";
import { buildPlan } from "@/lib/curriculum-engine";
import type { IntakeAnswers, IntakeDraft } from "@/lib/intake-types";
import { startHref } from "@/lib/intake-url";
import { markDone, putBack, setAside, undoDone } from "@/lib/plan-adjustments";
import type { PlanBlock } from "@/lib/plan-types";
import { cn } from "@/lib/utils";

const CONTAINER = "mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16 lg:px-8";
const CONTROL = "h-11 rounded-full px-5";

/**
 * The plan, rebuilt in the browser with the visitor's own adjustments: ticks,
 * "Already done", "Not relevant" and the self-check. None of them go in the
 * link. The server's first view is the same plan with no adjustments.
 */
export function PlanView({ answers, blocks, draft, answersPanel }: { answers: IntakeAnswers; blocks: Block[]; draft: IntakeDraft; answersPanel: ReactNode }) {
  const { ticks, replace } = useTicks();
  const { saved, update } = useAdjustments();
  const plan = useMemo(() => buildPlan(answers, blocks, { ...saved, ticked: ticks }), [answers, blocks, saved, ticks]);
  const [message, setMessage] = useState("");
  const announce = (text: string) => setMessage(text);

  const stepIds = plan.phases
    .flatMap((phase) => phase.blocks)
    .filter((block) => !block.optional)
    .flatMap((block) => block.steps.map((step) => step.id));
  const tight = plan.pace.status === "tight";
  const PaceIcon = tight ? TriangleAlert : CalendarClock;

  const timelineControls = (block: PlanBlock) => {
    const ids = block.steps.map((step) => step.id);
    return (
      <>
        {block.done ? (
          <Button
            type="button"
            variant="outline"
            className={CONTROL}
            aria-label={`Undo “${block.title}” as already done`}
            onClick={() => {
              replace(undoDone(ticks, ids));
              announce(`“${block.title}” is no longer marked as done.`);
            }}
          >
            Undo already done
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            className={CONTROL}
            aria-label={`Mark “${block.title}” as already done`}
            onClick={() => {
              replace(markDone(ticks, ids));
              announce(`“${block.title}” is marked as already done.`);
            }}
          >
            Already done
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          className={CONTROL}
          aria-label={`Set aside “${block.title}” as not relevant`}
          onClick={() => {
            update((before) => setAside(before, block.id));
            announce(`“${block.title}” is set aside. You can put it back from “Set aside” at the end of the plan.`);
          }}
        >
          Not relevant
        </Button>
      </>
    );
  };

  const newToProduct = plan.getUpToSpeed.length > 0 && (
    <section aria-label="If you're new to this product" className={cn(plan.newToProductFirst && "border-t")}>
      <div className={CONTAINER}>
        <details data-plan-block open={plan.newToProductFirst} className="rounded-2xl border border-border bg-card shadow-sm">
          <summary className="cursor-pointer rounded-2xl p-5 font-semibold sm:p-6">
            {plan.newToProductFirst ? "If you're new to this product" : `New to this product? ${plan.getUpToSpeed.length} ${plan.getUpToSpeed.length === 1 ? "block" : "blocks"} to get up to speed`}
            <span className="mt-1 block text-sm font-normal text-muted-foreground">It runs alongside your timeline, so it doesn&apos;t add to your weeks.</span>
          </summary>
          <div id="get-up-to-speed" className="scroll-mt-24 space-y-4 border-t border-border p-5 sm:p-6">
            {plan.getUpToSpeed.map((block) => (
              <PlanBlockCard key={block.id} block={block} heading="h3" teamAnswered={plan.teamAnswered} />
            ))}
          </div>
        </details>
      </div>
    </section>
  );

  const skillCount = plan.skillsForLevel.length + plan.skillsAnyLevel.length;
  const growSkills = plan.skillsStart.length > 0 && (
    <section id="grow-your-skills" aria-label="Grow your skills" className={cn("border-t", (plan.skillsFirst || plan.rhythm.length === 0) && "bg-secondary/40")}>
      <div className={CONTAINER}>
        <SectionHeading eyebrow="Whenever you're ready" title="Grow your skills" lead="These build your craft as a PM. They sit outside the timeline, so pick them up as you need them." />
        <h3 className="mt-8 text-2xl font-bold tracking-tight">Start with these</h3>
        <div className="mt-4 space-y-4">
          {plan.skillsStart.map((block) => (
            <PlanBlockCard key={block.id} block={block} heading="h4" teamAnswered={plan.teamAnswered} />
          ))}
        </div>
        {skillCount > 0 && (
          <details data-plan-block className="mt-6 rounded-2xl border border-border bg-background">
            <summary className="cursor-pointer rounded-2xl p-5 font-semibold sm:p-6">
              See {skillCount} more {skillCount === 1 ? "skill" : "skills"}
            </summary>
            <div className="space-y-10 border-t border-border p-5 sm:p-6">
              {plan.skillsForLevel.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold tracking-tight">Picked for your level</h3>
                  <div className="mt-4 space-y-4">
                    {plan.skillsForLevel.map((block) => (
                      <PlanBlockCard key={block.id} block={block} heading="h4" teamAnswered={plan.teamAnswered} />
                    ))}
                  </div>
                </div>
              )}
              {plan.skillsAnyLevel.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold tracking-tight">Useful at any level</h3>
                  <p className="mt-1 max-w-3xl text-pretty leading-relaxed text-muted-foreground">The steps are written for your experience.</p>
                  <div className="mt-4 space-y-4">
                    {plan.skillsAnyLevel.map((block) => (
                      <PlanBlockCard key={block.id} block={block} heading="h4" teamAnswered={plan.teamAnswered} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </details>
        )}
      </div>
    </section>
  );

  return (
    <>
      <p aria-live="polite" className="sr-only">
        {message}
      </p>

      {plan.newToProductFirst && newToProduct}

      <section aria-label="Summary" className="border-t bg-secondary/40">
        <div className={cn(CONTAINER, "space-y-6")}>
          <p className="max-w-4xl text-lg text-pretty leading-relaxed">{plan.openingLine}</p>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm lg:col-span-2">
              <h2 className="text-2xl font-bold tracking-tight">Your next 3 actions</h2>
              {plan.checkBeforeSentence && <p className="mt-3 rounded-xl bg-secondary/60 p-4 text-pretty leading-relaxed">{plan.checkBeforeSentence}</p>}
              {plan.nextActions.length === 0 ? (
                <p className="mt-4 leading-relaxed">Everything on your timeline is done. Look through “Grow your skills” for what to learn next.</p>
              ) : (
                <ol className="mt-4 space-y-3">
                  {plan.nextActions.map((action, index) => (
                    <li key={action.text} className="flex gap-3">
                      <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        {index + 1}
                      </span>
                      <span className="min-w-0 text-pretty leading-relaxed">
                        {/* Once per block, so three steps from one block don't repeat the pill. */}
                        {action.label && plan.nextActions[index - 1]?.blockId !== action.blockId && (
                          <>
                            <LabelPill label={action.label} />{" "}
                          </>
                        )}
                        {action.text}{" "}
                        <a href={`#${action.blockId}`} className="no-print inline-flex items-center gap-1 text-sm font-medium text-primary underline underline-offset-4">
                          Go to this step
                          <ArrowRight className="size-3.5" aria-hidden="true" />
                        </a>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
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
          {answersPanel}
          <TailorPanel draft={draft} />
          <SelfCheckPanel selfCheck={saved.selfCheck} update={update} announce={announce} />
        </div>
      </section>

      {!plan.newToProductFirst && newToProduct}

      {plan.skillsFirst && growSkills}

      <section id="timeline" aria-label={plan.isLoop ? "Your improvement loop" : "Your timeline"} className={cn(plan.getUpToSpeed.length > 0 && "border-t bg-secondary/40")}>
        <div className={CONTAINER}>
          {plan.leaderNudge && (
            <p className="no-print mb-10 rounded-2xl border border-border bg-card p-5 text-pretty leading-relaxed shadow-sm sm:p-6">
              Leading strategy or building your team&apos;s skills?{" "}
              <Link href={startHref(draft, 1, true)} className="font-medium text-primary underline underline-offset-4">
                Build a plan for that instead.
              </Link>
            </p>
          )}
          <SectionHeading
            eyebrow="Your timeline"
            title={plan.isLoop ? "Your improvement loop" : "Phase by phase"}
            lead="Open a block to see its steps, who can help and what done looks like."
          />
          <PlanPhases
            current={plan.currentPhase}
            phases={plan.phases.map((phase) => ({ id: phase.id, label: phase.label, weeks: phase.weeks, blockCount: phase.blocks.length, done: phase.done ?? false }))}
            contents={plan.phases.map((phase, phaseIndex) => (
              <div key={phase.id}>
                <p className="max-w-3xl text-pretty leading-relaxed text-muted-foreground">
                  <span className="font-medium text-foreground">Ready to move on when:</span> {phase.readyWhen}
                </p>
                {phase.note && <p className="mt-2 max-w-3xl text-pretty leading-relaxed text-muted-foreground">{phase.note}</p>}
                <div className="mt-4 space-y-4">
                  {phase.blocks.map((block, blockIndex) => (
                    <PlanBlockCard
                      key={block.id}
                      block={block}
                      heading="h4"
                      open={phaseIndex === 0 && blockIndex === 0}
                      teamAnswered={plan.teamAnswered}
                      controls={timelineControls(block)}
                    />
                  ))}
                </div>
              </div>
            ))}
          />
          {plan.isLoop && <p className="mt-8 text-lg font-semibold text-pretty">Then start the loop again with what you&apos;ve learned.</p>}
        </div>
      </section>

      {plan.rhythm.length > 0 && (
        <section id="rhythm" aria-label="Your team's rhythm" className="border-t bg-secondary/40">
          <div className={CONTAINER}>
            <details data-plan-block className="rounded-2xl border border-border bg-card shadow-sm">
              <summary className="cursor-pointer rounded-2xl p-5 font-semibold sm:p-6">
                {plan.rhythmSummary}
                <span className="mt-1 block text-sm font-normal text-muted-foreground">These repeat throughout your work, so they sit outside the timeline.</span>
              </summary>
              <div className="space-y-4 border-t border-border p-5 sm:p-6">
                {plan.rhythm.map((block) => (
                  <PlanBlockCard key={block.id} block={block} heading="h3" teamAnswered={plan.teamAnswered} />
                ))}
              </div>
            </details>
          </div>
        </section>
      )}

      {plan.leadYourTeam.length > 0 && (
        <section id="lead-your-team" aria-label="Lead your team" className="border-t">
          <div className={CONTAINER}>
            <SectionHeading eyebrow="Alongside your plan" title="Lead your team" lead="You lead other product people, so these sit alongside your own work." />
            <div className="mt-8 space-y-4">
              {plan.leadYourTeam.map((block) => (
                <PlanBlockCard key={block.id} block={block} heading="h3" teamAnswered={plan.teamAnswered} />
              ))}
            </div>
          </div>
        </section>
      )}

      {!plan.skillsFirst && growSkills}

      {plan.refreshBasics.length > 0 && (
        <section id="refresh-the-basics" aria-label="Refresh the basics" className="border-t">
          <div className={CONTAINER}>
            <details data-plan-block className="rounded-2xl border border-border bg-card shadow-sm">
              <summary className="cursor-pointer rounded-2xl p-5 font-semibold sm:p-6">
                Refresh the basics
                <span className="mt-1 block text-sm font-normal text-muted-foreground">Written for earlier in a PM career. Open this if you want to check the fundamentals.</span>
              </summary>
              <div className="space-y-4 border-t border-border p-5 sm:p-6">
                {plan.refreshBasics.map((block) => (
                  <PlanBlockCard key={block.id} block={block} heading="h3" teamAnswered={plan.teamAnswered} />
                ))}
              </div>
            </details>
          </div>
        </section>
      )}

      {plan.setAside.length > 0 && (
        <section id="set-aside" aria-label="Set aside" className="no-print border-t">
          <div className={CONTAINER}>
            <details className="rounded-2xl border border-border bg-card shadow-sm">
              <summary className="cursor-pointer rounded-2xl p-5 font-semibold sm:p-6">
                Set aside ({plan.setAside.length})
                <span className="mt-1 block text-sm font-normal text-muted-foreground">Blocks you marked as not relevant. Saved in this browser only.</span>
              </summary>
              <ul className="divide-y divide-border border-t border-border">
                {plan.setAside.map((block) => (
                  <li key={block.id} className="flex flex-wrap items-center justify-between gap-3 p-5 sm:px-6">
                    <span className="font-medium">{block.title}</span>
                    <Button
                      type="button"
                      variant="outline"
                      className={CONTROL}
                      aria-label={`Put back “${block.title}”`}
                      onClick={() => {
                        update((before) => putBack(before, block.id));
                        announce(`“${block.title}” is back in your timeline.`);
                      }}
                    >
                      Put back
                    </Button>
                  </li>
                ))}
              </ul>
            </details>
          </div>
        </section>
      )}
    </>
  );
}
