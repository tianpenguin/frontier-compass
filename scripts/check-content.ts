// Validate content/snapshot.json without building the site.
// Usage: npm run check:content
import { readFileSync } from "node:fs";
import { buildContent, ContentError } from "../lib/content/build";

const snap = JSON.parse(readFileSync("content/snapshot.json", "utf8"));
try {
  const c = buildContent(snap.tabs);
  console.log(`OK: ${c.arenas.length} arenas, ${c.cards.length} published cards, ${c.quiz.length} quiz questions.`);
  if (c.warnings.length) console.log(`\n${c.warnings.length} warning(s):\n` + c.warnings.map((w) => "  - " + w).join("\n"));
} catch (e) {
  if (e instanceof ContentError) {
    console.error(e.message);
    process.exit(1);
  }
  throw e;
}
