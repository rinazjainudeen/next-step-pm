"use client";

import { ArrowRight } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { SKIP_KEYS, introTimings, takeIntro, type IntroModel } from "@/lib/plan-intro";

type Stage = "off" | "building" | "leaving";

/** Merely asking for storage can throw when a browser blocks it. */
function sessionStore(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Lets CSS read a delay in milliseconds. */
const delay = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

/** Counts up to `to` while the lane fills, then rests on the real number. */
function CountUp({ to, start, duration }: { to: number; start: number; duration: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    let frame = 0;
    const began = performance.now() + start;
    const tick = (now: number) => {
      const progress = Math.min(Math.max((now - began) / duration, 0), 1);
      setShown(Math.round(to * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [to, start, duration]);
  return <>{shown}</>;
}

/**
 * The "Building your plan" moment after the last question (see lib/plan-intro.ts).
 * It covers the plan, which is already at the top of the page underneath, then
 * fades to show it. A button, Esc, a tap or trying to scroll skips it. While it
 * shows, the page behind it is inert, so Tab can't wander into something hidden.
 * When it ends, focus moves to the plan's heading.
 */
export function PlanBuildIntro({ planHref, model, noun }: { planHref: string; model: IntroModel; noun: "step" | "question" }) {
  const [stage, setStage] = useState<Stage>("off");
  const overlayRef = useRef<HTMLDivElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const timings = introTimings(model.lanes.length);

  // Before the first paint, so the plan doesn't flash before the intro covers it.
  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- session storage is only readable in the browser, and must be read once
    if (takeIntro(sessionStore(), planHref, reducedMotion())) setStage("building");
  }, [planHref]);

  const skip = useCallback(() => setStage((now) => (now === "building" ? "leaving" : now)), []);

  // The timeline: build, then fade, then gone.
  useEffect(() => {
    if (stage === "off") return;
    const timer =
      stage === "building"
        ? window.setTimeout(() => setStage("leaving"), timings.revealAt)
        : window.setTimeout(() => setStage("off"), timings.fadeFor);
    return () => window.clearTimeout(timer);
  }, [stage, timings.revealAt, timings.fadeFor]);

  // While it shows: the page behind is inert, focus is on "Show my plan now", and keys or scrolling skip.
  const showing = stage !== "off";
  useEffect(() => {
    if (!showing) return;
    const overlay = overlayRef.current;
    const behind = [...document.body.children].filter(
      (element): element is HTMLElement => element instanceof HTMLElement && !element.contains(overlay) && !element.inert,
    );
    behind.forEach((element) => (element.inert = true));
    skipRef.current?.focus({ preventScroll: true });

    const onKey = (event: KeyboardEvent) => {
      if (!SKIP_KEYS.includes(event.key)) return;
      event.preventDefault();
      skip();
    };
    const onScroll = (event: Event) => {
      event.preventDefault();
      skip();
    };
    document.addEventListener("keydown", onKey);
    overlay?.addEventListener("wheel", onScroll, { passive: false });
    overlay?.addEventListener("touchmove", onScroll, { passive: false });
    return () => {
      behind.forEach((element) => (element.inert = false));
      document.removeEventListener("keydown", onKey);
      overlay?.removeEventListener("wheel", onScroll);
      overlay?.removeEventListener("touchmove", onScroll);
      // Screen readers then start at the plan's heading, and keyboard users from the top.
      const heading = document.querySelector<HTMLElement>("main h1");
      if (heading) {
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      }
    };
  }, [showing, skip]);

  if (!showing) return null;

  const { chips, lanes } = model;
  const word = (count: number, base: string) => `${count} ${base}${count === 1 ? "" : "s"}`;
  const summary = `${word(chips.length, "answer")} into ${word(lanes.length, "phase")}, ${word(model.blocks, "block")} and ${word(model.steps, noun)}.`;

  return createPortal(
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="build-intro-title"
      aria-describedby="build-intro-summary"
      onClick={skip}
      data-stage={stage}
      style={{ "--fade": `${timings.fadeFor}ms` } as CSSProperties}
      className="build-intro no-print fixed inset-0 z-[60] flex cursor-pointer items-center justify-center overflow-hidden bg-background px-4 py-6"
    >
      <div className="build-intro-card w-full max-w-2xl">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-accent">Building your plan</p>
        <h2 id="build-intro-title" className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          Turning your answers into your plan
        </h2>
        <p id="build-intro-summary" className="mt-1 text-pretty text-muted-foreground">
          {summary}
        </p>

        {/* The picture repeats the summary above, so screen readers skip it. */}
        <div aria-hidden="true">
          <ul style={{ "--flow": `${timings.flowAt}ms` } as CSSProperties} className="mt-5 flex flex-wrap gap-2">
            {chips.map((chip, index) => (
              <li
                key={index}
                style={delay(index * timings.chipStagger)}
                className="build-intro-chip max-w-[16rem] truncate rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium"
              >
                {chip}
              </li>
            ))}
          </ul>

          <ol className="mt-5 space-y-2">
            {lanes.map((lane, index) => {
              const start = timings.lanesAt + index * timings.laneStagger;
              return (
                <li
                  key={lane.id}
                  style={delay(start)}
                  className="build-intro-lane rounded-xl border border-border bg-card p-3 shadow-sm sm:p-4"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate font-semibold">{lane.label}</span>
                    <span className="shrink-0 text-sm text-muted-foreground">{lane.weeks}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex h-2.5 flex-1 gap-1">
                      {Array.from({ length: lane.bars }, (_, bar) => (
                        <span key={bar} style={delay(start + 150 + bar * timings.barStagger)} className="build-intro-bar h-full max-w-8 flex-1 rounded-full bg-primary" />
                      ))}
                    </div>
                    <span className="shrink-0 text-right text-sm font-medium tabular-nums">
                      {word(lane.blocks, "block")} ·{" "}
                      <span className="inline-block min-w-[3ch] text-right">
                        <CountUp to={lane.steps} start={start} duration={timings.countFor} />
                      </span>{" "}
                      {lane.steps === 1 ? noun : `${noun}s`}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Button
            ref={skipRef}
            type="button"
            variant="outline"
            size="lg"
            className="h-11 rounded-full px-6"
            onClick={(event) => {
              event.stopPropagation();
              skip();
            }}
          >
            Show my plan now
            <ArrowRight aria-hidden="true" />
          </Button>
          <p className="text-sm text-muted-foreground">Or tap anywhere, or press Esc.</p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
