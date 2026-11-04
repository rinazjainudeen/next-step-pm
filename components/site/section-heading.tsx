import { cn } from "@/lib/utils";

/** Eyebrow label, H2 and optional lead paragraph, used at the top of each section. */
export function SectionHeading({
  eyebrow,
  title,
  lead,
  className,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
  className?: string;
}) {
  return (
    <div className={cn("max-w-3xl", className)}>
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-accent">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      {lead && <p className="mt-4 max-w-3xl text-lg leading-relaxed text-muted-foreground">{lead}</p>}
    </div>
  );
}
