import { RotateCcw } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PlanView } from "@/components/plan/plan-view";
import { PageHero } from "@/components/site/page-hero";
import { Button } from "@/components/ui/button";
import { loadBlocks } from "@/lib/blocks-load";
import { blocksForPlan, buildPlan } from "@/lib/curriculum-engine";
import { summariseAnswers } from "@/lib/intake-questions";
import type { IntakeAnswers, IntakeDraft } from "@/lib/intake-types";
import { parseDraft, readerFromRecord, startHref, withOldLinkDefaults } from "@/lib/intake-url";
import { firstUnansweredStep, validateDraft } from "@/lib/intake-validate";

export const metadata: Metadata = {
  title: "Your plan",
  description: "Your step-by-step learning plan, built from your answers.",
  // Every set of answers is a different address, so search engines stay out.
  robots: { index: false, follow: false },
};

// Read once per server start, not on every visit.
const BLOCKS = loadBlocks();

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
  // A plan link from before the challenge question has none, so it counts as Not sure. Answers
  // in progress only ever live on /start, so the intake itself never fills this in.
  const draft = withOldLinkDefaults(parseDraft(readerFromRecord(await searchParams)));
  const result = validateDraft(draft);
  // An incomplete or hand-edited link goes back to the first gap, keeping what's there.
  if (!result.ok) redirect(startHref(draft, firstUnansweredStep(draft) ?? 1));

  const plan = buildPlan(result.answers, BLOCKS);
  // The browser rebuilds the plan with the visitor's own adjustments, so it gets only the blocks this plan needs.
  const blocks = blocksForPlan(result.answers, plan, BLOCKS);

  return (
    <>
      <PageHero size="tool" eyebrow="Your plan" title="Your step-by-step plan" lead={`${plan.who}. ${plan.where}`} />
      <PlanView answers={result.answers} blocks={blocks} draft={draft} answersPanel={<YourAnswers answers={result.answers} draft={draft} />} />
    </>
  );
}
