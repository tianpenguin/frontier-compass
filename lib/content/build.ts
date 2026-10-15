// Turns raw spreadsheet tabs into validated, typed Content.
// Every problem is collected and reported together, with the tab, row and column, so a bad edit
// in the sheet produces one readable error list instead of a broken page.
import { z } from "zod";
import type {
  Arena, Archetype, Builder, BuilderType, Card, Content, MathLine, QuizOption, QuizQuestion,
  RubricItem, Settings, Skill, Source,
} from "./types";

export type RawRow = Record<string, unknown> & { __row?: number };
export type RawTabs = Record<string, RawRow[]>;

export class ContentError extends Error {
  constructor(public problems: string[]) {
    super(`Content has ${problems.length} problem(s):\n` + problems.map((p) => "  - " + p).join("\n"));
    this.name = "ContentError";
  }
}

/* ---------- field parsers ---------- */
const blank = (v: unknown) => v === null || v === undefined || String(v).trim() === "";
const str = (v: unknown) => (blank(v) ? undefined : String(v).trim());

const text = z.preprocess(str, z.string({ error: "is required" }));
const optText = z.preprocess((v) => str(v) ?? null, z.string().nullable());
const intIn = (lo: number, hi: number) =>
  z.preprocess(
    (v) => (blank(v) ? undefined : Number(v)),
    z.number({ error: "must be a number" }).int(`must be a whole number`).min(lo, `must be ${lo} to ${hi}`).max(hi, `must be ${lo} to ${hi}`),
  );
const optIntIn = (lo: number, hi: number) =>
  z.preprocess((v) => (blank(v) ? null : Number(v)), z.number({ error: "must be a number" }).int().min(lo).max(hi).nullable());
const oneOf = <T extends string>(vals: readonly [T, ...T[]]) =>
  z.preprocess(str, z.enum(vals, { error: `must be one of: ${vals.join(", ")}` }));
const yesNo = z.preprocess((v) => str(v)?.toLowerCase(), z.enum(["yes", "no"], { error: "must be yes or no" })).transform((v) => v === "yes");
const url = z.preprocess(
  (v) => str(v) ?? null,
  z.string().nullable().refine((v) => v === null || /^https?:\/\/[^\s]+$/i.test(v), "must start with http:// or https://"),
);
const isoDate = z.preprocess((v) => {
  // Google Sheets returns dates as serial day numbers (days since 1899-12-30)
  if (typeof v === "number" && v > 20000 && v < 80000) return new Date(Date.UTC(1899, 11, 30) + v * 86400000).toISOString().slice(0, 10);
  const s = str(v);
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toISOString().slice(0, 10);
}, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be a date").nullable());
const cardId = z.preprocess(str, z.string({ error: "is required" }).regex(/^\d{2}\.\d{2}$/, "must look like 02.05 (set the column to plain text if Sheets turned it into a number)"));
const arenaId = z.preprocess(str, z.string({ error: "is required" }).regex(/^\d{2}$/, "must look like 03 (set the column to plain text)"));

/* ---------- row schemas ---------- */
const S = {
  arenas: z.object({
    id: arenaId, short_name: text, name: text, line: text,
    status: oneOf(["live", "soon"]), deal_flow_90d: text, deal_flow_sourced: yesNo, thesis: optText,
  }),
  arena_macro: z.object({
    arena_id: arenaId, order: intIn(1, 99), label: text, value: text, change: text,
    trend: oneOf(["up", "down"]),
    sparkline: z.preprocess(str, z.string({ error: "is required" }).regex(/^\s*\d+(\.\d+)?(\s*,\s*\d+(\.\d+)?)+\s*$/, "must be comma-separated numbers")),
    sourced: yesNo,
  }),
  cards: z.object({
    id: cardId, arena_id: arenaId, status: oneOf(["published", "draft"]), archetype: text,
    question: text, why_now: text, why_long: optText, why_you: text,
    cap_1: text, cap_2: optText, cap_3: optText,
    skill_1: text, skill_2: text, skill_3: text,
    math_headline: text, math_subhead: text, figure_label: text,
    funded_teams: optIntIn(0, 100000), funded_teams_source: optText,
    tech_difficulty: intIn(0, 100), market_difficulty: intIn(0, 100),
    hard_kind: oneOf(["access", "distribution", "convening"]), buyer: text, tech_need: text,
    score_market_pull: intIn(0, 100), score_capital_momentum: intIn(0, 100), score_why_now: intIn(0, 100),
    score_ai_native_edge: intIn(0, 100), score_impact: intIn(0, 100), score_whitespace: intIn(0, 100),
    quote_text: optText, quote_attribution: optText, quote_source_url: url,
    note: optText, last_verified: isoDate,
  }),
  math_lines: z.object({
    card_id: cardId, order: intIn(1, 99), text: text,
    source_ref: z.preprocess(str, z.string({ error: "is required" }).regex(/^(EST|\d+)$/, "must be a source number or EST")),
  }),
  sources: z.object({ card_id: cardId, order: intIn(1, 99), tier: oneOf(["DATA", "FUNDING", "NAMED"]), text: text, url: url }),
  builders: z.object({
    card_id: cardId, order: intIn(1, 99), initials: z.preprocess(str, z.string({ error: "is required" }).max(3, "must be 3 characters or fewer")),
    name: text, note: text, backers: text, raised: text, source_url: url,
  }),
  quiz_questions: z.object({ id: text, order: intIn(1, 999), axis: oneOf(["edge", "stance"]), question: text }),
  quiz_option: z.object({ question_id: text, option: oneOf(["A", "B"]), text: text, stance: optIntIn(-1, 1) }),
  types: z.object({
    key: text, name: text, edge: oneOf(["technical", "market"]), stance: oneOf(["contrarian", "evidence-led"]),
    description: text, where_to_look: text, cofounder_key: text,
  }),
  skills: z.object({ label: text, hint: text, tag: text, side: oneOf(["technical", "market"]) }),
  capabilities: z.object({ name: text }),
  archetypes: z.object({
    name: text,
    colour: z.preprocess(str, z.string({ error: "is required" }).regex(/^#[0-9a-fA-F]{6}$/, "must be a hex colour like #C4451C")),
    stance_lean: intIn(-1, 1),
  }),
  rubric: z.object({ order: intIn(1, 99), dimension: text, card_column: text, description: text }),
};

const REQUIRED_TABS = ["arenas", "arena_macro", "cards", "math_lines", "sources", "builders", "quiz_questions",
  "quiz_options", "types", "skills", "capabilities", "archetypes", "rubric", "settings"];

const SCORE_COLUMNS = ["score_market_pull", "score_capital_momentum", "score_why_now", "score_ai_native_edge", "score_impact", "score_whitespace"] as const;

/** A row with only its first cell filled is a note written under the table, not data. */
function isNoteRow(row: RawRow, firstKey: string) {
  const cols = Object.keys(row).filter((k) => k !== "__row");
  if (cols.length < 2) return false; // single-column tabs (capabilities) have no notes
  return cols.every((k) => k === firstKey || blank(row[k]));
}

export const slugify = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const cardSlug = (id: string) => id.replace(".", "-");

export function buildContent(tabs: RawTabs): Content {
  const problems: string[] = [];
  const warnings: string[] = [];

  for (const t of REQUIRED_TABS) if (!Array.isArray(tabs[t])) problems.push(`Missing tab '${t}'`);
  if (problems.length) throw new ContentError(problems);

  function parse<T extends z.ZodTypeAny>(tab: string, schema: T, firstKey: string): (z.infer<T> & { __row: number })[] {
    const out: (z.infer<T> & { __row: number })[] = [];
    tabs[tab].forEach((raw, i) => {
      const rowNo = raw.__row ?? i + 2;
      if (isNoteRow(raw, firstKey)) return;
      const r = schema.safeParse(raw);
      if (!r.success) {
        for (const iss of r.error.issues) {
          const col = String(iss.path[0] ?? "");
          const shown = blank(raw[col]) ? "" : ` (got '${String(raw[col])}')`;
          problems.push(`${tab} row ${rowNo}: ${col} ${iss.message}${shown}`);
        }
      } else out.push(Object.assign({}, r.data as object, { __row: rowNo }) as z.infer<T> & { __row: number });
    });
    return out;
  }
  function unique<T>(tab: string, rows: (T & { __row: number })[], key: (r: T) => string, label: string) {
    const seen = new Map<string, number>();
    for (const r of rows) {
      const k = key(r);
      if (seen.has(k)) problems.push(`${tab} row ${r.__row}: duplicate ${label} '${k}' (also on row ${seen.get(k)})`);
      else seen.set(k, r.__row);
    }
  }

  /* reference tabs */
  const skillsRows = parse("skills", S.skills, "label");
  unique("skills", skillsRows, (r) => r.label, "label");
  const skills: Skill[] = skillsRows.map((r) => ({ label: r.label, hint: r.hint, tag: r.tag, side: r.side }));
  const skillSet = new Set(skills.map((s) => s.label));
  if (!skills.some((s) => s.side === "technical") || !skills.some((s) => s.side === "market"))
    problems.push("skills: need at least one technical and one market skill");

  const capRows = parse("capabilities", S.capabilities, "name");
  unique("capabilities", capRows, (r) => r.name, "name");
  const capabilities = capRows.map((r) => r.name);
  const capSet = new Set(capabilities);

  const archRows = parse("archetypes", S.archetypes, "name");
  unique("archetypes", archRows, (r) => r.name, "name");
  const archetypes: Archetype[] = archRows.map((r) => ({ name: r.name, colour: r.colour, lean: r.stance_lean }));
  const archSet = new Set(archetypes.map((a) => a.name));

  const rubricRows = parse("rubric", S.rubric, "order").sort((a, b) => a.order - b.order);
  const rubric: RubricItem[] = rubricRows.map((r) => ({ dimension: r.dimension, column: r.card_column, description: r.description }));
  if (rubric.length !== 6 || rubric.some((r, i) => r.column !== SCORE_COLUMNS[i]))
    problems.push(`rubric: must have 6 rows whose card_column values are, in order: ${SCORE_COLUMNS.join(", ")}`);

  /* settings (key/value; unknown keys such as 'weights total' are ignored) */
  const kv = new Map<string, unknown>();
  for (const r of tabs.settings) if (!blank(r.key)) kv.set(String(r.key).trim(), r.value);
  const num = (k: string, lo: number, hi: number) => {
    const v = Number(kv.get(k));
    if (!kv.has(k) || blank(kv.get(k))) { problems.push(`settings: '${k}' is missing`); return lo; }
    if (!Number.isInteger(v) || v < lo || v > hi) { problems.push(`settings: '${k}' must be a whole number ${lo} to ${hi} (got '${String(kv.get(k))}')`); return lo; }
    return v;
  };
  const settings: Settings = {
    quizVersion: num("quiz_version", 1, 100000),
    resultsShown: num("results_shown", 1, 10),
    weights: { edge: num("match_weight_edge", 0, 100), skills: num("match_weight_skills", 0, 100), stance: num("match_weight_stance", 0, 100) },
    dataScope: str(kv.get("data_scope")) ?? "US",
  };
  const wsum = settings.weights.edge + settings.weights.skills + settings.weights.stance;
  if (wsum !== 100) problems.push(`settings: match weights must sum to 100 (currently ${wsum})`);

  /* arenas */
  const arenaRows = parse("arenas", S.arenas, "id");
  unique("arenas", arenaRows, (r) => r.id, "id");
  unique("arenas", arenaRows, (r) => slugify(r.short_name), "short_name");
  const arenaIds = new Set(arenaRows.map((r) => r.id));
  const macroRows = parse("arena_macro", S.arena_macro, "arena_id");
  for (const m of macroRows) if (!arenaIds.has(m.arena_id)) problems.push(`arena_macro row ${m.__row}: arena_id '${m.arena_id}' is not on the arenas tab`);
  const arenas: Arena[] = arenaRows
    .map((r) => {
      if (r.status === "live" && !r.thesis) problems.push(`arenas row ${r.__row}: a live arena needs a thesis`);
      return {
        id: r.id, slug: slugify(r.short_name), shortName: r.short_name, name: r.name, line: r.line,
        live: r.status === "live", dealFlow: r.deal_flow_90d, dealFlowSourced: r.deal_flow_sourced, thesis: r.thesis,
        macro: macroRows.filter((m) => m.arena_id === r.id).sort((a, b) => a.order - b.order).map((m) => ({
          label: m.label, value: m.value, change: m.change, trend: m.trend, sourced: m.sourced,
          spark: m.sparkline.split(",").map((x) => Number(x.trim())),
        })),
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));

  /* cards and their child tabs */
  const cardRows = parse("cards", S.cards, "id");
  unique("cards", cardRows, (r) => r.id, "id");
  const cardIds = new Set(cardRows.map((r) => r.id));

  const mathRows = parse("math_lines", S.math_lines, "card_id");
  const srcRows = parse("sources", S.sources, "card_id");
  const bldRows = parse("builders", S.builders, "card_id");
  for (const [tab, rows] of [["math_lines", mathRows], ["sources", srcRows], ["builders", bldRows]] as const)
    for (const r of rows) if (!cardIds.has(r.card_id)) problems.push(`${tab} row ${r.__row}: card_id '${r.card_id}' is not on the cards tab`);
  unique("sources", srcRows, (r) => `${r.card_id} #${r.order}`, "card_id + order");

  const cards: Card[] = [];
  for (const r of cardRows) {
    const at = `cards row ${r.__row} (${r.id})`;
    if (!arenaIds.has(r.arena_id)) problems.push(`${at}: arena_id '${r.arena_id}' is not on the arenas tab`);
    if (r.id.slice(0, 2) !== r.arena_id) warnings.push(`${at}: id does not start with its arena_id '${r.arena_id}'`);
    if (!archSet.has(r.archetype)) problems.push(`${at}: archetype '${r.archetype}' is not on the archetypes tab`);
    const caps = [r.cap_1, r.cap_2, r.cap_3].filter((c): c is string => !!c);
    for (const c of caps) if (!capSet.has(c)) problems.push(`${at}: capability '${c}' is not on the capabilities tab`);
    const sk = [r.skill_1, r.skill_2, r.skill_3];
    for (const s of sk) if (!skillSet.has(s)) problems.push(`${at}: skill '${s}' is not on the skills tab`);
    if (new Set(sk).size !== 3) problems.push(`${at}: skill_1, skill_2 and skill_3 must all be different`);
    if (r.quote_text && !r.quote_attribution) problems.push(`${at}: quote_text needs a quote_attribution`);

    const sources: Source[] = srcRows.filter((s) => s.card_id === r.id).sort((a, b) => a.order - b.order)
      .map((s) => ({ order: s.order, tier: s.tier, text: s.text, url: s.url }));
    const srcOrders = new Set(sources.map((s) => s.order));
    const lines: MathLine[] = mathRows.filter((m) => m.card_id === r.id).sort((a, b) => a.order - b.order).map((m) => {
      const ref = m.source_ref === "EST" ? "EST" : Number(m.source_ref);
      if (ref !== "EST" && !srcOrders.has(ref)) problems.push(`math_lines row ${m.__row}: source_ref ${ref} has no matching row on 'sources' for card ${r.id}`);
      return { text: m.text, ref };
    });
    if (!lines.length) problems.push(`${at}: has no math_lines`);
    const builders: Builder[] = bldRows.filter((b) => b.card_id === r.id).sort((a, b) => a.order - b.order)
      .map((b) => ({ initials: b.initials, name: b.name, note: b.note, backers: b.backers, raised: b.raised, url: b.source_url }));

    const scores = SCORE_COLUMNS.map((c) => r[c] as number);
    if (r.status !== "published") continue;
    if (r.funded_teams !== null && !r.funded_teams_source) warnings.push(`${at}: funded_teams has no funded_teams_source`);
    cards.push({
      id: r.id, slug: cardSlug(r.id), arenaId: r.arena_id, archetype: r.archetype, question: r.question,
      whyNow: r.why_now, whyLong: r.why_long, whyYou: r.why_you, caps, skills: sk,
      math: { headline: r.math_headline, subhead: r.math_subhead, lines },
      figureLabel: r.figure_label, fundedTeams: r.funded_teams, fundedTeamsSource: r.funded_teams_source,
      hard: { t: r.tech_difficulty, m: r.market_difficulty, kind: r.hard_kind, buyer: r.buyer, techNeed: r.tech_need },
      scores, conviction: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      quote: r.quote_text ? { text: r.quote_text, attribution: r.quote_attribution ?? "", url: r.quote_source_url } : null,
      note: r.note, lastVerified: r.last_verified, sources, builders,
    });
  }
  cards.sort((a, b) => a.arenaId.localeCompare(b.arenaId) || b.conviction - a.conviction || a.id.localeCompare(b.id));
  for (const a of arenas) {
    const n = cards.filter((c) => c.arenaId === a.id).length;
    if (!a.live && n) warnings.push(`arena ${a.id} is 'soon' but has ${n} published card(s); they are hidden until it is live`);
  }

  /* quiz */
  const qRows = parse("quiz_questions", S.quiz_questions, "id").sort((a, b) => a.order - b.order);
  unique("quiz_questions", qRows, (r) => r.id, "id");
  const optRaw = tabs.quiz_options.filter((r) => !isNoteRow(r, "question_id"));
  const quiz: QuizQuestion[] = [];
  for (const q of qRows) {
    const opts: QuizOption[] = [];
    for (const letter of ["A", "B"] as const) {
      const matches = optRaw.filter((o) => str(o.question_id) === q.id && str(o.option) === letter);
      if (matches.length !== 1) { problems.push(`quiz_options: question ${q.id} needs exactly one option ${letter} (found ${matches.length})`); continue; }
      const raw = matches[0];
      const where = `quiz_options row ${raw.__row} (${q.id}${letter})`;
      const base = S.quiz_option.safeParse(raw);
      if (!base.success) { for (const iss of base.error.issues) problems.push(`${where}: ${String(iss.path[0])} ${iss.message}`); continue; }
      const points: Record<string, number> = {};
      for (const s of skills) {
        const v = raw[s.label];
        if (blank(v)) continue;
        const n = Number(v);
        if (!Number.isInteger(n) || n < 0 || n > 5) problems.push(`${where}: '${s.label}' must be a whole number 0 to 5`);
        else if (n) points[s.label] = n;
      }
      const hasPts = Object.keys(points).length > 0;
      if (q.axis === "edge" && (!hasPts || base.data.stance !== null)) problems.push(`${where}: edge questions need skill points and an empty stance`);
      if (q.axis === "stance" && (hasPts || (base.data.stance !== 1 && base.data.stance !== -1))) problems.push(`${where}: stance questions need stance +1 or -1 and no skill points`);
      opts.push({ text: base.data.text, points, stance: base.data.stance });
    }
    if (opts.length === 2) {
      if (q.axis === "edge") {
        const tot = opts.map((o) => Object.values(o.points).reduce((a, b) => a + b, 0));
        if (tot[0] !== tot[1]) warnings.push(`quiz ${q.id}: options award ${tot[0]} vs ${tot[1]} points; unequal totals bias the edge score`);
      }
      quiz.push({ id: q.id, axis: q.axis, question: q.question, options: [opts[0], opts[1]] });
    }
  }
  if (!quiz.some((q) => q.axis === "edge") || !quiz.some((q) => q.axis === "stance")) problems.push("quiz: needs at least one edge and one stance question");

  /* builder types */
  const typeRows = parse("types", S.types, "key");
  unique("types", typeRows, (r) => r.key, "key");
  unique("types", typeRows, (r) => `${r.edge}/${r.stance}`, "edge + stance combination");
  const types: BuilderType[] = typeRows.map((r) => ({
    key: r.key, name: r.name, edge: r.edge, stance: r.stance, description: r.description, whereToLook: r.where_to_look, cofounderKey: r.cofounder_key,
  }));
  const typeKeys = new Set(types.map((t) => t.key));
  for (const r of typeRows) if (!typeKeys.has(r.cofounder_key)) problems.push(`types row ${r.__row}: cofounder_key '${r.cofounder_key}' is not a type key`);
  if (types.length !== 4) problems.push("types: need exactly 4 types, one per edge/stance combination");

  if (problems.length) throw new ContentError(problems);
  return { arenas, cards, skills, capabilities, archetypes, rubric, quiz, types, settings, warnings };
}
