import type { CareerLevelId, PmTypeId } from "../content/taxonomy";
import type { NotSure } from "./intake-types";

/**
 * The plan's opening line: one sentence for the level, then one for the first
 * PM type or the track. Kept in one place so the wording can be edited.
 * Approved by Rinaz on 7 November 2026.
 */
export const OPENING_LINES: {
  levels: Record<CareerLevelId | NotSure, string>;
  pmTypes: Record<PmTypeId, string>;
  tracks: { strategy: string; coaching: string };
} = {
  levels: {
    associate: "You're building your craft, so this plan explains each step and why it matters.",
    "product-manager": "You own a feature or module end to end, so this plan focuses on the decisions that are yours to make.",
    senior: "You own a product line or a hard problem, so this plan focuses on trade-offs, evidence and influence.",
    group: "You lead PMs while owning product, so this plan pairs your own work with growing your team.",
    director: "You run a portfolio and the people in it, so this plan focuses on direction, investment and capability.",
    vp: "You set product direction for the company, so this plan focuses on strategy, alignment and the organisation you're building.",
    "not-sure": "We've pitched this at product manager level. Change it in Your answers at any time.",
  },
  pmTypes: {
    general: "It covers the whole lifecycle, so nothing important is missed.",
    growth: "Growth steps focus on activation, retention and experiments.",
    ai: "AI steps focus on data, evaluation and designing for uncertain output.",
    data: "Data steps focus on decisions, quality and trust.",
    technical: "Technical steps treat developers as your users.",
    platform: "Platform steps treat other teams as your customers.",
    transformation: "Transformation steps focus on people and process as much as systems.",
    hardware: "Hardware steps cover cost, manufacturing and certification.",
  },
  tracks: {
    strategy: "This plan takes you from understanding the situation to a strategy people act on.",
    coaching: "This plan takes you from assessing practice to making it run without you.",
  },
};
