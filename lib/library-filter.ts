import {
  KIND_IDS,
  PHASE_IDS,
  PM_TYPE_IDS,
  SKILL_IDS,
  WAY_OF_WORKING_IDS,
  isOneOf,
  type KindId,
  type PhaseId,
  type PmTypeId,
  type SkillId,
  type WayOfWorkingId,
} from "../content/taxonomy";
import { blockPhases, type BlockSummary } from "./blocks-types";

/**
 * The Library's filters. They live in the web address (?phase=define&pm=ai),
 * so a filtered view can be shared and survives a refresh.
 * A filter that is null means "show all".
 */

export type LibraryFilters = {
  phase: PhaseId | null;
  pm: PmTypeId | null;
  kind: KindId | null;
  way: WayOfWorkingId | null;
  skill: SkillId | null;
};

export const NO_FILTERS: LibraryFilters = { phase: null, pm: null, kind: null, way: null, skill: null };

type ParamReader = { get(name: string): string | null };

/** Reads filters from a web address. Anything unrecognised is ignored. */
export function parseLibraryFilters(params: ParamReader): LibraryFilters {
  const pick = <T extends string>(name: string, allowed: readonly T[]): T | null => {
    const value = params.get(name);
    return isOneOf(allowed, value) ? value : null;
  };
  return {
    phase: pick("phase", PHASE_IDS),
    pm: pick("pm", PM_TYPE_IDS),
    kind: pick("kind", KIND_IDS),
    way: pick("way", WAY_OF_WORKING_IDS),
    skill: pick("skill", SKILL_IDS),
  };
}

/** Turns filters back into a query string, such as "phase=define&pm=ai". Empty if none. */
export function filtersToQuery(filters: LibraryFilters): string {
  const params = new URLSearchParams();
  if (filters.phase) params.set("phase", filters.phase);
  if (filters.pm) params.set("pm", filters.pm);
  if (filters.kind) params.set("kind", filters.kind);
  if (filters.way) params.set("way", filters.way);
  if (filters.skill) params.set("skill", filters.skill);
  return params.toString();
}

export function hasFilters(filters: LibraryFilters): boolean {
  return Object.values(filters).some((value) => value !== null);
}

/**
 * A block matches when it fits every chosen filter.
 * - Phase: the block belongs to that phase ("any" fits every phase).
 * - PM type and way of working: the block names it, or names none (applies to all).
 * - Kind: the block is of that kind.
 * - Skill: the block builds that skill.
 */
export function filterBlocks<T extends Pick<BlockSummary, "phase" | "kind" | "appliesTo" | "alsoIn"> & { skills?: readonly string[] }>(
  blocks: readonly T[],
  filters: LibraryFilters,
): T[] {
  return blocks.filter((block) => {
    const placements = (block.alsoIn ?? []).map((place) => place.phase);
    if (filters.phase && !blockPhases(block.phase).includes(filters.phase) && !placements.includes(filters.phase)) return false;
    if (filters.kind && block.kind !== filters.kind) return false;
    if (filters.skill && !(block.skills ?? []).includes(filters.skill)) return false;
    const { pmTypes, waysOfWorking } = block.appliesTo;
    if (filters.pm && pmTypes.length > 0 && !pmTypes.includes(filters.pm)) return false;
    if (filters.way && waysOfWorking.length > 0 && !waysOfWorking.includes(filters.way)) return false;
    return true;
  });
}
