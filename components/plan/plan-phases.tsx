"use client";

import { Check, ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

export type PhaseSummary = {
  id: string;
  label: string;
  weeks: string;
  blockCount: number;
  /** Every required block in the phase is done. */
  done: boolean;
};

/**
 * The timeline, one phase at a time. The phase you're in opens, as worked out by
 * the engine from ticks and "Already done". Others stay collapsed, with done
 * phases marked. Printing opens everything.
 */
export function PlanPhases({ phases, current, contents }: { phases: PhaseSummary[]; current: string | null; contents: ReactNode[] }) {
  // Once a visitor opens or closes a phase, their choice wins.
  const [chosen, setChosen] = useState<Record<string, boolean>>({});
  const isOpen = (id: string) => chosen[id] ?? id === current;
  const allOpen = phases.every((phase) => isOpen(phase.id));

  return (
    <div>
      {phases.length > 1 && (
        <div className="no-print mt-8 flex flex-wrap items-center gap-3">
          {allOpen ? (
            <Button type="button" variant="outline" className="h-11 rounded-full px-5" onClick={() => setChosen({})}>
              Show only the current phase
            </Button>
          ) : (
            <Button type="button" variant="outline" className="h-11 rounded-full px-5" onClick={() => setChosen(Object.fromEntries(phases.map((phase) => [phase.id, true])))}>
              Open all phases
            </Button>
          )}
        </div>
      )}
      <div className="mt-6 space-y-4">
        {phases.map((phase, index) => (
          <details
            key={phase.id}
            data-plan-block
            data-phase={phase.id}
            open={isOpen(phase.id)}
            onToggle={(event) => {
              const open = event.currentTarget.open;
              if (open !== isOpen(phase.id)) setChosen((before) => ({ ...before, [phase.id]: open }));
            }}
            className="group/phase rounded-2xl border border-border bg-background"
          >
            <summary className="flex cursor-pointer list-none items-start gap-3 rounded-2xl p-5 sm:p-6 [&::-webkit-details-marker]:hidden">
              <ChevronDown className="no-print mt-1 size-5 shrink-0 text-primary transition-transform group-open/phase:rotate-180" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-accent">{phase.weeks}</p>
                <h3 id={`phase-${phase.id}`} className="mt-1 text-2xl font-bold tracking-tight">
                  {phase.label}
                </h3>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span>
                    {phase.blockCount} {phase.blockCount === 1 ? "block" : "blocks"}
                  </span>
                  {phase.done && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
                      <Check className="size-3.5" aria-hidden="true" />
                      Done
                    </span>
                  )}
                  {phase.id === current && <span className="font-semibold text-foreground">You&apos;re here</span>}
                </p>
              </div>
            </summary>
            <div className="px-5 pb-5 sm:px-6 sm:pb-6">{contents[index]}</div>
          </details>
        ))}
      </div>
    </div>
  );
}
