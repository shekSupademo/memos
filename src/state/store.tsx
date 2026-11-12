import { createContext, useContext, useEffect, useReducer, type Dispatch, type ReactNode } from "react";
import { createSeed, isoDay } from "../data/seed";
import type { AppState, Card, Category, Invoice, InvoiceStatus, Member, Recipient, Role, Settings, Transaction } from "../data/types";
import { uid } from "../lib/format";

const STORAGE_KEY = "northbeam:v1";

export type Action =
  | { type: "tx/update"; id: string; patch: Partial<Pick<Transaction, "category" | "note" | "receipt">> }
  | { type: "tx/bulkCategorize"; ids: string[]; category: Category }
  | { type: "payment/send"; recipientId: string; accountId: string; amount: number; date: string; memo: string }
  | { type: "transfer"; fromId: string; toId: string; amount: number }
  | { type: "recipient/add"; recipient: Recipient }
  | { type: "card/toggleFreeze"; id: string }
  | { type: "card/update"; id: string; patch: Partial<Pick<Card, "name" | "monthlyLimit">> }
  | { type: "card/create"; card: Card }
  | { type: "invoice/create"; invoice: Invoice }
  | { type: "invoice/setStatus"; id: string; status: InvoiceStatus }
  | { type: "invoice/delete"; id: string }
  | { type: "member/invite"; member: Member }
  | { type: "member/setRole"; id: string; role: Role }
  | { type: "member/remove"; id: string }
  | { type: "settings/update"; patch: Partial<Settings> }
  | { type: "reset" };

const adjust = (state: AppState, accountId: string, delta: number) =>
  state.accounts.map((a) => (a.id === accountId ? { ...a, balance: a.balance + delta } : a));

export const invoiceTotal = (inv: Invoice) => inv.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "tx/update":
      return { ...state, transactions: state.transactions.map((t) => (t.id === action.id ? { ...t, ...action.patch } : t)) };
    case "tx/bulkCategorize": {
      const ids = new Set(action.ids);
      return { ...state, transactions: state.transactions.map((t) => (ids.has(t.id) ? { ...t, category: action.category } : t)) };
    }
    case "payment/send": {
      const r = state.recipients.find((x) => x.id === action.recipientId);
      if (!r) return state;
      const tx: Transaction = {
        id: uid("tx"),
        date: action.date,
        counterparty: r.name,
        description: action.memo || `${r.method.toUpperCase()} to ${r.name}`,
        amount: -action.amount,
        accountId: action.accountId,
        category: "Contractors",
        status: "pending",
        method: r.method,
      };
      return { ...state, transactions: [tx, ...state.transactions], accounts: adjust(state, action.accountId, -action.amount) };
    }
    case "transfer": {
      const from = state.accounts.find((a) => a.id === action.fromId);
      const to = state.accounts.find((a) => a.id === action.toId);
      if (!from || !to) return state;
      const date = isoDay(new Date());
      const base = { date, category: "Transfer" as const, status: "posted" as const, method: "transfer" as const };
      const out: Transaction = { ...base, id: uid("tx"), counterparty: `${from.name} → ${to.name}`, description: `Transfer to ${to.name}`, amount: -action.amount, accountId: from.id };
      const inn: Transaction = { ...base, id: uid("tx"), counterparty: `${from.name} → ${to.name}`, description: `Transfer from ${from.name}`, amount: action.amount, accountId: to.id };
      const accounts = adjust({ ...state, accounts: adjust(state, from.id, -action.amount) }, to.id, action.amount);
      return { ...state, accounts, transactions: [out, inn, ...state.transactions] };
    }
    case "recipient/add":
      return { ...state, recipients: [...state.recipients, action.recipient] };
    case "card/toggleFreeze":
      return { ...state, cards: state.cards.map((c) => (c.id === action.id ? { ...c, frozen: !c.frozen } : c)) };
    case "card/update":
      return { ...state, cards: state.cards.map((c) => (c.id === action.id ? { ...c, ...action.patch } : c)) };
    case "card/create":
      return { ...state, cards: [...state.cards, action.card] };
    case "invoice/create":
      return { ...state, invoices: [action.invoice, ...state.invoices] };
    case "invoice/setStatus": {
      const inv = state.invoices.find((i) => i.id === action.id);
      if (!inv) return state;
      const invoices = state.invoices.map((i) => (i.id === action.id ? { ...i, status: action.status } : i));
      if (action.status !== "paid" || inv.status === "paid") return { ...state, invoices };
      const total = invoiceTotal(inv);
      const tx: Transaction = {
        id: uid("tx"),
        date: isoDay(new Date()),
        counterparty: inv.customer,
        description: `Payment for ${inv.number}`,
        amount: total,
        accountId: "acc_ops",
        category: "Revenue",
        status: "posted",
        method: "ach",
      };
      return { ...state, invoices, transactions: [tx, ...state.transactions], accounts: adjust(state, "acc_ops", total) };
    }
    case "invoice/delete":
      return { ...state, invoices: state.invoices.filter((i) => i.id !== action.id) };
    case "member/invite":
      return { ...state, members: [...state.members, action.member] };
    case "member/setRole":
      return { ...state, members: state.members.map((m) => (m.id === action.id ? { ...m, role: action.role } : m)) };
    case "member/remove":
      return { ...state, members: state.members.filter((m) => m.id !== action.id) };
    case "settings/update":
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case "reset":
      return createSeed();
  }
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AppState;
  } catch {
    // Storage can be blocked; fall back to fresh demo data.
  }
  return createSeed();
}

const StateCtx = createContext<AppState | null>(null);
const DispatchCtx = createContext<Dispatch<Action> | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore quota or privacy-mode errors.
    }
  }, [state]);
  return (
    <StateCtx.Provider value={state}>
      <DispatchCtx.Provider value={dispatch}>{children}</DispatchCtx.Provider>
    </StateCtx.Provider>
  );
}

export function useStore() {
  const s = useContext(StateCtx);
  if (!s) throw new Error("useStore outside StoreProvider");
  return s;
}

export function useDispatch() {
  const d = useContext(DispatchCtx);
  if (!d) throw new Error("useDispatch outside StoreProvider");
  return d;
}
