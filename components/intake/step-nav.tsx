import { INTAKE_QUESTIONS } from "@/lib/intake-questions";
import type { IntakeDraft } from "@/lib/intake-types";
import { canJumpTo, isAnswered } from "@/lib/intake-validate";
import { cn } from "@/lib/utils";

/**
 * The progress bar, made of numbered steps. A visitor can click straight to any
 * question they've answered, or to the first gap. Others stay disabled.
 */
export function StepNav({ step, draft, onJump }: { step: number; draft: IntakeDraft; onJump: (step: number) => void }) {
  return (
    <nav aria-label="Questions" className="mt-2">
      <ol className="flex gap-1">
        {INTAKE_QUESTIONS.map((question, index) => {
          const number = index + 1;
          const isCurrent = number === step;
          return (
            <li key={question.id} className="flex-1">
              <button
                type="button"
                disabled={!canJumpTo(draft, number)}
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`Question ${number}: ${question.title}`}
                onClick={() => onJump(number)}
                className={cn(
                  "h-7 w-full rounded-md text-xs font-semibold transition-colors",
                  "disabled:cursor-not-allowed enabled:hover:bg-primary/30",
                  isCurrent
                    ? "bg-primary text-primary-foreground enabled:hover:bg-primary"
                    : isAnswered(draft, question.id)
                      ? "bg-primary/15 text-foreground"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {number}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
