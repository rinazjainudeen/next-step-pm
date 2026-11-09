"use client";

import { createContext, useContext } from "react";

/**
 * Small differences between kinds of plan, shared by every block card so each doesn't need extra props.
 * `explorer` is for "I'm exploring product management": the visitor does the work themselves, so
 * the cards have no "Who can do this" or tools. `challengePill` is the label on favoured blocks.
 */
export type PlanStyle = { explorer: boolean; challengePill: string };

export const PlanStyleContext = createContext<PlanStyle>({ explorer: false, challengePill: "Helps with your challenge" });

export function usePlanStyle(): PlanStyle {
  return useContext(PlanStyleContext);
}
