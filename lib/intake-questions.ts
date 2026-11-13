import {
  BACKGROUNDS,
  CAREER_LEVELS,
  COMPANY_SIZES,
  EXPLORE_GOALS,
  HOURS,
  PM_TYPES,
  PRODUCT_TYPES,
  ROLES,
  STARTING_QUESTIONS,
  TIMELINES,
  TOOLS,
  TOOL_GROUPS,
  TOOL_IDS,
  WAYS_OF_WORKING,
  WORK_KINDS,
  labelOf,
} from "../content/taxonomy";
import { phaseLabelFor, phasesCovered, stagesFor, trackFor } from "./intake-phases";
import { challengeOptions, leadsPeople } from "./leader-intake";
import { KIND_OF_WORK_ENABLED, MAX_PM_TYPES, MAX_TEAM_COUNT, NOT_SURE, OTHER_TOOL, type ExploreQuestionId, type IntakeAnswers, type IntakeDraft, type MultiQuestionId, type SingleQuestionId, type TeamRoleId } from "./intake-types";

export type IntakeOption = { readonly id: string; readonly label: string; readonly description?: string };
type OptionGroup = { id: string; label: string; options: readonly IntakeOption[] };

type QuestionText = {
  /** The label beside the answer on the plan page. */
  shortLabel: string;
  title: string;
  /** One line on what the answer changes in the plan. */
  why: string;
  /** One line on what happens if the visitor picks "Not sure". */
  notSure: string;
};

export type IntakeQuestion = QuestionText &
  (
    | { id: SingleQuestionId | ExploreQuestionId; kind: "single"; options: readonly IntakeOption[] }
    | {
        id: MultiQuestionId;
        kind: "multi";
        options: readonly IntakeOption[];
        groups?: OptionGroup[];
        /** Shown below the groups, and can be ticked alongside them. */
        extraOption?: IntakeOption;
        /** The most a visitor can tick. No limit if left out. */
        maxChoices?: number;
      }
  );

export const TEAM_ROLES = ROLES.filter((role) => role.inTeamQuestion);
export const TEAM_ROLE_IDS = TEAM_ROLES.map((role) => role.id as TeamRoleId);

const OTHER_TOOL_OPTION: IntakeOption = {
  id: OTHER_TOOL,
  label: "A tool that isn't listed",
  description: "Tick this as well if you use something else. You'll get tips that work with any tool.",
};

/** Every answer the tools question accepts. */
export const TOOL_ANSWER_IDS = [...TOOL_IDS, OTHER_TOOL] as const;

const TOOLS_BY_GROUP: OptionGroup[] = TOOL_GROUPS.map((group) => ({
  id: group.id,
  label: group.label,
  options: TOOLS.filter((tool) => tool.group === group.id),
}));

const KIND_OF_WORK_QUESTION: IntakeQuestion = {
  id: "work",
  kind: "single",
  shortLabel: "Kind of work",
  title: "What kind of product work are you doing right now?",
  why: "This decides which kind of plan you get.",
  notSure: "We'll start you on building or improving a product. Most plans begin there.",
  options: WORK_KINDS,
};

const CORE_QUESTIONS: readonly IntakeQuestion[] = [
  {
    id: "level",
    kind: "single",
    shortLabel: "What you own",
    title: "What best describes what you own?",
    why: "This sets how much guidance each step gives. Titles mean different things at different companies, so pick by scope.",
    notSure: "We'll pitch your plan at product manager level. You can change it on your plan.",
    options: CAREER_LEVELS,
  },
  {
    id: "pm",
    kind: "multi",
    shortLabel: "Kind of PM",
    title: "What kind of product manager are you?",
    why: "Pick up to two. This decides which add-on blocks you get.",
    notSure: "We'll use general. You can change it on your plan.",
    options: PM_TYPES,
    maxChoices: MAX_PM_TYPES,
  },
  {
    id: "product",
    kind: "single",
    shortLabel: "Kind of product",
    title: "What kind of product is it?",
    why: "Some steps only matter for certain products, such as service assessments in the public sector.",
    notSure: "Pick this if it doesn't fit neatly. We'll leave out add-ons aimed at one kind of product.",
    options: PRODUCT_TYPES,
  },
  {
    id: "size",
    kind: "single",
    shortLabel: "Size of organisation",
    title: "How big is your organisation?",
    why: "This adds blocks for your size and moves some others up. Public sector and charities: pick the size that fits.",
    notSure: "We'll assume an established organisation.",
    options: COMPANY_SIZES,
  },
  {
    id: "stage",
    kind: "single",
    ...STARTING_QUESTIONS.product,
    notSure: "Pick this if you can't tell yet. Your plan will start from the beginning.",
    options: stagesFor("product"),
  },
  {
    id: "challenge",
    kind: "single",
    shortLabel: "Biggest challenge",
    title: "What's your biggest challenge right now?",
    why: "This moves the blocks that help most to the front of each phase.",
    notSure: "We'll keep your plan balanced.",
    options: challengeOptions(null),
  },
  {
    id: "time",
    kind: "single",
    shortLabel: "Timeline",
    title: "How long until your next milestone?",
    why: "A milestone is the next point that matters to you, such as a small feature release, the end of discovery, going live or the end of a client contract. We'll fit your plan to this time, week by week, and warn you if it looks tight.",
    notSure: "Pick this if you have no date yet. Your plan will use a steady pace, with no deadline warning.",
    options: TIMELINES,
  },
  {
    id: "way",
    kind: "single",
    shortLabel: "Way of working",
    title: "How does your team work?",
    why: "This decides which ways-of-working blocks you get.",
    notSure: "Pick this if it varies. You'll only get blocks that suit any team.",
    options: WAYS_OF_WORKING,
  },
];

/**
 * The optional questions in "Tailor your plan" on the plan page. They were
 * part of the intake until Phase 8a-2. The answers still go in the link.
 */
export const TAILOR_QUESTIONS: readonly IntakeQuestion[] = [
  {
    id: "team",
    kind: "multi",
    shortLabel: "Team",
    title: "Who is in your team?",
    why: "Tick each role and say how many. Your plan will suggest what to ask them.",
    notSure: "Pick this if you don't know yet or have no team. Your plan will assume tasks sit with you.",
    options: TEAM_ROLES,
  },
  {
    id: "tools",
    kind: "multi",
    shortLabel: "Tools",
    title: "Which tools do you use?",
    why: "Tick all that apply. You'll only see tool examples for these.",
    notSure: "Pick this if you don't know or use none of these. You'll get tips that work with any tool.",
    options: [...TOOLS, OTHER_TOOL_OPTION],
    groups: TOOLS_BY_GROUP,
    extraOption: OTHER_TOOL_OPTION,
  },
];

/** The three questions that follow "I'm exploring product management". Together with the first, that's four. */
const EXPLORE_ONLY_QUESTIONS: readonly IntakeQuestion[] = [
  {
    id: "background",
    kind: "single",
    shortLabel: "Background",
    title: "Where are you coming from?",
    why: "This favours the skills where people from your background usually have gaps.",
    notSure: "We'll cover the foundations evenly.",
    options: BACKGROUNDS,
  },
  {
    id: "goal",
    kind: "single",
    shortLabel: "Goal",
    title: "What do you want from this?",
    why: "This decides which phases you get, from understanding the role to applying for jobs.",
    notSure: "We'll start with understanding the role, then practising.",
    options: EXPLORE_GOALS,
  },
  {
    id: "hours",
    kind: "single",
    shortLabel: "Time each week",
    title: "How much time can you give each week?",
    why: "This sets how many weeks your plan takes.",
    notSure: "We'll assume 3 to 6 hours.",
    options: HOURS,
  },
];

/** The questions, in the order visitors see them. The first has a switch. */
export function questionsFor(kindOfWorkEnabled: boolean): readonly IntakeQuestion[] {
  return kindOfWorkEnabled ? [KIND_OF_WORK_QUESTION, ...CORE_QUESTIONS] : CORE_QUESTIONS;
}

export const INTAKE_QUESTIONS = questionsFor(KIND_OF_WORK_ENABLED);

/** The explore path's four questions: the first, then background, goal and time each week. */
export const EXPLORE_QUESTIONS: readonly IntakeQuestion[] = [KIND_OF_WORK_QUESTION, ...EXPLORE_ONLY_QUESTIONS];

/** The questions a visitor is asked. Exploring product management has its own short path of four. */
export function questionsForWork(work: IntakeDraft["work"] | undefined): readonly IntakeQuestion[] {
  return work === "explore" ? EXPLORE_QUESTIONS : INTAKE_QUESTIONS;
}

/** How many questions a visitor's path has. */
export function totalStepsFor(work: IntakeDraft["work"] | undefined): number {
  return questionsForWork(work).length;
}

/**
 * People leaders look after products and teams, not one product of their own, so
 * some questions are worded for them. The answers and what they change stay the same.
 */
const LEADER_WORDING: Partial<Record<IntakeQuestion["id"], Partial<QuestionText>>> = {
  pm: {
    shortLabel: "Kind of product work",
    title: "What kind of product work do your teams do?",
    why: "Pick up to two. This decides which add-on blocks your plan includes.",
  },
  product: {
    title: "What kind of products do you look after?",
    why: "Some steps only matter for certain products, such as service assessments in the public sector. If you look after several kinds, pick the main one.",
  },
  challenge: {
    title: "What's your biggest challenge as a leader right now?",
    why: "This moves the blocks that help most to the front of your plan.",
  },
  way: {
    title: "How do your teams work?",
    why: "This decides which ways-of-working blocks you get. If it varies, pick the most common.",
  },
};

/** The product track's starting point, for someone who looks after more than one product. */
const LEADER_STAGE: Partial<QuestionText> = {
  title: "Where is your main product now?",
  why: "This sets where your plan starts. If you look after several, pick the one that needs you most right now.",
};

/** "General" describes one PM. For a leader it describes their teams. */
const LEADER_PM_TYPES: readonly IntakeOption[] = PM_TYPES.map((type) => (type.id === "general" ? { ...type, description: "Your teams cover a bit of everything." } : type));

/**
 * The question as this visitor sees it. The starting point depends on the kind of
 * work. People leaders get their own wording, and their own challenges as well.
 */
export function questionFor(question: IntakeQuestion, draft: Pick<IntakeDraft, "work"> & Partial<Pick<IntakeDraft, "level">>): IntakeQuestion {
  const leader = leadsPeople(draft.level ?? null);
  if (question.id === "stage") {
    const track = trackFor(draft.work);
    return { ...question, ...STARTING_QUESTIONS[track], ...(leader && track === "product" ? LEADER_STAGE : {}), options: stagesFor(draft.work) };
  }
  if (question.id === "challenge") return { ...question, ...(leader ? LEADER_WORDING.challenge : {}), options: challengeOptions(draft.level ?? null) };
  if (!leader || !LEADER_WORDING[question.id]) return question;
  const worded = { ...question, ...LEADER_WORDING[question.id] } as IntakeQuestion;
  return question.id === "pm" ? ({ ...worded, options: LEADER_PM_TYPES } as IntakeQuestion) : worded;
}

/** The longest path. A step in the address can't go past it. */
export const TOTAL_STEPS = INTAKE_QUESTIONS.length;

function answerLabel(options: readonly IntakeOption[], id: string): string {
  return id === NOT_SURE ? "Not sure" : labelOf(options, id);
}

function withCount(label: string, count: number | undefined): string {
  if (!count) return label;
  return `${label} (${count === MAX_TEAM_COUNT ? `${count}+` : count})`;
}

/**
 * The answers as readable label and value pairs, in question order. `step` is
 * the question to change it; the last row is worked out, so it has none.
 */
export function summariseAnswers(answers: IntakeAnswers): { label: string; value: string; step?: number }[] {
  const rows = questionsForWork(answers.work).map((baseQuestion, index) => {
    const question = questionFor(baseQuestion, answers);
    const answer = answers[question.id];
    const counts: Record<string, number | undefined> = question.id === "team" ? answers.teamCounts : {};
    const value = Array.isArray(answer)
      ? answer.map((id) => withCount(answerLabel(question.options, id), counts[id])).join(", ")
      : answerLabel(question.options, answer ?? NOT_SURE);
    return { label: question.shortLabel, value: `${value}${followUpText(question.id, answers)}`, step: index + 1 };
  });
  const covered = phasesCovered(answers).map((phase) => phase.label);
  return [...rows, { label: "Phases your plan covers", value: covered.join(", ") }];
}

function followUpText(question: IntakeQuestion["id"], answers: IntakeAnswers): string {
  const { phase, until } = answers;
  if (question === "stage" && phase && phase !== NOT_SURE) return ` (${phaseLabelFor(phase, answers.stage)})`;
  if (question === "time" && until && until !== NOT_SURE) return `, finishing ${phaseLabelFor(until, answers.stage)}`;
  return "";
}
