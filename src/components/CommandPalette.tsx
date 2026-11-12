import { ArrowRight, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cx, money, shortDate } from "../lib/format";
import { useDispatch, useStore } from "../state/store";
import { useUI } from "../state/ui";

type Item = { id: string; label: string; hint?: string; group: string; run: () => void };

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const { transactions, settings } = useStore();
  const dispatch = useDispatch();
  const ui = useUI();

  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
    }
  }, [open]);

  const items = useMemo<Item[]>(() => {
    const go = (path: string) => () => navigate(path);
    const base: Item[] = [
      { id: "home", label: "Go to Home", group: "Navigate", run: go("/") },
      { id: "tx", label: "Go to Transactions", group: "Navigate", run: go("/transactions") },
      { id: "pay", label: "Go to Payments", group: "Navigate", run: go("/payments") },
      { id: "cards", label: "Go to Cards", group: "Navigate", run: go("/cards") },
      { id: "inv", label: "Go to Invoices", group: "Navigate", run: go("/invoices") },
      { id: "ins", label: "Go to Insights", group: "Navigate", run: go("/insights") },
      { id: "set", label: "Go to Settings", group: "Navigate", run: go("/settings") },
      { id: "send", label: "Send money", group: "Actions", run: () => ui.openSend() },
      { id: "transfer", label: "Transfer between accounts", group: "Actions", run: () => ui.openTransfer() },
      { id: "newinv", label: "Create invoice", group: "Actions", run: go("/invoices?new=1") },
      { id: "theme", label: `Switch to ${document.documentElement.classList.contains("dark") ? "light" : "dark"} mode`, group: "Actions", run: () => dispatch({ type: "settings/update", patch: { theme: document.documentElement.classList.contains("dark") ? "light" : "dark" } }) },
    ];
    const term = q.trim().toLowerCase();
    if (!term) return base;
    const txHits: Item[] = transactions
      .filter((t) => t.counterparty.toLowerCase().includes(term) || t.description.toLowerCase().includes(term))
      .slice(0, 6)
      .map((t) => ({ id: t.id, label: t.counterparty, hint: `${shortDate(t.date)} · ${money(t.amount)}`, group: "Transactions", run: go(`/transactions?tx=${t.id}`) }));
    return [...base.filter((i) => i.label.toLowerCase().includes(term)), ...txHits];
  }, [q, transactions, navigate, ui, dispatch, settings.theme]);

  if (!open) return null;
  const runAt = (i: number) => {
    items[i]?.run();
    onClose();
  };
  let lastGroup = "";
  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-zinc-950/40 p-4 pt-[12vh] backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-label="Command palette" data-testid="command-palette" className="h-fit w-full max-w-lg overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-2 border-b border-zinc-100 px-4 dark:border-zinc-800">
          <Search className="size-4 text-zinc-400" />
          <input
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, items.length - 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              }
              if (e.key === "Enter") runAt(active);
            }}
            placeholder="Search pages, actions, transactions…"
            className="h-12 flex-1 bg-transparent text-sm outline-none"
          />
          <kbd className="rounded border border-zinc-200 px-1.5 text-[10px] text-zinc-400 dark:border-zinc-700">ESC</kbd>
        </div>
        <ul className="max-h-80 overflow-y-auto p-2">
          {items.map((it, i) => {
            const header = it.group !== lastGroup ? it.group : null;
            lastGroup = it.group;
            return (
              <li key={it.id}>
                {header && <p className="px-2 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-zinc-400">{header}</p>}
                <button onMouseEnter={() => setActive(i)} onClick={() => runAt(i)} className={cx("flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm", i === active && "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300")}>
                  <span>{it.label}</span>
                  <span className="flex items-center gap-2 text-xs text-zinc-400">
                    {it.hint}
                    {i === active && <ArrowRight className="size-3.5" />}
                  </span>
                </button>
              </li>
            );
          })}
          {items.length === 0 && <li className="px-2 py-8 text-center text-sm text-zinc-500">No results</li>}
        </ul>
      </div>
    </div>
  );
}
