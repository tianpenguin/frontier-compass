"use client";
import { useShortlist } from "@/lib/shortlist";

export function SaveButton({ id }: { id: string }) {
  const { has, toggle } = useShortlist();
  const saved = has(id);
  return (
    <button type="button" className={`btn btn-dark btn-wide${saved ? " is-saved" : ""}`} aria-pressed={saved} onClick={() => toggle(id)}>
      {saved ? "✓ SAVED TO SHORTLIST" : "＋ SAVE TO MY SHORTLIST"}
    </button>
  );
}
