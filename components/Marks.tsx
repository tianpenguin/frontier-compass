import { poly, polar, sparkPath } from "@/lib/util";

export function CompassMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden className="compass-mark">
      <circle cx="20" cy="20" r="18" stroke="rgba(26,26,26,.28)" strokeWidth="1.5" />
      <polygon points="20,5 24,20 20,26 16,20" fill="#C4451C" />
      <circle cx="20" cy="20" r="2.2" fill="#F5F3EF" stroke="#1A1A1A" strokeWidth="1" />
    </svg>
  );
}

const RING6 = poly([100, 100, 100, 100, 100, 100], 42, 50, 50);

export function MiniRadar({ values, size = 42, label }: { values: number[]; size?: number; label?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" role="img" aria-label={label} style={{ flex: "none" }}>
      <polygon points={RING6} stroke="rgba(26,26,26,.18)" strokeWidth="1.5" fill="none" />
      <polygon points={poly(values, 42, 50, 50)} fill="rgba(196,69,28,.16)" stroke="#C4451C" strokeWidth="2" />
    </svg>
  );
}

export function HeroRadar({ values, labels }: { values: number[]; labels: string[] }) {
  const rings = [0.33, 0.66, 1].map((f) => poly(values.map(() => 100 * f), 86, 0, 0));
  return (
    <div className="hero-radar" role="img" aria-label={labels.map((l, i) => `${l} ${values[i]}`).join(", ")}>
      <svg viewBox="0 0 320 320" fill="none" aria-hidden>
        <g transform="translate(160,150)">
          {rings.map((p, i) => <polygon key={i} points={p} stroke="rgba(26,26,26,.16)" strokeWidth="1" fill="none" />)}
          {values.map((_, i) => { const p = polar(100, i, 86); return <line key={i} x1="0" y1="0" x2={p[0].toFixed(1)} y2={p[1].toFixed(1)} stroke="rgba(26,26,26,.16)" strokeWidth="1" />; })}
          <polygon points={poly(values, 86, 0, 0)} fill="rgba(196,69,28,.14)" stroke="#C4451C" strokeWidth="2" />
        </g>
      </svg>
      {labels.map((name, i) => {
        const p = polar(100, i, 108);
        return (
          <div key={i} className="hero-radar-label" style={{ left: `${((160 + p[0]) / 320) * 100}%`, top: `${((150 + p[1]) / 320) * 100}%` }} aria-hidden>
            <div className="hr-name">{name}</div>
            <div className="hr-val">{values[i]}</div>
          </div>
        );
      })}
    </div>
  );
}

export function Spark({ values, colour }: { values: number[]; colour: string }) {
  return (
    <svg width="62" height="18" viewBox="0 0 62 18" fill="none" aria-hidden>
      <path d={sparkPath(values, 62, 18)} stroke={colour} strokeWidth="1.25" />
    </svg>
  );
}

export function CoverDial() {
  const ticks = Array.from({ length: 72 }, (_, i) => {
    const a = (i * 5 * Math.PI) / 180, major = i % 6 === 0, r1 = 232, r2 = major ? 258 : 244;
    return (
      <line key={i} x1={(r1 * Math.cos(a)).toFixed(1)} y1={(r1 * Math.sin(a)).toFixed(1)} x2={(r2 * Math.cos(a)).toFixed(1)} y2={(r2 * Math.sin(a)).toFixed(1)}
        stroke={major ? "rgba(26,26,26,.22)" : "rgba(26,26,26,.11)"} strokeWidth={major ? 1.25 : 1} />
    );
  });
  return (
    <svg className="cover-dial" viewBox="0 0 620 620" fill="none" aria-hidden>
      <g transform="translate(310,310)">
        <circle r="298" stroke="rgba(26,26,26,.10)" /><circle r="232" stroke="rgba(26,26,26,.10)" /><circle r="96" stroke="rgba(26,26,26,.10)" />
        {ticks}
        <line x1="0" y1="232" x2="0" y2="-232" stroke="rgba(26,26,26,.16)" /><line x1="-232" y1="0" x2="232" y2="0" stroke="rgba(26,26,26,.16)" />
        <polygon points="0,-208 26,0 0,64 -26,0" fill="rgba(196,69,28,.16)" stroke="#C4451C" strokeWidth="1.25" />
        <circle r="5" fill="#F5F3EF" stroke="#1A1A1A" strokeWidth="1.25" />
        <text x="0" y="-256" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="13" letterSpacing="2" fill="rgba(26,26,26,.35)">N</text>
      </g>
    </svg>
  );
}

export function ArchTag({ name, colour, solid = false }: { name: string; colour: string; solid?: boolean }) {
  return (
    <span className="arch-tag" style={solid ? { background: colour, color: "#F5F3EF", borderColor: colour } : { color: colour, borderColor: colour }}>
      {solid ? name.toUpperCase() : name}
    </span>
  );
}
