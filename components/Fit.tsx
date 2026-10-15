"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { BuilderType, QuizQuestion, Settings, Skill } from "@/lib/content/types";
import { besideYou, KIND_LABEL, matchCard, profileOf, type FitCard, type Profile } from "@/lib/match";
import { pad2 } from "@/lib/util";
import { ArchTag } from "./Marks";

export interface FitData {
  quiz: QuizQuestion[];
  skills: Skill[];
  types: BuilderType[];
  settings: Settings;
  cards: FitCard[];
  archetypes: { name: string; colour: string; lean: number }[];
}

type Phase = "intro" | "q" | "result";
interface Saved { v: number; phase: Phase; ans: number[] }
const KEY = "fc_quiz";

/* ---------------- compass field ---------------- */
const FW = 360, FC = 180, FR = 146;
const fx = (e: number) => FC + e * FR;
const fy = (s: number) => FC - s * FR;

function Field({ P, trail, from, done, types, ghost }: {
  P: Profile | null; trail: Profile[]; from: { edge: number; stance: number }; done?: boolean; types: BuilderType[]; ghost: { x: number; y: number } | null;
}) {
  const target = P ? { x: fx(P.edge), y: fy(P.stance) } : null;
  const [pos, setPos] = useState({ x: fx(from.edge), y: fy(from.stance) });
  useEffect(() => {
    if (!target) return;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setPos(target)));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.x, target?.y]);

  const quadLabel = (t: BuilderType) => {
    const x = t.edge === "technical" ? FC + FR * 0.55 : FC - FR * 0.55;
    const y = t.stance === "contrarian" ? FC - FR * 0.55 : FC + FR * 0.6;
    const on = done && P?.type.key === t.key;
    return <text key={t.key} x={x} y={y} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10" letterSpacing="1.2" fill={on ? "#C4451C" : "rgba(26,26,26,.4)"}>{t.name.toUpperCase()}</text>;
  };
  const ticks = Array.from({ length: 48 }, (_, i) => {
    const a = (i * 7.5 * Math.PI) / 180, maj = i % 6 === 0, r1 = FR + 6, r2 = FR + (maj ? 16 : 10);
    return <line key={i} x1={(FC + r1 * Math.cos(a)).toFixed(1)} y1={(FC + r1 * Math.sin(a)).toFixed(1)} x2={(FC + r2 * Math.cos(a)).toFixed(1)} y2={(FC + r2 * Math.sin(a)).toFixed(1)} stroke={`rgba(26,26,26,${maj ? 0.25 : 0.12})`} />;
  });
  const axisLabel = (x: number, y: number, t: string, anchor: "start" | "middle" | "end") =>
    <text x={x} y={y} textAnchor={anchor} fontFamily="var(--font-mono)" fontSize="10" letterSpacing="1.4" fill="#1A1A1A">{t}</text>;

  return (
    <svg className="field" viewBox={`-40 -30 ${FW + 80} ${FW + 60}`} fill="none" role="img"
      aria-label={P ? `Your position: ${P.type.name}. Edge ${P.edge.toFixed(2)}, stance ${P.stance.toFixed(2)}.` : "Compass field, no answers yet."}>
      {[1, 0.66, 0.33].map((f) => <circle key={f} cx={FC} cy={FC} r={FR * f} fill="none" stroke="rgba(26,26,26,.09)" />)}
      {ticks}
      <line x1={FC - FR} y1={FC} x2={FC + FR} y2={FC} stroke="rgba(26,26,26,.22)" />
      <line x1={FC} y1={FC - FR} x2={FC} y2={FC + FR} stroke="rgba(26,26,26,.22)" />
      {axisLabel(FC + FR + 22, FC + 4, "TECHNICAL", "start")}
      {axisLabel(FC - FR - 22, FC + 4, "MARKET", "end")}
      {axisLabel(FC, FC - FR - 24, "CONTRARIAN", "middle")}
      {axisLabel(FC, FC + FR + 32, "EVIDENCE-LED", "middle")}
      {types.map(quadLabel)}
      {trail.length > 1 && (
        <>
          <polyline points={trail.map((p) => `${fx(p.edge).toFixed(1)},${fy(p.stance).toFixed(1)}`).join(" ")} fill="none" stroke="rgba(196,69,28,.35)" strokeWidth="1.25" strokeDasharray="3 3" />
          {trail.slice(0, -1).map((p, i) => <circle key={i} cx={fx(p.edge).toFixed(1)} cy={fy(p.stance).toFixed(1)} r="2.2" fill="rgba(196,69,28,.45)" />)}
        </>
      )}
      <g className="field-ghost" style={{ opacity: ghost ? 1 : 0, transform: ghost ? `translate(${ghost.x}px,${ghost.y}px)` : undefined }}>
        <circle r="7" fill="none" stroke="#C4451C" strokeWidth="1.5" strokeDasharray="2 2" />
      </g>
      {P && (
        <g className="field-dot" style={{ transform: `translate(${pos.x}px,${pos.y}px)` }}>
          <circle r="16" fill="rgba(196,69,28,.14)" /><circle r="7" fill="#C4451C" stroke="#F5F3EF" strokeWidth="2" />
        </g>
      )}
    </svg>
  );
}

function SkillBars({ P, skills }: { P: Profile | null; skills: Skill[] }) {
  return (
    <div className="skillbars">
      {skills.map((s) => {
        const v = P ? P.norm(s.label) : 0;
        return (
          <div key={s.label} className="skillbar">
            <span>{s.label}</span>
            <span className="track"><span className={`fill ${s.side}`} style={{ width: `${Math.round(v * 100)}%` }} /></span>
            <span className="val">{P ? P.sk[s.label] : 0}</span>
          </div>
        );
      })}
      <div className="skill-legend"><span><i className="sw technical" />TECHNICAL SIDE</span><span><i className="sw market" />MARKET SIDE</span></div>
    </div>
  );
}

function Readout({ P }: { P: Profile }) {
  const tp = P.T + P.M ? Math.round((P.T / (P.T + P.M)) * 100) : 50;
  return (
    <dl className="readout">
      <div><dt>EDGE</dt><dd>{tp === 50 ? "balanced · 50 / 50" : tp > 50 ? `${tp}% technical` : `${100 - tp}% market`}</dd></div>
      <div><dt>STANCE</dt><dd>{P.ns ? `${P.stance >= 0 ? "contrarian" : "evidence-led"} · ${Math.max(P.st + P.ns, P.ns - P.st) / 2}/${P.ns}` : "not yet read"}</dd></div>
    </dl>
  );
}

/* ---------------- main ---------------- */
export function Fit({ data }: { data: FitData }) {
  const { quiz, skills, types, settings, cards, archetypes } = data;
  const [state, setState] = useState<Saved | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  // load saved progress; discard it if the quiz has changed since
  useEffect(() => {
    let s: Saved = { v: settings.quizVersion, phase: "intro", ans: [] };
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
      if (raw && raw.v === settings.quizVersion && Array.isArray(raw.ans) && raw.ans.length <= quiz.length && raw.ans.every((x: unknown) => x === 0 || x === 1)) {
        const phase: Phase = raw.ans.length === quiz.length ? "result" : raw.phase === "q" || raw.ans.length ? "q" : "intro";
        s = { v: settings.quizVersion, phase, ans: raw.ans };
      }
    } catch { /* ignore */ }
    setState(s);
  }, [settings.quizVersion, quiz.length]);

  const update = useCallback((s: Saved) => {
    setState(s);
    setHover(null);
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage blocked */ }
  }, []);

  const act = useCallback((a: "start" | "ans" | "back" | "retake" | "reset", arg?: number) => {
    if (!state) return;
    const v = settings.quizVersion;
    if (a === "start" || a === "retake") update({ v, phase: "q", ans: [] });
    else if (a === "reset") update({ v, phase: "intro", ans: [] });
    else if (a === "back") update({ v, phase: "q", ans: state.ans.slice(0, -1) });
    else if (a === "ans" && state.ans.length < quiz.length) {
      const ans = [...state.ans, arg!];
      update({ v, phase: ans.length === quiz.length ? "result" : "q", ans });
    }
    window.scrollTo({ top: 0 });
  }, [state, settings.quizVersion, quiz.length, update]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!state || e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (state.phase === "intro" && e.key === "Enter" && tag !== "A" && tag !== "BUTTON") act("start");
      else if (state.phase === "q") {
        const k = e.key.toLowerCase();
        if (k === "1" || k === "a") act("ans", 0);
        else if (k === "2" || k === "b") act("ans", 1);
        else if ((e.key === "Backspace" || e.key === "ArrowLeft") && state.ans.length) act("back");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, act]);

  const prof = useCallback((ans: number[]) => profileOf(ans, quiz, skills, types), [quiz, skills, types]);
  const leanOf = useMemo(() => Object.fromEntries(archetypes.map((a) => [a.name, a.lean])), [archetypes]);
  const colourOf = useMemo(() => Object.fromEntries(archetypes.map((a) => [a.name, a.colour])), [archetypes]);

  if (!state) return <div className="fit-loading" aria-busy="true" />;

  /* ---------- intro ---------- */
  if (state.phase === "intro") {
    // same layout as the field: market on the left, contrarian on top
    const order = ["market/contrarian", "technical/contrarian", "market/evidence-led", "technical/evidence-led"];
    const sorted = [...types].sort((a, b) => order.indexOf(`${a.edge}/${a.stance}`) - order.indexOf(`${b.edge}/${b.stance}`));
    return (
      <div className="split">
        <div className="split-main fit-intro">
          <p className="eyebrow red">BUILDER PROFILE · {quiz.length} QUESTIONS · ~2 MINUTES</p>
          <h1 className="h-fit">Find your fit<span className="red">.</span></h1>
          <p className="lede">Every problem has a hard part. Sometimes it is technical. More often now it is the market: getting in the door, or reaching buyers at all. {quiz.length} choices place you on the compass, then we point you to the problems where your edge is the bottleneck.</p>
          <ol className="intro-steps">
            <li><span>01</span>Every question has two good answers. Pick the truer one, not the better-sounding one.</li>
            <li><span>02</span>Watch your position move as you answer. Hover an option to preview where it takes you.</li>
            <li><span>03</span>You get a profile, {settings.resultsShown} problems to look at, and who you would need beside you.</li>
          </ol>
          <div className="intro-cta">
            <button type="button" className="btn btn-dark btn-lg" onClick={() => act("start")}>START →</button>
            <span className="muted small">or press Enter</span>
          </div>
        </div>
        <div className="split-rail">
          <Field P={null} trail={[]} from={{ edge: 0, stance: 0 }} types={types} ghost={null} />
          <div className="type-grid">
            {sorted.map((t) => (
              <div key={t.key} className="type-chip"><div className="type-name">{t.name}</div><div className="type-sub">{t.edge} edge · {t.stance}</div></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const trail: Profile[] = [];
  for (let k = 1; k <= state.ans.length; k++) trail.push(prof(state.ans.slice(0, k)));
  const P = state.ans.length ? trail[trail.length - 1] : null;

  /* ---------- question ---------- */
  if (state.phase === "q") {
    const i = state.ans.length, item = quiz[i];
    const prev = state.ans.length > 1 ? trail[trail.length - 2] : { edge: 0, stance: 0 };
    const ghostP = hover !== null ? prof([...state.ans, hover]) : null;
    return (
      <div className="split">
        <div className="split-main fit-q">
          <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={quiz.length} aria-valuenow={i} aria-label="Quiz progress">
            {quiz.map((_, k) => <span key={k} className={k < i ? "done" : k === i ? "now" : ""} />)}
          </div>
          <div className="q-meta">
            <span>Q {pad2(i + 1)} / {quiz.length}</span>
            <span>READS YOUR {item.axis === "edge" ? "EDGE · TECHNICAL ↔ MARKET" : "STANCE · CONTRARIAN ↔ EVIDENCE"}</span>
          </div>
          <div className="qslide" key={i}>
            <h1 className="h-q">{item.question}</h1>
            <div className="q-opts">
              {item.options.map((o, k) => (
                <button key={k} type="button" className="qopt" onClick={() => act("ans", k)}
                  onMouseEnter={() => setHover(k)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(k)} onBlur={() => setHover(null)}>
                  <span className="qopt-top"><span className="qkey">{k ? "B" : "A"}</span><span className="qhint">PRESS {k ? "2" : "1"}</span></span>
                  <span className="qopt-text">{o.text}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="q-foot">
            {i ? <button type="button" className="lnk-btn" onClick={() => act("back")}>‹ BACK</button> : <button type="button" className="lnk-btn" onClick={() => act("reset")}>‹ INTRO</button>}
            <span>NO RIGHT ANSWERS · PICK THE TRUER ONE</span>
          </div>
        </div>
        <div className="split-rail">
          <div className="rail-head"><span className="eyebrow">YOUR POSITION</span><span className="eyebrow">{P ? `${P.type.name.toUpperCase()} · SO FAR` : "WAITING FOR FIRST ANSWER"}</span></div>
          <Field P={P} trail={trail} from={prev} types={types} ghost={ghostP ? { x: fx(ghostP.edge), y: fy(ghostP.stance) } : null} />
          {P && <Readout P={P} />}
          <h2 className="eyebrow rail-title">SKILL SIGNAL</h2>
          <SkillBars P={P} skills={skills} />
        </div>
      </div>
    );
  }

  /* ---------- result ---------- */
  const R = P!;
  const T = R.type;
  const C = types.find((t) => t.key === T.cofounderKey)!;
  const ms = cards.map((c) => matchCard(c, R, leanOf[c.archetype] ?? 0, settings.weights)).sort((a, b) => b.total - a.total || a.c.id.localeCompare(b.c.id));
  const top = ms.slice(0, settings.resultsShown);
  const w = settings.weights;
  const fmt = (n: number) => (n >= 0 ? "+" : "") + n.toFixed(2);
  const bar = (v: number, max: number, label: string) => (
    <div className="mbar"><span>{label}</span><span className="track"><span className="fill technical" style={{ width: `${max ? Math.round((v / max) * 100) : 0}%` }} /></span><span>{Math.round(v)}/{max}</span></div>
  );

  return (
    <div className="split">
      <div className="split-main fit-result">
        <p className="eyebrow red rin">YOUR BUILDER PROFILE</p>
        <h1 className="h-type rin" style={{ animationDelay: ".08s" }}>{T.name}<span className="red">.</span></h1>
        <p className="lede rin" style={{ animationDelay: ".16s" }}>{T.description}</p>
        <div className="type-cards rin" style={{ animationDelay: ".2s" }}>
          <div className="info-tile"><h2 className="eyebrow">WHERE TO LOOK</h2><p>{T.whereToLook}</p></div>
          <div className="info-tile"><h2 className="eyebrow">YOUR NATURAL CO-FOUNDER</h2><p><b>{C.name}</b>: {C.edge} edge, {C.stance}. Covers the side you do not.</p></div>
        </div>

        <div className="section-rule"><h2 className="eyebrow ink">YOUR {top.length} PLACES TO LOOK</h2><span className="muted small">RANKED FROM {cards.length} PROBLEM CARDS</span></div>
        <ol className="matches">
          {top.map((m, i) => {
            const c = m.c, h = c.hard;
            return (
              <li key={c.id} className="match rin" style={{ animationDelay: `${0.25 + i * 0.12}s` }}>
                <div className="match-score"><div className="match-n">{pad2(i + 1)}</div><div className="match-total">{m.total}</div><div className="match-lbl">MATCH</div></div>
                <div className="match-body">
                  <div className="match-meta"><ArchTag name={c.archetype} colour={colourOf[c.archetype]} /><span>{c.arenaName} · {c.id}</span></div>
                  <Link href={`/cards/${c.slug}`} className="match-q">{c.question}</Link>
                  <div className="match-hard">HARD PART · {h.t >= h.m ? "TECHNICAL" : `MARKET (${KIND_LABEL[h.kind]})`}</div>
                  <p className="match-beside"><span className="eyebrow red inline">BESIDE YOU · </span>{besideYou(c, R)}</p>
                  <p className="match-why"><span className="eyebrow inline">YOUR EDGE HERE · </span>{c.whyYou}</p>
                </div>
                <div className="match-bars">{bar(m.ef, w.edge, "EDGE")}{bar(m.sf, w.skills, "SKILLS")}{bar(m.tf, w.stance, "STANCE")}<Link href={`/cards/${c.slug}`} className="match-open">OPEN →</Link></div>
              </li>
            );
          })}
        </ol>

        <details className="logic">
          <summary>SHOW THE LOGIC · HOW YOUR ANSWERS BECAME THESE MATCHES</summary>
          <div className="logic-grid">
            <div>
              <h3 className="eyebrow">1 · YOUR ANSWERS → POINTS</h3>
              <table className="logic-table">
                <tbody>
                  {state.ans.map((ai, qi) => {
                    const o = quiz[qi].options[ai];
                    const eff = o.stance === null ? Object.entries(o.points).map(([k, v]) => `+${v} ${k}`).join(", ") : o.stance > 0 ? "+1 contrarian" : "+1 evidence-led";
                    return <tr key={qi}><td className="muted">{pad2(qi + 1)}</td><td>{o.text}</td><td className="ink">{eff}</td></tr>;
                  })}
                </tbody>
              </table>
            </div>
            <div className="logic-steps">
              <div><h3 className="eyebrow">2 · POINTS → POSITION</h3>
                TECH = {skills.filter((s) => s.side === "technical").map((s) => s.label).join(" + ")} = <b>{R.T}</b><br />
                MARKET = {skills.filter((s) => s.side === "market").map((s) => s.label).join(" + ")} = <b>{R.M}</b><br />
                EDGE = (TECH − MARKET) / (TECH + MARKET) = <b>{fmt(R.edge)}</b><br />
                STANCE = {R.st} / {R.ns} stance answers = <b>{fmt(R.stance)}</b></div>
              <div><h3 className="eyebrow">3 · POSITION → TYPE</h3>
                EDGE {R.edge > 0 ? "> 0 → technical" : R.edge < 0 ? "< 0 → market" : "= 0 → tie, goes to technical"}, STANCE {R.stance >= 0 ? "≥ 0 → contrarian" : "< 0 → evidence-led"} → <b>{T.name}</b></div>
              <div><h3 className="eyebrow">4 · TYPE → MATCHES (ALL {cards.length} CARDS)</h3>
                Card bottleneck = (tech difficulty − market difficulty) / 50.<br />
                MATCH = {w.edge} × edge fit + {w.skills} × skill fit + {w.stance} × stance fit.
                <table className="logic-table">
                  <tbody>{ms.map((m) => <tr key={m.c.id}><td>{m.c.id}</td><td className="muted">btl {fmt(m.b)}</td><td>{Math.round(m.ef)}+{Math.round(m.sf)}+{Math.round(m.tf)}</td><td className="ink right"><b>{m.total}</b></td></tr>)}</tbody>
                </table>
              </div>
            </div>
          </div>
        </details>

        <div className="result-ctas">
          <button type="button" className="btn btn-ghost" onClick={() => act("retake")}>↺ RETAKE</button>
          <Link href="/arenas" className="btn btn-dark">BROWSE ALL ARENAS →</Link>
        </div>
        <p className="muted small">The guide surfaces where to look, never what to build.</p>
      </div>
      <div className="split-rail">
        <h2 className="eyebrow rail-title">WHERE YOU LANDED · YOUR PATH IN DOTS</h2>
        <Field P={R} trail={trail} from={{ edge: 0, stance: 0 }} done types={types} ghost={null} />
        <Readout P={R} />
        <h2 className="eyebrow rail-title">SKILL SIGNAL</h2>
        <SkillBars P={R} skills={skills} />
      </div>
    </div>
  );
}
