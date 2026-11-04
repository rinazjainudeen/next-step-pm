import { cn } from "@/lib/utils";

/**
 * The top of an inner page. "plain" sits on the page background;
 * "card" is a navy-to-blue gradient box. Leaves room for the fixed header.
 *
 * `size="tool"` is the short version for tool pages (Library, Build my plan,
 * Your plan): about 35% of the screen, so the tool itself shows straight away.
 */
export function PageHero({
  eyebrow,
  title,
  lead,
  variant = "plain",
  size = "default",
}: {
  eyebrow: string;
  title: string;
  lead?: string;
  variant?: "plain" | "card";
  size?: "default" | "tool";
}) {
  const isTool = size === "tool";

  const heading = (
    <>
      <p className={cn("text-sm font-bold uppercase tracking-[0.18em]", variant === "card" ? "text-white/80" : "text-accent")}>
        {eyebrow}
      </p>
      <h1
        className={cn(
          "max-w-3xl font-bold leading-[1.05] tracking-tight",
          isTool ? "mt-3 text-3xl sm:text-4xl" : "mt-4 text-4xl sm:text-5xl",
        )}
      >
        {title}
      </h1>
      {lead && (
        <p
          className={cn(
            "max-w-2xl leading-relaxed",
            isTool ? "mt-3 text-base sm:text-lg" : "mt-5 text-lg",
            variant === "card" ? "text-white/90" : "text-muted-foreground",
          )}
        >
          {lead}
        </p>
      )}
    </>
  );

  return (
    <section className={cn("flex items-center pt-16", isTool ? "min-h-[35vh]" : "min-h-[60vh]")}>
      <div className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", isTool ? "py-6" : "py-16")}>
        {variant === "card" ? (
          <div className="rounded-3xl bg-gradient-to-br from-navy to-primary p-8 text-white sm:p-12">{heading}</div>
        ) : (
          heading
        )}
      </div>
    </section>
  );
}
