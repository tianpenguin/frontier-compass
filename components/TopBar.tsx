"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useShortlist } from "@/lib/shortlist";
import { CompassMark } from "./Marks";

export interface Crumb { label: string; href?: string }

export function TopBar({ crumbs = [], scope = "US" }: { crumbs?: Crumb[]; scope?: string }) {
  const path = usePathname();
  const { ids } = useShortlist();
  const tab = (href: string, label: string, on: boolean) => (
    <Link href={href} className="nav-tab" aria-current={on ? "page" : undefined}>{label}</Link>
  );
  return (
    <header className="topbar">
      <div className="topbar-left">
        <Link href="/" className="brand" aria-label="Frontier Compass home">
          <CompassMark />
          <span>FRONTIER COMPASS<span className="red">.</span></span>
        </Link>
        {crumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="crumbs">
            <span className="crumb-bar" aria-hidden>|</span>
            <ol>
              {crumbs.map((c, i) => (
                <li key={i} aria-current={i === crumbs.length - 1 ? "page" : undefined}>
                  {i > 0 && <span className="crumb-sep" aria-hidden>›</span>}
                  {c.href ? <Link href={c.href}>{c.label}</Link> : <span>{c.label}</span>}
                </li>
              ))}
            </ol>
          </nav>
        )}
      </div>
      <div className="topbar-right">
        <span className="badge">ILLUSTRATIVE · {scope.toUpperCase()} DATA</span>
        <nav aria-label="Main" className="nav">
          {tab("/arenas", "BROWSE", path.startsWith("/arenas") || path.startsWith("/cards"))}
          {tab("/fit", "FIND YOUR FIT", path.startsWith("/fit"))}
          {tab("/shortlist", `SHORTLIST${ids.length ? ` (${ids.length})` : ""}`, path.startsWith("/shortlist"))}
        </nav>
      </div>
    </header>
  );
}
