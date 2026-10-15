// Turn the content spreadsheet (.xlsx, e.g. downloaded from Google Sheets) into content/snapshot.json.
// Usage: npm run snapshot -- path/to/frontier_compass_content.xlsx
//
// Each tab becomes an array of row objects keyed by the header row, exactly the shape the
// Google Sheets reader produces, so the site does not care which one supplied the data.
import ExcelJS from "exceljs";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const file = process.argv[2];
if (!file) {
  console.error("Usage: npm run snapshot -- path/to/content.xlsx");
  process.exit(1);
}

const SKIP = new Set(["README", "_lists"]);

function cellValue(v) {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    if ("result" in v) return cellValue(v.result); // formula: use the cached result
    if ("richText" in v) return v.richText.map((t) => t.text).join("");
    if ("text" in v) return String(v.text); // hyperlink
    if ("error" in v) return null;
  }
  if (typeof v === "string") return v.trim() === "" ? null : v;
  return v;
}

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(resolve(file));

const tabs = {};
wb.eachSheet((ws) => {
  if (SKIP.has(ws.name)) return;
  const headers = [];
  ws.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => {
    headers[col] = cellValue(cell.value);
  });
  const rows = [];
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const obj = {};
    let filled = 0;
    headers.forEach((h, col) => {
      if (!h) return;
      const v = cellValue(row.getCell(col).value);
      obj[h] = v;
      if (v !== null) filled++;
    });
    if (filled === 0) continue; // blank row
    obj.__row = r;
    rows.push(obj);
  }
  tabs[ws.name] = rows;
});

const out = { source: file.split("/").pop(), generatedAt: new Date().toISOString(), tabs };
writeFileSync("content/snapshot.json", JSON.stringify(out, null, 2) + "\n");
console.log(`Wrote content/snapshot.json (${Object.keys(tabs).length} tabs)`);
