"use client";

import { Check, Link as LinkIcon, Printer } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

/** Copy link and print. Printing opens every block first, so nothing is left out. */
export function PlanActions() {
  const [status, setStatus] = useState("");

  useEffect(() => {
    let wereClosed: HTMLDetailsElement[] = [];
    const openAll = () => {
      wereClosed = [...document.querySelectorAll<HTMLDetailsElement>("details[data-plan-block]:not([open])")];
      wereClosed.forEach((item) => (item.open = true));
    };
    const restore = () => wereClosed.forEach((item) => (item.open = false));
    window.addEventListener("beforeprint", openAll);
    window.addEventListener("afterprint", restore);
    return () => {
      window.removeEventListener("beforeprint", openAll);
      window.removeEventListener("afterprint", restore);
    };
  }, []);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setStatus("Link copied.");
    } catch {
      setStatus("We couldn't copy that. Copy the address from your browser's address bar instead.");
    }
  }

  return (
    <div className="no-print flex flex-wrap items-center gap-3">
      <Button type="button" size="lg" className="h-11 rounded-full px-6" onClick={copyLink}>
        {status === "Link copied." ? <Check aria-hidden="true" /> : <LinkIcon aria-hidden="true" />}
        Copy link to this plan
      </Button>
      <Button type="button" variant="outline" size="lg" className="h-11 rounded-full px-6" onClick={() => window.print()}>
        <Printer aria-hidden="true" />
        Print / save as PDF
      </Button>
      <p role="status" className="text-sm text-muted-foreground">
        {status}
      </p>
    </div>
  );
}
