"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { OptionCard } from "@/components/intake/option-card";
import { Button } from "@/components/ui/button";
import { setTeamCount, toggleMulti } from "@/lib/intake-draft";
import { TAILOR_QUESTIONS, TEAM_ROLES } from "@/lib/intake-questions";
import { MAX_TEAM_COUNT, NOT_SURE, type IntakeDraft, type TeamRoleId } from "@/lib/intake-types";
import { planHref } from "@/lib/intake-url";

/**
 * "Tailor your plan": the optional team and tools questions. The answers go in
 * the link, so a shared plan keeps them.
 */
export function TailorPanel({ draft }: { draft: IntakeDraft }) {
  const router = useRouter();
  const [next, setNext] = useState(draft);
  const [team, tools] = TAILOR_QUESTIONS;
  const changed = JSON.stringify([next.team, next.teamCounts, next.tools]) !== JSON.stringify([draft.team, draft.teamCounts, draft.tools]);
  const answered = draft.team.length + draft.tools.length;

  const box = (question: "team" | "tools", id: string, label: string, compact: boolean) => (
    <OptionCard
      key={id}
      type="checkbox"
      name={question}
      value={id}
      label={label}
      compact={compact}
      checked={(next[question] as string[]).includes(id)}
      onChange={() => setNext((before) => toggleMulti(before, question, id))}
    >
      {question === "team" && id !== NOT_SURE && next.team.includes(id as TeamRoleId) && (
        <div className="flex items-center gap-2 px-3 pb-3 pl-11">
          <label htmlFor={`tailor-count-${id}`} className="text-sm font-medium">
            How many<span className="sr-only"> {label}</span>
          </label>
          <select
            id={`tailor-count-${id}`}
            value={next.teamCounts[id as TeamRoleId] ?? 1}
            onChange={(event) => setNext((before) => setTeamCount(before, id as TeamRoleId, Number(event.target.value)))}
            className="h-11 rounded-lg border border-input bg-background px-2 text-base text-foreground"
          >
            {Array.from({ length: MAX_TEAM_COUNT }, (_, index) => index + 1).map((value) => (
              <option key={value} value={value}>
                {value === MAX_TEAM_COUNT ? `${value}+` : value}
              </option>
            ))}
          </select>
        </div>
      )}
    </OptionCard>
  );

  return (
    <details className="no-print rounded-2xl border border-border bg-card shadow-sm">
      <summary className="cursor-pointer rounded-2xl p-5 font-semibold sm:p-6">
        Tailor your plan
        <span className="mt-1 block text-sm font-normal text-muted-foreground">
          Optional. Add your team and tools, and blocks will say who to ask and how to use your tools.
          {answered > 0 && " You've added some already."}
        </span>
      </summary>
      <form
        className="border-t border-border p-5 sm:p-6"
        onSubmit={(event) => {
          event.preventDefault();
          router.push(planHref(next));
        }}
      >
        <fieldset className="min-w-0">
          <legend className="text-lg font-semibold">{team.title}</legend>
          <p className="mt-1 text-sm text-muted-foreground">{team.why}</p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {TEAM_ROLES.map((role) => box("team", role.id, role.label, true))}
            {box("team", NOT_SURE, "Not sure, or no team", true)}
          </div>
        </fieldset>
        <fieldset className="mt-8 min-w-0">
          <legend className="text-lg font-semibold">{tools.title}</legend>
          <p className="mt-1 text-sm text-muted-foreground">{tools.why}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {tools.options.map((option) => box("tools", option.id, option.label, true))}
            {box("tools", NOT_SURE, "Not sure", true)}
          </div>
        </fieldset>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button type="submit" size="lg" className="h-11 rounded-full px-6" disabled={!changed}>
            Update my plan
          </Button>
          {changed && <p className="text-sm text-muted-foreground">Your changes apply when you update.</p>}
        </div>
      </form>
    </details>
  );
}
