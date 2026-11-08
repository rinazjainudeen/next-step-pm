import { SKILL_IDS, isOneOf, type SkillId } from "../content/taxonomy";

/**
 * A visitor's own adjustments to their plan: the skill self-check and the
 * blocks they've set aside. Saved in their browser only, never in the link.
 * A browser can refuse storage, so reading and writing never throw.
 * "Already done" uses the ticks: a block is done when all its steps are ticked.
 */

export const CONFIDENCE = [
  { id: "getting-started", label: "Getting started" },
  { id: "comfortable", label: "Comfortable" },
  { id: "strong", label: "Strong" },
] as const;

export type ConfidenceId = (typeof CONFIDENCE)[number]["id"];
const CONFIDENCE_IDS: readonly ConfidenceId[] = CONFIDENCE.map((item) => item.id);

export type SelfCheck = Partial<Record<SkillId, ConfidenceId>>;

/** What the visitor has chosen in this browser. */
export type SavedAdjustments = { selfCheck: SelfCheck; setAside: readonly string[] };

/** Everything the engine needs from the browser, including ticks. */
export type Adjustments = SavedAdjustments & { ticked: readonly string[] };

export const NO_SAVED_ADJUSTMENTS: SavedAdjustments = { selfCheck: {}, setAside: [] };
export const NO_ADJUSTMENTS: Adjustments = { ...NO_SAVED_ADJUSTMENTS, ticked: [] };

export const ADJUSTMENTS_KEY = "next-step-pm:adjustments";

export type AdjustmentStorage = Pick<Storage, "getItem" | "setItem">;

/** Reads saved adjustments, keeping only values we recognise. */
export function readAdjustments(storage: AdjustmentStorage): SavedAdjustments {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(ADJUSTMENTS_KEY) ?? "{}");
    if (typeof parsed !== "object" || parsed === null) return NO_SAVED_ADJUSTMENTS;
    const record = parsed as { selfCheck?: unknown; setAside?: unknown };
    const selfCheck: SelfCheck = {};
    if (typeof record.selfCheck === "object" && record.selfCheck !== null) {
      for (const [skill, value] of Object.entries(record.selfCheck)) {
        if (isOneOf(SKILL_IDS, skill) && isOneOf(CONFIDENCE_IDS, value)) selfCheck[skill] = value;
      }
    }
    const setAside = Array.isArray(record.setAside) ? [...new Set(record.setAside.filter((id): id is string => typeof id === "string"))] : [];
    return { selfCheck, setAside };
  } catch {
    return NO_SAVED_ADJUSTMENTS;
  }
}

/** Returns false if the browser wouldn't save. The choices still work until the page closes. */
export function writeAdjustments(storage: AdjustmentStorage, adjustments: SavedAdjustments): boolean {
  try {
    storage.setItem(ADJUSTMENTS_KEY, JSON.stringify(adjustments));
    return true;
  } catch {
    return false;
  }
}

/** Sets one skill's confidence. Null leaves it blank. */
export function setConfidence(adjustments: SavedAdjustments, skill: SkillId, value: ConfidenceId | null): SavedAdjustments {
  const selfCheck = { ...adjustments.selfCheck };
  if (value === null) delete selfCheck[skill];
  else selfCheck[skill] = value;
  return { ...adjustments, selfCheck };
}

export function clearSelfCheck(adjustments: SavedAdjustments): SavedAdjustments {
  return { ...adjustments, selfCheck: {} };
}

export function setAside(adjustments: SavedAdjustments, blockId: string): SavedAdjustments {
  return adjustments.setAside.includes(blockId) ? adjustments : { ...adjustments, setAside: [...adjustments.setAside, blockId] };
}

export function putBack(adjustments: SavedAdjustments, blockId: string): SavedAdjustments {
  return { ...adjustments, setAside: adjustments.setAside.filter((id) => id !== blockId) };
}

/** The skills rated "Getting started", in the order of the ten skills. */
export function growingSkills(selfCheck: SelfCheck): SkillId[] {
  return SKILL_IDS.filter((skill) => selfCheck[skill] === "getting-started");
}

/** "Already done" ticks every step of a block. */
export function markDone(ticks: readonly string[], stepIds: readonly string[]): string[] {
  return [...ticks, ...stepIds.filter((id) => !ticks.includes(id))];
}

/** Undoing "Already done" unticks every step of the block. */
export function undoDone(ticks: readonly string[], stepIds: readonly string[]): string[] {
  return ticks.filter((id) => !stepIds.includes(id));
}
