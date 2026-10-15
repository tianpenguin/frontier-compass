// Builder-profile scoring. Same logic as V6, but every input comes from the content sheet.
//   EDGE   = (TECH - MARKET) / (TECH + MARKET), from skill points          -1 market .. +1 technical
//   STANCE = mean of stance answers                                        -1 evidence-led .. +1 contrarian
//   TYPE   = the type whose edge/stance matches the quadrant (ties go technical / contrarian)
//   MATCH  = w.edge * edge fit + w.skills * skill fit + w.stance * stance fit
import type { BuilderType, QuizQuestion, Settings, Skill } from "./content/types";

export interface FitCard {
  id: string;
  slug: string;
  question: string;
  archetype: string;
  arenaName: string;
  skills: string[];
  whyYou: string;
  hard: { t: number; m: number; kind: "access" | "distribution" | "convening"; buyer: string; techNeed: string };
}

export interface Profile {
  sk: Record<string, number>;
  T: number;
  M: number;
  edge: number;
  stance: number;
  st: number;
  ns: number;
  type: BuilderType;
  norm: (label: string) => number;
}

export function profileOf(ans: number[], quiz: QuizQuestion[], skills: Skill[], types: BuilderType[]): Profile {
  const sk: Record<string, number> = {};
  for (const s of skills) sk[s.label] = 0;
  let st = 0, ns = 0;
  ans.forEach((ai, qi) => {
    const o = quiz[qi]?.options[ai];
    if (!o) return;
    for (const [k, v] of Object.entries(o.points)) sk[k] = (sk[k] ?? 0) + v;
    if (o.stance !== null) { st += o.stance; ns++; }
  });
  const T = skills.filter((s) => s.side === "technical").reduce((a, s) => a + sk[s.label], 0);
  const M = skills.filter((s) => s.side === "market").reduce((a, s) => a + sk[s.label], 0);
  const edge = T + M ? (T - M) / (T + M) : 0;
  const stance = ns ? st / ns : 0;
  const type = types.find((t) => t.edge === (edge >= 0 ? "technical" : "market") && t.stance === (stance >= 0 ? "contrarian" : "evidence-led"))!;
  const mx = Math.max(1, ...Object.values(sk));
  return { sk, T, M, edge, stance, st, ns, type, norm: (k) => (sk[k] ?? 0) / mx };
}

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export interface Match { c: FitCard; b: number; lean: number; ef: number; sf: number; tf: number; total: number }

export function matchCard(c: FitCard, P: Profile, lean: number, w: Settings["weights"]): Match {
  const b = clamp((c.hard.t - c.hard.m) / 50, -1, 1);
  const ef = w.edge * (1 - Math.abs(P.edge - b) / 2);
  const sf = w.skills * (c.skills.reduce((a, k) => a + P.norm(k), 0) / c.skills.length);
  const tf = w.stance * (1 - Math.abs(P.stance - lean) / 2);
  return { c, b, lean, ef, sf, tf, total: Math.round(ef + sf + tf) };
}

export function besideYou(c: FitCard, P: Profile): string {
  const h = c.hard;
  if (h.m >= 60 && P.edge > 0.15) {
    return h.kind === "access" ? `Someone who can get inside ${h.buyer}.`
      : h.kind === "distribution" ? `Someone who can reach ${h.buyer} cheaply.`
      : `Someone who can bring ${h.buyer} to the table.`;
  }
  if (h.t >= 60 && P.edge < -0.15) return `A technical co-founder who can build ${h.techNeed}.`;
  if (h.t >= 60 && h.m >= 60) return "Hard on both sides. Plan for a two-person founding team from day one.";
  return "You cover the hard part of this one.";
}

export const KIND_LABEL = { access: "ACCESS", distribution: "DISTRIBUTION", convening: "CONVENING" } as const;
