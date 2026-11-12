import { isoDay } from "../data/seed";
import type { Account, Category, Transaction } from "../data/types";
import { monthKey } from "./format";

const counted = (t: Transaction) => t.status !== "failed";

/** Daily end-of-day balance for the last `days` days, walked back from today's balance. */
export function balanceSeries(accounts: Account[], txs: Transaction[], days: number, accountId?: string) {
  const accs = accountId ? accounts.filter((a) => a.id === accountId) : accounts;
  const ids = new Set(accs.map((a) => a.id));
  let bal = accs.reduce((s, a) => s + a.balance, 0);
  const byDay = new Map<string, number>();
  for (const t of txs) if (ids.has(t.accountId) && counted(t)) byDay.set(t.date, (byDay.get(t.date) ?? 0) + t.amount);
  const out: { date: string; balance: number }[] = [];
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  for (let i = 0; i < days; i++) {
    const key = isoDay(d);
    out.push({ date: key, balance: bal });
    bal -= byDay.get(key) ?? 0;
    d.setDate(d.getDate() - 1);
  }
  return out.reverse();
}

export function monthlyInOut(txs: Transaction[], months = 6) {
  const map = new Map<string, { month: string; moneyIn: number; moneyOut: number }>();
  for (const t of txs) {
    if (!counted(t) || t.category === "Transfer") continue;
    const k = monthKey(t.date);
    const row = map.get(k) ?? { month: k, moneyIn: 0, moneyOut: 0 };
    if (t.amount > 0) row.moneyIn += t.amount;
    else row.moneyOut += -t.amount;
    map.set(k, row);
  }
  return [...map.values()].sort((a, b) => a.month.localeCompare(b.month)).slice(-months);
}

export function spendByCategory(txs: Transaction[], sinceIso: string) {
  const map = new Map<Category, number>();
  for (const t of txs) {
    if (!counted(t) || t.amount >= 0 || t.date < sinceIso || t.category === "Transfer") continue;
    map.set(t.category, (map.get(t.category) ?? 0) - t.amount);
  }
  return [...map.entries()].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
}

export function topMerchants(txs: Transaction[], sinceIso: string, n = 8) {
  const map = new Map<string, { name: string; amount: number; count: number }>();
  for (const t of txs) {
    if (!counted(t) || t.amount >= 0 || t.date < sinceIso || t.category === "Transfer" || t.category === "Payroll") continue;
    const row = map.get(t.counterparty) ?? { name: t.counterparty, amount: 0, count: 0 };
    row.amount -= t.amount;
    row.count += 1;
    map.set(t.counterparty, row);
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount).slice(0, n);
}

export function cardSpendThisMonth(txs: Transaction[], cardId: string) {
  const m = monthKey(isoDay(new Date()));
  return txs.filter((t) => t.cardId === cardId && counted(t) && t.amount < 0 && monthKey(t.date) === m).reduce((s, t) => s - t.amount, 0);
}

export const daysAgoIso = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return isoDay(d);
};

export const CATEGORY_COLORS: Record<Category, string> = {
  Software: "#6366f1",
  Payroll: "#0ea5e9",
  Advertising: "#f59e0b",
  Travel: "#10b981",
  Meals: "#ec4899",
  Office: "#8b5cf6",
  Contractors: "#14b8a6",
  Rent: "#64748b",
  Utilities: "#84cc16",
  Revenue: "#22c55e",
  Taxes: "#ef4444",
  Transfer: "#a1a1aa",
  Uncategorized: "#d4d4d8",
};
