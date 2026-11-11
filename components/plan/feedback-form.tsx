"use client";

import { Star } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { HONEYPOT_FIELD, MAX_COMMENT_LENGTH, commentPrompt, type FeedbackError } from "@/lib/feedback-types";
import { commentLength, validateFeedback } from "@/lib/feedback-validate";
import { cn } from "@/lib/utils";

type Status = "idle" | "sending" | "sent";

const RATINGS = [1, 2, 3, 4, 5] as const;
const SERVICE_DOWN = "Couldn't send that just now. Please try again in a few minutes. Your plan still works as normal.";

/** The id of the first star, so other parts of the page can move focus to the form. */
export const FIRST_STAR_ID = "feedback-rating-1";

/**
 * "How useful was this plan?" Five stars as native radio buttons, so arrow keys
 * and screen readers work, an optional comment and a hidden field that only bots fill in.
 */
export function FeedbackForm({ planQuery, onSent }: { planQuery: string; onSent?: () => void }) {
  const id = useId();
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [trap, setTrap] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<FeedbackError[]>([]);
  const [problem, setProblem] = useState("");
  const thanksRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "sent") thanksRef.current?.focus();
  }, [status]);

  const length = commentLength(comment.trim());
  const errorFor = (field: FeedbackError["field"]) => errors.find((error) => error.field === field)?.message;
  const ratingError = errorFor("rating");
  const commentError = errorFor("comment");

  async function send(event: FormEvent) {
    event.preventDefault();
    setProblem("");
    const body = { rating, comment, [HONEYPOT_FIELD]: trap, plan: planQuery };
    // The same checks as the server, so most mistakes are caught without a round trip.
    const checked = validateFeedback(body);
    if (checked.ok === false) {
      setErrors(checked.errors);
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    setErrors([]);
    setStatus("sending");
    try {
      const response = await fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (response.ok) {
        setStatus("sent");
        onSent?.();
        return;
      }
      const reply = (await response.json().catch(() => ({}))) as { error?: string; errors?: FeedbackError[] };
      if (response.status === 400 && reply.errors?.length) {
        setErrors(reply.errors);
        requestAnimationFrame(() => summaryRef.current?.focus());
      } else {
        setProblem(response.status === 429 && reply.error ? reply.error : SERVICE_DOWN);
      }
    } catch {
      setProblem(SERVICE_DOWN);
    }
    setStatus("idle");
  }

  if (status === "sent") {
    return (
      <div ref={thanksRef} tabIndex={-1} role="status" className="rounded-2xl border border-border bg-card p-6 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 sm:p-8">
        <p className="text-xl font-bold tracking-tight">Thank you. Your feedback has been sent.</p>
        <p className="mt-2 text-pretty leading-relaxed text-muted-foreground">It helps make the plans more useful for everyone.</p>
      </div>
    );
  }

  return (
    <form onSubmit={send} noValidate className="relative space-y-6 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
      {errors.length > 0 && (
        <div ref={summaryRef} tabIndex={-1} role="alert" className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 focus-visible:outline-2 focus-visible:outline-offset-2">
          <p className="font-semibold">Please fix the following:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {errors.map((error) => (
              <li key={error.field}>
                <a href={error.field === "rating" ? `#${FIRST_STAR_ID}` : `#${id}-comment`} className="underline underline-offset-4">
                  {error.message}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <fieldset aria-describedby={`${id}-rating-hint${ratingError ? ` ${id}-rating-error` : ""}`}>
        <legend className="text-lg font-semibold">How useful was this plan?</legend>
        <div className="mt-3 flex flex-wrap gap-1">
          {RATINGS.map((value) => (
            <label
              key={value}
              className="cursor-pointer rounded-lg p-1.5 hover:bg-primary/10 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring"
            >
              <input
                id={value === 1 ? FIRST_STAR_ID : undefined}
                type="radio"
                name="rating"
                value={value}
                checked={rating === value}
                onChange={() => {
                  setRating(value);
                  // A message about the rating no longer applies once one is chosen.
                  setErrors((before) => before.filter((error) => error.field !== "rating"));
                }}
                className="sr-only"
              />
              <Star className={cn("size-9 transition-colors", rating !== null && value <= rating ? "fill-primary text-primary" : "text-muted-foreground")} aria-hidden="true" />
              <span className="sr-only">
                {value} out of 5{value === 1 ? ", not useful" : value === 5 ? ", very useful" : ""}
              </span>
            </label>
          ))}
        </div>
        <p id={`${id}-rating-hint`} className="mt-2 text-sm text-muted-foreground">
          {rating === null ? "1 star is not useful, 5 stars is very useful." : `You chose ${rating} out of 5.`}
        </p>
        {ratingError && (
          <p id={`${id}-rating-error`} className="mt-2 text-sm font-medium text-destructive">
            {ratingError}
          </p>
        )}
      </fieldset>

      <div>
        <label htmlFor={`${id}-comment`} className="text-lg font-semibold">
          {commentPrompt(rating)}
        </label>
        <p id={`${id}-comment-hint`} className="mt-1 text-sm text-muted-foreground">
          Please don&apos;t include names, emails or anything that identifies you or your employer.
        </p>
        <textarea
          id={`${id}-comment`}
          name="comment"
          rows={4}
          value={comment}
          onChange={(event) => {
            setComment(event.target.value);
            if (commentLength(event.target.value.trim()) <= MAX_COMMENT_LENGTH) setErrors((before) => before.filter((error) => error.field !== "comment"));
          }}
          aria-describedby={`${id}-comment-hint ${id}-comment-count${commentError ? ` ${id}-comment-error` : ""}`}
          aria-invalid={commentError || length > MAX_COMMENT_LENGTH ? true : undefined}
          className="mt-3 w-full rounded-lg border border-input bg-background p-3 text-base leading-relaxed text-foreground"
        />
        <p id={`${id}-comment-count`} className={cn("mt-1 text-sm", length > MAX_COMMENT_LENGTH ? "font-medium text-destructive" : "text-muted-foreground")}>
          {length.toLocaleString("en-GB")} of {MAX_COMMENT_LENGTH.toLocaleString("en-GB")} characters
        </p>
        {commentError && (
          <p id={`${id}-comment-error`} className="mt-1 text-sm font-medium text-destructive">
            {commentError}
          </p>
        )}
      </div>

      {/* Hidden from people and screen readers. Bots fill it in, and anything sent with it is dropped. */}
      <div aria-hidden="true" className="absolute -left-[10000px] top-0 h-px w-px overflow-hidden">
        <label>
          Your website
          <input type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" value={trap} onChange={(event) => setTrap(event.target.value)} />
        </label>
      </div>

      {problem && (
        <p role="alert" className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 font-medium">
          {problem}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" size="lg" className="h-11 rounded-full px-6" disabled={status === "sending"}>
          {status === "sending" ? "Sending…" : "Send feedback"}
        </Button>
        <p className="text-sm text-muted-foreground">
          Kept for 12 months.{" "}
          <Link href="/privacy" className="font-medium text-primary underline underline-offset-4">
            How we use your feedback
          </Link>
        </p>
      </div>
    </form>
  );
}
