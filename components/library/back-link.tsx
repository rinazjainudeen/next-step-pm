"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { planReturnHref } from "@/lib/navigation";

function BackButton({ href, label }: { href: string; label: string }) {
  return (
    <Button render={<Link href={href} />} nativeButton={false} variant="ghost" className="-ml-2 h-10 rounded-full px-4">
      <ArrowLeft aria-hidden="true" />
      {label}
    </Button>
  );
}

/** The Library link, used before the address is read and when the visitor didn't come from a plan. */
export function BackToLibrary() {
  return <BackButton href="/library" label="Back to the library" />;
}

/**
 * Back to where the visitor came from. Opened from a plan, the address carries
 * the plan's own address, so they return to their plan, not the Library.
 */
export function BlockBackLink() {
  const from = planReturnHref(useSearchParams().get("from"));
  return from ? <BackButton href={from} label="Back to your plan" /> : <BackToLibrary />;
}
