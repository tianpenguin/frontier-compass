import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { TopBar } from "@/components/TopBar";
import { ArchTag, HeroRadar } from "@/components/Marks";
import { SaveButton } from "@/components/SaveButton";
import { getContent, arenaOf, cardsIn, publicCards } from "@/lib/content";
import { safeUrl, stampDate } from "@/lib/util";

export const dynamicParams = false;

export function generateStaticParams() {
  return publicCards(getContent()).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = getContent().cards.find((x) => x.slug === slug);
  return { title: c ? `${c.id} · ${c.question}` : "Card" };
}

export default async function CardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = getContent();
  const card = publicCards(c).find((x) => x.slug === slug);
  if (!card) notFound();
  const a = arenaOf(c, card.arenaId);
  const siblings = cardsIn(c, a.id);
  const pos = siblings.findIndex((x) => x.id === card.id);
  const next = siblings[(pos + 1) % siblings.length];
  const colour = c.archetypes.find((x) => x.name === card.archetype)!.colour;
  const estCount = card.math.lines.filter((l) => l.ref === "EST").length;
  const quoteUrl = card.quote ? safeUrl(card.quote.url) : null;

  return (
    <>
      <TopBar crumbs={[{ label: "Map", href: "/arenas" }, { label: a.name, href: `/arenas/${a.slug}` }, { label: `Card ${card.id}` }]} scope={c.settings.dataScope} />
      <main id="main" className="dossier">
        <article className="dossier-main">
          <div className="dossier-meta">
            <ArchTag name={card.archetype} colour={colour} solid />
            <span className="caps-line">{card.caps.join(" · ").toUpperCase()}</span>
            <span className="pos">PROBLEM CARD {pos + 1} / {siblings.length} IN THIS ARENA</span>
          </div>
          <h1 className="h-dossier">{card.question}</h1>

          {card.quote && (
            <blockquote className="quote">
              <p>“{card.quote.text}”</p>
              <footer>{quoteUrl ? <a href={quoteUrl} target="_blank" rel="noopener noreferrer">{card.quote.attribution} ↗</a> : card.quote.attribution}</footer>
            </blockquote>
          )}

          <section className="dsec">
            <h2 className="eyebrow red">WHY NOW</h2>
            <p className="body">{card.whyLong ?? card.whyNow}</p>
          </section>

          <section className="dsec">
            <h2 className="eyebrow red">YOUR EDGE HERE</h2>
            <p className="body">{card.whyYou}</p>
          </section>

          <section className="napkin" aria-labelledby="napkin-h">
            <h2 id="napkin-h" className="eyebrow">NAPKIN MATH</h2>
            <ol className="napkin-lines">
              {card.math.lines.map((l, i) => (
                <li key={i}><span>{l.text}</span><span className="ref">{l.ref === "EST" ? "EST" : `[${l.ref}]`}</span></li>
              ))}
            </ol>
            <div className="napkin-total">= {card.math.headline} <span>{card.math.subhead}</span></div>
            {card.note && <p className="napkin-note">{card.note}</p>}
            <p className="napkin-key">[n] = SOURCE BELOW · EST = WORKING ASSUMPTION, TO VALIDATE</p>
          </section>

          <section className="builders" aria-labelledby="builders-h">
            <div className="section-rule">
              <h2 id="builders-h" className="eyebrow ink">WHO’S ALREADY BUILDING</h2>
              <span className="muted small">FUNDING · SEE SOURCES · VERIFY BEFORE PUBLICATION</span>
            </div>
            {card.builders.length ? (
              <ul role="list">
                {card.builders.map((b) => {
                  const u = safeUrl(b.url);
                  return (
                    <li key={b.name} className="builder">
                      <span className="initials" aria-hidden>{b.initials}</span>
                      <div><div className="b-name">{b.name}</div><div className="b-note">{b.note}</div></div>
                      <div className="b-backers">{b.backers}</div>
                      <div className="b-raised">{u ? <a href={u} target="_blank" rel="noopener noreferrer">{b.raised} ↗</a> : b.raised}</div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="empty-line">Being mapped. Named teams and rounds will be added once verified.</p>
            )}
          </section>
        </article>

        <aside className="dossier-rail" aria-label="Conviction and sources">
          <section>
            <div className="rail-head"><h2 className="eyebrow">CONVICTION · 6 DIMENSIONS</h2><span className="eyebrow">{card.conviction} / 100 · DRAFT</span></div>
            <HeroRadar values={card.scores} labels={c.rubric.map((r) => r.dimension)} />
            <details className="rubric">
              <summary>HOW EACH DIMENSION IS SCORED</summary>
              <dl>
                {c.rubric.map((r) => <div key={r.dimension}><dt>{r.dimension}</dt><dd>{r.description}</dd></div>)}
              </dl>
              <p className="fineprint">0 to 100 per dimension, higher = more attractive. Scores are editorial drafts, not yet derived from these inputs.</p>
            </details>
          </section>

          <section>
            <h2 className="eyebrow rail-title">SOURCES · THIS CARD</h2>
            <ol className="src-list">
              {card.sources.map((s) => {
                const u = safeUrl(s.url);
                return (
                  <li key={s.order}>
                    <span className="src-tag">{s.order} · {s.tier}</span>
                    <span className="src-text">{s.text}{u && <> <a href={u} target="_blank" rel="noopener noreferrer" aria-label={`Open source ${s.order}`}>↗</a></>}</span>
                  </li>
                );
              })}
              {estCount > 0 && (
                <li>
                  <span className="src-tag est">EST</span>
                  <span className="src-text">{estCount} napkin-math input{estCount > 1 ? "s are working assumptions" : " is a working assumption"} from the team. Not yet sourced.</span>
                </li>
              )}
            </ol>
            {card.lastVerified && <p className="fineprint">VERIFIED {stampDate(card.lastVerified)}</p>}
          </section>

          <div className="rail-actions">
            <SaveButton id={card.id} />
            <div className="rail-row">
              <Link href={`/arenas/${a.slug}`} className="btn btn-ghost">‹ BACK TO ARENA</Link>
              {siblings.length > 1 && <Link href={`/cards/${next.slug}`} className="btn btn-ghost">NEXT CARD →</Link>}
            </div>
          </div>
        </aside>
      </main>
    </>
  );
}
