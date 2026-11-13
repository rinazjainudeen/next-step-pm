import Link from "next/link";
import { Logo } from "@/components/site/logo";
import { FOOTER_LINKS, HOME_SECTION_LINKS, PAGE_LINKS, SITE_TAGLINE, availableLinks } from "@/lib/navigation";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer data-site-footer className="border-t border-border bg-secondary/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr] lg:px-8">
        <div>
          <Link href="/" className="inline-block rounded-md" aria-label="Next Step PM, home">
            <Logo />
          </Link>
          <p className="mt-4 max-w-sm text-muted-foreground">{SITE_TAGLINE} Free to use, with no sign-up.</p>
        </div>

        <nav aria-label="Footer: pages">
          <h2 className="font-heading text-sm font-bold uppercase tracking-[0.18em] text-accent">Pages</h2>
          <ul className="mt-4 space-y-2">
            {availableLinks([...PAGE_LINKS, ...FOOTER_LINKS]).map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="inline-flex min-h-6 items-center rounded-sm text-muted-foreground hover:text-foreground hover:underline">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Footer: on this page">
          <h2 className="font-heading text-sm font-bold uppercase tracking-[0.18em] text-accent">On this page</h2>
          <ul className="mt-4 space-y-2">
            {availableLinks(HOME_SECTION_LINKS).map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="inline-flex min-h-6 items-center rounded-sm text-muted-foreground hover:text-foreground hover:underline">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-muted-foreground sm:px-6 md:flex-row md:justify-between lg:px-8">
          <p>A personal project by Rinaz Jainudeen. Not affiliated with any employer.</p>
          <p>© {year} Rinaz Jainudeen</p>
        </div>
      </div>
    </footer>
  );
}
