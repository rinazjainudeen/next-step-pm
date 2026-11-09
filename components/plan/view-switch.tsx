"use client";

import { useRouter } from "next/navigation";
import { useId, useOptimistic, useState, useTransition } from "react";
import type { IntakeDraft, ViewId } from "@/lib/intake-types";
import { planHref } from "@/lib/intake-url";
import { cn } from "@/lib/utils";

const OPTIONS: { id: ViewId; label: string }[] = [
  { id: "hands-on", label: "Hands-on" },
  { id: "leader", label: "Leader" },
];

/**
 * "Show steps as: Hands-on | Leader". Native radio buttons, so arrow keys and screen readers work
 * with no extra code. The choice goes in the link (`view=`), so a shared plan opens the same way.
 */
export function ViewSwitch({ draft, current, className }: { draft: IntakeDraft; current: ViewId; className?: string }) {
  const router = useRouter();
  const name = useId();
  const [shown, setShown] = useOptimistic(current);
  const [, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  function choose(view: ViewId) {
    if (view === shown) return;
    startTransition(() => {
      setShown(view);
      router.replace(planHref({ ...draft, view }), { scroll: false });
    });
    setMessage(view === "leader" ? "Showing the leader view." : "Showing the hands-on view.");
  }

  return (
    <fieldset className={cn("no-print m-0 min-w-0 border-0 p-0", className)}>
      <legend className="text-sm font-semibold">Show steps as</legend>
      <div className="mt-2 flex flex-wrap gap-3">
        {OPTIONS.map((option) => (
          <label
            key={option.id}
            className="flex min-h-11 cursor-pointer items-center rounded-full border border-border bg-background px-5 font-medium hover:bg-primary/5 has-checked:border-primary has-checked:bg-primary has-checked:text-primary-foreground has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring"
          >
            <input type="radio" name={name} value={option.id} checked={shown === option.id} onChange={() => choose(option.id)} className="sr-only" />
            {option.label}
          </label>
        ))}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        {shown === "leader" ? "Leader: what good looks like, what to ask your PM and what to watch for." : "Hands-on: the steps you do yourself."}
      </p>
      <p aria-live="polite" className="sr-only">
        {message}
      </p>
    </fieldset>
  );
}
