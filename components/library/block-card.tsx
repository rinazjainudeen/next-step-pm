import { ArrowRight, Clock } from "lucide-react";
import Link from "next/link";
import { KINDS, labelOf } from "@/content/taxonomy";
import { phaseLabel, type BlockSummary } from "@/lib/blocks-types";

/** One block in the Library list. The whole card is a link to the block. */
export function BlockCard({ block }: { block: BlockSummary }) {
  return (
    <Link
      href={`/library/${block.id}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl focus-visible:-translate-y-1 focus-visible:border-primary/40"
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-gradient-to-r from-primary to-accent transition-transform duration-500 group-hover:scale-x-100 group-focus-visible:scale-x-100"
      />
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-[0.18em] text-accent">{phaseLabel(block.phase)}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
          {labelOf(KINDS, block.kind)}
        </span>
        {block.optional && (
          <span className="rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">Go further</span>
        )}
        {block.placeholder && (
          <span className="rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-destructive">
            Placeholder
          </span>
        )}
      </div>
      <h3 className="mt-4 text-xl font-bold tracking-tight">{block.title}</h3>
      <p className="mt-3 flex-1 leading-relaxed text-muted-foreground">{block.summary}</p>
      <div className="mt-5 flex items-center justify-between text-sm">
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <Clock className="size-4" aria-hidden="true" />
          {block.estimatedEffort}
        </span>
        <span className="inline-flex items-center gap-1 font-semibold text-primary">
          Open
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}

export function BlockGrid({ blocks }: { blocks: BlockSummary[] }) {
  return (
    <ul className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {blocks.map((block) => (
        <li key={block.id}>
          <BlockCard block={block} />
        </li>
      ))}
    </ul>
  );
}
