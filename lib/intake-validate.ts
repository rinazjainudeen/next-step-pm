import { finishOptions, phasesForStage } from "./intake-phases";
import { INTAKE_QUESTIONS, TOTAL_STEPS, type IntakeQuestion } from "./intake-questions";
import type { IntakeAnswers, IntakeDraft, QuestionId } from "./intake-types";

export type IntakeError = { question: QuestionId; message: string };

export type IntakeValidation = { ok: true; answers: IntakeAnswers } | { ok: false; errors: IntakeError[] };

/** A message if this question's follow-up is on offer but unanswered, otherwise null. */
export function followUpError(draft: IntakeDraft, id: QuestionId): string | null {
  if (id === "stage" && draft.phase === null && phasesForStage(draft.stage).length > 0) {
    return "Please choose the phase you're in, or choose Not sure.";
  }
  if (id === "time" && draft.until === null && finishOptions(draft).length > 0) {
    return "Please choose the phase to finish by then, or choose Not sure.";
  }
  return null;
}

function hasMainAnswer(draft: IntakeDraft, id: QuestionId): boolean {
  const answer = draft[id];
  return Array.isArray(answer) ? answer.length > 0 : answer !== null;
}

/** True when a question and any follow-up it shows are both answered. */
export function isAnswered(draft: IntakeDraft, id: QuestionId): boolean {
  return hasMainAnswer(draft, id) && followUpError(draft, id) === null;
}

/** A friendly message if this question still needs an answer, otherwise null. */
export function questionError(draft: IntakeDraft, question: IntakeQuestion): string | null {
  if (hasMainAnswer(draft, question.id)) return followUpError(draft, question.id);
  return question.kind === "multi"
    ? "Please tick at least one, or choose Not sure."
    : "Please choose an option, or choose Not sure.";
}

/** Checks a whole draft. On success, the result is a complete set of answers. */
export function validateDraft(draft: IntakeDraft): IntakeValidation {
  const errors = INTAKE_QUESTIONS.flatMap((question) => {
    const message = questionError(draft, question);
    return message ? [{ question: question.id, message }] : [];
  });
  return errors.length > 0 ? { ok: false, errors } : { ok: true, answers: draft as IntakeAnswers };
}

/** The step number of the first unanswered question, or null if all are answered. */
export function firstUnansweredStep(draft: IntakeDraft): number | null {
  const index = INTAKE_QUESTIONS.findIndex((question) => !isAnswered(draft, question.id));
  return index === -1 ? null : index + 1;
}

/**
 * A visitor can jump to any question they've answered, or to the first gap.
 * Going back to change something must never lock them out of later answers.
 * The last button still catches any gap before building the plan.
 */
export function canJumpTo(draft: IntakeDraft, step: number): boolean {
  if (isAnswered(draft, INTAKE_QUESTIONS[step - 1].id)) return true;
  return step <= (firstUnansweredStep(draft) ?? TOTAL_STEPS);
}
