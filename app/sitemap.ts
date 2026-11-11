import type { MetadataRoute } from "next";
import { loadBlocks } from "@/lib/blocks-load";
import { FOOTER_LINKS, PAGE_LINKS, PRIMARY_ACTION, SITE_URL, availableLinks } from "@/lib/navigation";

export default function sitemap(): MetadataRoute.Sitemap {
  const pagePaths = [...availableLinks([...PAGE_LINKS, ...FOOTER_LINKS]), PRIMARY_ACTION].map((link) => link.href);
  // Placeholder blocks are dummy content and are kept out of search engines.
  const blockPaths = loadBlocks()
    .filter((block) => !block.placeholder)
    .map((block) => `/library/${block.id}`);

  return [...new Set([...pagePaths, ...blockPaths])].map((path) => ({
    url: `${SITE_URL}${path === "/" ? "" : path}`,
  }));
}
