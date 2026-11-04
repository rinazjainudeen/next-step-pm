import { SITE_NAME } from "@/lib/navigation";
import { cn } from "@/lib/utils";

/**
 * The Next Step PM mark: three rising steps. It is drawn with `currentColor`,
 * so it follows the text colour in light and dark mode (and over the hero)
 * without needing two separate image files.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden="true" focusable="false">
      <rect x="2" y="20" width="8" height="10" rx="2" fill="currentColor" opacity="0.45" />
      <rect x="12" y="12" width="8" height="18" rx="2" fill="currentColor" opacity="0.75" />
      <rect x="22" y="3" width="8" height="27" rx="2" fill="currentColor" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="font-heading text-lg font-bold tracking-tight">{SITE_NAME}</span>
    </span>
  );
}
