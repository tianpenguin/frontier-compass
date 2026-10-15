// Reads every content tab from the Google Sheet with a service account.
// No Google SDK: a signed JWT is exchanged for a short-lived read-only token, then one batchGet call.
import { createSign } from "node:crypto";
import type { RawRow, RawTabs } from "./build";

export const CONTENT_TABS = [
  "arenas", "arena_macro", "cards", "math_lines", "sources", "builders", "quiz_questions",
  "quiz_options", "types", "skills", "capabilities", "archetypes", "rubric", "settings",
] as const;

export interface SheetConfig { sheetId: string; clientEmail: string; privateKey: string }

/** Reads GOOGLE_SHEET_ID and GOOGLE_SERVICE_ACCOUNT_KEY (the whole JSON key, raw or base64). Null if not set. */
export function sheetConfigFromEnv(env: NodeJS.ProcessEnv = process.env): SheetConfig | null {
  const sheetId = env.GOOGLE_SHEET_ID?.trim();
  const rawKey = env.GOOGLE_SERVICE_ACCOUNT_KEY?.trim();
  if (!sheetId && !rawKey) return null;
  if (!sheetId || !rawKey) throw new Error("Set both GOOGLE_SHEET_ID and GOOGLE_SERVICE_ACCOUNT_KEY, or neither.");
  let key: { client_email?: string; private_key?: string };
  try {
    key = JSON.parse(rawKey.startsWith("{") ? rawKey : Buffer.from(rawKey, "base64").toString("utf8"));
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY is not valid JSON. Paste the entire downloaded key file.");
  }
  if (!key.client_email || !key.private_key) throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY is missing client_email or private_key.");
  return { sheetId: extractSheetId(sheetId), clientEmail: key.client_email, privateKey: key.private_key.replace(/\\n/g, "\n") };
}

/** Accepts a bare ID or a full docs.google.com URL. */
export function extractSheetId(s: string) {
  const m = s.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : s;
}

const b64url = (b: Buffer | string) => Buffer.from(b).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

export function signedJwt(clientEmail: string, privateKey: string, now = Math.floor(Date.now() / 1000)) {
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(JSON.stringify({
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 600,
  }));
  const sig = createSign("RSA-SHA256").update(`${header}.${claims}`).sign(privateKey);
  return `${header}.${claims}.${b64url(sig)}`;
}

async function accessToken(cfg: SheetConfig) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: signedJwt(cfg.clientEmail, cfg.privateKey) }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) throw new Error(`Google sign-in failed (${res.status}): ${body.error_description ?? body.error ?? "unknown error"}`);
  return body.access_token as string;
}

interface ValueRange { range: string; values?: unknown[][] }

/** Turns batchGet value ranges into header-keyed rows, the same shape snapshot-from-xlsx produces. */
export function rangesToTabs(ranges: ValueRange[], names: readonly string[]): RawTabs {
  const tabs: RawTabs = {};
  ranges.forEach((vr, i) => {
    const [head = [], ...rows] = vr.values ?? [];
    const headers = head.map((h) => (h === null || h === undefined ? "" : String(h).trim()));
    const out: RawRow[] = [];
    rows.forEach((row, r) => {
      const obj: RawRow = { __row: r + 2 };
      let filled = 0;
      headers.forEach((h, c) => {
        if (!h) return;
        const v = row[c];
        const val = v === undefined || v === null || (typeof v === "string" && v.trim() === "") ? null : v;
        obj[h] = val;
        if (val !== null) filled++;
      });
      if (filled) out.push(obj);
    });
    tabs[names[i]] = out;
  });
  return tabs;
}

export async function fetchSheetTabs(cfg: SheetConfig): Promise<RawTabs> {
  const token = await accessToken(cfg);
  const q = new URLSearchParams({ valueRenderOption: "UNFORMATTED_VALUE", dateTimeRenderOption: "SERIAL_NUMBER", majorDimension: "ROWS" });
  for (const t of CONTENT_TABS) q.append("ranges", `'${t}'`);
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${cfg.sheetId}/values:batchGet?${q}`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg: string = body?.error?.message ?? res.statusText;
    const hint = res.status === 403 ? " Share the Sheet with the service account email (Viewer)."
      : res.status === 404 ? " Check GOOGLE_SHEET_ID."
      : /not supported for this document/i.test(msg) ? " The file is an uploaded .xlsx: use File > Save as Google Sheets and point GOOGLE_SHEET_ID at the copy."
      : /Unable to parse range/i.test(msg) ? ` A tab is missing or renamed. Expected tabs: ${CONTENT_TABS.join(", ")}.`
      : "";
    throw new Error(`Reading the Google Sheet failed (${res.status}): ${msg}.${hint}`);
  }
  return rangesToTabs(body.valueRanges ?? [], CONTENT_TABS);
}
