import type { MetadataRoute } from "next";
import { PAGE_LINKS, PRIMARY_ACTION, SITE_URL, availableLinks } from "@/lib/navigation";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = new Set([...availableLinks(PAGE_LINKS), PRIMARY_ACTION].map((link) => link.href));
  return [...paths].map((path) => ({ url: `${SITE_URL}${path === "/" ? "" : path}` }));
}
