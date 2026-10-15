// Validates the live Google Sheet without publishing. Called by the "Frontier Compass" menu in the Sheet.
// Protected by CONTENT_CHECK_TOKEN so only the Sheet's script can call it.
import { timingSafeEqual } from "node:crypto";
import { buildContent, ContentError } from "@/lib/content/build";
import { fetchSheetTabs, sheetConfigFromEnv } from "@/lib/content/sheets";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function authorised(req: Request) {
  const want = process.env.CONTENT_CHECK_TOKEN;
  const got = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!want || want.length < 16) return false;
  const a = Buffer.from(got), b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  if (!authorised(req)) return Response.json({ ok: false, error: "Not authorised" }, { status: 401 });
  try {
    const cfg = sheetConfigFromEnv();
    if (!cfg) return Response.json({ ok: false, error: "The site is not connected to a Google Sheet yet (GOOGLE_SHEET_ID / GOOGLE_SERVICE_ACCOUNT_KEY)." }, { status: 500 });
    const c = buildContent(await fetchSheetTabs(cfg));
    return Response.json({
      ok: true,
      summary: `${c.arenas.length} arenas (${c.arenas.filter((a) => a.live).length} live), ${c.cards.length} published cards, ${c.quiz.length} quiz questions`,
      problems: [],
      warnings: c.warnings,
    });
  } catch (e) {
    if (e instanceof ContentError) return Response.json({ ok: false, problems: e.problems, warnings: [] });
    return Response.json({ ok: false, error: (e as Error).message }, { status: 502 });
  }
}
