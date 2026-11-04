import { RotateCcw } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHero } from "@/components/site/page-hero";
import { Button } from "@/components/ui/button";
import { summariseAnswers } from "@/lib/intake-questions";
import { parseDraft, readerFromRecord, startHref } from "@/lib/intake-url";
import { firstUnansweredStep, validateDraft } from "@/lib/intake-validate";

export const metadata: Metadata = {
  title: "Your plan",
  description: "Your answers to the Next Step PM questions.",
  // Every set of answers is a different address, so search engines stay out.
  robots: { index: false, follow: false },
};

// Stand-in until Phase 4: this shows the answers, and the curriculum engine replaces it.
export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const draft = parseDraft(readerFromRecord(await searchParams));
  const result = validateDraft(draft);
  // An incomplete or hand-edited link goes back to the first gap, keeping what's there.
  if (!result.ok) redirect(startHref(draft, firstUnansweredStep(draft) ?? 1));

  return (
    <>
      <PageHero
        size="tool"
        eyebrow="Your plan"
        title="We have your answers"
        lead="The plan itself isn't built yet: it arrives in the next phase of this project. For now, here's what you told us. This link keeps your answers, so you can come back to it."
      />
      <section aria-label="Your answers" className="border-t bg-secondary/40">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <h2 className="text-2xl font-bold tracking-tight">Your answers</h2>
            <dl className="mt-6 divide-y divide-border">
              {summariseAnswers(result.answers).map((row) => (
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
            <Button render={<Link href="/start" />} nativeButton={false} variant="outline" size="lg" className="mt-8 h-11 rounded-full px-6">
              <RotateCcw aria-hidden="true" />
              Start again
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
