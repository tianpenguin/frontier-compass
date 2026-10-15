"use client";
import Link from "next/link";
import { useShortlist } from "@/lib/shortlist";
import { pad2 } from "@/lib/util";
import { ArchTag } from "./Marks";

export interface ShortCard { id: string; slug: string; question: string; archetype: string; archColour: string; arenaName: string }

export function ShortlistView({ cards }: { cards: ShortCard[] }) {
  const { ids, remove } = useShortlist();
  const items = ids.map((id) => cards.find((c) => c.id === id)).filter((c): c is ShortCard => !!c);
  return (
    <>
      <div className="page-head">
        <h1 className="h-page">Your shortlist<span className="red">.</span></h1>
        <p className="sub-mono">{items.length ? `${items.length} problem card${items.length > 1 ? "s" : ""} saved in this browser` : "Problem cards you save appear here"}</p>
      </div>
      {items.length ? (
        <ol className="short-list">
          {items.map((c, i) => (
            <li key={c.id} className="short-item">
              <span className="short-n" aria-hidden>{pad2(i + 1)}</span>
              <div className="short-body">
                <div className="short-meta"><ArchTag name={c.archetype} colour={c.archColour} /><span>{c.arenaName} · CARD {c.id}</span></div>
                <Link href={`/cards/${c.slug}`} className="short-q">{c.question}</Link>
              </div>
              <div className="short-actions">
                <Link href={`/cards/${c.slug}`} className="btn btn-ghost btn-sm">OPEN →</Link>
                <button type="button" className="lnk-btn" onClick={() => remove(c.id)} aria-label={`Remove card ${c.id} from shortlist`}>REMOVE</button>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className="empty-big">
          <p className="empty-title">Nothing saved yet.</p>
          <p className="lede center">Open a problem card and hit <b>Save to my shortlist</b> to collect the ones worth coming back to.</p>
          <Link href="/arenas" className="btn btn-dark">BROWSE THE MAP →</Link>
        </div>
      )}
    </>
  );
}
