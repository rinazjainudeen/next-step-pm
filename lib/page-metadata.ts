import type { Metadata } from "next";
import { SITE_NAME, SITE_TAGLINE } from "./navigation";

/**
 * The picture made by app/opengraph-image.tsx. Named here because a page that sets its own
 * `openGraph` loses the layout's picture otherwise.
 */
const SHARE_IMAGE = { url: "/opengraph-image", width: 1200, height: 630, alt: `${SITE_NAME}: a learning plan for product managers` };

/** The sharing details every page has. A page's own `openGraph` replaces the layout's, so each page starts from these. */
export const BASE_OPEN_GRAPH = {
  type: "website" as const,
  siteName: SITE_NAME,
  locale: "en_GB",
  images: [SHARE_IMAGE],
};

/**
 * A page's title, description, canonical address and sharing details. The
 * canonical address tells search engines which address is the real one, and
 * `og:url` does the same for LinkedIn, Slack and so on. Paths are resolved
 * against the site address in the root layout.
 */
export function pageMetadata({ path, title, description, absoluteTitle = false }: { path: string; title: string; description: string; absoluteTitle?: boolean }): Metadata {
  const shareTitle = absoluteTitle ? title : `${title} | ${SITE_NAME}`;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: { ...BASE_OPEN_GRAPH, url: path, title: shareTitle, description },
    twitter: { card: "summary_large_image", title: shareTitle, description, images: [SHARE_IMAGE] },
  };
}

/** The layout's sharing details, used by pages with no address of their own, such as a plan. */
export const DEFAULT_SHARING: Pick<Metadata, "openGraph" | "twitter"> = {
  openGraph: { ...BASE_OPEN_GRAPH, title: SITE_NAME, description: SITE_TAGLINE },
  twitter: { card: "summary_large_image", title: SITE_NAME, description: SITE_TAGLINE, images: [SHARE_IMAGE] },
};
