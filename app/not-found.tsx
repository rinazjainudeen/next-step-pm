import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/site/page-hero";
import { Button } from "@/components/ui/button";
import { PRIMARY_ACTION } from "@/lib/navigation";

export const metadata: Metadata = {
  title: "Page not found",
  description: "This page doesn't exist. Build a plan, browse the Library or go back to the home page.",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <PageHero
      eyebrow="Page not found"
      title="We couldn't find that page"
      lead="The link may be old or mistyped. If it was a plan, your answers are in the link, so check it was copied in full."
    >
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Button render={<Link href={PRIMARY_ACTION.href} />} nativeButton={false} size="lg" className="h-12 rounded-full px-7 text-base">
          {PRIMARY_ACTION.label}
          <ArrowRight aria-hidden="true" />
        </Button>
        <Button render={<Link href="/library" />} nativeButton={false} variant="outline" size="lg" className="h-12 rounded-full px-7 text-base">
          Browse the Library
        </Button>
        <Link href="/" className="inline-flex min-h-6 items-center px-2 font-medium text-primary underline underline-offset-4">
          Go to the home page
        </Link>
      </div>
    </PageHero>
  );
}
