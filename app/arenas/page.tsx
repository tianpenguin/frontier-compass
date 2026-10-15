import Link from "next/link";
import type { Metadata } from "next";
import { TopBar } from "@/components/TopBar";
import { getContent, cardsIn, liveArenas } from "@/lib/content";

export const metadata: Metadata = { title: "The arenas" };

export default function MapPage() {
  const c = getContent();
  const nLive = liveArenas(c).length;
  return (
    <>
      <TopBar crumbs={[{ label: "Map" }]} scope={c.settings.dataScope} />
      <main id="main">
        <div className="page-head">
          <h1 className="h-page">The {c.arenas.length} arenas</h1>
          <p className="lede">
            {c.arenas.length} arenas across the AI landscape. {nLive} {nLive === 1 ? "is" : "are"} populated with problem cards; the rest are coming soon.
            Figures are illustrative and {c.settings.dataScope}-only for now.
          </p>
        </div>
        <ul className="arena-grid" role="list">
          {c.arenas.map((a) => {
            const n = cardsIn(c, a.id).length;
            return (
              <li key={a.id}>
                <Link href={`/arenas/${a.slug}`} className={`tile arena-tile${a.live ? "" : " is-soon"}`}>
                  <div className="tile-top">
                    <span className="num">{a.id}</span>
                    {a.live ? <span className="arw" aria-hidden>↗</span> : <span className="soon-tag">SOON</span>}
                  </div>
                  <div>
                    <h2 className="arena-name">{a.name}</h2>
                    <p className="arena-line">{a.line}</p>
                  </div>
                  <div className="tile-foot">
                    <span>
                      <span className="red">{a.dealFlow}</span> DEAL FLOW{a.dealFlowSourced ? "" : <span className="unsourced"> · UNSOURCED</span>}
                    </span>
                    <span>{a.live ? `${n} PROBLEM CARD${n === 1 ? "" : "S"}` : "COMING SOON"}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </main>
    </>
  );
}
