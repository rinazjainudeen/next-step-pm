/**
 * Every link in the header and footer comes from this file.
 * To add a page to the menus, add it here. Nowhere else.
 *
 * `available: false` keeps a link hidden until its page exists, so visitors
 * never land on a 404. Flip it to `true` in the phase that builds the page.
 */

export type NavLink = {
  label: string;
  href: string;
  description: string;
  available: boolean;
};

export const SITE_NAME = "Next Step PM";
export const SITE_TAGLINE = "A step-by-step learning plan, built for your product role.";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://next-step-pm.vercel.app";

/** The main call to action, shown as a button in the header. */
export const PRIMARY_ACTION: NavLink = {
  label: "Build my plan",
  href: "/start",
  description: "Answer a few questions and get your plan.",
  available: true,
};

/** Pages shown in the header menu and footer. */
export const PAGE_LINKS: NavLink[] = [
  { label: "Home", href: "/", description: "What Next Step PM is.", available: true },
  { label: "Library", href: "/library", description: "Browse every learning block.", available: false },
  { label: "How I built this", href: "/how-i-built-this", description: "The case study.", available: false },
  { label: "Decision log", href: "/decisions", description: "What I decided and why.", available: false },
  { label: "Privacy", href: "/privacy", description: "What is stored, and for how long.", available: false },
];

/** Jump links to sections of the home page ("On this page"). */
export const HOME_SECTION_LINKS: NavLink[] = [
  { label: "How it works", href: "/#how-it-works", description: "Three steps from questions to plan.", available: true },
  { label: "Built to be trusted", href: "/#principles", description: "How the tool treats your data.", available: true },
];

export function availableLinks(links: NavLink[]): NavLink[] {
  return links.filter((link) => link.available);
}

/** True when `pathname` is the page a link points to (ignoring any #section). */
export function isCurrentPage(pathname: string, href: string): boolean {
  const path = href.split("#")[0] || "/";
  return pathname === path;
}
