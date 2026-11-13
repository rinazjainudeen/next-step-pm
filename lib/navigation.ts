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

/**
 * The intake with "I'm exploring product management" already chosen, at question 2. Written out
 * here so the header doesn't load the intake code. A test checks it matches the real address.
 */
export const NEW_TO_PRODUCT_HREF = "/start?step=2&work=explore";

/** Pages shown in the header menu and footer. */
export const PAGE_LINKS: NavLink[] = [
  { label: "Home", href: "/", description: "What Next Step PM is.", available: true },
  { label: "Library", href: "/library", description: "Browse every learning block.", available: true },
  { label: "How I built this", href: "/how-i-built-this", description: "Why I built it, how it works and what I learned.", available: true },
  { label: "Decision log", href: "/decisions", description: "What I decided and why.", available: false },
];

/** Pages linked from the footer only, so the header stays short. */
export const FOOTER_LINKS: NavLink[] = [{ label: "Privacy", href: "/privacy", description: "What is stored, and for how long.", available: true }];

/** Jump links to sections of the home page ("On this page"). */
export const HOME_SECTION_LINKS: NavLink[] = [
  { label: "How it works", href: "/#how-it-works", description: "Three steps from questions to plan.", available: true },
  { label: "Built to be trusted", href: "/#principles", description: "How the tool treats your data.", available: true },
];

/**
 * A block's page in the Library. From a plan, it carries the plan's address,
 * so "Back" returns to the plan instead of the Library. The plan lives in its
 * address, so this is all it takes to keep it.
 */
export function blockHref(id: string, fromPlan?: string): string {
  const path = `/library/${id}`;
  return fromPlan ? `${path}?from=${encodeURIComponent(fromPlan)}` : path;
}

/** The plan to go back to, or null. Only a plan on this site counts, so the link can't be pointed elsewhere. */
export function planReturnHref(from: string | null | undefined): string | null {
  if (!from || from.includes("\\")) return null;
  return /^\/plan(?:[?#]|$)/.test(from) ? from : null;
}

export function availableLinks(links: NavLink[]): NavLink[] {
  return links.filter((link) => link.available);
}

/** True when `pathname` is the page a link points to (ignoring any #section). */
export function isCurrentPage(pathname: string, href: string): boolean {
  const path = href.split("#")[0] || "/";
  return pathname === path;
}
