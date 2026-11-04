"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Fades and slides its content up the first time it scrolls into view.
 *
 * It starts visible, so the page still works if JavaScript fails. Only content
 * that begins below the visible screen is hidden, then revealed on scroll.
 * `index` staggers a row of items by 80ms each. The CSS switches this off for
 * people who prefer reduced motion.
 */
export function Reveal({
  children,
  index = 0,
  className,
}: {
  children: ReactNode;
  index?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const alreadyVisible = el.getBoundingClientRect().top < window.innerHeight;
    if (alreadyVisible) return;

    // Only now, after the first paint, do we know where the element sits.
    setHidden(true);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHidden(false);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-hidden={hidden}
      style={{ transitionDelay: hidden ? "0ms" : `${index * 80}ms` }}
      className={cn("reveal", className)}
    >
      {children}
    </div>
  );
}
