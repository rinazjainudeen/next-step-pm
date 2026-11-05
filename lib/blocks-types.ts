import {
  ANY_PHASE,
  CROSS_PHASE_FOLDER,
  PHASES,
  PHASE_IDS,
  type ExperienceId,
  type FreshnessId,
  type KindId,
  type PhaseId,
  type PmTypeId,
  type ProductTypeId,
  type RoleId,
  type StageId,
  type TaskFallbackId,
  type ToolId,
  type WayOfWorkingId,
} from "../content/taxonomy";

/**
 * The shape of one learning block (one JSON file in content/blocks/).
 * The rules in docs/content-model.md are checked by lib/blocks-validate.ts.
 */

/** One task a PM can hand to someone else. */
export type DelegatedTask = {
  role: RoleId;
  /** Other roles who could do this instead, best first. */
  orRoles?: RoleId[];
  task: string;
  /** What to tell the visitor if nobody in their team can do it. */
  ifMissing: TaskFallbackId;
};

/** One phase, a list of phases, or "any" (every phase). */
export type BlockPhase = PhaseId | PhaseId[] | typeof ANY_PHASE;

export type Block = {
  id: string;
  title: string;
  phase: BlockPhase;
  kind: KindId;
  summary: string;
  /** An empty list means "applies to all". */
  appliesTo: {
    pmTypes: PmTypeId[];
    productTypes: ProductTypeId[];
    stages: StageId[];
    waysOfWorking: WayOfWorkingId[];
    /** Leaves the block out for other levels. "Not sure" counts as intermediate. */
    experience: ExperienceId[];
  };
  steps: Record<ExperienceId, string[]>;
  roles: {
    owner: RoleId;
    canDelegateTo: DelegatedTask[];
    reviewers: RoleId[];
  };
  toolExamples: Partial<Record<ToolId, string>>;
  definitionOfDone: string[];
  pitfalls: string[];
  /** For example "2-4 hours" or "1 day". */
  estimatedEffort: string;
  dependsOn: string[];
  /**
   * Order only: come after these blocks when they're in the same phase of the
   * plan. Unlike dependsOn, a missing block is ignored and never becomes a check.
   */
  comesAfter?: string[];
  freshness: FreshnessId;
  sources: { title: string; url: string }[];
  /** A date written as YYYY-MM-DD. */
  lastReviewed: string;
  /** A "Go further" block: shown in its phase, but left out of the timing and next actions. */
  optional?: boolean;
  /** True for dummy blocks used only to test the site. Never real guidance. */
  placeholder?: boolean;
};

/** The small part of a block the Library list needs. */
export type BlockSummary = Pick<
  Block,
  "id" | "title" | "phase" | "kind" | "summary" | "appliesTo" | "estimatedEffort" | "optional" | "placeholder"
>;

export function toSummary(block: Block): BlockSummary {
  return {
    id: block.id,
    title: block.title,
    phase: block.phase,
    kind: block.kind,
    summary: block.summary,
    appliesTo: block.appliesTo,
    estimatedEffort: block.estimatedEffort,
    ...(block.optional ? { optional: true } : {}),
    ...(block.placeholder ? { placeholder: true } : {}),
  };
}

/** True when the block belongs to exactly one phase. */
export function isSinglePhase(phase: BlockPhase): phase is PhaseId {
  return typeof phase === "string" && phase !== ANY_PHASE;
}

/** Every phase a block belongs to, in lifecycle order. "any" means all eight. */
export function blockPhases(phase: BlockPhase): PhaseId[] {
  if (phase === ANY_PHASE) return [...PHASE_IDS];
  const list = Array.isArray(phase) ? phase : [phase];
  return PHASE_IDS.filter((id) => list.includes(id));
}

/** The folder inside content/blocks/ that a block must live in. */
export function expectedFolder(phase: BlockPhase): string {
  return isSinglePhase(phase) ? phase : CROSS_PHASE_FOLDER;
}

/** A readable phase label, such as "Define", "Design, Plan and prioritise" or "Any phase". */
export function phaseLabel(phase: BlockPhase): string {
  if (phase === ANY_PHASE) return "Any phase";
  return blockPhases(phase)
    .map((id) => PHASES.find((p) => p.id === id)?.label ?? id)
    .join(", ");
}
