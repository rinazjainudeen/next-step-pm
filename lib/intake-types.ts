import type {
  ExperienceId,
  PhaseId,
  PmTypeId,
  ProductTypeId,
  RoleId,
  StageId,
  TimelineId,
  ToolId,
  WayOfWorkingId,
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

/** The team question lists everyone except the visitor. */
export type TeamRoleId = Exclude<RoleId, "pm">;

export type SingleQuestionId = "pm" | "product" | "stage" | "exp" | "time" | "way";
export type MultiQuestionId = "team" | "tools";
export type QuestionId = SingleQuestionId | MultiQuestionId;

/** A finished set of answers: every question has one. */
export type IntakeAnswers = {
  pm: Answer<PmTypeId>;
  product: Answer<ProductTypeId>;
  stage: Answer<StageId>;
  /** Optional follow-up to `stage`. Null means the visitor didn't pick one. */
  phase: PhaseId | null;
  exp: Answer<ExperienceId>;
  team: Answer<TeamRoleId>[];
  /** How many of a role, for roles with more than one. Others count as 1. */
  teamCounts: Partial<Record<TeamRoleId, number>>;
  tools: Answer<ToolId | OtherTool>[];
  time: Answer<TimelineId>;
  /** Optional follow-up to `time`: the phase to finish by the milestone. */
  until: PhaseId | null;
  way: Answer<WayOfWorkingId>;
};

/** Answers part-way through: single questions may be blank, lists may be empty. */
export type IntakeDraft = Omit<IntakeAnswers, SingleQuestionId> & {
  [Id in SingleQuestionId]: IntakeAnswers[Id] | null;
};

export const EMPTY_DRAFT: IntakeDraft = {
  pm: null,
  product: null,
  stage: null,
  phase: null,
  exp: null,
  team: [],
  teamCounts: {},
  tools: [],
  time: null,
  until: null,
  way: null,
};
