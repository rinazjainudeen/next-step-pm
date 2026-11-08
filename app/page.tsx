import { ArrowRight, BookOpenCheck, ClipboardList, ListChecks, Route, ShieldCheck, Shapes, UserX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/site/reveal";
import { SectionHeading } from "@/components/site/section-heading";
import { Button } from "@/components/ui/button";
import { HOME_SECTION_LINKS, PRIMARY_ACTION } from "@/lib/navigation";
import { HOME_STATS } from "@/lib/site-stats";

export const metadata: Metadata = {
  title: { absolute: "Next Step PM: a learning plan for product managers" },
  description:
    "A free learning plan for product managers, built around the product you're working on. Answer a few short questions and get sourced, step-by-step guidance pitched at your level.",
};

const STEPS = [
  {
    icon: ClipboardList,
    title: "Answer a few questions",
    text: "The kind of work you're doing, your kind of PM, what you own, your product, your organisation, where you're starting from, your biggest challenge, your timeline and how you work. You can say “Not sure” to any of them, and add your team and tools later.",
  },
  {
    icon: Shapes,
    title: "We match learning blocks",
    text: "Each block is one small, reusable activity, such as writing a problem statement. Fixed rules pick the right blocks and shape them to your experience. The same answers always give the same plan.",
  },
  {
    icon: Route,
    title: "Follow your plan",
    text: "Work through it phase by phase. Each block says who in your team can help, which of your tools to use and what “done” looks like. Tick tasks off as you go.",
  },
];

const PRINCIPLES = [
  {
    icon: UserX,
    title: "No sign-up",
    text: "There are no accounts. Your answers live in the web address, so you can bookmark or share your plan.",
  },
  {
    icon: ShieldCheck,
    title: "No personal details",
    text: "We ask for roles and categories only. We never ask for your name, email or company.",
  },
  {
    icon: ListChecks,
    title: "Rules, not guesswork",
    text: "The plan is built by tested code, not by an AI making it up. Any AI summary added later can only use steps that are already in your plan.",
  },
  {
    icon: BookOpenCheck,
    title: "Sources cited",
    text: "Every learning block lists where its advice comes from, so you can check it for yourself.",
  },
];

function HeroArt() {
  return (
    <svg
      viewBox="0 0 640 520"
      className="absolute inset-y-0 right-0 h-full w-full max-w-4xl object-cover text-white"
      preserveAspectRatio="xMaxYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="step-glow" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#0a5f8a" />
          <stop offset="1" stopColor="#3fc1ea" />
        </linearGradient>
      </defs>
      <rect x="120" y="360" width="130" height="200" rx="18" fill="url(#step-glow)" opacity="0.35" />
      <rect x="280" y="260" width="130" height="300" rx="18" fill="url(#step-glow)" opacity="0.55" />
      <rect x="440" y="140" width="130" height="420" rx="18" fill="url(#step-glow)" opacity="0.85" />
      <circle cx="505" cy="96" r="14" fill="#3fc1ea" />
    </svg>
  );
}

export default function HomePage() {
  return (
    <>
      {/* Hero and stats band together fill one screen. */}
      <div className="flex min-h-svh flex-col">
        <section aria-labelledby="hero-title" className="relative flex flex-1 items-center overflow-hidden bg-navy pt-16 text-white">
          <HeroArt />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-r from-navy/90 via-navy/55 to-navy/15"
          />
          <div className="relative mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 md:py-16 lg:px-8">
            <p className="inline-flex items-center rounded-full border border-white/30 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] backdrop-blur">
              Free tool · In development
            </p>
            <h1
              id="hero-title"
              className="mt-6 max-w-3xl text-4xl font-bold leading-[1.05] tracking-tight text-balance sm:text-5xl lg:text-6xl"
            >
              Learn product management on the product you&apos;re building.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/90 text-pretty">
              Answer a few short questions about your work, your product and your team. Get a step-by-step learning plan
              you follow on your real work, pitched at your level. Free, with no sign-up.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Button
                render={<Link href={PRIMARY_ACTION.href} />}
                nativeButton={false}
                size="lg"
                className="h-12 rounded-full bg-white px-7 text-base text-navy hover:bg-white/90"
              >
                {PRIMARY_ACTION.label}
                <ArrowRight aria-hidden="true" />
              </Button>
              <nav aria-label="Jump to a section" className="flex flex-wrap gap-2">
                {HOME_SECTION_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-full border border-white/30 px-4 py-2 text-sm font-medium backdrop-blur hover:bg-white/10"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </section>

        <section aria-label="At a glance" className="border-t border-white/10 bg-navy text-white">
          <dl className="mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-8 px-4 py-10 sm:px-6 md:grid-cols-3 lg:grid-cols-5 lg:px-8">
            {HOME_STATS.map((stat) => (
              <div key={stat.label} className="flex flex-col">
                <dt className="order-2 mt-1 text-xs font-bold uppercase tracking-[0.18em] text-white/80">{stat.label}</dt>
                <dd className="font-heading text-4xl font-bold tracking-tight sm:text-5xl">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <section id="how-it-works" className="scroll-mt-20">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 md:py-28 lg:px-8">
          <Reveal>
            <SectionHeading
              eyebrow="How it works"
              title="From a few answers to a plan you can follow"
              lead="Courses teach product management in the abstract. This builds a plan around the real work on your product, at your level, so you learn by doing."
            />
          </Reveal>
          <ol className="mt-12 grid gap-6 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title}>
                <Reveal index={i} className="h-full">
                  <div className="h-full rounded-2xl border border-border bg-card p-6 shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                        <step.icon className="size-5" aria-hidden="true" />
                      </span>
                      <span className="font-heading text-sm font-bold uppercase tracking-[0.18em] text-accent">
                        Step {i + 1}
                      </span>
                    </div>
                    <h3 className="mt-5 text-xl font-bold tracking-tight">{step.title}</h3>
                    <p className="mt-3 leading-relaxed text-muted-foreground">{step.text}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="principles" className="scroll-mt-20 border-t bg-secondary/40">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 md:py-28 lg:px-8">
          <Reveal>
            <SectionHeading
              eyebrow="Built to be trusted"
              title="Simple, private and checkable"
              lead="A learning plan is only useful if you can trust where it came from and what happens to your answers."
            />
          </Reveal>
          <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PRINCIPLES.map((item, i) => (
              <li key={item.title}>
                <Reveal index={i} className="h-full">
                  <div className="h-full rounded-2xl border border-border bg-card p-6 shadow-sm">
                    <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                      <item.icon className="size-5" aria-hidden="true" />
                    </span>
                    <h3 className="mt-5 text-lg font-bold tracking-tight">{item.title}</h3>
                    <p className="mt-3 leading-relaxed text-muted-foreground">{item.text}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="cta-title" className="bg-navy text-white">
        <div className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 md:py-28 lg:px-8">
          <Reveal>
            <h2 id="cta-title" className="mx-auto max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
              Ready for your next step?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-white/90">
              It takes about two minutes, and there is nothing to sign up for.
            </p>
            <Button
              render={<Link href={PRIMARY_ACTION.href} />}
              nativeButton={false}
              size="lg"
              className="mt-8 h-12 rounded-full bg-white px-7 text-base text-navy hover:bg-white/90"
            >
              {PRIMARY_ACTION.label}
              <ArrowRight aria-hidden="true" />
            </Button>
          </Reveal>
        </div>
      </section>
    </>
  );
}
