/**
 * The allowed values for learning blocks and for the intake questions.
 *
 * This is the single source of truth. A block can only use a value that is
 * listed here, so blocks and questions can't drift apart. To add a new PM type,
 * tool or role, add it here first.
 *
 * The `id` of each value is what appears in block files and in the plan's web
 * address (for example `pm=ai`). The `label` is what visitors read.
 */

type Option = { readonly id: string; readonly label: string };

/** Finds the visitor-facing label for an id. Falls back to the id itself. */
export function labelOf(list: readonly Option[], id: string): string {
  return list.find((item) => item.id === id)?.label ?? id;
}

/** True when `value` is one of `allowed`. Narrows the type for TypeScript. */
export function isOneOf<T extends string>(allowed: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// 1. Lifecycle phases (generic, from public best practice; see docs/content-model.md)
// ---------------------------------------------------------------------------

export const PHASES = [
  { id: "discover", label: "Discover", order: 1, lead: "PM, User Researcher", readyWhen: "The problem, the users and the evidence are clear, and the opportunity is sized." },
  { id: "define", label: "Define", order: 2, lead: "PM, BA", readyWhen: "The problem statement, hypothesis, measures of success and constraints are agreed." },
  { id: "design", label: "Design", order: 3, lead: "UX / Content Designer, PM", readyWhen: "A solution has been tested with users and judged feasible by engineering." },
  { id: "plan", label: "Plan and prioritise", order: 4, lead: "PM, Delivery Manager", readyWhen: "Scope is set, estimates exist, the work is on the roadmap and epics are created." },
  { id: "build", label: "Build", order: 5, lead: "Tech Lead, Engineers", readyWhen: "Stories meet acceptance criteria, code is reviewed and tests pass." },
  { id: "test", label: "Test", order: 6, lead: "QA, PM", readyWhen: "Acceptance criteria, accessibility, security and performance are checked." },
  { id: "launch", label: "Launch", order: 7, lead: "Delivery Manager, DevOps, PM", readyWhen: "The release plan, monitoring, support and comms are ready." },
  { id: "measure", label: "Measure and improve", order: 8, lead: "PM, Analyst", readyWhen: "Results are measured against the hypothesis and the next iteration is chosen." },
] as const;

export type PhaseId = (typeof PHASES)[number]["id"];
export const PHASE_IDS: readonly PhaseId[] = PHASES.map((phase) => phase.id);

/** `phase: "any"` in a block means it applies in every phase. */
export const ANY_PHASE = "any";

/**
 * Blocks with a single phase live in `content/blocks/<phase>/`.
 * Blocks with `phase: "any"` or a list of phases live in this folder instead.
 */
export const CROSS_PHASE_FOLDER = "cross-phase";

// ---------------------------------------------------------------------------
// 2. Starting points (question 3: where is the product now?)
// ---------------------------------------------------------------------------

export const STAGES = [
  { id: "new", label: "Starting something new", phases: ["discover", "define", "design", "plan"] },
  { id: "mid-build", label: "Joining mid-build", phases: ["design", "plan", "build", "test", "launch"] },
  { id: "live", label: "Running a live product", phases: ["measure", "discover", "define", "design"] },
] as const;

export type StageId = (typeof STAGES)[number]["id"];
export const STAGE_IDS: readonly StageId[] = STAGES.map((stage) => stage.id);

// ---------------------------------------------------------------------------
// 3. Kinds of block
// ---------------------------------------------------------------------------

export const KINDS = [
  { id: "core", label: "Core", description: "Every PM in that phase gets it." },
  { id: "add-on", label: "Add-on", description: "Only for certain PM types or product types." },
  { id: "onboarding", label: "Onboarding", description: "For people joining mid-build or taking over a live product." },
  {
    id: "ways-of-working",
    label: "Ways of working",
    description: "How the team works, such as sprint planning, stand-ups or Kanban flow. Chosen by the team's way of working.",
  },
] as const;

export type KindId = (typeof KINDS)[number]["id"];
export const KIND_IDS: readonly KindId[] = KINDS.map((kind) => kind.id);

// ---------------------------------------------------------------------------
// 4. Intake question 1: what kind of PM are you?
// ---------------------------------------------------------------------------

export const PM_TYPES = [
  { id: "general", label: "General" },
  { id: "ai", label: "AI and innovation" },
  { id: "technical", label: "Technical / platform" },
  { id: "transformation", label: "Product transformation" },
  { id: "growth", label: "Growth / commercial" },
] as const;

export type PmTypeId = (typeof PM_TYPES)[number]["id"];
export const PM_TYPE_IDS: readonly PmTypeId[] = PM_TYPES.map((item) => item.id);

// ---------------------------------------------------------------------------
// 5. Intake question 2: what kind of product?
// ---------------------------------------------------------------------------

export const PRODUCT_TYPES = [
  { id: "consumer", label: "Consumer digital product" },
  { id: "b2b", label: "Business software (B2B / SaaS)" },
  { id: "public", label: "Public sector service" },
  { id: "internal", label: "Internal tool or platform" },
  { id: "data-ai", label: "Data or AI product" },
] as const;

export type ProductTypeId = (typeof PRODUCT_TYPES)[number]["id"];
export const PRODUCT_TYPE_IDS: readonly ProductTypeId[] = PRODUCT_TYPES.map((item) => item.id);

// ---------------------------------------------------------------------------
// 6. Intake question 4: experience as a PM
// ---------------------------------------------------------------------------

export const EXPERIENCE_LEVELS = [
  { id: "beginner", label: "Beginner (under 1 year)" },
  { id: "intermediate", label: "Intermediate (1 to 4 years)" },
  { id: "experienced", label: "Experienced (5+ years)" },
] as const;

export type ExperienceId = (typeof EXPERIENCE_LEVELS)[number]["id"];
export const EXPERIENCE_IDS: readonly ExperienceId[] = EXPERIENCE_LEVELS.map((item) => item.id);

// ---------------------------------------------------------------------------
// 7. Intake question 5: who is in your team? (also used for block roles)
// ---------------------------------------------------------------------------

export const ROLES = [
  // The visitor. Can own a block, but is never picked in the team question.
  { id: "pm", label: "Product manager", inTeamQuestion: false },
  { id: "delivery-manager", label: "Delivery Manager", inTeamQuestion: true },
  { id: "scrum-master", label: "Scrum Master", inTeamQuestion: true },
  { id: "ba", label: "Business Analyst", inTeamQuestion: true },
  { id: "user-researcher", label: "User Researcher", inTeamQuestion: true },
  { id: "ux-designer", label: "UX Designer", inTeamQuestion: true },
  { id: "content-designer", label: "Content Designer", inTeamQuestion: true },
  { id: "tech-lead", label: "Tech Lead", inTeamQuestion: true },
  { id: "frontend-engineer", label: "Frontend Engineer", inTeamQuestion: true },
  { id: "backend-engineer", label: "Backend Engineer", inTeamQuestion: true },
  { id: "fullstack-engineer", label: "Full-stack Engineer", inTeamQuestion: true },
  { id: "architect", label: "Architect", inTeamQuestion: true },
  { id: "devops", label: "DevOps / SRE", inTeamQuestion: true },
  { id: "qa", label: "QA / Tester", inTeamQuestion: true },
  { id: "data-analyst", label: "Data Analyst", inTeamQuestion: true },
  { id: "data-scientist", label: "Data Scientist / ML Engineer", inTeamQuestion: true },
  { id: "performance-analyst", label: "Performance Analyst", inTeamQuestion: true },
  { id: "policy-legal", label: "Policy / Legal / Compliance", inTeamQuestion: true },
  { id: "product-owner", label: "Product Owner", inTeamQuestion: true },
] as const;

export type RoleId = (typeof ROLES)[number]["id"];
export const ROLE_IDS: readonly RoleId[] = ROLES.map((role) => role.id);

// ---------------------------------------------------------------------------
// 8. Intake question 6: which tools do you use?
// ---------------------------------------------------------------------------

export const TOOL_GROUPS = [
  { id: "tracking", label: "Tracking" },
  { id: "docs", label: "Documents" },
  { id: "design", label: "Design and whiteboards" },
  { id: "code", label: "Code and hosting" },
  { id: "analytics", label: "Analytics" },
  { id: "ai", label: "AI assistants" },
] as const;

export type ToolGroupId = (typeof TOOL_GROUPS)[number]["id"];

export const TOOLS = [
  { id: "jira", label: "Jira", group: "tracking" },
  { id: "azure-devops", label: "Azure DevOps", group: "tracking" },
  { id: "linear", label: "Linear", group: "tracking" },
  { id: "trello", label: "Trello", group: "tracking" },
  { id: "confluence", label: "Confluence", group: "docs" },
  { id: "notion", label: "Notion", group: "docs" },
  { id: "sharepoint-word", label: "SharePoint / Word", group: "docs" },
  { id: "google-docs", label: "Google Docs", group: "docs" },
  { id: "figma", label: "Figma", group: "design" },
  { id: "miro", label: "Miro", group: "design" },
  { id: "mural", label: "Mural", group: "design" },
  { id: "github", label: "GitHub", group: "code" },
  { id: "gitlab", label: "GitLab", group: "code" },
  { id: "aws", label: "AWS", group: "code" },
  { id: "azure", label: "Azure", group: "code" },
  { id: "gcp", label: "Google Cloud", group: "code" },
  { id: "vercel", label: "Vercel", group: "code" },
  { id: "ga4", label: "Google Analytics 4", group: "analytics" },
  { id: "amplitude", label: "Amplitude", group: "analytics" },
  { id: "mixpanel", label: "Mixpanel", group: "analytics" },
  { id: "power-bi", label: "Power BI", group: "analytics" },
  { id: "looker", label: "Looker", group: "analytics" },
  { id: "claude", label: "Claude", group: "ai" },
  { id: "chatgpt", label: "ChatGPT", group: "ai" },
  { id: "copilot", label: "Copilot", group: "ai" },
  { id: "gemini", label: "Gemini", group: "ai" },
] as const;

export type ToolId = (typeof TOOLS)[number]["id"];
export const TOOL_IDS: readonly ToolId[] = TOOLS.map((tool) => tool.id);

// ---------------------------------------------------------------------------
// 9. Intake question 7: timeline to the next milestone
// ---------------------------------------------------------------------------

export const TIMELINES = [
  { id: "under-1m", label: "Under 1 month" },
  { id: "1-3m", label: "1 to 3 months" },
  { id: "3-6m", label: "3 to 6 months" },
  { id: "6m-plus", label: "6 months or more" },
] as const;

export type TimelineId = (typeof TIMELINES)[number]["id"];
export const TIMELINE_IDS: readonly TimelineId[] = TIMELINES.map((item) => item.id);

// ---------------------------------------------------------------------------
// 10. Intake question 8: how does your team work?
// ---------------------------------------------------------------------------

export const WAYS_OF_WORKING = [
  { id: "scrum", label: "Scrum" },
  { id: "kanban", label: "Kanban" },
  { id: "hybrid", label: "Hybrid / stage gates" },
] as const;

export type WayOfWorkingId = (typeof WAYS_OF_WORKING)[number]["id"];
export const WAY_OF_WORKING_IDS: readonly WayOfWorkingId[] = WAYS_OF_WORKING.map((item) => item.id);

// ---------------------------------------------------------------------------
// 11. How quickly a block goes out of date (used by the weekly content check)
// ---------------------------------------------------------------------------

export const FRESHNESS = [
  { id: "evergreen", label: "Evergreen" },
  { id: "changes-yearly", label: "Changes yearly" },
  { id: "fast-moving", label: "Fast-moving" },
] as const;

export type FreshnessId = (typeof FRESHNESS)[number]["id"];
export const FRESHNESS_IDS: readonly FreshnessId[] = FRESHNESS.map((item) => item.id);
