import type { Block } from "./blocks-types";

/**
 * A small, valid block used only by the tests. The text is dummy text,
 * not PM guidance. Pass `overrides` to change fields for a particular test.
 */
export function makeBlock(overrides: Partial<Block> = {}): Block {
  return {
    id: "define-test-block",
    title: "Test block",
    phase: "define",
    kind: "core",
    summary: "Dummy text for tests.",
    appliesTo: { pmTypes: [], productTypes: [], stages: [], waysOfWorking: [] },
    steps: {
      beginner: ["Dummy beginner step."],
      intermediate: ["Dummy intermediate step."],
      experienced: ["Dummy experienced step."],
    },
    roles: {
      owner: "pm",
      canDelegateTo: [{ role: "ba", task: "Dummy task." }],
      reviewers: ["tech-lead"],
    },
    toolExamples: { claude: "Dummy tool tip." },
    definitionOfDone: ["Dummy done item."],
    pitfalls: ["Dummy pitfall."],
    estimatedEffort: "2-4 hours",
    dependsOn: [],
    freshness: "evergreen",
    sources: [{ title: "Dummy source", url: "https://example.com/source" }],
    lastReviewed: "2026-11-04",
    ...overrides,
  };
}
