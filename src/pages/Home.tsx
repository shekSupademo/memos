import { AlertTriangle, ArrowDownLeft, ArrowLeftRight, ArrowUpRight, FileText, Paperclip, Send, Snowflake } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TransactionTable } from "../components/TransactionTable";
import { Panel, Tabs } from "../components/ui";
import { isoDay } from "../data/seed";
import { balanceSeries, monthlyInOut } from "../lib/analytics";
import { money, moneyCompact, monthKey, monthLabel, shortDate } from "../lib/format";
import { useStore } from "../state/store";
import { useUI } from "../state/ui";

const RANGES = { "30": 30, "90": 90, "180": 180 } as const;
type Range = keyof typeof RANGES;

export function Home() {
  const state = useStore();
  const ui = useUI();
  const [range, setRange] = useState<Range>("90");
  const total = state.accounts.reduce((s, a) => s + a.balance, 0);
  const series = useMemo(() => balanceSeries(state.accounts, state.transactions, RANGES[range]), [state.accounts, state.transactions, range]);
  const change = total - (series[0]?.balance ?? total);
  const flows = useMemo(() => monthlyInOut(state.transactions, 6), [state.transactions]);
  const thisMonth = flows.find((f) => f.month === monthKey(isoDay(new Date()))) ?? { moneyIn: 0, moneyOut: 0 };
  const burn = flows.slice(-4, -1).reduce((s, f) => s + (f.moneyOut - f.moneyIn), 0) / 3;
  const runway = burn > 0 ? total / burn : Infinity;

  const attention = [
    { n: state.transactions.filter((t) => t.category === "Uncategorized").length, label: "uncategorized", noun: "transaction", to: "/transactions?category=Uncategorized", icon: AlertTriangle },
    { n: state.transactions.filter((t) => t.method === "card" && !t.receipt && t.amount < 0).length, label: "missing receipts", noun: "card charge", to: "/transactions", icon: Paperclip },
    { n: state.invoices.filter((i) => i.status === "overdue").length, label: "overdue", noun: "invoice", to: "/invoices", icon: FileText },
    { n: state.cards.filter((c) => c.frozen).length, label: "frozen", noun: "card", to: "/cards", icon: Snowflake },
  ].filter((a) => a.n > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-500">Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, {state.settings.userName.split(" ")[0]}</p>
          <h1 className="text-2xl font-semibold tracking-tight">Home</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => ui.openSend()} className="inline-flex h-9 items-center gap-2 rounded-lg bg-indigo-600 px-3.5 text-sm font-medium text-white hover:bg-indigo-500" data-testid="home-send">
            <Send className="size-4" /> Send
          </button>
          <button onClick={() => ui.openTransfer()} className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3.5 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900">
            <ArrowLeftRight className="size-4" /> Transfer
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2" data-testid="balance-panel">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-zinc-500">Total balance</p>
              <p className="tabular mt-1 text-3xl font-semibold tracking-tight" data-testid="total-balance">
                {money(total)}
              </p>
              <p className={`mt-1 text-sm ${change >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {change >= 0 ? "+" : ""}
                {money(change)} <span className="text-zinc-500">in the last {range} days</span>
              </p>
            </div>
            <Tabs value={range} onChange={setRange} options={[{ value: "30", label: "30D" }, { value: "90", label: "90D" }, { value: "180", label: "6M" }]} />
          </div>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="bal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} minTickGap={40} />
                <YAxis hide domain={["dataMin - 500000", "dataMax + 500000"]} />
                <Tooltip formatter={(v: number) => money(v)} labelFormatter={(l: string) => shortDate(l)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Area isAnimationActive={false} type="monotone" dataKey="balance" stroke="#6366f1" strokeWidth={2} fill="url(#bal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <div className="grid gap-6">
          <Panel>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="flex items-center gap-1 text-xs text-zinc-500">
                  <ArrowDownLeft className="size-3.5 text-emerald-600" /> Money in this month
                </p>
                <p className="tabular mt-1 text-lg font-semibold">{moneyCompact(thisMonth.moneyIn)}</p>
              </div>
              <div>
                <p className="flex items-center gap-1 text-xs text-zinc-500">
                  <ArrowUpRight className="size-3.5 text-rose-600" /> Money out this month
                </p>
                <p className="tabular mt-1 text-lg font-semibold">{moneyCompact(thisMonth.moneyOut)}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Avg. net burn (3 mo)</p>
                <p className="tabular mt-1 text-lg font-semibold">{burn > 0 ? moneyCompact(burn) : "Profitable"}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Runway</p>
                <p className="tabular mt-1 text-lg font-semibold" data-testid="runway">
                  {Number.isFinite(runway) ? `${runway.toFixed(1)} mo` : "∞"}
                </p>
              </div>
            </div>
          </Panel>
          <Panel title="Needs attention" data-testid="attention-panel">
            {attention.length === 0 ? (
              <p className="text-sm text-zinc-500">You're all caught up.</p>
            ) : (
              <ul className="space-y-2.5">
                {attention.map(({ n, label, noun, to, icon: Icon }) => (
                  <li key={label}>
                    <Link to={to} className="flex items-center gap-3 text-sm hover:text-indigo-600">
                      <Icon className="size-4 text-amber-500" />
                      <span>
                        <span className="font-semibold">{n}</span> {label === "missing receipts" ? `${noun}${n === 1 ? "" : "s"} missing receipts` : `${label} ${noun}${n === 1 ? "" : "s"}`}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" data-testid="account-cards">
        {state.accounts.map((a) => (
          <Link key={a.id} to={`/accounts/${a.id}`} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-indigo-300 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="flex items-center justify-between text-sm text-zinc-500">
              <span>{a.name}</span>
              <span className="text-xs">••{a.last4}</span>
            </p>
            <p className="tabular mt-2 text-xl font-semibold">{money(a.balance)}</p>
            <p className="mt-1 text-xs capitalize text-zinc-500">
              {a.type}
              {a.apy ? ` · ${a.apy}% APY` : ""}
            </p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Cash flow" className="lg:col-span-1">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={flows} margin={{ left: -12, right: 0, top: 4, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#e4e4e7" strokeOpacity={0.5} />
                <XAxis dataKey="month" tickFormatter={monthLabel} tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v: number) => moneyCompact(v)} tick={{ fontSize: 10, fill: "#a1a1aa" }} axisLine={false} tickLine={false} width={56} />
                <Tooltip formatter={(v: number) => money(v)} labelFormatter={(l: string) => monthLabel(l)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar isAnimationActive={false} dataKey="moneyIn" name="Money in" fill="#10b981" radius={[3, 3, 0, 0]} />
                <Bar isAnimationActive={false} dataKey="moneyOut" name="Money out" fill="#a1a1aa" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Recent transactions" className="lg:col-span-2" padded={false} action={<Link to="/transactions" className="text-xs font-medium text-indigo-600">View all</Link>}>
          <div className="p-3">
            <TransactionTable compact />
          </div>
        </Panel>
      </div>
    </div>
  );
}
