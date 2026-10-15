import type { Metadata } from "next";
import { TopBar } from "@/components/TopBar";
import { Fit, type FitData } from "@/components/Fit";
import { getContent, arenaOf, publicCards } from "@/lib/content";

export const metadata: Metadata = { title: "Find your fit" };

export default function FitPage() {
  const c = getContent();
  const data: FitData = {
    quiz: c.quiz, skills: c.skills, types: c.types, settings: c.settings,
    archetypes: c.archetypes,
    cards: publicCards(c).map((x) => ({
      id: x.id, slug: x.slug, question: x.question, archetype: x.archetype, arenaName: arenaOf(c, x.arenaId).name.toUpperCase(),
      skills: x.skills, whyYou: x.whyYou, hard: x.hard,
    })),
  };
  return (
    <>
      <TopBar crumbs={[{ label: "Find your fit" }]} scope={c.settings.dataScope} />
      <main id="main"><Fit data={data} /></main>
    </>
  );
}
