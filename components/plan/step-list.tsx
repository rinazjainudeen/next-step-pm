"use client";

import { useTicks } from "@/components/plan/use-ticks";
import type { PlanStep } from "@/lib/plan-types";

/** Tick-boxes for a block's steps. Ticks are saved in this browser only. */
export function StepList({ steps }: { steps: PlanStep[] }) {
  const { ticks, toggle } = useTicks();
  return (
    <ul className="space-y-2">
      {steps.map((step) => (
        <li key={step.id}>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg p-2 leading-relaxed hover:bg-primary/5 has-checked:text-muted-foreground">
            <input
              type="checkbox"
              checked={ticks.includes(step.id)}
              onChange={() => toggle(step.id)}
              className="mt-1 size-5 shrink-0 accent-primary"
            />
            <span className="min-w-0 text-pretty">{step.text}</span>
          </label>
        </li>
      ))}
    </ul>
  );
}

/**
 * The questions a leader asks their PM, each with a tick-box. Saved in this browser only, the same
 * way as step ticks. The label names the question, so a screen reader hears what is being marked.
 */
export function QuestionList({ questions }: { questions: PlanStep[] }) {
  const { ticks, toggle } = useTicks();
  return (
    <ul className="space-y-2">
      {questions.map((question) => (
        <li key={question.id}>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg p-2 leading-relaxed hover:bg-primary/5 has-checked:text-muted-foreground">
            <input
              type="checkbox"
              checked={ticks.includes(question.id)}
              onChange={() => toggle(question.id)}
              aria-label={`Mark “${question.text}” as asked`}
              className="mt-1 size-5 shrink-0 accent-primary"
            />
            <span className="min-w-0 text-pretty">{question.text}</span>
          </label>
        </li>
      ))}
    </ul>
  );
}
