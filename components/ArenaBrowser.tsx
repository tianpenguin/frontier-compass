"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Archetype } from "@/lib/content/types";
import { ArchTag, MiniRadar } from "./Marks";

export interface TileCard {
  id: string; slug: string; archetype: string; archColour: string; question: string; whyNow: string;
  caps: string[]; figure: string; fundedTeams: number | null; stamp: string | null; conviction: number; scores: number[];
}

export function ArenaBrowser({ cards, capabilities, archetypes }: { cards: TileCard[]; capabilities: string[]; archetypes: Archetype[] }) {
  const sp = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const cap = sp.get("cap") ?? "all";
  const arch = sp.get("arch") ?? "all";

  const set = (k: "cap" | "arch", v: string) => {
    const q = new URLSearchParams(sp.toString());
    if (v === "all") q.delete(k); else q.set(k, v);
    const s = q.toString();
    router.replace(s ? `${path}?${s}` : path, { scroll: false });
  };

  const shown = cards.filter((c) => (cap === "all" || c.caps.includes(cap)) && (arch === "all" || c.archetype === arch));
  const capOpts = [{ key: "all", label: "all capabilities", n: cards.length }, ...capabilities.map((k) => ({ key: k, label: k, n: cards.filter((c) => c.caps.includes(k)).length }))];
  const archOpts = [{ key: "all", label: "all archetypes", colour: "rgba(26,26,26,.3)", n: cards.length }, ...archetypes.map((a) => ({ key: a.name, label: a.name, colour: a.colour, n: cards.filter((c) => c.archetype === a.name).length }))];

  return (
    <div className="arena-body">
      <aside className="filters" aria-label="Filters">
        <div className="filter-group">
          <h2 className="eyebrow">FILTER · CAPABILITY</h2>
          <div className="filter-list" role="group" aria-label="Capability">
            {capOpts.map((o) => (
              <button key={o.key} type="button" className={`frow${cap === o.key ? " on" : ""}`} aria-pressed={cap === o.key} onClick={() => set("cap", o.key)}>
                <span>{o.label}</span><span className="frow-n">{o.n}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="filter-group">
          <h2 className="eyebrow">FILTER · PROVOCATION</h2>
          <div className="filter-list arch" role="group" aria-label="Archetype">
            {archOpts.map((o) => (
              <button key={o.key} type="button" className={`arow${arch === o.key ? " on" : ""}`} aria-pressed={arch === o.key} onClick={() => set("arch", o.key)}>
                <span className="arow-l"><span className="swatch" style={{ background: o.colour }} />{o.label}</span><span className="frow-n">{o.n}</span>
              </button>
            ))}
          </div>
        </div>
        <p className="filters-note">Every card carries its own sources. Nothing here is a recommendation of what to build.</p>
      </aside>
      <section className="cards-col" aria-label="Problem cards">
        <div className="cards-meta">
          <span aria-live="polite">{shown.length} PROBLEM CARD{shown.length === 1 ? "" : "S"}</span>
          <span className="muted">SORTED BY CONVICTION · MEAN OF 6 DRAFT SCORES</span>
        </div>
        {shown.length ? (
          <ul className="card-grid" role="list">
            {shown.map((c) => (
              <li key={c.id}>
                <Link href={`/cards/${c.slug}`} className="pcard">
                  <div className="tile-top"><ArchTag name={c.archetype} colour={c.archColour} /><span className="num">{c.id}</span></div>
                  <h3 className="pcard-q">{c.question}</h3>
                  <p className="pcard-why"><span className="eyebrow inline">WHY NOW · </span>{c.whyNow}</p>
                  <div className="caps">{c.caps.map((t) => <span key={t} className="cap">{t}</span>)}</div>
                  <div className="pcard-stats">
                    <div className="pcard-figs">
                      <span className="ink">{c.figure}</span>
                      {c.fundedTeams !== null && <span>{c.fundedTeams} funded teams</span>}
                      {c.stamp && <span className="muted">UPDATED {c.stamp}</span>}
                    </div>
                    <div className="pcard-conv" title="Conviction: mean of 6 draft scores">
                      <span>{c.conviction}</span>
                      <MiniRadar values={c.scores} label={`Conviction ${c.conviction} of 100`} />
                    </div>
                  </div>
                  <div className="pcard-open"><span>OPEN DOSSIER</span><span className="arw" aria-hidden>→</span></div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty">No cards match. <button type="button" className="lnk-btn" onClick={() => router.replace(path, { scroll: false })}>Clear filters</button></div>
        )}
      </section>
    </div>
  );
}
