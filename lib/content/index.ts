import "server-only";
import { cache } from "react";
import snapshot from "@/content/snapshot.json";
import { buildContent, type RawTabs } from "./build";
import type { Content } from "./types";

// Step 3: content comes from content/snapshot.json (generated from the spreadsheet).
// Step 4 swaps this for a live read of the Google Sheet at build time; nothing else changes.
export const getContent = cache((): Content => {
  const c = buildContent((snapshot as { tabs: RawTabs }).tabs);
  if (c.warnings.length && process.env.NODE_ENV !== "test") {
    console.warn(`[content] ${c.warnings.length} warning(s):\n` + c.warnings.map((w) => "  - " + w).join("\n"));
  }
  return c;
});

export function liveArenas(c: Content) {
  return c.arenas.filter((a) => a.live);
}
export function cardsIn(c: Content, arenaId: string) {
  return c.cards.filter((x) => x.arenaId === arenaId);
}
export function arenaOf(c: Content, arenaId: string) {
  return c.arenas.find((a) => a.id === arenaId)!;
}
/** Cards are only public when their arena is live. */
export function publicCards(c: Content) {
  const live = new Set(liveArenas(c).map((a) => a.id));
  return c.cards.filter((x) => live.has(x.arenaId));
}
