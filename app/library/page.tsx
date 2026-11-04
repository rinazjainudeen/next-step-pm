import type { Metadata } from "next";
import { Suspense } from "react";
import { BlockGrid } from "@/components/library/block-card";
import { LibraryBrowser } from "@/components/library/library-browser";
import { PageHero } from "@/components/site/page-hero";
import { loadBlocks } from "@/lib/blocks-load";
import { toSummary } from "@/lib/blocks-types";

export const metadata: Metadata = {
  title: "Library",
  description:
    "Browse every learning block: small, reusable activities for product managers, filtered by phase, PM type, kind and way of working.",
};

export default function LibraryPage() {
  // Read at build time. If any block is invalid, the build stops here.
  const blocks = loadBlocks().map(toSummary);

  return (
    <>
      <PageHero
        size="tool"
        eyebrow="Library"
        title="Every learning block, in one place"
        lead="Your plan is built from these small, reusable activities. Browse them all, or filter by phase, PM type, kind of block and way of working."
      />
      <section aria-label="Learning blocks" className="border-t bg-secondary/40">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
          {/* Until the filters load, show the full list so the page works without JavaScript. */}
          <Suspense fallback={<BlockGrid blocks={blocks} />}>
            <LibraryBrowser blocks={blocks} />
          </Suspense>
        </div>
      </section>
    </>
  );
}
