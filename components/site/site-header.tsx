"use client";

import { ArrowRight, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/site/logo";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { Button } from "@/components/ui/button";
import { PAGE_LINKS, PRIMARY_ACTION, availableLinks, isCurrentPage } from "@/lib/navigation";
import { cn } from "@/lib/utils";

const links = availableLinks(PAGE_LINKS);

export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Transparent over the home hero until the visitor scrolls about 24px.
  const overHero = pathname === "/" && !scrolled && !menuOpen;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock page scrolling while the mobile menu is open, and let Escape close it.
  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <header
      data-site-header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
        overHero
          ? "border-b border-transparent bg-transparent text-white"
          : "border-b border-border bg-background/95 text-foreground backdrop-blur",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="rounded-md" aria-label="Next Step PM, home">
          <Logo />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {links.map((link) => {
            const current = isCurrentPage(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  overHero ? "hover:bg-white/10" : "hover:bg-muted",
                  current && (overHero ? "bg-white/15" : "bg-muted text-primary"),
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle className={cn(overHero && "hover:bg-white/10 hover:text-white")} />
          <Button
            render={<Link href={PRIMARY_ACTION.href} />}
            nativeButton={false}
            size="lg"
            className={cn(
              "hidden h-10 rounded-full px-5 text-sm sm:inline-flex",
              overHero && "bg-white text-navy hover:bg-white/90",
            )}
          >
            {PRIMARY_ACTION.label}
            <ArrowRight aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            className={cn("md:hidden", overHero && "hover:bg-white/10 hover:text-white")}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
          </Button>
        </div>
      </div>

      {menuOpen && (
        <div
          id="mobile-menu"
          className="h-[calc(100svh-4rem)] overflow-y-auto border-t border-border bg-background px-4 py-6 text-foreground md:hidden"
        >
          <nav aria-label="Mobile" className="flex flex-col gap-1">
            {links.map((link) => {
              const current = isCurrentPage(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={current ? "page" : undefined}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    "rounded-lg px-3 py-3 text-lg font-medium hover:bg-muted",
                    current && "bg-muted text-primary",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <Button
            render={<Link href={PRIMARY_ACTION.href} onClick={() => setMenuOpen(false)} />}
            nativeButton={false}
            size="lg"
            className="mt-6 h-12 w-full rounded-full text-base"
          >
            {PRIMARY_ACTION.label}
            <ArrowRight aria-hidden="true" />
          </Button>
        </div>
      )}
    </header>
  );
}
