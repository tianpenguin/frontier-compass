# Notes for Claude

- Next.js 16 App Router, TypeScript, plain CSS (`app/globals.css`). No Tailwind.
- All content comes from the Google Sheet via `content/snapshot.json`, which `scripts/pull-sheet.ts` refreshes at the
  start of every build when GOOGLE_SHEET_ID / GOOGLE_SERVICE_ACCOUNT_KEY are set. Never hardcode content in components.
  The committed snapshot is only a local-dev fallback and may lag the live Sheet.
- Never print, log or commit the service account key or CONTENT_CHECK_TOKEN.
  Column names in `lib/content/build.ts` must match the Sheet headers exactly.
- `npm run build` must pass; it runs content validation. Use `npm run check:content` for content-only checks.
- Quiz scoring in `lib/match.ts` was verified identical to the V6 HTML prototype over 202 answer sets. Treat changes to it as product decisions.
- Shortlist and quiz progress are client-side (localStorage keys `fc_shortlist`, `fc_quiz`). The quiz resets saved answers when `quiz_version` changes.
- Design rules: small text at least 60% ink (`--ink-3`) for contrast; every interactive element is a link or button; phone layout at 760px and below.
- Commits: no Claude co-author line.
