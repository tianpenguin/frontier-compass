import type { Metadata } from "next";
import { TopBar } from "@/components/TopBar";
import { ShortlistView, type ShortCard } from "@/components/ShortlistView";
import { getContent, arenaOf, publicCards } from "@/lib/content";

export const metadata: Metadata = { title: "Your shortlist" };

export default function ShortlistPage() {
  const c = getContent();
  const cards: ShortCard[] = publicCards(c).map((x) => ({
    id: x.id, slug: x.slug, question: x.question, archetype: x.archetype,
    archColour: c.archetypes.find((a) => a.name === x.archetype)!.colour,
    arenaName: arenaOf(c, x.arenaId).name.toUpperCase(),
  }));
  return (
    <>
      <TopBar crumbs={[{ label: "Shortlist" }]} scope={c.settings.dataScope} />
      <main id="main"><ShortlistView cards={cards} /></main>
    </>
  );
}
