// Runs before every build (npm "prebuild").
// If GOOGLE_SHEET_ID and GOOGLE_SERVICE_ACCOUNT_KEY are set: read the live Sheet, validate it, and write
// content/snapshot.json. Any failure stops the build, so Vercel keeps serving the last good version.
// If they are not set (local development): keep the committed snapshot.
import { writeFileSync } from "node:fs";
import { buildContent, ContentError } from "../lib/content/build";
import { fetchSheetTabs, sheetConfigFromEnv } from "../lib/content/sheets";

async function main() {
  const cfg = sheetConfigFromEnv();
  if (!cfg) {
    console.log("[content] Google Sheet not configured; using committed content/snapshot.json");
    return;
  }
  console.log(`[content] Reading Google Sheet ${cfg.sheetId} as ${cfg.clientEmail}`);
  const tabs = await fetchSheetTabs(cfg);
  const c = buildContent(tabs); // throws ContentError listing every problem
  writeFileSync("content/snapshot.json", JSON.stringify({ source: `google-sheet:${cfg.sheetId}`, generatedAt: new Date().toISOString(), tabs }, null, 2) + "\n");
  console.log(`[content] OK: ${c.arenas.length} arenas, ${c.cards.length} published cards, ${c.quiz.length} quiz questions`);
}

main().catch((e) => {
  console.error(e instanceof ContentError ? `\n[content] The Sheet has problems. Nothing was published.\n${e.message}\n` : `\n[content] ${e.message}\n`);
  process.exit(1);
});
