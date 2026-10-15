import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { CoverDial } from "@/components/Marks";
import { getContent, liveArenas, publicCards } from "@/lib/content";

export default function Cover() {
  const c = getContent();
  const nCards = publicCards(c).length;
  const nQ = c.quiz.length;
  return (
    <>
      <TopBar scope={c.settings.dataScope} />
      <main id="main" className="cover">
        <CoverDial />
        <h1 className="cover-title">Frontier Compass<span className="red">.</span></h1>
        <p className="cover-lede">A field guide to where to build next.</p>
        <div className="cover-ctas">
          <Link href="/arenas" className="btn btn-dark btn-stack">
            <span className="btn-main">EXPLORE THE MAP →</span>
            <span className="btn-sub">See the whole landscape</span>
          </Link>
          <Link href="/fit" className="btn btn-ghost btn-stack">
            <span className="btn-main">FIND YOUR FIT</span>
            <span className="btn-sub">2-minute builder profile</span>
          </Link>
        </div>
        <section className="howto" aria-labelledby="howto-h">
          <h2 id="howto-h" className="eyebrow red">HOW TO USE THIS GUIDE</h2>
          <p><b>Browse the map</b> → open an arena → read a problem card: why now, the market, who’s already building, and a 6-way conviction read.</p>
          <p><b>Find your fit</b> → answer {nQ} quick either/or questions; get a builder profile, {c.settings.resultsShown} problem cards where your edge is the bottleneck, and who you would need beside you.</p>
          <p className="howto-small">It points you where to look. It doesn’t tell you what to build. Figures are illustrative, {c.settings.dataScope} data only.</p>
        </section>
      </main>
      <footer className="cover-foot">
        <span>{c.arenas.length} ARENAS · {liveArenas(c).length} LIVE · {nCards} PROBLEM CARDS</span>
        <span>ILLUSTRATIVE · {c.settings.dataScope.toUpperCase()} DATA</span>
      </footer>
    </>
  );
}
