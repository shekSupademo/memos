import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Download, Paperclip, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CATEGORIES, type Category, type Transaction, type TxStatus } from "../data/types";
import { cx, downloadCsv, longDate, money, parseDollars, shortDate, signedMoney } from "../lib/format";
import { useDispatch, useStore } from "../state/store";
import { useToast } from "../state/toast";
import { Badge, Button, Drawer, Empty, Field, Input, Select } from "./ui";

type SortKey = "date" | "amount" | "counterparty";
const PAGE = 25;

export const statusTone = (s: TxStatus) => (s === "posted" ? "gray" : s === "pending" ? "amber" : "red") as "gray" | "amber" | "red";

export function TransactionTable({ accountId, compact }: { accountId?: string; compact?: boolean }) {
  const { transactions, accounts, cards } = useStore();
  const dispatch = useDispatch();
  const toast = useToast();
  const [params, setParams] = useSearchParams();

  const [q, setQ] = useState(params.get("q") ?? "");
  const [category, setCategory] = useState<Category | "all">((params.get("category") as Category) ?? "all");
  const [status, setStatus] = useState<TxStatus | "all">("all");
  const [direction, setDirection] = useState<"all" | "in" | "out">("all");
  const [acct, setAcct] = useState(accountId ?? "all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [minText, setMinText] = useState("");
  const [missingReceipt, setMissingReceipt] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "date", dir: "desc" });
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const openId = params.get("tx");

  useEffect(() => setAcct(accountId ?? "all"), [accountId]);
  useEffect(() => setPage(0), [q, category, status, direction, acct, from, to, minText, missingReceipt]);

  const min = parseDollars(minText);
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = transactions.filter(
      (t) =>
        (acct === "all" || t.accountId === acct) &&
        (category === "all" || t.category === category) &&
        (status === "all" || t.status === status) &&
        (direction === "all" || (direction === "in" ? t.amount > 0 : t.amount < 0)) &&
        (!from || t.date >= from) &&
        (!to || t.date <= to) &&
        (!min || Math.abs(t.amount) >= min) &&
        (!missingReceipt || (t.method === "card" && !t.receipt)) &&
        (!term || t.counterparty.toLowerCase().includes(term) || t.description.toLowerCase().includes(term) || (t.note ?? "").toLowerCase().includes(term)),
    );
    const mul = sort.dir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => mul * (sort.key === "amount" ? a.amount - b.amount : sort.key === "date" ? a.date.localeCompare(b.date) : a.counterparty.localeCompare(b.counterparty)));
  }, [transactions, q, category, status, direction, acct, from, to, min, missingReceipt, sort]);

  const pageRows = compact ? rows.slice(0, 10) : rows.slice(page * PAGE, page * PAGE + PAGE);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const totalIn = rows.filter((r) => r.amount > 0 && r.status !== "failed").reduce((s, r) => s + r.amount, 0);
  const totalOut = rows.filter((r) => r.amount < 0 && r.status !== "failed").reduce((s, r) => s - r.amount, 0);
  const filtersActive = q || category !== "all" || status !== "all" || direction !== "all" || (!accountId && acct !== "all") || from || to || minText || missingReceipt;
  const allOnPage = pageRows.length > 0 && pageRows.every((r) => selected.has(r.id));

  const toggleSort = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "counterparty" ? "asc" : "desc" }));
  const clear = () => {
    setQ("");
    setCategory("all");
    setStatus("all");
    setDirection("all");
    if (!accountId) setAcct("all");
    setFrom("");
    setTo("");
    setMinText("");
    setMissingReceipt(false);
  };
  const openTx = (id: string | null) => {
    const next = new URLSearchParams(params);
    if (id) next.set("tx", id);
    else next.delete("tx");
    setParams(next, { replace: true });
  };
  const exportCsv = (list: Transaction[]) => {
    downloadCsv("transactions.csv", [["Date", "Counterparty", "Description", "Category", "Account", "Status", "Amount"], ...list.map((t) => [t.date, t.counterparty, t.description, t.category, accounts.find((a) => a.id === t.accountId)?.name ?? "", t.status, (t.amount / 100).toFixed(2)])]);
    toast(`Exported ${list.length} transactions`);
  };

  const SortHead = ({ k, label, right }: { k: SortKey; label: string; right?: boolean }) => (
    <th className={cx("px-4 py-2.5 font-medium", right && "text-right")}>
      <button onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 hover:text-zinc-900 dark:hover:text-white" aria-label={`Sort by ${label}`}>
        {label}
        {sort.key === k && (sort.dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
      </button>
    </th>
  );

  const open = transactions.find((t) => t.id === openId);

  return (
    <div className="space-y-4" data-testid="transaction-table">
      {!compact && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Input className="w-64" placeholder="Search counterparty, description, note" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search transactions" data-testid="tx-search" />
            {!accountId && (
              <Select className="w-40" value={acct} onChange={(e) => setAcct(e.target.value)} aria-label="Account">
                <option value="all">All accounts</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            )}
            <Select className="w-44" value={category} onChange={(e) => setCategory(e.target.value as Category | "all")} aria-label="Category" data-testid="tx-category-filter">
              <option value="all">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
            <Select className="w-36" value={status} onChange={(e) => setStatus(e.target.value as TxStatus | "all")} aria-label="Status">
              <option value="all">Any status</option>
              <option value="posted">Posted</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </Select>
            <Select className="w-32" value={direction} onChange={(e) => setDirection(e.target.value as "all" | "in" | "out")} aria-label="Direction">
              <option value="all">In & out</option>
              <option value="in">Money in</option>
              <option value="out">Money out</option>
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Input type="date" className="w-40" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
            <span className="text-zinc-400">to</span>
            <Input type="date" className="w-40" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
            <Input className="w-32" placeholder="Min $" value={minText} onChange={(e) => setMinText(e.target.value)} aria-label="Minimum amount" />
            <label className="ml-1 inline-flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
              <input type="checkbox" checked={missingReceipt} onChange={(e) => setMissingReceipt(e.target.checked)} className="accent-indigo-600" />
              Missing receipt
            </label>
            {filtersActive && (
              <Button size="sm" variant="ghost" onClick={clear}>
                <X className="size-3.5" /> Clear filters
              </Button>
            )}
            <Button size="sm" className="ml-auto" onClick={() => exportCsv(rows)} data-testid="export-csv">
              <Download className="size-3.5" /> Export {rows.length}
            </Button>
          </div>
          <div className="flex flex-wrap gap-6 text-sm text-zinc-500" data-testid="tx-summary">
            <span>
              {rows.length} results
            </span>
            <span>
              Money in <span className="tabular font-medium text-emerald-600">{money(totalIn)}</span>
            </span>
            <span>
              Money out <span className="tabular font-medium text-zinc-800 dark:text-zinc-200">{money(totalOut)}</span>
            </span>
          </div>
        </div>
      )}

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm dark:border-indigo-900 dark:bg-indigo-950" data-testid="bulk-bar">
          <span className="font-medium">{selected.size} selected</span>
          <Select
            className="h-8 w-44"
            defaultValue=""
            aria-label="Set category for selected"
            onChange={(e) => {
              const c = e.target.value as Category;
              if (!c) return;
              dispatch({ type: "tx/bulkCategorize", ids: [...selected], category: c });
              toast(`Categorized ${selected.size} transactions as ${c}`);
              setSelected(new Set());
            }}
          >
            <option value="" disabled>
              Set category…
            </option>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
          <Button size="sm" onClick={() => exportCsv(transactions.filter((t) => selected.has(t.id)))}>
            <Download className="size-3.5" /> Export
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            Deselect
          </Button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {rows.length === 0 ? (
          <Empty title="No transactions match" body="Try removing a filter or widening the date range." action={<Button onClick={clear}>Clear filters</Button>} />
        ) : (
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-zinc-100 text-left text-xs text-zinc-500 dark:border-zinc-800">
              <tr>
                {!compact && (
                  <th className="w-10 px-4 py-2.5">
                    <input
                      type="checkbox"
                      aria-label="Select page"
                      className="accent-indigo-600"
                      checked={allOnPage}
                      onChange={() => {
                        const next = new Set(selected);
                        pageRows.forEach((r) => (allOnPage ? next.delete(r.id) : next.add(r.id)));
                        setSelected(next);
                      }}
                    />
                  </th>
                )}
                <SortHead k="date" label="Date" />
                <SortHead k="counterparty" label="To / From" />
                <th className="px-4 py-2.5 font-medium">Category</th>
                <th className="px-4 py-2.5 font-medium">Account</th>
                <SortHead k="amount" label="Amount" right />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {pageRows.map((t) => {
                const card = cards.find((c) => c.id === t.cardId);
                return (
                  <tr key={t.id} className={cx("cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50", selected.has(t.id) && "bg-indigo-50/50 dark:bg-indigo-950/30")} onClick={() => openTx(t.id)} data-testid="tx-row">
                    {!compact && (
                      <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label={`Select ${t.counterparty}`}
                          className="accent-indigo-600"
                          checked={selected.has(t.id)}
                          onChange={() => {
                            const next = new Set(selected);
                            if (next.has(t.id)) next.delete(t.id);
                            else next.add(t.id);
                            setSelected(next);
                          }}
                        />
                      </td>
                    )}
                    <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500">{shortDate(t.date)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{t.counterparty}</span>
                        {t.status !== "posted" && <Badge tone={statusTone(t.status)}>{t.status}</Badge>}
                        {t.receipt && <Paperclip className="size-3.5 text-zinc-400" aria-label="Has receipt" />}
                      </div>
                      <div className="text-xs text-zinc-500">{card ? `${card.name} ••${card.last4}` : t.description}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge tone={t.category === "Uncategorized" ? "amber" : "gray"}>{t.category}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-zinc-500">{accounts.find((a) => a.id === t.accountId)?.name}</td>
                    <td className={cx("tabular whitespace-nowrap px-4 py-2.5 text-right font-medium", t.amount > 0 && "text-emerald-600", t.status === "failed" && "text-zinc-400 line-through")}>{signedMoney(t.amount)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {!compact && rows.length > PAGE && (
        <div className="flex items-center justify-between text-sm text-zinc-500">
          <span>
            {page * PAGE + 1}–{Math.min(rows.length, (page + 1) * PAGE)} of {rows.length}
          </span>
          <div className="flex gap-2">
            <Button size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)} aria-label="Previous page">
              <ChevronLeft className="size-4" />
            </Button>
            <span className="self-center">
              Page {page + 1} of {pages}
            </span>
            <Button size="sm" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)} aria-label="Next page">
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      <TransactionDrawer tx={open} onClose={() => openTx(null)} />
    </div>
  );
}

function TransactionDrawer({ tx, onClose }: { tx?: Transaction; onClose: () => void }) {
  const { accounts, cards } = useStore();
  const dispatch = useDispatch();
  const toast = useToast();
  const [note, setNote] = useState(tx?.note ?? "");
  useEffect(() => setNote(tx?.note ?? ""), [tx?.id, tx?.note]);
  if (!tx) return null;
  const card = cards.find((c) => c.id === tx.cardId);
  return (
    <Drawer open onClose={onClose} title="Transaction details" testId="tx-drawer">
      <div className="space-y-6">
        <div>
          <p className={cx("tabular text-3xl font-semibold", tx.amount > 0 && "text-emerald-600")}>{signedMoney(tx.amount)}</p>
          <p className="mt-1 font-medium">{tx.counterparty}</p>
          <p className="text-sm text-zinc-500">{tx.description}</p>
        </div>
        <dl className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 text-sm dark:divide-zinc-800 dark:border-zinc-800">
          {[
            ["Date", longDate(tx.date)],
            ["Status", <Badge key="s" tone={statusTone(tx.status)}>{tx.status}</Badge>],
            ["Account", accounts.find((a) => a.id === tx.accountId)?.name],
            ["Method", tx.method.toUpperCase()],
            ["Card", card ? `${card.name} ••${card.last4} (${card.holder})` : "—"],
            ["Reference", tx.id],
          ].map(([k, v]) => (
            <div key={String(k)} className="flex justify-between gap-4 px-3 py-2.5">
              <dt className="text-zinc-500">{k}</dt>
              <dd className="text-right font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        <Field label="Category">
          <Select
            value={tx.category}
            data-testid="drawer-category"
            onChange={(e) => {
              dispatch({ type: "tx/update", id: tx.id, patch: { category: e.target.value as Category } });
              toast(`Category set to ${e.target.value}`);
            }}
          >
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </Field>
        <Field label="Note">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => note !== (tx.note ?? "") && dispatch({ type: "tx/update", id: tx.id, patch: { note } })}
            rows={3}
            placeholder="Add context for your accountant"
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </Field>
        <div>
          <p className="mb-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400">Receipt</p>
          {tx.receipt ? (
            <div className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800">
              <span className="flex items-center gap-2">
                <Paperclip className="size-4 text-zinc-400" /> {tx.receipt}
              </span>
              <Button size="sm" variant="ghost" onClick={() => dispatch({ type: "tx/update", id: tx.id, patch: { receipt: undefined } })}>
                Remove
              </Button>
            </div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-dashed border-zinc-300 px-3 py-6 text-sm text-zinc-500 hover:border-indigo-400 dark:border-zinc-700">
              <Paperclip className="size-4" />
              Upload a receipt
              <input
                type="file"
                className="sr-only"
                accept="image/*,.pdf"
                data-testid="receipt-upload"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  dispatch({ type: "tx/update", id: tx.id, patch: { receipt: f.name } });
                  toast("Receipt attached");
                }}
              />
            </label>
          )}
        </div>
      </div>
    </Drawer>
  );
}
