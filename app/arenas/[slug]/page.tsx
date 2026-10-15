import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { TopBar } from "@/components/TopBar";
import { Spark } from "@/components/Marks";
import { ArenaBrowser, ArenaView, type TileCard } from "@/components/ArenaBrowser";
import { getContent, cardsIn, liveArenas } from "@/lib/content";
import { stampDate } from "@/lib/util";

export const dynamicParams = false;

export function generateStaticParams() {
  return getContent().arenas.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const a = getContent().arenas.find((x) => x.slug === slug);
  return { title: a?.name ?? "Arena" };
}

export default async function ArenaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = getContent();
  const a = c.arenas.find((x) => x.slug === slug);
  if (!a) notFound();
  const crumbs = [{ label: "Map", href: "/arenas" }, { label: a.name }];

  if (!a.live) {
    const live = liveArenas(c);
    return (
      <>
        <TopBar crumbs={crumbs} scope={c.settings.dataScope} />
        <main id="main" className="soon">
          <div className="soon-num" aria-hidden>{a.id}</div>
          <h1 className="h-page">{a.name}<span className="red">.</span></h1>
          <p className="lede center">Coming soon. We’re populating this arena with problem cards. In the meantime, explore the {live.length === 1 ? "one" : live.length} that {live.length === 1 ? "is" : "are"} live.</p>
          <div className="soon-ctas">
            {live.map((x, i) => (
              <Link key={x.id} href={`/arenas/${x.slug}`} className={`btn ${i === 0 ? "btn-dark" : "btn-ghost"}`}>{x.name.toUpperCase()} →</Link>
            ))}
          </div>
          <Link href="/arenas" className="lnk small-link">‹ BACK TO MAP</Link>
        </main>
      </>
    );
  }

  const arch = Object.fromEntries(c.archetypes.map((x) => [x.name, x.colour]));
  const cards: TileCard[] = cardsIn(c, a.id).map((x) => ({
    id: x.id, slug: x.slug, archetype: x.archetype, archColour: arch[x.archetype], question: x.question, whyNow: x.whyNow,
    caps: x.caps, figure: `${x.math.headline} ${x.figureLabel}`, fundedTeams: x.fundedTeams,
    stamp: stampDate(x.lastVerified), conviction: x.conviction, scores: x.scores,
  }));
  const anyUnsourced = a.macro.some((m) => !m.sourced);

  return (
    <>
      <TopBar crumbs={crumbs} scope={c.settings.dataScope} />
      <nav className="switcher" aria-label="Jump to arena">
        <span className="eyebrow">JUMP TO ARENA</span>
        <ul role="list">
          {c.arenas.map((x) => (
            <li key={x.id}>
              <Link href={`/arenas/${x.slug}`} className={`chip${x.id === a.id ? " on" : ""}${x.live ? "" : " dim"}`} aria-current={x.id === a.id ? "page" : undefined}>
                {x.id} {x.shortName}{x.live ? "" : " ·"}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <main id="main">
        <section className="arena-head">
          <div className="arena-head-text">
            <div className="big-num" aria-hidden>{a.id}</div>
            <h1 className="h-arena">{a.name}</h1>
            {a.thesis && <p className="thesis">{a.thesis}</p>}
          </div>
          {a.macro.length > 0 && (
            <div className="arena-head-macro">
              <dl className="macro-grid">
                {a.macro.map((m) => {
                  const col = m.trend === "up" ? "#5E6E4D" : "#A0532F";
                  return (
                    <div key={m.label} className="macro">
                      <dt>{m.label}</dt>
                      <dd className="macro-val">{m.value}</dd>
                      <dd className="macro-foot"><span style={{ color: col }}>{m.change}</span><Spark values={m.spark} colour={col} /></dd>
                    </div>
                  );
                })}
              </dl>
              {anyUnsourced && <p className="fineprint">ARENA MACRO FIGURES ARE PLACEHOLDERS · NOT YET SOURCED</p>}
            </div>
          )}
        </section>
        <Suspense fallback={<ArenaView cards={cards} capabilities={c.capabilities} archetypes={c.archetypes} />}>
          <ArenaBrowser cards={cards} capabilities={c.capabilities} archetypes={c.archetypes} />
        </Suspense>
      </main>
    </>
  );
}
