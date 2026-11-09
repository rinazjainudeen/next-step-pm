"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { OptionCard } from "@/components/intake/option-card";
import { StepNav } from "@/components/intake/step-nav";
import { PageHero } from "@/components/site/page-hero";
import { Button } from "@/components/ui/button";
import type { PHASES, PhaseId } from "@/content/taxonomy";
import { choosePhase, chooseSingle, setTeamCount, toggleMulti } from "@/lib/intake-draft";
import { finishOptions, phasesForStage } from "@/lib/intake-phases";
import { questionFor, questionsForWork, totalStepsFor, type IntakeOption, type IntakeQuestion } from "@/lib/intake-questions";
import { MAX_TEAM_COUNT, NOT_SURE, type IntakeDraft, type NotSure, type TeamRoleId } from "@/lib/intake-types";
import { parseDraft, parseEditing, parseStep, planHref, startHref } from "@/lib/intake-url";
import { firstUnansweredStep, followUpError, questionError } from "@/lib/intake-validate";
import { cn } from "@/lib/utils";

const GRID = "grid gap-3 sm:grid-cols-2 lg:grid-cols-3";
// Tool names are short, so they fit two to a row even on a phone.
const COMPACT_GRID = "grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6";

/** Stretches the last card to fill its row, so the grid ends cleanly whatever the count. */
function fillRow(cardsBefore: number): string {
  const tablet = cardsBefore % 2 === 0 ? "sm:col-span-2" : "sm:col-span-1";
  const laptop = ["lg:col-span-3", "lg:col-span-2", "lg:col-span-1"][cardsBefore % 3];
  return `${tablet} ${laptop}`;
}

/** Reads the very latest answers, so two quick clicks can't overwrite each other. */
function latestDraft(): IntakeDraft {
  return parseDraft(new URLSearchParams(window.location.search));
}

/**
 * One question per screen. The web address holds everything: which question
 * you're on and every answer so far. That's why Back, refresh and sharing work.
 */
export function IntakeWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const draft = parseDraft(searchParams);
  // Exploring product management has a shorter path, so a step past its end counts as the last.
  const totalSteps = totalStepsFor(draft.work);
  const step = Math.min(parseStep(searchParams), totalSteps);
  const editing = parseEditing(searchParams);
  const question = questionFor(questionsForWork(draft.work)[step - 1], draft);
  // The hero is only for arriving. After that, the question comes straight away.
  const compact = step > 1 || editing;

  // The message belongs to one step, so it can't follow a visitor to another.
  const [error, setError] = useState<{ step: number; message: string } | null>(null);
  const message = error?.step === step ? error.message : null;

  const followUpRef = useRef<HTMLDivElement>(null);
  const hasFollowUp =
    (question.id === "stage" && phasesForStage(draft.stage).length > 0) ||
    (question.id === "time" && finishOptions(draft).length > 0);

  /** Brings the follow-up out from behind the Back and Next bar. */
  function revealFollowUp() {
    followUpRef.current?.scrollIntoView({ block: "start" });
    followUpRef.current?.querySelector("input")?.focus({ preventScroll: true });
  }

  // When the question changes, start at the top and move focus to the question,
  // so screen readers announce it. Not on first load, where focus stays at the
  // top of the page. If a follow-up is why they're here, go straight to it.
  const headingRef = useRef<HTMLHeadingElement>(null);
  const shownStep = useRef(step);
  const hadFollowUp = useRef(hasFollowUp);
  useEffect(() => {
    if (shownStep.current !== step) {
      shownStep.current = step;
      window.scrollTo({ top: 0, behavior: "instant" });
      headingRef.current?.focus({ preventScroll: true });
      if (message && followUpError(draft, question.id)) revealFollowUp();
    } else if (hasFollowUp && !hadFollowUp.current) {
      // It has just appeared, probably below the fold. Scroll only, so
      // keyboard users stay on the radio button they're using.
      followUpRef.current?.scrollIntoView({ block: "start" });
    }
    hadFollowUp.current = hasFollowUp;
  });

  function save(change: (current: IntakeDraft) => IntakeDraft) {
    window.history.replaceState(null, "", startHref(change(latestDraft()), step, editing));
    setError(null);
  }

  function goTo(nextStep: number, nextError: string | null = null, keepEditing = false) {
    window.history.pushState(null, "", startHref(latestDraft(), nextStep, keepEditing));
    setError(nextError ? { step: nextStep, message: nextError } : null);
  }

  function handleNext(event: FormEvent) {
    event.preventDefault();
    const current = latestDraft();
    const problem = questionError(current, question);
    if (problem) {
      setError({ step, message: problem });
      if (followUpError(current, question.id)) revealFollowUp();
    } else if (editing) {
      // A change can rule out a later answer, such as the phase to finish by.
      const missing = firstUnansweredStep(current);
      if (missing) goTo(missing, "Your change means we need this answer again.", true);
      else router.push(planHref(current));
    } else if (step < totalSteps) {
      goTo(step + 1);
    } else {
      // A shared or hand-edited link could reach here with gaps.
      const missing = firstUnansweredStep(current);
      if (missing) goTo(missing, "We still need this answer before we can build your plan.");
      else router.push(planHref(current));
    }
  }

  return (
    <>
      {!compact && (
        <PageHero
          size="tool"
          eyebrow="Build my plan"
          title="Tell us about your work"
          lead="A few short questions. No name, no email and no account. Your answers stay in the web address, so you can go back, refresh or share the link."
        />
      )}
      <section aria-label="Questions" className={cn("bg-secondary/40", compact ? "pt-16" : "border-t")}>
        <div className={cn("mx-auto max-w-7xl px-4 sm:px-6 lg:px-8", compact ? "py-4 md:py-6" : "py-8 md:py-12")}>
          <form
            onSubmit={handleNext}
            noValidate
            aria-label={editing ? "Change your answer" : "Build my plan"}
            className="rounded-2xl border border-border bg-card px-6 pt-6 shadow-sm sm:px-8"
          >
            <div className="flex items-baseline justify-between gap-4 text-sm font-semibold">
              {compact ? (
                <h1 className="text-foreground">{editing ? "Change your answer" : "Build my plan"}</h1>
              ) : (
                <span />
              )}
              {!editing && (
                <p className="text-muted-foreground">
                  Question {step} of {totalSteps}
                </p>
              )}
            </div>
            {!editing && <StepNav step={step} draft={draft} onJump={goTo} />}

            <fieldset className="mt-6 min-w-0">
              <legend className="w-full">
                <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-bold tracking-tight text-balance outline-none sm:text-3xl">
                  {question.title}
                </h2>
              </legend>
              <p className="mt-2 max-w-3xl leading-relaxed text-pretty text-muted-foreground">{question.why}</p>
              <div className="mt-6">
                <Options question={question} draft={draft} save={save} />
              </div>
            </fieldset>

            <div ref={followUpRef}>
              {question.id === "stage" && (
                <PhaseFollowUp
                  name="phase"
                  title="Which phase are you in right now?"
                  hint="Your plan will start here."
                  notSure="Your plan will start at the first phase for where the product is."
                  phases={phasesForStage(draft.stage)}
                  value={draft.phase}
                  save={save}
                />
              )}
              {question.id === "time" && (
                <PhaseFollowUp
                  name="until"
                  title="Which phase do you want to finish by then?"
                  hint="Your plan will stop here."
                  notSure="Pick this if your milestone doesn't match a phase, such as a contract ending. Your plan will cover the usual phases for where you are."
                  phases={finishOptions(draft)}
                  value={draft.until}
                  save={save}
                />
              )}
            </div>

            {/* Stays on screen on long questions, so nobody has to scroll to carry on. */}
            <div className="sticky bottom-0 -mx-6 mt-6 rounded-b-2xl border-t border-border bg-card px-6 py-3 sm:-mx-8 sm:px-8">
              <div role="alert">{message && <p className="mb-3 font-medium text-destructive">{message}</p>}</div>
              <div className="flex flex-wrap items-center gap-3">
                {step > 1 && !editing && (
                  <Button type="button" variant="outline" size="lg" className="h-11 rounded-full px-6" onClick={() => goTo(step - 1)}>
                    <ArrowLeft aria-hidden="true" />
                    Back
                  </Button>
                )}
                <Button type="submit" size="lg" className="ml-auto h-11 rounded-full px-6">
                  {editing ? "Save and return to my answers" : step < totalSteps ? "Next" : "Build my plan"}
                  <ArrowRight aria-hidden="true" />
                </Button>
              </div>
            </div>
          </form>
        </div>
      </section>
    </>
  );
}

type OptionsProps = {
  question: IntakeQuestion;
  draft: IntakeDraft;
  save: (change: (current: IntakeDraft) => IntakeDraft) => void;
};

function Options({ question, draft, save }: OptionsProps) {
  const type = question.kind === "single" ? "radio" : "checkbox";
  const isChecked = (id: string) => {
    const answer = draft[question.id];
    return Array.isArray(answer) ? (answer as string[]).includes(id) : answer === id;
  };
  const select = (id: string) =>
    save((current) =>
      question.kind === "single" ? chooseSingle(current, question.id, id) : toggleMulti(current, question.id, id),
    );

  const card = (option: IntakeOption, compact = false) => (
    <OptionCard
      key={option.id}
      compact={compact}
      type={type}
      name={question.id}
      value={option.id}
      label={option.label}
      explanation={option.description}
      checked={isChecked(option.id)}
      onChange={() => select(option.id)}
      disabled={atLimit && !isChecked(option.id)}
    >
      {question.id === "team" && isChecked(option.id) && (
        <TeamCount option={option} count={draft.teamCounts[option.id as TeamRoleId] ?? 1} save={save} />
      )}
    </OptionCard>
  );

  const maxChoices = question.kind === "multi" ? question.maxChoices : undefined;
  const answer = draft[question.id];
  const chosen = Array.isArray(answer) ? answer.filter((id) => id !== NOT_SURE).length : 0;
  const atLimit = maxChoices !== undefined && chosen >= maxChoices;

  const groups = question.kind === "multi" ? question.groups : undefined;
  const extraOption = question.kind === "multi" ? question.extraOption : undefined;

  return (
    <div className="flex flex-col gap-3">
      {atLimit && <p className="font-medium">You&apos;ve picked two. Untick one to choose another.</p>}
      {groups && (
        groups.map((group) => (
          <fieldset key={group.id} className="min-w-0">
            <legend className="mb-2 text-sm font-semibold">{group.label}</legend>
            <div className={COMPACT_GRID}>{group.options.map((option) => card(option, true))}</div>
          </fieldset>
        ))
      )}
      <div className={GRID}>
        {!groups && question.options.map((option) => card(option))}
        {extraOption && card(extraOption)}
        <div className={fillRow(groups ? 1 : question.options.length)}>
          <OptionCard
            type={type}
            name={question.id}
            value={NOT_SURE}
            label="Not sure"
            explanation={question.notSure}
            checked={isChecked(NOT_SURE)}
            onChange={() => select(NOT_SURE)}
          />
        </div>
      </div>
    </div>
  );
}

/** How many people have this role. A list, so it can't be left blank. */
function TeamCount({ option, count, save }: Pick<OptionsProps, "save"> & { option: IntakeOption; count: number }) {
  const id = `count-${option.id}`;
  return (
    <div className="flex items-center gap-2 px-4 pb-4 pl-12">
      <label htmlFor={id} className="text-sm font-medium">
        How many
        <span className="sr-only"> {option.label} roles</span>
      </label>
      <select
        id={id}
        value={count}
        onChange={(event) => save((current) => setTeamCount(current, option.id as TeamRoleId, Number(event.target.value)))}
        className="h-11 rounded-lg border border-input bg-background px-2 text-base text-foreground"
      >
        {Array.from({ length: MAX_TEAM_COUNT }, (_, index) => index + 1).map((value) => (
          <option key={value} value={value}>
            {value === MAX_TEAM_COUNT ? `${value}+` : value}
          </option>
        ))}
      </select>
    </div>
  );
}

/** An optional question about a lifecycle phase. Hidden when there's nothing to choose. */
function PhaseFollowUp({
  name,
  title,
  hint,
  notSure,
  phases,
  value,
  save,
}: Pick<OptionsProps, "save"> & {
  name: "phase" | "until";
  title: string;
  hint: string;
  notSure: string;
  phases: readonly (typeof PHASES)[number][];
  value: IntakeDraft["phase"];
}) {
  if (phases.length === 0) return null;

  const choose = (phase: PhaseId | NotSure) => save((current) => choosePhase(current, name, phase));

  return (
    <fieldset className="mt-8 min-w-0 border-t border-border pt-6">
      <legend className="float-left w-full text-lg font-semibold">{title}</legend>
      <p className="clear-both pt-1 leading-relaxed text-muted-foreground">{hint}</p>
      <div className={cn(GRID, "mt-4")}>
        {phases.map((phase) => (
          <OptionCard
            key={phase.id}
            type="radio"
            name={name}
            value={phase.id}
            label={phase.label}
            explanation={phase.description}
            checked={value === phase.id}
            onChange={() => choose(phase.id)}
          />
        ))}
        <div className={fillRow(phases.length)}>
          <OptionCard type="radio" name={name} value={NOT_SURE} label="Not sure" explanation={notSure} checked={value === NOT_SURE} onChange={() => choose(NOT_SURE)} />
        </div>
      </div>
    </fieldset>
  );
}
