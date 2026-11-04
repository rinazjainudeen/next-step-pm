import { ArrowLeft, Clock, ExternalLink, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  EXPERIENCE_LEVELS,
  FRESHNESS,
  KINDS,
  PM_TYPES,
  PRODUCT_TYPES,
  ROLES,
  STAGES,
  TOOLS,
  WAYS_OF_WORKING,
  labelOf,
} from "@/content/taxonomy";
import { loadBlocks } from "@/lib/blocks-load";
import { phaseLabel } from "@/lib/blocks-types";

export const dynamicParams = false;

export function generateStaticParams() {
  return loadBlocks().map((block) => ({ id: block.id }));
}

export async function generateMetadata({ params }: PageProps<"/library/[id]">): Promise<Metadata> {
  const { id } = await params;
  const block = loadBlocks().find((b) => b.id === id);
  if (!block) return {};
  return {
    title: block.title,
    description: block.summary,
    // Dummy blocks must never appear in search results.
    ...(block.placeholder ? { robots: { index: false, follow: false } } : {}),
  };
}

function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${isoDate}T00:00:00Z`));
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5 leading-relaxed marker:text-primary">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function Chips({ label, values }: { label: string; values: string[] }) {
  return (
    <div>
      <dt className="text-sm font-semibold text-muted-foreground">{label}</dt>
      <dd className="mt-1.5 flex flex-wrap gap-2">
        {values.length > 0 ? (
          values.map((value) => (
            <span key={value} className="rounded-full border border-border bg-card px-3 py-1 text-sm">
              {value}
            </span>
          ))
        ) : (
          <span className="rounded-full border border-dashed border-border px-3 py-1 text-sm text-muted-foreground">All</span>
        )}
      </dd>
    </div>
  );
}

export default async function BlockPage({ params }: PageProps<"/library/[id]">) {
  const { id } = await params;
  const blocks = loadBlocks();
  const block = blocks.find((b) => b.id === id);
  if (!block) notFound();

  const roleLabel = (role: string) => labelOf(ROLES, role);
  const dependencies = block.dependsOn.map((depId) => blocks.find((b) => b.id === depId)).filter((b) => b !== undefined);
  const toolEntries = Object.entries(block.toolExamples);

  return (
    <article className="mx-auto max-w-4xl px-4 pb-24 pt-28 sm:px-6 lg:px-8">
      <Button render={<Link href="/library" />} nativeButton={false} variant="ghost" className="-ml-2 h-10 rounded-full px-4">
        <ArrowLeft aria-hidden="true" />
        Back to the library
      </Button>

      {block.placeholder && (
        <div role="note" className="mt-6 flex gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-4">
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
          <p className="leading-relaxed">
            <strong>Placeholder block.</strong> This is dummy content used to test the site. It is not real guidance and will be
            replaced.
          </p>
        </div>
      )}

      <p className="mt-8 text-sm font-bold uppercase tracking-[0.18em] text-accent">
        {phaseLabel(block.phase)} · {labelOf(KINDS, block.kind)}
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">{block.title}</h1>
      <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{block.summary}</p>

      <p className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="size-4" aria-hidden="true" />
          About {block.estimatedEffort}
        </span>
        <span>{labelOf(FRESHNESS, block.freshness)}</span>
        <span>Last reviewed {formatDate(block.lastReviewed)}</span>
      </p>

      <Section title="Who this applies to">
        <dl className="grid gap-5 sm:grid-cols-2">
          <Chips label="PM types" values={block.appliesTo.pmTypes.map((v) => labelOf(PM_TYPES, v))} />
          <Chips label="Product types" values={block.appliesTo.productTypes.map((v) => labelOf(PRODUCT_TYPES, v))} />
          <Chips label="Starting points" values={block.appliesTo.stages.map((v) => labelOf(STAGES, v))} />
          <Chips label="Ways of working" values={block.appliesTo.waysOfWorking.map((v) => labelOf(WAYS_OF_WORKING, v))} />
        </dl>
      </Section>

      <Section title="Steps, by experience">
        <div className="grid gap-6 lg:grid-cols-3">
          {EXPERIENCE_LEVELS.map((level) => (
            <div key={level.id} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h3 className="text-lg font-bold tracking-tight">{level.label}</h3>
              <ol className="mt-3 list-decimal space-y-2 pl-5 leading-relaxed marker:font-semibold marker:text-primary">
                {block.steps[level.id].map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Who can do this">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <p>
            <span className="font-semibold">Owner:</span> {roleLabel(block.roles.owner)}
          </p>
          {block.roles.canDelegateTo.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold">Can be delegated to</h3>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 leading-relaxed marker:text-primary">
                {block.roles.canDelegateTo.map((item) => (
                  <li key={`${item.role}-${item.task}`}>
                    <span className="font-medium">{roleLabel(item.role)}:</span> {item.task}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {block.roles.reviewers.length > 0 && (
            <p className="mt-4">
              <span className="font-semibold">Reviewed by:</span> {block.roles.reviewers.map(roleLabel).join(", ")}
            </p>
          )}
        </div>
      </Section>

      {toolEntries.length > 0 && (
        <Section title="Tool examples">
          <dl className="space-y-4">
            {toolEntries.map(([tool, tip]) => (
              <div key={tool} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <dt className="font-semibold">{labelOf(TOOLS, tool)}</dt>
                <dd className="mt-1 leading-relaxed text-muted-foreground">{tip}</dd>
              </div>
            ))}
          </dl>
        </Section>
      )}

      <Section title="Definition of done">
        <Bullets items={block.definitionOfDone} />
      </Section>

      {block.pitfalls.length > 0 && (
        <Section title="Common pitfalls">
          <Bullets items={block.pitfalls} />
        </Section>
      )}

      {dependencies.length > 0 && (
        <Section title="Do these first">
          <ul className="list-disc space-y-2 pl-5 marker:text-primary">
            {dependencies.map((dep) => (
              <li key={dep.id}>
                <Link href={`/library/${dep.id}`} className="font-medium text-primary underline-offset-4 hover:underline">
                  {dep.title}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Sources">
        <ul className="space-y-2">
          {block.sources.map((source) => (
            <li key={source.url}>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-primary underline-offset-4 hover:underline"
              >
                {source.title}
                <ExternalLink className="size-4" aria-hidden="true" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>
      </Section>
    </article>
  );
}
