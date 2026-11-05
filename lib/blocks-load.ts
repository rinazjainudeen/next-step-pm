import fs from "node:fs";
import path from "node:path";
import { CROSS_PHASE_FOLDER, KINDS, PHASES, PHASE_IDS } from "../content/taxonomy";
import { validateBlock, validateBlockSet, type BlockFile, type ValidateOptions } from "./blocks-validate";
import { blockPhases, type Block } from "./blocks-types";

/**
 * Reads the block files from content/blocks/ and checks them.
 *
 * `checkContent` never throws. It returns every problem it finds, which is what
 * `pnpm validate:content` prints.
 * `loadBlocks` is for the website: it throws if anything is wrong, so a bad
 * block stops the build instead of reaching visitors.
 */

// Most pages read the blocks while the site is being built. The plan page reads
// them for each visitor, so next.config.ts ships the files with that page. The
// comment below tells the build tool not to bundle the whole project because of
// these file reads.
export const BLOCKS_DIR = path.join(/*turbopackIgnore: true*/ process.cwd(), "content", "blocks");

export type ContentCheck = {
  /** Valid blocks, in display order. Only trustworthy when `errors` is empty. */
  blocks: Block[];
  errors: string[];
  warnings: string[];
  /** How many .json files were read. */
  fileCount: number;
};

const VALID_FOLDERS: readonly string[] = [...PHASE_IDS, CROSS_PHASE_FOLDER];

function relative(...parts: string[]): string {
  return parts.join("/");
}

/** Lifecycle order first (cross-phase blocks last), then kind, then id. */
function sortBlocks(blocks: Block[]): Block[] {
  const firstPhase = (block: Block): number => {
    const phases = blockPhases(block.phase);
    if (phases.length === PHASE_IDS.length && block.phase === "any") return 99;
    return PHASES.find((p) => p.id === phases[0])?.order ?? 99;
  };
  const kindOrder = (block: Block): number => KINDS.findIndex((k) => k.id === block.kind);
  return [...blocks].sort(
    (a, b) => firstPhase(a) - firstPhase(b) || kindOrder(a) - kindOrder(b) || a.id.localeCompare(b.id),
  );
}

export function checkContent(dir: string = BLOCKS_DIR, options: ValidateOptions = {}): ContentCheck {
  const errors: string[] = [];
  const warnings: string[] = [];
  const files: BlockFile[] = [];
  let fileCount = 0;

  if (!fs.existsSync(/*turbopackIgnore: true*/ dir)) {
    return { blocks: [], errors: [`The blocks folder was not found: ${dir}`], warnings, fileCount };
  }

  const entries = fs
    .readdirSync(/*turbopackIgnore: true*/ dir, { withFileTypes: true })
    .filter((entry) => !entry.name.startsWith("."))
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      errors.push(`${entry.name}: blocks must sit inside a folder named after a phase (or "${CROSS_PHASE_FOLDER}"), not loose in content/blocks/.`);
      continue;
    }
    if (!VALID_FOLDERS.includes(entry.name)) {
      errors.push(`${entry.name}/: this isn't a folder we use. Folders are: ${VALID_FOLDERS.join(", ")}.`);
      continue;
    }

    const folderPath = path.join(/*turbopackIgnore: true*/ dir, entry.name);
    const names = fs
      .readdirSync(/*turbopackIgnore: true*/ folderPath, { withFileTypes: true })
      .filter((file) => !file.name.startsWith("."))
      .sort((a, b) => a.name.localeCompare(b.name));

    for (const file of names) {
      const rel = relative(entry.name, file.name);
      if (!file.isFile() || !file.name.endsWith(".json")) {
        errors.push(`${rel}: only .json block files belong here.`);
        continue;
      }
      fileCount += 1;

      let parsed: unknown;
      try {
        parsed = JSON.parse(fs.readFileSync(path.join(/*turbopackIgnore: true*/ folderPath, file.name), "utf8"));
      } catch (error) {
        const reason = error instanceof Error ? error.message : "unknown reason";
        errors.push(`${rel}: this isn't valid JSON (${reason}). Look for a missing comma, quote or bracket.`);
        continue;
      }

      const result = validateBlock(parsed, options);
      if (!result.ok) {
        for (const message of result.errors) errors.push(`${rel}: ${message}`);
        continue;
      }
      files.push({ path: rel, fileId: file.name.replace(/\.json$/, ""), folder: entry.name, block: result.block });
    }
  }

  errors.push(...validateBlockSet(files));

  for (const file of files) {
    if (file.block.placeholder) {
      warnings.push(`${file.path}: placeholder block. It must be replaced or removed before the real launch.`);
    }
  }

  return { blocks: sortBlocks(files.map((f) => f.block)), errors, warnings, fileCount };
}

/** For the website. Throws if any block is wrong, so the build fails. */
export function loadBlocks(dir: string = BLOCKS_DIR): Block[] {
  const result = checkContent(dir);
  if (result.errors.length > 0) {
    throw new Error(`Learning blocks have ${result.errors.length} problem(s). Run "pnpm validate:content" for the list.\n${result.errors.join("\n")}`);
  }
  return result.blocks;
}
