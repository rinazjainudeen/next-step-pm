// `pnpm validate:content`
// Checks every learning block in content/blocks/ against the rules in
// docs/content-model.md. Exits with an error if anything is wrong, so a bad
// block can't be merged unnoticed.

import { checkContent } from "../lib/blocks-load";

const { blocks, errors, warnings, fileCount } = checkContent();

if (warnings.length > 0) {
  console.log("Warnings (these don't fail the check):");
  for (const warning of warnings) console.log(`  - ${warning}`);
  console.log("");
}

if (errors.length > 0) {
  console.error(`validate:content: found ${errors.length} problem${errors.length === 1 ? "" : "s"} in ${fileCount} file${fileCount === 1 ? "" : "s"}:\n`);
  for (const error of errors) console.error(`  - ${error}`);
  console.error("\nFix these, then run `pnpm validate:content` again.");
  process.exitCode = 1;
} else {
  const byKind = new Map<string, number>();
  for (const block of blocks) byKind.set(block.kind, (byKind.get(block.kind) ?? 0) + 1);
  const summary = [...byKind.entries()].map(([kind, count]) => `${count} ${kind}`).join(", ");
  console.log(`validate:content: all ${blocks.length} block${blocks.length === 1 ? "" : "s"} are valid${summary ? ` (${summary})` : ""}.`);
}
