/** Only http(s) links reach the page; anything else (javascript:, data:) is dropped. */
export function safeUrl(u: string | null | undefined): string | null {
  if (!u) return null;
  try {
    const p = new URL(u);
    return p.protocol === "http:" || p.protocol === "https:" ? p.toString() : null;
  } catch {
    return null;
  }
}

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
/** 2026-10-02 -> 02 OCT 2026 */
export function stampDate(iso: string | null): string | null {
  if (!iso) return null;
  const [y, m, d] = iso.split("-");
  return `${d} ${MONTHS[Number(m) - 1]} ${y}`;
}

export const pad2 = (n: number) => String(n).padStart(2, "0");

/* radar / polar helpers shared by the SVG components */
export function polar(v: number, i: number, r: number, n = 6): [number, number] {
  const a = ((-90 + i * (360 / n)) * Math.PI) / 180;
  return [r * (v / 100) * Math.cos(a), r * (v / 100) * Math.sin(a)];
}
export function poly(vals: number[], r: number, cx: number, cy: number) {
  return vals.map((v, i) => { const p = polar(v, i, r, vals.length); return `${(cx + p[0]).toFixed(1)},${(cy + p[1]).toFixed(1)}`; }).join(" ");
}
export function sparkPath(vals: number[], w: number, h: number) {
  const mx = Math.max(...vals), mn = Math.min(...vals), sp = mx - mn || 1;
  return vals.map((v, i) => `${i ? "L" : "M"}${((i * w) / (vals.length - 1)).toFixed(1)} ${(h - ((v - mn) / sp) * (h - 2) - 1).toFixed(1)}`).join(" ");
}
