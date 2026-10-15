// The shape of validated content the site renders. Built from the spreadsheet tabs by build.ts.

export type Side = "technical" | "market";
export type Stance = "contrarian" | "evidence-led";
export type HardKind = "access" | "distribution" | "convening";
export type Tier = "DATA" | "FUNDING" | "NAMED";

export interface Macro {
  label: string;
  value: string;
  change: string;
  trend: "up" | "down";
  spark: number[];
  sourced: boolean;
}

export interface Arena {
  id: string;
  slug: string;
  shortName: string;
  name: string;
  line: string;
  live: boolean;
  dealFlow: string;
  dealFlowSourced: boolean;
  thesis: string | null;
  macro: Macro[];
}

export interface MathLine {
  text: string;
  ref: number | "EST";
}

export interface Source {
  order: number;
  tier: Tier;
  text: string;
  url: string | null;
}

export interface Builder {
  initials: string;
  name: string;
  note: string;
  backers: string;
  raised: string;
  url: string | null;
}

export interface Card {
  id: string;
  slug: string;
  arenaId: string;
  archetype: string;
  question: string;
  whyNow: string;
  whyLong: string | null;
  whyYou: string;
  caps: string[];
  skills: string[];
  math: { headline: string; subhead: string; lines: MathLine[] };
  figureLabel: string;
  fundedTeams: number | null;
  fundedTeamsSource: string | null;
  hard: { t: number; m: number; kind: HardKind; buyer: string; techNeed: string };
  scores: number[]; // same order as rubric
  conviction: number;
  quote: { text: string; attribution: string; url: string | null } | null;
  note: string | null;
  lastVerified: string | null; // YYYY-MM-DD
  sources: Source[];
  builders: Builder[];
}

export interface Skill {
  label: string;
  hint: string;
  tag: string;
  side: Side;
}

export interface Archetype {
  name: string;
  colour: string;
  lean: number; // +1 contrarian, -1 evidence-led
}

export interface RubricItem {
  dimension: string;
  column: string;
  description: string;
}

export interface QuizOption {
  text: string;
  points: Record<string, number>; // skill label -> points
  stance: number | null;
}

export interface QuizQuestion {
  id: string;
  axis: "edge" | "stance";
  question: string;
  options: [QuizOption, QuizOption]; // A, B
}

export interface BuilderType {
  key: string;
  name: string;
  edge: Side;
  stance: Stance;
  description: string;
  whereToLook: string;
  cofounderKey: string;
}

export interface Settings {
  quizVersion: number;
  resultsShown: number;
  weights: { edge: number; skills: number; stance: number };
  dataScope: string;
}

export interface Content {
  arenas: Arena[];
  cards: Card[]; // published only, sorted by conviction desc within each arena
  skills: Skill[];
  capabilities: string[];
  archetypes: Archetype[];
  rubric: RubricItem[];
  quiz: QuizQuestion[];
  types: BuilderType[];
  settings: Settings;
  warnings: string[];
}
