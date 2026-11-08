"use client";

import { SKILLS } from "@/content/taxonomy";
import { CONFIDENCE, clearSelfCheck, setConfidence, type SavedAdjustments, type SelfCheck } from "@/lib/plan-adjustments";

/**
 * "How confident are you?" Optional, saved in this browser only, and never in
 * the link. Skills rated "Getting started" move their blocks up.
 */
export function SelfCheckPanel({
  selfCheck,
  update,
  announce,
}: {
  selfCheck: SelfCheck;
  update: (change: (before: SavedAdjustments) => SavedAdjustments) => void;
  announce: (message: string) => void;
}) {
  const rated = Object.keys(selfCheck).length;
  return (
    <details className="no-print rounded-2xl border border-border bg-card shadow-sm">
      <summary className="cursor-pointer rounded-2xl p-5 font-semibold sm:p-6">
        How confident are you?
        <span className="mt-1 block text-sm font-normal text-muted-foreground">
          Optional. Rate any skills, and blocks for the ones you&apos;re getting started with move up. Saved in this browser only, never in shared links.
          {rated > 0 && ` ${rated} rated.`}
        </span>
      </summary>
      <div className="border-t border-border p-5 sm:p-6">
        <div className="grid gap-x-8 gap-y-5 lg:grid-cols-2">
          {SKILLS.map((skill) => (
            <fieldset key={skill.id} className="min-w-0">
              <legend className="font-semibold">{skill.label}</legend>
              <p className="text-sm text-muted-foreground">{skill.description}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {[...CONFIDENCE, { id: null, label: "Leave blank" } as const].map((option) => (
                  <label key={option.id ?? "blank"} className="flex cursor-pointer items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm has-checked:border-primary has-checked:bg-primary/10">
                    <input
                      type="radio"
                      name={`confidence-${skill.id}`}
                      checked={(selfCheck[skill.id] ?? null) === option.id}
                      onChange={() => {
                        update((before) => setConfidence(before, skill.id, option.id));
                        announce(option.id === null ? `${skill.label} left blank.` : `${skill.label}: ${option.label}. Your plan has been updated.`);
                      }}
                      className="size-4 accent-primary"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
        <button
          type="button"
          disabled={rated === 0}
          onClick={() => {
            update(clearSelfCheck);
            announce("Your self-check answers are cleared.");
          }}
          className="mt-6 font-medium text-primary underline underline-offset-4 disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
        >
          Clear my answers
        </button>
      </div>
    </details>
  );
}
