/**
 * Which plan steps a visitor has ticked. Saved in their browser only. A browser
 * can refuse storage (private mode, or a full disk), so nothing here may throw.
 */

export const TICKS_KEY = "next-step-pm:ticks";

export type TickStorage = Pick<Storage, "getItem" | "setItem">;

export function readTicks(storage: TickStorage): string[] {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(TICKS_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

/** Returns false if the browser wouldn't save. The ticks still work until the page closes. */
export function writeTicks(storage: TickStorage, ticks: readonly string[]): boolean {
  try {
    storage.setItem(TICKS_KEY, JSON.stringify(ticks));
    return true;
  } catch {
    return false;
  }
}

export function toggleTick(ticks: readonly string[], id: string): string[] {
  return ticks.includes(id) ? ticks.filter((item) => item !== id) : [...ticks, id];
}

/** How many of a plan's steps are ticked. Ticks from other plans don't count. */
export function countTicked(ticks: readonly string[], stepIds: readonly string[]): number {
  return stepIds.filter((id) => ticks.includes(id)).length;
}
