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
  { id: "discover", label: "Discover", description: "Understanding your users and the problem.", order: 1, lead: "PM, User Researcher", readyWhen: "The problem, the users and the evidence are clear, and the opportunity is sized." },
  { id: "define", label: "Define", description: "Agreeing the problem, the goal and how you'll measure success.", order: 2, lead: "PM, BA", readyWhen: "The problem statement, hypothesis, measures of success and constraints are agreed." },
  { id: "design", label: "Design", description: "Shaping a solution and testing it with users.", order: 3, lead: "UX / Content Designer, PM", readyWhen: "A solution has been tested with users and judged feasible by engineering." },
  { id: "plan", label: "Plan and prioritise", description: "Setting the scope, estimates and roadmap.", order: 4, lead: "PM, Delivery Manager", readyWhen: "Scope is set, estimates exist, the work is on the roadmap and epics are created." },
  { id: "build", label: "Build", description: "Engineers build the product in small pieces.", order: 5, lead: "Tech Lead, Engineers", readyWhen: "Stories meet acceptance criteria, code is reviewed and tests pass." },
  { id: "test", label: "Test", description: "Checking it works and is accessible and secure.", order: 6, lead: "QA, PM", readyWhen: "Acceptance criteria, accessibility, security and performance are checked." },
  { id: "launch", label: "Launch", description: "Releasing it to real users.", order: 7, lead: "Delivery Manager, DevOps, PM", readyWhen: "The release plan, monitoring, support and comms are ready." },
  { id: "measure", label: "Measure and improve", description: "Checking the results and choosing what comes next.", order: 8, lead: "PM, Analyst", readyWhen: "Results are measured against the hypothesis and the next iteration is chosen." },
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

/**
 * `phases` are what a plan covers by default, in working order. `startPhases`
 * are where a visitor can say they are now: a live product can be at any point
 * in building its next release. `journey` is the full route onwards, which a
 * plan can extend into if the milestone is further on. A live product loops
 * back from Measure.
 */
export const STAGES = [
  { id: "new", label: "Starting something new", description: "The idea or problem is new, and nothing has been built yet.", phases: ["discover", "define", "design", "plan"], startPhases: ["discover", "define", "design", "plan"], journey: ["discover", "define", "design", "plan", "build", "test", "launch", "measure"] },
  { id: "mid-build", label: "Partway through a build", description: "The work is under way, whether you've just joined or have been on it from the start.", phases: ["design", "plan", "build", "test", "launch"], startPhases: ["design", "plan", "build", "test", "launch"], journey: ["design", "plan", "build", "test", "launch", "measure"] },
  { id: "live", label: "Running a live product", description: "Real people use it today, and your job is to run and improve it.", phases: ["measure", "discover", "define", "design"], startPhases: ["measure", "discover", "define", "design", "plan", "build", "test", "launch"], journey: ["measure", "discover", "define", "design", "plan", "build", "test", "launch"] },
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
  { id: "craft", label: "Craft", description: "Skills that grow over time, such as strategy or influencing. Chosen by experience." },
] as const;

export type KindId = (typeof KINDS)[number]["id"];
export const KIND_IDS: readonly KindId[] = KINDS.map((kind) => kind.id);

// ---------------------------------------------------------------------------
// 4. Intake question 1: what kind of PM are you?
// ---------------------------------------------------------------------------

export const PM_TYPES = [
  { id: "general", label: "General", description: "You cover the whole product lifecycle, with no single specialism." },
  { id: "ai", label: "AI and innovation", description: "You work on AI features or new ideas, where what's possible is still being tested." },
  { id: "data", label: "Data", description: "You own data as a product, such as dashboards, pipelines or data platforms." },
  { id: "technical", label: "Technical / platform", description: "Your users are often engineers, and you work on APIs, infrastructure or shared platforms." },
  { id: "transformation", label: "Product transformation", description: "You change how an organisation works, often moving old processes or systems to new ones." },
  { id: "growth", label: "Growth / commercial", description: "You focus on sign-ups, retention or revenue, often through experiments." },
] as const;

export type PmTypeId = (typeof PM_TYPES)[number]["id"];
export const PM_TYPE_IDS: readonly PmTypeId[] = PM_TYPES.map((item) => item.id);

// ---------------------------------------------------------------------------
// 5. Intake question 2: what kind of product?
// ---------------------------------------------------------------------------

export const PRODUCT_TYPES = [
  { id: "consumer", label: "Consumer digital product", description: "Used by the public for themselves, such as a shopping, banking or streaming app." },
  { id: "b2b", label: "Business software (B2B / SaaS)", description: "Sold to organisations for their staff to use. SaaS means software paid for by subscription." },
  { id: "public", label: "Public sector service", description: "Run by government or a public body, such as applying for a licence or a benefit." },
  { id: "internal", label: "Internal tool or platform", description: "Used by staff inside your own organisation, such as a case-management system." },
  { id: "data-ai", label: "Data or AI product", description: "The main value comes from data or AI, such as a recommendation engine or a chatbot." },
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
  { id: "delivery-manager", label: "Delivery Manager", description: "Keeps work flowing and clears blockers.", inTeamQuestion: true },
  { id: "scrum-master", label: "Scrum Master", description: "Coaches the team in Scrum and runs its meetings.", inTeamQuestion: true },
  { id: "ba", label: "Business Analyst", description: "Turns business needs into clear requirements.", inTeamQuestion: true },
  { id: "user-researcher", label: "User Researcher", description: "Finds out what users need and how they behave.", inTeamQuestion: true },
  { id: "ux-designer", label: "UX Designer", description: "Designs how the product looks and works.", inTeamQuestion: true },
  { id: "content-designer", label: "Content Designer", description: "Writes the words users see.", inTeamQuestion: true },
  { id: "tech-lead", label: "Tech Lead", description: "Guides the engineers and the technical decisions.", inTeamQuestion: true },
  { id: "frontend-engineer", label: "Frontend Engineer", description: "Builds the parts users see and click.", inTeamQuestion: true },
  { id: "backend-engineer", label: "Backend Engineer", description: "Builds the servers, data and logic behind the scenes.", inTeamQuestion: true },
  { id: "fullstack-engineer", label: "Full-stack Engineer", description: "Works on both frontend and backend.", inTeamQuestion: true, covers: ["frontend-engineer", "backend-engineer"] },
  { id: "architect", label: "Architect", description: "Designs how the whole system fits together.", inTeamQuestion: true, reviewsFor: ["tech-lead"] },
  { id: "devops", label: "DevOps / SRE", person: "DevOps / SRE engineer", plural: "DevOps / SRE engineers", description: "Releases the product and keeps it running reliably.", inTeamQuestion: true },
  { id: "qa", label: "QA / Tester", plural: "QA / Testers", description: "Checks that the product works as it should.", inTeamQuestion: true },
  { id: "data-analyst", label: "Data Analyst", description: "Turns data into reports and insights.", inTeamQuestion: true },
  { id: "data-scientist", label: "Data Scientist / ML Engineer", plural: "Data Scientists / ML Engineers", description: "Builds models and machine learning features.", inTeamQuestion: true },
  { id: "performance-analyst", label: "Performance Analyst", description: "Tracks how the service performs against its goals.", inTeamQuestion: true },
  { id: "policy-legal", label: "Policy / Legal / Compliance", person: "Policy / Legal / Compliance colleague", plural: "Policy / Legal / Compliance colleagues", description: "Checks the rules, risks and legal duties.", inTeamQuestion: true },
  { id: "product-owner", label: "Product Owner", description: "Manages the backlog and day-to-day priorities.", inTeamQuestion: true },
] as const;

export type RoleId = (typeof ROLES)[number]["id"];
export const ROLE_IDS: readonly RoleId[] = ROLES.map((role) => role.id);

/**
 * What a task says when nobody in the visitor's team can do it.
 * Every delegable task in a block must choose one.
 */
export const TASK_FALLBACKS = [
  { id: "pm", label: "The PM can do this themselves" },
  { id: "find-someone", label: "It needs specialist skills, so the PM should find someone" },
  { id: "ask-around", label: "It needs someone who knows the product, so the PM should ask around" },
] as const;

export type TaskFallbackId = (typeof TASK_FALLBACKS)[number]["id"];
export const TASK_FALLBACK_IDS: readonly TaskFallbackId[] = TASK_FALLBACKS.map((item) => item.id);

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
  { id: "scrum", label: "Scrum", description: "Work happens in fixed sprints, often two weeks, with planning and a review." },
  { id: "kanban", label: "Kanban", description: "Work flows continuously across a board, with limits on how much is in progress." },
  { id: "hybrid", label: "Hybrid / stage gates", description: "Some agile working, plus formal approval points between phases." },
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
