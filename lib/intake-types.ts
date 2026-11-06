import type {
  CareerLevelId,
  CompanySizeId,
  PhaseId,
  PmTypeId,
  ProductTypeId,
  RoleId,
  StageId,
  TimelineId,
  ToolId,
  WayOfWorkingId,
  WorkKindId,
} from "../content/taxonomy";

/**
 * The shapes of a visitor's answers.
 *
 * "Not sure" is an intake answer, not a block value. It stays out of
 * `content/taxonomy.ts` on purpose, so a block can't be tagged "not-sure".
 */
export const NOT_SURE = "not-sure";
export type NotSure = typeof NOT_SURE;

type Answer<T extends string> = T | NotSure;

/** "A tool that isn't listed". An intake answer too, so blocks can't use it. */
export const OTHER_TOOL = "other";
export type OtherTool = typeof OTHER_TOOL;

/** The biggest number the team question offers for one role. */
export const MAX_TEAM_COUNT = 20;

/** How many PM types a visitor can pick. */
export const MAX_PM_TYPES = 2;

/** Asks for the kind of work first. Turn off to take the strategy and coaching tracks away. */
export const KIND_OF_WORK_ENABLED = true;

/** The team question lists everyone except the visitor. */
export type TeamRoleId = Exclude<RoleId, "pm">;

export type SingleQuestionId = "work" | "level" | "product" | "size" | "stage" | "time" | "way";
export type MultiQuestionId = "pm" | "team" | "tools";
export type QuestionId = SingleQuestionId | MultiQuestionId;

/** A finished set of answers: every question has one. */
export type IntakeAnswers = {
  /** The kind of product work, which sets the track. Null while the question is switched off. */
  work: Answer<WorkKindId> | null;
  /** One or two PM types, or "Not sure". */
  pm: Answer<PmTypeId>[];
  level: Answer<CareerLevelId>;
  product: Answer<ProductTypeId>;
  size: Answer<CompanySizeId>;
  stage: Answer<StageId>;
  /** Follow-up to `stage`: where the plan starts. Null only when it wasn't asked. */
  phase: Answer<PhaseId> | null;
  team: Answer<TeamRoleId>[];
  /** How many of a role, for roles with more than one. Others count as 1. */
  teamCounts: Partial<Record<TeamRoleId, number>>;
  tools: Answer<ToolId | OtherTool>[];
  time: Answer<TimelineId>;
  /** Follow-up to `time`: the phase to finish by the milestone. Null only when it wasn't asked. */
  until: Answer<PhaseId> | null;
  way: Answer<WayOfWorkingId>;
};

/** Answers part-way through: single questions may be blank, lists may be empty. */
export type IntakeDraft = Omit<IntakeAnswers, SingleQuestionId> & {
  [Id in SingleQuestionId]: IntakeAnswers[Id] | null;
};

export const EMPTY_DRAFT: IntakeDraft = {
  work: null,
  pm: [],
  level: null,
  product: null,
  size: null,
  stage: null,
  phase: null,
  team: [],
  teamCounts: {},
  tools: [],
  time: null,
  until: null,
  way: null,
};
