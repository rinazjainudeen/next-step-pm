"use client";

import { useEffect, useRef } from "react";
import { AMBIENT_BLOCKS, PATH_LENGTH, alignment, cycleOf, drift, pathBlocks, pathFor, pathPoint } from "@/lib/hero-ambient";

/** The blocks' size when they sit on the path, so the path looks even. */
const PATH_WIDTH = 26;
/** About 30 frames a second is plenty for something this slow, and easier on phones. */
const FRAME = 1000 / 30;

/**
 * The home hero's slow background (see lib/hero-ambient.ts). Decorative only:
 * hidden from screen readers and never in the way of a click. Blocks start where
 * they rest, so the first paint, a failed script and "reduce motion" all show
 * the same still picture. It only moves while the hero is on screen and the tab
 * is open. Only position and transparency change, so nothing reflows.
 */
export function HeroAmbient() {
  const rootRef = useRef<HTMLDivElement>(null);
  const blockRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const lineRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const line = lineRef.current;
    if (!root || !line) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

    let width = root.clientWidth;
    let height = root.clientHeight;
    let time = 0;
    let last = 0;
    let frame = 0;
    let onScreen = false;

    const placeLine = () => {
      const start = pathPoint(0, pathFor(width));
      const end = pathPoint(PATH_LENGTH - 1, pathFor(width));
      const dx = (end.x - start.x) * width;
      const dy = (end.y - start.y) * height;
      line.style.left = `${start.x * width}px`;
      line.style.top = `${start.y * height}px`;
      line.style.width = `${Math.hypot(dx, dy)}px`;
      line.style.setProperty("--angle", `${Math.atan2(dy, dx)}rad`);
    };

    const draw = () => {
      const t = alignment(time);
      const onPath = pathBlocks(cycleOf(time));
      const path = pathFor(width);
      AMBIENT_BLOCKS.forEach((block, index) => {
        const element = blockRefs.current[index];
        if (!element) return;
        const slot = onPath.indexOf(index);
        const wander = drift(block, time);
        const pull = slot === -1 ? 0 : t;
        const target = slot === -1 ? { x: block.x, y: block.y } : pathPoint(slot, path);
        const x = wander.x * (1 - pull) + (target.x - block.x) * width * pull;
        const y = wander.y * (1 - pull) + (target.y - block.y) * height * pull;
        const scale = 1 + pull * (PATH_WIDTH / block.width - 1);
        element.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${(wander.turn * (1 - pull)).toFixed(2)}deg) scale(${scale.toFixed(3)})`;
        element.style.opacity = (0.55 + 0.45 * pull).toFixed(3);
      });
      line.style.opacity = (t * 0.6).toFixed(3);
      line.style.transform = `rotate(var(--angle)) scaleX(${t.toFixed(3)})`;
    };

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      if (now - last < FRAME) return;
      // Time only runs while it's showing, and a long gap doesn't make it jump.
      if (last) time += Math.min(now - last, 100);
      last = now;
      draw();
    };

    const shouldRun = () => onScreen && document.visibilityState === "visible" && !motion.matches;
    const update = () => {
      if (shouldRun()) {
        if (!frame) {
          last = 0;
          frame = requestAnimationFrame(tick);
        }
        return;
      }
      cancelAnimationFrame(frame);
      frame = 0;
      if (motion.matches) {
        // Back to the still picture.
        time = 0;
        draw();
      }
    };

    const resize = new ResizeObserver(() => {
      width = root.clientWidth;
      height = root.clientHeight;
      placeLine();
      draw();
    });
    resize.observe(root);
    const visible = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      update();
    });
    visible.observe(root);
    document.addEventListener("visibilitychange", update);
    motion.addEventListener("change", update);
    placeLine();

    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      visible.disconnect();
      document.removeEventListener("visibilitychange", update);
      motion.removeEventListener("change", update);
    };
  }, []);

  return (
    <div ref={rootRef} aria-hidden="true" className="hero-ambient pointer-events-none absolute inset-0 overflow-hidden">
      <span ref={lineRef} className="hero-ambient-line absolute block h-0.5 origin-left rounded-full bg-[#3fc1ea] opacity-0" />
      {AMBIENT_BLOCKS.map((block, index) => (
        <span
          key={index}
          ref={(element) => {
            blockRefs.current[index] = element;
          }}
          className="hero-ambient-block absolute block rounded-md border border-white/25 bg-white/15 opacity-55"
          style={{ left: `${block.x * 100}%`, top: `${block.y * 100}%`, width: block.width, height: block.height, marginLeft: -block.width / 2, marginTop: -block.height / 2 }}
        />
      ))}
    </div>
  );
}
