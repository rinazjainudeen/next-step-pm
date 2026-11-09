import { ChevronDown, Clock } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { RegionNote } from "@/components/library/region-label";
import { QuestionList, StepList } from "@/components/plan/step-list";
import type { PlanBlock, PlanLabel } from "@/lib/plan-types";

const LABEL_TEXT: Record<PlanLabel, string> = {
  challenge: "Helps with your challenge",
  skill: "Builds a skill you want to grow",
};

/** The small pill that says why a block comes early. Used on block cards and next actions. */
export function LabelPill({ label }: { label: PlanLabel }) {
  return (
    <span className="inline-block rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 align-middle text-xs font-semibold text-primary">
      {LABEL_TEXT[label]}
    </span>
  );
}

function Part({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="font-semibold">{title}</p>
      <div className="mt-2 leading-relaxed">{children}</div>
    </div>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 text-pretty marker:text-primary">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

/** What a leader needs from a block: what good looks like, what to ask the PM, and what to watch for. */
function LeaderPart({ view }: { view: NonNullable<PlanBlock["leaderView"]> }) {
  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-2">
      <div className="space-y-6">
        <Part title="What good looks like">
          <p className="text-pretty">{view.good}</p>
        </Part>
        <Part title="Warning signs">
          <Bullets items={view.signs} />
        </Part>
      </div>
      <Part title="Ask your PM">
        <QuestionList questions={view.ask} />
      </Part>
    </div>
  );
}

/**
 * One block in a plan. A native expandable section, so the keyboard, screen
 * readers and a link to #block-id all work with no extra code.
 */
export function PlanBlockCard({
  block,
  heading: Heading,
  open = false,
  teamAnswered = true,
  controls,
}: {
  block: PlanBlock;
  heading: "h3" | "h4";
  open?: boolean;
  /** Without a team answer, roles read as who usually helps. */
  teamAnswered?: boolean;
  /** Buttons such as "Already done", shown at the end of the open block. */
  controls?: ReactNode;
}) {
  const handsOn = (
    <>
        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          <Part title="Steps">
            <StepList steps={block.steps} />
          </Part>

          <div className="space-y-6">
            <Part title={teamAnswered ? "Who can do this" : "Who usually helps"}>
              <ul className="space-y-3">
                {block.tasks.map((task) => (
                  <li key={`${task.roleLabel}-${task.task}`} className="text-pretty">
                    <span className="font-medium">{task.who}:</span> {task.task}
                    {task.note && <span className="block text-sm text-muted-foreground">{task.note}</span>}
                  </li>
                ))}
              </ul>
              {block.reviewers.length > 0 && <p className="mt-3">Ask for a review from: {block.reviewers.join(", ")}.</p>}
            </Part>

            <Part title="With your tools">
              {block.tools.length > 0 ? (
                <dl className="space-y-3">
                  {block.tools.map((tool) => (
                    <div key={tool.toolLabel}>
                      <dt className="font-medium">{tool.toolLabel}</dt>
                      <dd className="text-pretty text-muted-foreground">{tool.tip}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-muted-foreground">{block.toolTip}</p>
              )}
            </Part>
          </div>
        </div>

        <div className="mt-6 grid gap-8 border-t border-border pt-6 lg:grid-cols-2">
          <Part title="Definition of done">
            <Bullets items={block.definitionOfDone} />
          </Part>
          {block.pitfalls.length > 0 && (
            <Part title="Common pitfalls">
              <Bullets items={block.pitfalls} />
            </Part>
          )}
        </div>
    </>
  );
  return (
    <details id={block.id} data-plan-block open={open} className="group scroll-mt-24 rounded-2xl border border-border bg-card shadow-sm">
      <summary className="flex cursor-pointer list-none items-start gap-3 rounded-2xl p-5 sm:p-6 [&::-webkit-details-marker]:hidden">
        <ChevronDown className="no-print mt-1 size-5 shrink-0 text-primary transition-transform group-open:rotate-180" aria-hidden="true" />
        <div className="min-w-0">
          <Heading className="text-lg font-bold tracking-tight sm:text-xl">{block.title}</Heading>
          {(block.helpsChallenge || block.growsSkill || block.done) && (
            <p className="mt-2 flex flex-wrap gap-2">
              {block.helpsChallenge && <LabelPill label="challenge" />}
              {block.growsSkill && <LabelPill label="skill" />}
              {block.done && <span className="rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">Done</span>}
            </p>
          )}
          {block.movedUp && (
            <p className="mt-2">
              <span className="rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
                Priority at your size of organisation
              </span>
            </p>
          )}
          {block.optional && (
            <p className="mt-2">
              <span className="rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">Go further</span>
              <span className="ml-2 text-sm text-muted-foreground">Optional, and not counted in your timing.</span>
            </p>
          )}
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{block.why}</p>
          {block.region && <RegionNote region={block.region} className="mt-2" />}
          <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="size-4" aria-hidden="true" />
            About {block.effort}
          </p>
        </div>
      </summary>

      <div className="border-t border-border p-5 sm:p-6">
        <p className="max-w-3xl leading-relaxed text-muted-foreground">{block.summary}</p>

        {block.checkFirst.length > 0 && (
          <div className="mt-5 rounded-xl bg-secondary/60 p-4">
            <p className="font-semibold">Check this exists first</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 marker:text-primary">
              {block.checkFirst.map((item) => (
                <li key={item.id}>
                  <Link href={`/library/${item.id}`} className="text-primary underline underline-offset-4">
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {block.leaderView ? (
          <>
            <LeaderPart view={block.leaderView} />
            <details data-plan-block className="group/steps mt-6 rounded-xl border border-border">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl p-4 font-semibold [&::-webkit-details-marker]:hidden">
                <ChevronDown className="no-print size-4 shrink-0 text-primary transition-transform group-open/steps:rotate-180" aria-hidden="true" />
                See the hands-on steps
              </summary>
              <div className="border-t border-border px-4 pb-4 sm:px-5 sm:pb-5">
                {handsOn}
              </div>
            </details>
          </>
        ) : (
          handsOn
        )}

        {controls && <div className="no-print mt-6 flex flex-wrap gap-3 border-t border-border pt-6">{controls}</div>}

        <p className="no-print mt-6">
          <Link href={`/library/${block.id}`} className="font-medium text-primary underline underline-offset-4">
            See the full block and its sources
          </Link>
        </p>
      </div>
    </details>
  );
}
