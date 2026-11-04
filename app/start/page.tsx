import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Build my plan",
  description: "The plan builder is being made. Check back soon.",
};

// Placeholder. The real eight-question intake is Phase 3.
export default function StartPage() {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-7xl flex-col items-start justify-center px-4 pb-20 pt-32 sm:px-6 lg:px-8">
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-accent">Coming soon</p>
      <h1 className="mt-3 max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">The plan builder is still being made</h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
        This site is being built in public, one small phase at a time. The eight questions arrive in a later phase.
        Nothing here asks for your details yet.
      </p>
      <Button render={<Link href="/" />} nativeButton={false} variant="outline" size="lg" className="mt-8 h-11 rounded-full px-6">
        <ArrowLeft aria-hidden="true" />
        Back to home
      </Button>
    </section>
  );
}
