"use client";

import { SlidersHorizontal } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { BlockGrid } from "@/components/library/block-card";
import { Button } from "@/components/ui/button";
import { KINDS, PHASES, PM_TYPES, SKILLS, WAYS_OF_WORKING } from "@/content/taxonomy";
import { phaseName } from "@/lib/blocks-types";
import { cn } from "@/lib/utils";
import type { BlockSummary } from "@/lib/blocks-types";
import {
  NO_FILTERS,
  activeFilterCount,
  filterBlocks,
  filtersToQuery,
  hasFilters,
  parseLibraryFilters,
  type LibraryFilters,
} from "@/lib/library-filter";

type FilterDefinition = {
  key: keyof LibraryFilters;
  label: string;
  allLabel: string;
  options: readonly { id: string; label: string }[];
};

const FILTERS: FilterDefinition[] = [
  { key: "phase", label: "Phase", allLabel: "All phases", options: PHASES.map((phase) => ({ id: phase.id, label: phaseName(phase.id) })) },
  { key: "pm", label: "PM type", allLabel: "All PM types", options: PM_TYPES },
  { key: "kind", label: "Kind of block", allLabel: "All kinds", options: KINDS },
  { key: "way", label: "Way of working", allLabel: "All ways of working", options: WAYS_OF_WORKING },
  { key: "skill", label: "Skill", allLabel: "All skills", options: SKILLS },
];

/**
 * The filters and the list. The chosen filters live in the web address
 * (?phase=define&pm=ai), so a filtered view can be shared and survives a refresh.
 */
export function LibraryBrowser({ blocks }: { blocks: BlockSummary[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = parseLibraryFilters(searchParams);
  const shown = filterBlocks(blocks, filters);
  const active = activeFilterCount(filters);
  // Phones only: the five filters fold behind a button so the blocks show on the first screen.
  const [filtersOpen, setFiltersOpen] = useState(false);

  function change(next: LibraryFilters) {
    const query = filtersToQuery(next);
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 md:hidden">
        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-full px-5"
          aria-expanded={filtersOpen}
          aria-controls="library-filters"
          onClick={() => setFiltersOpen((open) => !open)}
        >
          <SlidersHorizontal aria-hidden="true" />
          {active > 0 ? `Filters (${active})` : "Filters"}
        </Button>
        {active > 0 && (
          <button type="button" onClick={() => change(NO_FILTERS)} className="h-11 font-medium text-primary underline underline-offset-4">
            Clear all
          </button>
        )}
      </div>

      <form
        id="library-filters"
        aria-label="Filter the library"
        onSubmit={(event) => event.preventDefault()}
        className={cn(
          "gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[repeat(5,1fr)_auto] lg:items-end",
          filtersOpen ? "mt-4 grid" : "hidden",
          "md:mt-0 md:grid",
        )}
      >
        {FILTERS.map((filter) => (
          <div key={filter.key} className="flex flex-col gap-1.5">
            <label htmlFor={`filter-${filter.key}`} className="text-sm font-semibold">
              {filter.label}
            </label>
            <select
              id={`filter-${filter.key}`}
              value={filters[filter.key] ?? ""}
              onChange={(event) => change({ ...filters, [filter.key]: event.target.value || null })}
              className="h-11 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground"
            >
              <option value="">{filter.allLabel}</option>
              {filter.options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          className="h-11 px-4"
          disabled={!hasFilters(filters)}
          onClick={() => change(NO_FILTERS)}
        >
          Clear filters
        </Button>
      </form>

      <p className="mt-6 text-muted-foreground" aria-live="polite">
        Showing {shown.length} of {blocks.length} {blocks.length === 1 ? "block" : "blocks"}.
      </p>

      <div className="mt-6">
        {shown.length > 0 ? (
          <BlockGrid blocks={shown} />
        ) : (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <p className="text-lg font-semibold">No blocks match those filters.</p>
            <p className="mt-2 text-muted-foreground">Try choosing &ldquo;All&rdquo; for one of them, or clear the filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
