import {
  ANY_PHASE,
  COMPANY_SIZE_IDS,
  EXPERIENCE_IDS,
  FRESHNESS_IDS,
  KIND_IDS,
  PHASES,
  PHASE_IDS,
  PM_TYPE_IDS,
  PRODUCT_TYPE_IDS,
  ROLE_IDS,
  STAGE_IDS,
  TASK_FALLBACK_IDS,
  TOOL_IDS,
  WAY_OF_WORKING_IDS,
  isOneOf,
  type PhaseId,
} from "../content/taxonomy";
import { blockPhases, expectedFolder, type Block } from "./blocks-types";

/**
 * Checks learning blocks against the rules in docs/content-model.md.
 *
 * `validateBlock` checks one block on its own.
 * `validateBlockSet` checks things that need several blocks: duplicate ids,
 * dependencies, and whether each file is in the right folder.
 *
 * Both are pure (no files, no database) and return plain-English messages.
 */

export type BlockValidation = { ok: true; block: Block } | { ok: false; errors: string[] };

export type ValidateOptions = {
  /** Today's date as YYYY-MM-DD. Only for tests. Defaults to the real date. */
  today?: string;
};

const TOP_LEVEL_KEYS = [
  "id",
  "title",
  "phase",
  "kind",
  "summary",
  "appliesTo",
  "steps",
  "roles",
  "toolExamples",
  "definitionOfDone",
  "pitfalls",
  "estimatedEffort",
  "dependsOn",
  "comesAfter",
  "movesUpFor",
  "freshness",
  "sources",
  "lastReviewed",
  "optional",
  "placeholder",
];

const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/** "30 minutes", "2 hours", "2-4 hours", "1 day", "2-3 days" */
const EFFORT_PATTERN = /^\d+(-\d+)? (minute|minutes|hour|hours|day|days)$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function listOf(allowed: readonly string[]): string {
  return allowed.join(", ");
}

function checkUnknownKeys(obj: Record<string, unknown>, allowed: readonly string[], where: string, errors: string[]) {
  for (const key of Object.keys(obj)) {
    if (!allowed.includes(key)) {
      errors.push(`${where}"${key}" is not a field blocks use. Check the spelling. Allowed: ${listOf(allowed)}.`);
    }
  }
}

/** Checks a list of text items, each non-empty. */
function checkTextList(value: unknown, path: string, errors: string[], minimum: number): void {
  if (!Array.isArray(value)) {
    errors.push(`${path}: must be a list, such as ["first item", "second item"].`);
    return;
  }
  if (value.length < minimum) {
    errors.push(`${path}: needs at least ${minimum} ${minimum === 1 ? "item" : "items"}.`);
  }
  value.forEach((item, i) => {
    if (!isNonEmptyString(item)) errors.push(`${path}[${i + 1}]: must be some text, not empty.`);
  });
}

/** Checks a list where every item must be one of the allowed ids, with no repeats. */
function checkIdList(value: unknown, allowed: readonly string[], path: string, errors: string[], hint: string): void {
  if (!Array.isArray(value)) {
    errors.push(`${path}: must be a list. ${hint}`);
    return;
  }
  const seen = new Set<string>();
  for (const item of value) {
    if (!isOneOf(allowed, item)) {
      errors.push(`${path}: ${JSON.stringify(item)} isn't allowed. Use one of: ${listOf(allowed)}.`);
    } else if (seen.has(item)) {
      errors.push(`${path}: "${item}" is listed twice.`);
    }
    if (typeof item === "string") seen.add(item);
  }
}

function isRealDate(text: string): boolean {
  if (!DATE_PATTERN.test(text)) return false;
  const date = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === text;
}

function todayAsText(): string {
  return new Date().toISOString().slice(0, 10);
}

function checkPhase(value: unknown, errors: string[]): void {
  if (value === ANY_PHASE) return;

  if (typeof value === "string") {
    if (!isOneOf(PHASE_IDS, value)) {
      errors.push(`phase: "${value}" isn't a phase. Use one of: ${listOf(PHASE_IDS)}, a list of phases, or "${ANY_PHASE}".`);
    }
    return;
  }

  if (Array.isArray(value)) {
    if (value.length < 2) {
      errors.push(`phase: a list needs at least 2 phases. For one phase, write it as plain text, such as "define".`);
    }
    const seen = new Set<string>();
    for (const item of value) {
      if (!isOneOf(PHASE_IDS, item)) {
        errors.push(`phase: ${JSON.stringify(item)} isn't a phase. Use one of: ${listOf(PHASE_IDS)}.`);
      } else if (seen.has(item)) {
        errors.push(`phase: "${item}" is listed twice.`);
      }
      if (typeof item === "string") seen.add(item);
    }
    return;
  }

  errors.push(`phase: is missing. Use one phase ("define"), a list (["design", "plan"]) or "${ANY_PHASE}".`);
}

function checkAppliesTo(value: unknown, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push(`appliesTo: is missing. It needs pmTypes, productTypes, stages, waysOfWorking and experience. An empty list means "applies to all".`);
    return;
  }
  const keys = ["pmTypes", "productTypes", "stages", "waysOfWorking", "experience", "companySizes", "leadsPeople"];
  checkUnknownKeys(value, keys, "appliesTo: ", errors);
  if ("companySizes" in value) {
    checkIdList(value.companySizes, COMPANY_SIZE_IDS, "appliesTo.companySizes", errors, "Leave it out to apply to every size.");
  }
  if ("leadsPeople" in value && value.leadsPeople !== true) {
    errors.push(`appliesTo.leadsPeople: leave it out, or set it to true.`);
  }
  const hint = "Use [] to mean applies to all.";
  const lists: [string, readonly string[]][] = [
    ["pmTypes", PM_TYPE_IDS],
    ["productTypes", PRODUCT_TYPE_IDS],
    ["stages", STAGE_IDS],
    ["waysOfWorking", WAY_OF_WORKING_IDS],
    ["experience", EXPERIENCE_IDS],
  ];
  for (const [key, allowed] of lists) {
    if (!(key in value)) {
      errors.push(`appliesTo.${key}: is missing. ${hint}`);
    } else {
      checkIdList(value[key], allowed, `appliesTo.${key}`, errors, hint);
    }
  }
}

function checkSteps(value: unknown, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push(`steps: is missing. It needs a list of steps for each experience level: ${listOf(EXPERIENCE_IDS)}.`);
    return;
  }
  checkUnknownKeys(value, EXPERIENCE_IDS, "steps: ", errors);
  for (const level of EXPERIENCE_IDS) {
    if (!(level in value)) {
      errors.push(`steps.${level}: is missing. Every block needs steps for all three experience levels.`);
    } else {
      checkTextList(value[level], `steps.${level}`, errors, 1);
    }
  }
}

function checkRoles(value: unknown, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push(`roles: is missing. It needs owner, canDelegateTo and reviewers.`);
    return;
  }
  checkUnknownKeys(value, ["owner", "canDelegateTo", "reviewers"], "roles: ", errors);

  if (!isOneOf(ROLE_IDS, value.owner)) {
    errors.push(`roles.owner: ${JSON.stringify(value.owner)} isn't a role. Use one of: ${listOf(ROLE_IDS)}.`);
  }

  if (!Array.isArray(value.canDelegateTo)) {
    errors.push(`roles.canDelegateTo: must be a list. Use [] if nothing can be delegated.`);
  } else {
    value.canDelegateTo.forEach((item, i) => {
      const where = `roles.canDelegateTo[${i + 1}]`;
      if (!isRecord(item)) {
        errors.push(`${where}: must have a role and a task.`);
        return;
      }
      checkUnknownKeys(item, ["role", "orRoles", "task", "ifMissing"], `${where}: `, errors);
      if (!isOneOf(ROLE_IDS, item.role)) {
        errors.push(`${where}.role: ${JSON.stringify(item.role)} isn't a role. Use one of: ${listOf(ROLE_IDS)}.`);
      }
      if (item.role === "pm" || (Array.isArray(item.orRoles) && item.orRoles.includes("pm"))) {
        errors.push(`${where}: a task can't be handed to "pm". The PM is the visitor, so they're never in their own team. Use ifMissing: "pm" instead.`);
      }
      if ("orRoles" in item) {
        checkIdList(item.orRoles, ROLE_IDS, `${where}.orRoles`, errors, "Leave it out if only one role can do this.");
        if (Array.isArray(item.orRoles) && item.orRoles.includes(item.role)) {
          errors.push(`${where}.orRoles: "${String(item.role)}" is already the main role.`);
        }
      }
      if (!isNonEmptyString(item.task)) errors.push(`${where}.task: must be some text, not empty.`);
      if (!isOneOf(TASK_FALLBACK_IDS, item.ifMissing)) {
        errors.push(`${where}.ifMissing: ${JSON.stringify(item.ifMissing)} isn't allowed. Say what happens if nobody in the team can do this: ${listOf(TASK_FALLBACK_IDS)}.`);
      }
    });
  }

  checkIdList(value.reviewers, ROLE_IDS, "roles.reviewers", errors, "Use [] if nobody needs to review.");
  if (Array.isArray(value.reviewers) && value.reviewers.includes("pm")) {
    errors.push(`roles.reviewers: "pm" can't review, because the PM is the visitor.`);
  }
}

function checkToolExamples(value: unknown, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push(`toolExamples: is missing. Use {} if there are no tool examples.`);
    return;
  }
  for (const [tool, text] of Object.entries(value)) {
    if (!isOneOf(TOOL_IDS, tool)) {
      errors.push(`toolExamples: "${tool}" isn't a tool we list. Use one of: ${listOf(TOOL_IDS)}.`);
    }
    if (!isNonEmptyString(text)) errors.push(`toolExamples.${tool}: must be some text, not empty.`);
  }
}

function checkSources(value: unknown, errors: string[]): void {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(`sources: every block must cite at least one source, such as { "title": "…", "url": "https://…" }.`);
    return;
  }
  value.forEach((item, i) => {
    const where = `sources[${i + 1}]`;
    if (!isRecord(item)) {
      errors.push(`${where}: must have a title and a url.`);
      return;
    }
    checkUnknownKeys(item, ["title", "url"], `${where}: `, errors);
    if (!isNonEmptyString(item.title)) errors.push(`${where}.title: must be some text, not empty.`);
    let validUrl = false;
    if (isNonEmptyString(item.url)) {
      try {
        const url = new URL(item.url);
        validUrl = url.protocol === "https:" || url.protocol === "http:";
      } catch {
        validUrl = false;
      }
    }
    if (!validUrl) errors.push(`${where}.url: must be a full web address starting with https://.`);
  });
}

export function validateBlock(input: unknown, options: ValidateOptions = {}): BlockValidation {
  if (!isRecord(input)) {
    return { ok: false, errors: ["The file must hold one block, written as a JSON object that starts with { and ends with }."] };
  }

  const errors: string[] = [];
  const b = input;
  checkUnknownKeys(b, TOP_LEVEL_KEYS, "", errors);

  if (typeof b.id !== "string" || !ID_PATTERN.test(b.id)) {
    errors.push(`id: must be lowercase words joined by hyphens, such as "define-problem-statement".`);
  }
  if (!isNonEmptyString(b.title)) errors.push(`title: is missing or empty.`);
  if (!isNonEmptyString(b.summary)) errors.push(`summary: is missing or empty.`);

  checkPhase(b.phase, errors);

  if (!isOneOf(KIND_IDS, b.kind)) {
    errors.push(`kind: ${JSON.stringify(b.kind)} isn't a kind of block. Use one of: ${listOf(KIND_IDS)}.`);
  }

  if (b.kind === "craft" && b.phase !== ANY_PHASE) {
    errors.push(`phase: a craft block must use "${ANY_PHASE}", because it sits outside the timeline.`);
  }

  checkAppliesTo(b.appliesTo, errors);
  checkSteps(b.steps, errors);
  checkRoles(b.roles, errors);
  checkToolExamples(b.toolExamples, errors);

  checkTextList(b.definitionOfDone, "definitionOfDone", errors, 1);
  // A block may have no pitfalls, but the field must be there so it isn't forgotten.
  checkTextList(b.pitfalls, "pitfalls", errors, 0);

  if (typeof b.estimatedEffort !== "string" || !EFFORT_PATTERN.test(b.estimatedEffort)) {
    errors.push(`estimatedEffort: ${JSON.stringify(b.estimatedEffort)} isn't in the right format. Write a number or range and a unit, such as "30 minutes", "2-4 hours" or "1 day".`);
  }

  if (!Array.isArray(b.dependsOn)) {
    errors.push(`dependsOn: must be a list of block ids. Use [] if it depends on nothing.`);
  } else {
    const seen = new Set<string>();
    for (const dep of b.dependsOn) {
      if (typeof dep !== "string" || !ID_PATTERN.test(dep)) {
        errors.push(`dependsOn: ${JSON.stringify(dep)} isn't a block id.`);
      } else if (seen.has(dep)) {
        errors.push(`dependsOn: "${dep}" is listed twice.`);
      }
      if (typeof dep === "string") seen.add(dep);
    }
  }

  if ("comesAfter" in b) {
    if (!Array.isArray(b.comesAfter) || b.comesAfter.length === 0) {
      errors.push(`comesAfter: must be a list of block ids. Leave it out if the order doesn't matter.`);
    } else {
      const seen = new Set<string>();
      for (const id of b.comesAfter) {
        if (typeof id !== "string" || !ID_PATTERN.test(id)) {
          errors.push(`comesAfter: ${JSON.stringify(id)} isn't a block id.`);
        } else if (seen.has(id)) {
          errors.push(`comesAfter: "${id}" is listed twice.`);
        }
        if (typeof id === "string") seen.add(id);
      }
    }
  }

  if ("movesUpFor" in b) {
    checkIdList(b.movesUpFor, COMPANY_SIZE_IDS, "movesUpFor", errors, "Leave it out if the block doesn't move.");
  }

  if (!isOneOf(FRESHNESS_IDS, b.freshness)) {
    errors.push(`freshness: ${JSON.stringify(b.freshness)} isn't allowed. Use one of: ${listOf(FRESHNESS_IDS)}.`);
  }

  checkSources(b.sources, errors);

  if (typeof b.lastReviewed !== "string" || !isRealDate(b.lastReviewed)) {
    errors.push(`lastReviewed: must be a real date written as YYYY-MM-DD, such as "2026-11-04".`);
  } else if (b.lastReviewed > (options.today ?? todayAsText())) {
    errors.push(`lastReviewed: "${b.lastReviewed}" is in the future.`);
  }

  if ("optional" in b) {
    if (b.optional !== true) {
      errors.push(`optional: leave it out, or set it to true. It marks a "Go further" block.`);
    } else if (b.kind !== "core" && b.kind !== "add-on") {
      errors.push(`optional: only core and add-on blocks can be "Go further", because only they sit in the timeline.`);
    }
  }

  if ("placeholder" in b && b.placeholder !== true) {
    errors.push(`placeholder: leave it out, or set it to true. Real blocks don't use it.`);
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, block: input as unknown as Block };
}

/** One block file as found on disk, ready for cross-checks. */
export type BlockFile = {
  /** Where the file is, for messages, such as "define/my-block.json". */
  path: string;
  /** The file name without .json. */
  fileId: string;
  /** The folder it sits in, such as "define" or "cross-phase". */
  folder: string;
  block: Block;
};

/** The first and last lifecycle position of a block's phases. */
function phaseSpan(block: Block): { first: number; last: number } {
  const orders = blockPhases(block.phase).map((id) => PHASES.find((p) => p.id === (id as PhaseId))?.order ?? 0);
  return { first: Math.min(...orders), last: Math.max(...orders) };
}

/** Checks that need more than one block. Returns a list of problems (empty if fine). */
export function validateBlockSet(files: BlockFile[]): string[] {
  const errors: string[] = [];
  const byId = new Map<string, BlockFile>();

  for (const file of files) {
    const { block } = file;

    if (block.id !== file.fileId) {
      errors.push(`${file.path}: the file name must match the block's id. The id is "${block.id}", so the file should be called "${block.id}.json".`);
    }

    const folder = expectedFolder(block.phase);
    if (file.folder !== folder) {
      errors.push(`${file.path}: this block's phase means it belongs in the "${folder}" folder, not "${file.folder}".`);
    }

    const earlier = byId.get(block.id);
    if (earlier) {
      errors.push(`${file.path}: the id "${block.id}" is already used by ${earlier.path}. Every block needs its own id.`);
    } else {
      byId.set(block.id, file);
    }
  }

  for (const file of files) {
    for (const depId of file.block.dependsOn) {
      if (depId === file.block.id) {
        errors.push(`${file.path}: a block can't depend on itself.`);
        continue;
      }
      const dep = byId.get(depId);
      if (!dep) {
        errors.push(`${file.path}: dependsOn "${depId}", but no block has that id.`);
        continue;
      }
      if (phaseSpan(dep.block).first > phaseSpan(file.block).last) {
        errors.push(`${file.path}: depends on "${depId}", which belongs to a later phase. A block can only depend on blocks from the same or an earlier phase.`);
      }
      if (dep.block.optional && !file.block.optional) {
        errors.push(`${file.path}: depends on "${depId}", which is a "Go further" block. Required work can't rely on optional work.`);
      }
      const levels = file.block.appliesTo.experience;
      const reached = dep.block.appliesTo.experience;
      if (reached.length > 0 && (levels.length === 0 || levels.some((level) => !reached.includes(level)))) {
        errors.push(`${file.path}: depends on "${depId}", which some of this block's experience levels never see. They'd lose the order, or be told to check for work they were never given.`);
      }
    }
  }

  for (const file of files) {
    for (const id of file.block.comesAfter ?? []) {
      const other = byId.get(id);
      if (id === file.block.id) {
        errors.push(`${file.path}: a block can't come after itself.`);
      } else if (!other) {
        errors.push(`${file.path}: comesAfter "${id}", but no block has that id.`);
      } else if (!blockPhases(other.block.phase).some((phase) => blockPhases(file.block.phase).includes(phase))) {
        errors.push(`${file.path}: comesAfter "${id}", which shares no phase with it. It only sets the order within a phase, so this does nothing.`);
      }
    }
  }

  errors.push(...findCircularDependencies(byId));
  return errors;
}

/** Finds loops such as a → b → a, across dependsOn and comesAfter. Reports each loop once. */
function findCircularDependencies(byId: Map<string, BlockFile>): string[] {
  const errors: string[] = [];
  const done = new Set<string>();
  const reported = new Set<string>();

  function visit(id: string, trail: string[]): void {
    if (done.has(id)) return;
    const at = trail.indexOf(id);
    if (at !== -1) {
      const loop = trail.slice(at);
      const key = [...loop].sort().join(",");
      if (!reported.has(key)) {
        reported.add(key);
        errors.push(`Circular dependency: ${[...loop, id].join(" → ")}. These blocks wait for each other, so none could go first.`);
      }
      return;
    }
    const file = byId.get(id);
    if (!file) return;
    for (const dep of [...file.block.dependsOn, ...(file.block.comesAfter ?? [])]) {
      if (dep !== id) visit(dep, [...trail, id]);
    }
    done.add(id);
  }

  for (const id of [...byId.keys()].sort()) visit(id, []);
  return errors;
}
