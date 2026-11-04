import { INTAKE_QUESTIONS, TOTAL_STEPS, type IntakeQuestion } from "./intake-questions";
import type { IntakeAnswers, IntakeDraft, QuestionId } from "./intake-types";

export type IntakeError = { question: QuestionId; message: string };

export type IntakeValidation = { ok: true; answers: IntakeAnswers } | { ok: false; errors: IntakeError[] };

export function isAnswered(draft: IntakeDraft, id: QuestionId): boolean {
  const answer = draft[id];
  return Array.isArray(answer) ? answer.length > 0 : answer !== null;
}

/** A friendly message if this question still needs an answer, otherwise null. */
export function questionError(draft: IntakeDraft, question: IntakeQuestion): string | null {
  if (isAnswered(draft, question.id)) return null;
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

/** A visitor can jump to any question up to and including the first gap. */
export function canJumpTo(draft: IntakeDraft, step: number): boolean {
  return step <= (firstUnansweredStep(draft) ?? TOTAL_STEPS);
}
