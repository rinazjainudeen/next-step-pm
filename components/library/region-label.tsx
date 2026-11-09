import { Globe } from "lucide-react";
import { REGIONS, type RegionId } from "@/lib/blocks-types";

const regionOf = (id: RegionId) => REGIONS.find((region) => region.id === id) ?? REGIONS[0];

/** The small "UK guidance" pill on cards. */
export function RegionPill({ region }: { region: RegionId }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-accent/50 bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-foreground">
      <Globe className="size-3.5" aria-hidden="true" />
      {regionOf(region).label}
    </span>
  );
}

/** The pill with its one-line explanation, for block pages and open plan blocks. */
export function RegionNote({ region, className }: { region: RegionId; className?: string }) {
  return (
    <p role="note" className={`flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground ${className ?? ""}`}>
      <RegionPill region={region} />
      <span className="text-pretty">{regionOf(region).note}</span>
    </p>
  );
}
