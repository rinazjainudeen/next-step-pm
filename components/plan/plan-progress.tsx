"use client";

import { useTicks } from "@/components/plan/use-ticks";
import { countTicked } from "@/lib/plan-ticks";

/** How far through the plan the visitor is. */
export function PlanProgress({ stepIds }: { stepIds: string[] }) {
  const { ticks } = useTicks();
  const done = countTicked(ticks, stepIds);
  const percent = stepIds.length === 0 ? 0 : Math.round((done / stepIds.length) * 100);
  return (
    <div>
      <p className="font-semibold" aria-live="polite">
        {done} of {stepIds.length} timeline steps done
      </p>
      <div aria-hidden="true" className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-2 text-sm text-muted-foreground">Your ticks are saved in this browser only.</p>
    </div>
  );
}
