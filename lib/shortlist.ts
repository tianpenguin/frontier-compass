"use client";
// Shortlist kept in this browser (step 5 also records add/remove events in Supabase).
import { useSyncExternalStore } from "react";

const KEY = "fc_shortlist";
const EVENT = "fc-shortlist";
const EMPTY: string[] = [];

let cacheRaw: string | null = null;
let cacheVal: string[] = EMPTY;

function read(): string[] {
  let raw: string | null = null;
  try { raw = localStorage.getItem(KEY); } catch { return EMPTY; }
  if (raw === cacheRaw) return cacheVal;
  cacheRaw = raw;
  try {
    const v = JSON.parse(raw ?? "[]");
    cacheVal = Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : EMPTY;
  } catch {
    cacheVal = EMPTY;
  }
  return cacheVal;
}

function write(ids: string[]) {
  try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch { /* storage blocked: keep going */ }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => { window.removeEventListener(EVENT, cb); window.removeEventListener("storage", cb); };
}

export function useShortlist() {
  const ids = useSyncExternalStore(subscribe, read, () => EMPTY);
  return {
    ids,
    has: (id: string) => ids.includes(id),
    toggle: (id: string) => write(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]),
    remove: (id: string) => write(ids.filter((x) => x !== id)),
  };
}
