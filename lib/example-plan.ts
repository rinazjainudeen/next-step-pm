import { draftToQuery, planHref } from "./intake-url";
import { EMPTY_DRAFT, type IntakeDraft } from "./intake-types";

/**
 * The example plan linked from the home page. Change the answers here and every
 * link and the banner follow. Team and tools are left unanswered, as most visitors will.
 */
export const EXAMPLE_DRAFT: IntakeDraft = {
  ...EMPTY_DRAFT,
  work: "product",
  pm: ["general"],
  level: "product-manager",
  product: "b2b",
  size: "scaling",
  stage: "mid-build",
  phase: "build",
  challenge: "measurement",
  time: "1-3m",
  // The follow-up to the timeline. Finishing at Measure still fits 1 to 3 months, and it's where
  // a measurement challenge pays off, so the example shows all three challenge labels.
  until: "measure",
  way: "scrum",
};

export const EXAMPLE_PLAN_HREF = planHref(EXAMPLE_DRAFT);

/** True when a plan page shows exactly the example. Once tailored, it's the visitor's own plan. */
export function isExamplePlan(draft: IntakeDraft): boolean {
  return draftToQuery(draft) === draftToQuery(EXAMPLE_DRAFT);
}
