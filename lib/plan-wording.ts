import type { BackgroundId, CareerLevelId, PmTypeId } from "../content/taxonomy";
import type { NotSure } from "./intake-types";

/**
 * The plan's opening line: one sentence for the level, then one for the first
 * PM type or the track. Kept in one place so the wording can be edited.
 * Approved by Rinaz on 7 November 2026.
 */
export const OPENING_LINES: {
  levels: Record<CareerLevelId | NotSure, string>;
  pmTypes: Record<PmTypeId, string>;
  tracks: { strategy: string; coaching: string; explore: string };
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
    explore: "You're exploring product management, so this plan helps you learn what the job is, build foundations, practise on a real problem and, if you want, apply.",
  },
};

/**
 * Wording for the explore path. The opening line and the engineering line were approved in the
 * spec. The rest follow the same pattern and the skills each background favours: Rinaz to review.
 */
export const EXPLORE_WORDING: {
  /** "Helps close a common gap for ...", for the blocks the background favours. */
  gapFor: Record<BackgroundId, string>;
  /** The extra line on "Map your skills to product management". "Something else" and "Not sure" have none. */
  mapYourSkills: Partial<Record<BackgroundId, string>>;
} = {
  gapFor: {
    engineering: "people coming from engineering",
    design: "people coming from design, UX or research",
    data: "people coming from data or analytics",
    business: "people coming from business, operations or consulting",
    marketing: "people coming from marketing, sales or customer success",
    student: "students and recent graduates",
    other: "people changing careers",
  },
  mapYourSkills: {
    engineering: "Engineers already know how products get built. Spend your time on users and the business.",
    design: "Designers already know how people use things. Spend your time on data and the business.",
    data: "People who work with data already know how to find evidence. Spend your time on users and on bringing people with you.",
    business: "People from business and operations already know how organisations run. Spend your time on technology and on discovering what users need.",
    marketing: "People from marketing and sales already know customers and markets. Spend your time on data and on getting work delivered.",
    student: "You're early in your career, so there's no old habit to unlearn. Spend your time on users, communication and data.",
  },
};
