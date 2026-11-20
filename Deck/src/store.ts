import { PLANS, type Plan, type PlanId } from "./config";
import type { Deck } from "./types";

const PASS_DAYS = 7;

function read<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: the app keeps working in memory */
  }
}

const monthKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

interface PlanState {
  id: PlanId;
  passStartedAt?: number;
}

/** Billing is not wired yet: the plan is chosen by the tester and kept in this browser. */
export function getPlan(): Plan {
  const s = read<PlanState>("deck.plan", { id: "free" });
  if (s.id === "pass" && s.passStartedAt && Date.now() - s.passStartedAt > PASS_DAYS * 864e5) {
    return PLANS.free;
  }
  return PLANS[s.id] ?? PLANS.free;
}

export function setPlan(id: PlanId) {
  write("deck.plan", { id, passStartedAt: id === "pass" ? Date.now() : undefined });
  if (id === "pass") write("deck.usage.pass", 0);
}

export function decksUsed(plan: Plan): number {
  if (plan.period === "pass") return read<number>("deck.usage.pass", 0);
  const u = read<{ month: string; count: number }>("deck.usage", { month: monthKey(), count: 0 });
  return u.month === monthKey() ? u.count : 0;
}

export function decksLeft(plan: Plan): number | null {
  return plan.decksPerPeriod === null ? null : Math.max(0, plan.decksPerPeriod - decksUsed(plan));
}

export function countDeck(plan: Plan) {
  if (plan.period === "pass") write("deck.usage.pass", decksUsed(plan) + 1);
  else write("deck.usage", { month: monthKey(), count: decksUsed(plan) + 1 });
}

export function loadDeck(): Deck | null {
  const d = read<Deck | null>("deck.current", null);
  // Decks saved before the 3D book rebuild have no form.
  return d && d.form && Array.isArray(d.slides) ? d : null;
}

/** Page images can exceed the storage quota; then the deck is kept without them. */
export function saveDeck(d: Deck | null) {
  try {
    localStorage.setItem("deck.current", JSON.stringify(d));
  } catch {
    if (d?.orig) write("deck.current", { ...d, orig: undefined });
  }
}
