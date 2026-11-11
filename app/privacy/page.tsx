import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { PageHero } from "@/components/site/page-hero";
import { DELETION_CONTACT_URL } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Next Step PM stores, why, for how long, who can see it, and how to ask for it to be deleted.",
};

const UPDATED = "11 November 2026";

function Part({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-20">
      <h2 id={`${id}-title`} className="text-2xl font-bold tracking-tight text-balance">
        {title}
      </h2>
      <div className="mt-4 space-y-4 text-pretty leading-relaxed">{children}</div>
    </section>
  );
}

const LIST = "list-disc space-y-2 pl-5 marker:text-primary";

export default function PrivacyPage() {
  return (
    <>
      <PageHero eyebrow="Privacy" title="Your privacy" lead="This site asks for no names, emails or companies. Here is everything it does keep, and why." />
      <div className="border-t bg-secondary/40">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <div className="max-w-3xl space-y-12">
          <Part id="who" title="Who runs this site">
            <p>Next Step PM is a personal project by Rinaz Jainudeen. It isn&apos;t affiliated with any employer, and it isn&apos;t a business.</p>
          </Part>

          <Part id="your-answers" title="Your answers and your plan">
            <p>
              Your answers live in the web address of your plan, so you can bookmark or share it. They aren&apos;t sent to a database. The ticks,
              &ldquo;Already done&rdquo;, &ldquo;Not relevant&rdquo; and your self-check are saved in your own browser only, and you can clear them by
              clearing your browser&apos;s data for this site.
            </p>
            <p>When you finish the questions, one is added to a count of plans built that day, by kind of plan (such as building a product or exploring the role). Nothing about you is stored with it.</p>
          </Part>

          <Part id="feedback" title="If you send feedback">
            <p>The feedback form at the bottom of each plan stores:</p>
            <ul className={LIST}>
              <li>your rating, from 1 to 5</li>
              <li>your comment, if you write one</li>
              <li>your plan&apos;s answers, which are categories only, such as your kind of work, your level and your phase</li>
              <li>the date, and which version of the site you used</li>
            </ul>
            <p>
              It doesn&apos;t store your name, email, company or network address. Please don&apos;t include anything in your comment that identifies you
              or your employer.
            </p>
            <p>
              To stop the form being misused, the site keeps a scrambled version of your network address in its memory for up to an hour. It&apos;s
              never written to the database, and it can&apos;t be turned back into your address.
            </p>
          </Part>

          <Part id="why" title="Why it's kept">
            <p>Feedback shows whether plans are useful and what&apos;s missing, so the plans can be improved. The count of plans built shows whether people use the site.</p>
          </Part>

          <Part id="how-long" title="How long it's kept">
            <p>Feedback is deleted 12 months after it&apos;s sent. The daily counts of plans built are totals with nothing about you in them.</p>
          </Part>

          <Part id="who-sees" title="Who can see it">
            <p>Only Rinaz. Feedback is never shared, sold or published, and it isn&apos;t used to train AI.</p>
          </Part>

          <Part id="services" title="Services that handle it">
            <ul className={LIST}>
              <li>
                <span className="font-semibold">Supabase</span> stores the feedback and the counts, on servers in Frankfurt, Germany.
              </li>
              <li>
                <span className="font-semibold">Resend</span> sends Rinaz an email with each piece of feedback.
              </li>
              <li>
                <span className="font-semibold">Vercel</span> hosts the site, and its Web Analytics counts page visits without cookies and without
                identifying you.
              </li>
            </ul>
            <p>The site sets no cookies of its own.</p>
          </Part>

          <Part id="deletion" title="Asking for your feedback to be deleted">
            <p>
              Send Rinaz a{" "}
              <a href={DELETION_CONTACT_URL} className="font-medium text-primary underline underline-offset-4" rel="noopener noreferrer" target="_blank">
                message on LinkedIn (opens in a new tab)
              </a>
              . Because feedback has no name on it, say roughly when you sent it and what it said, and it will be found and deleted.
            </p>
            <p>
              You also have the right to ask what&apos;s held about you, and to complain to the{" "}
              <a href="https://ico.org.uk/make-a-complaint/" className="font-medium text-primary underline underline-offset-4" rel="noopener noreferrer" target="_blank">
                Information Commissioner&apos;s Office (opens in a new tab)
              </a>
              .
            </p>
          </Part>

          <p className="border-t border-border pt-6 text-sm text-muted-foreground">
            Last updated {UPDATED}. <Link href="/" className="text-primary underline underline-offset-4">Back to the home page</Link>
          </p>
          </div>
        </div>
      </div>
    </>
  );
}
