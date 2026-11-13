"use client";

import { Check, ChevronDown } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { useTicks } from "@/components/plan/use-ticks";
import { Button } from "@/components/ui/button";
import { ONLY_CURRENT, isPhaseOpen, openAll, openFor, phaseAnchor, phaseForTarget, phaseOverview, plural, type PhaseChoices, type PhaseOutline } from "@/lib/plan-phase-view";
import { countAt, revealTimings, sessionStore, takeReveal } from "@/lib/plan-reveal";
import { cn } from "@/lib/utils";

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function targetOf(hash: string): HTMLElement | null {
  try {
    return hash.length > 1 ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
  } catch {
    return null;
  }
}

/** Opens a linked block, so "Go to this step" lands on the steps. */
function openBlock(hash: string) {
  const target = targetOf(hash);
  if (target instanceof HTMLDetailsElement) target.open = true;
}

/** Brings a link's target into view once its phase has opened. */
function showTarget(hash: string) {
  const target = targetOf(hash);
  if (!target) return;
  openBlock(hash);
  target.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
  target.querySelector<HTMLElement>("summary, button")?.focus({ preventScroll: true });
}

type Reveal = "off" | "armed" | "playing";

/** Lets CSS read a time in milliseconds. */
const ms = (value: number) => `${value}ms`;

/**
 * A step count in the overview. During the reveal it counts up from 0 to the
 * real number; the rest of the time, and without JavaScript, it is the real
 * number. Screen readers get the real number from separate text, so this is hidden from them.
 */
function RevealCount({ to, playing, start, duration }: { to: number; playing: boolean; start: number; duration: number }) {
  const [shown, setShown] = useState<number | null>(null);
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const began = performance.now() + start;
    const tick = (now: number) => {
      setShown(countAt(to, now - began, duration));
      if (now - began < duration) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, to, start, duration]);
  return <>{playing ? (shown ?? 0) : to}</>;
}

/**
 * The timeline, one phase at a time, with an overview of every phase above it.
 * The phase you're in opens, as worked out by the engine from ticks and "Already
 * done". Others stay closed, with done phases marked. Each phase is a button with
 * `aria-expanded` inside its heading, so screen readers can still move between
 * phases by heading. A link to a block or phase in a closed phase opens it first,
 * whether it's "Go to this step", the overview or a shared link. Printing opens
 * everything (see app/globals.css).
 *
 * Right after the questions, the overview plays a short reveal the first time
 * it's on screen (see lib/plan-reveal.ts). Everything is on the page and usable
 * throughout; the motion only adds to it.
 */
export function PlanPhases({
  planHref,
  phases,
  current,
  contents,
  noun,
}: {
  planHref: string;
  phases: PhaseOutline[];
  current: string | null;
  contents: ReactNode[];
  noun: "steps done" | "questions asked";
}) {
  const [choices, setChoices] = useState<PhaseChoices>(ONLY_CURRENT);

  // Before the first paint, so nothing settles in that was already sitting still.
  const [reveal, setReveal] = useState<Reveal>("off");
  const revealRef = useRef<HTMLDivElement>(null);
  const timings = revealTimings(phases.length);
  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- session storage is only readable in the browser, and must be read once
    if (takeReveal(sessionStore(), planHref, prefersReducedMotion()) && typeof IntersectionObserver !== "undefined") setReveal("armed");
  }, [planHref]);
  // The plan opens at the top and the overview is usually further down, so it plays when it first comes into view.
  useEffect(() => {
    const element = revealRef.current;
    if (reveal !== "armed" || !element) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      setReveal("playing");
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [reveal]);
  useEffect(() => {
    if (reveal !== "playing") return;
    const timer = window.setTimeout(() => setReveal("off"), timings.total + 50);
    return () => window.clearTimeout(timer);
  }, [reveal, timings.total]);
  const playing = reveal === "playing";
  const { ticks } = useTicks();
  // The listeners below are added once, so they read the latest phases and choices from here.
  const outline = useRef(phases);
  const latest = useRef({ choices, current });
  useLayoutEffect(() => {
    outline.current = phases;
    latest.current = { choices, current };
  });

  /** Opens the phase holding a link's target. Synchronous, so the browser's own jump to the link finds it open. */
  const openTarget = useCallback((hash: string) => {
    const phaseId = phaseForTarget(hash, outline.current);
    const { choices: before, current: now } = latest.current;
    const next = openFor(phaseId, before, now);
    if (next !== before) flushSync(() => setChoices(next));
    return next !== before;
  }, []);

  // A link that opened a phase on arrival waits here until the phase is on screen.
  const pending = useRef<string | null>(null);
  useEffect(() => {
    if (pending.current === null) return;
    showTarget(pending.current);
    pending.current = null;
  });

  useEffect(() => {
    // A shared link, or "Back to your plan" from the Library, can land on a block in a closed phase.
    // While the page is still starting up, the phase may not open straight away, so the jump waits for it.
    const arrive = (hash: string) => {
      const phaseId = phaseForTarget(hash, outline.current);
      const { choices: before, current: now } = latest.current;
      const next = openFor(phaseId, before, now);
      if (next === before) return openBlock(hash);
      pending.current = hash;
      setChoices(next);
    };
    if (window.location.hash) arrive(window.location.hash);
    const onHashChange = () => arrive(window.location.hash);
    // A link to the same place twice doesn't change the hash, so clicks are caught as well. The
    // browser then makes its usual jump, to a phase that's now open.
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const hash = (event.target as Element | null)?.closest?.("a[href^='#']")?.getAttribute("href");
      if (!hash) return;
      openTarget(hash);
      openBlock(hash);
    };
    // Find in page can open a closed phase in browsers that support hidden="until-found".
    const onBeforeMatch = (event: Event) => {
      const phaseId = (event.target as Element | null)?.closest?.("[data-phase]")?.getAttribute("data-phase");
      if (phaseId) setChoices((before) => openFor(phaseId, before, latest.current.current));
    };
    window.addEventListener("hashchange", onHashChange);
    document.addEventListener("click", onClick);
    document.addEventListener("beforematch", onBeforeMatch, true);
    return () => {
      window.removeEventListener("hashchange", onHashChange);
      document.removeEventListener("click", onClick);
      document.removeEventListener("beforematch", onBeforeMatch, true);
    };
  }, [openTarget]);

  // React can only write hidden="", so closed phases are upgraded here.
  useEffect(() => {
    for (const panel of document.querySelectorAll<HTMLElement>("[data-phase-panel][hidden]")) panel.setAttribute("hidden", "until-found");
  });

  const isOpen = (id: string) => isPhaseOpen(id, choices, current);
  const allOpen = phases.every((phase) => isOpen(phase.id));
  const rows = phaseOverview(phases, current, ticks);
  const totalBlocks = rows.reduce((sum, row) => sum + row.blocks, 0);
  const totalSteps = rows.reduce((sum, row) => sum + row.steps, 0);
  const stepWord = noun === "questions asked" ? "question" : "step";

  return (
    <div
      ref={revealRef}
      data-reveal={reveal === "off" ? undefined : reveal}
      style={
        reveal === "off"
          ? undefined
          : ({
              "--rise": ms(timings.riseFor),
              "--glow": ms(timings.glowFor),
              "--glow-after": ms(timings.glowAfter),
              "--timeline-at": ms(timings.timelineAt),
              "--timeline-for": ms(timings.timelineFor),
            } as CSSProperties)
      }
    >
      {phases.length > 1 && (
        <nav aria-label="Phases in your plan" className="no-print mt-8 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold tracking-tight">Your plan at a glance</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {plural(phases.length, "phase")}, {plural(totalBlocks, "block")} and {plural(totalSteps, stepWord)}. Numbers show {noun === "questions asked" ? "questions asked" : "steps done"} in each phase.
              </p>
            </div>
            <Button type="button" variant="outline" className="h-11 rounded-full px-5" aria-pressed={allOpen} onClick={() => setChoices(allOpen ? ONLY_CURRENT : openAll(phases))}>
              {allOpen ? "Show only the current phase" : "Open all phases"}
            </Button>
          </div>
          <ol className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {rows.map((row, index) => (
              <li key={row.id} className="reveal-phase" style={reveal === "off" ? undefined : ({ "--d": ms(index * timings.stagger) } as CSSProperties)}>
                <a
                  href={`#${phaseAnchor(row.id)}`}
                  aria-current={row.status === "current" ? "step" : undefined}
                  className={cn(
                    "relative flex min-h-11 items-center gap-3 rounded-xl border px-3 py-2 transition-colors hover:border-primary/40 hover:bg-secondary/60 motion-reduce:transition-none",
                    row.status === "current" ? "reveal-glow border-primary/50 bg-primary/5" : "border-border",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                      row.status === "done" ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary",
                    )}
                  >
                    {row.status === "done" ? <Check className="size-4" /> : index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="font-semibold text-foreground">{row.label}</span>
                      <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
                        <span aria-hidden="true">
                          {row.ticked} of{" "}
                          <RevealCount to={row.steps} playing={playing} start={index * timings.stagger + timings.countAfter} duration={timings.countFor} />
                        </span>
                        <span className="sr-only">
                          {row.ticked} of {plural(row.steps, stepWord)} {noun === "questions asked" ? "asked" : "done"}
                        </span>
                      </span>
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {row.weeks}
                      {row.status === "current" && <span className="font-semibold text-foreground"> · You&apos;re here</span>}
                      {row.status === "done" && <span className="font-semibold text-foreground"> · Done</span>}
                    </span>
                    <span aria-hidden="true" className="mt-1 block h-1 overflow-hidden rounded-full bg-muted">
                      <span className="block h-full rounded-full bg-primary" style={{ width: `${row.steps === 0 ? 0 : Math.round((row.ticked / row.steps) * 100)}%` }} />
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="reveal-timeline mt-6 space-y-4">
        {phases.map((phase, index) => {
          const open = isOpen(phase.id);
          const row = rows[index];
          const panelId = `${phaseAnchor(phase.id)}-panel`;
          return (
            <section key={phase.id} id={phaseAnchor(phase.id)} data-phase={phase.id} aria-labelledby={`${phaseAnchor(phase.id)}-title`} className="scroll-mt-24 rounded-2xl border border-border bg-background">
              <h3 className="text-2xl font-bold tracking-tight">
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => setChoices((before) => ({ ...before, [phase.id]: !isPhaseOpen(phase.id, before, current) }))}
                  className="flex w-full cursor-pointer items-start gap-3 rounded-2xl p-5 text-left sm:p-6"
                >
                  <ChevronDown className={cn("no-print mt-1 size-5 shrink-0 text-primary transition-transform motion-reduce:transition-none", open && "rotate-180")} aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block text-sm font-bold uppercase tracking-[0.18em] text-accent">{phase.weeks}</span>
                    <span id={`${phaseAnchor(phase.id)}-title`} className="mt-1 block">
                      {phase.label}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-2 font-sans text-sm font-normal tracking-normal text-muted-foreground">
                      <span>
                        {plural(row.blocks, "block")}, {row.ticked} of {plural(row.steps, stepWord)} {noun === "questions asked" ? "asked" : "done"}
                      </span>
                      {phase.done && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
                          <Check className="size-3.5" aria-hidden="true" />
                          Done
                        </span>
                      )}
                      {phase.id === current && <span className="font-semibold text-foreground">You&apos;re here</span>}
                    </span>
                  </span>
                </button>
              </h3>
              {/* No padding on the panel itself: a closed panel can still take up its padding in some browsers. */}
              <div id={panelId} data-phase-panel hidden={!open}>
                <div className="px-5 pb-5 sm:px-6 sm:pb-6">{contents[index]}</div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
