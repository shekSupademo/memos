import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Link } from "react-router-dom";
import { PageHeader, Panel, Tabs } from "../components/ui";
import { CATEGORY_COLORS, daysAgoIso, monthlyInOut, spendByCategory, topMerchants } from "../lib/analytics";
import { money, moneyCompact, monthLabel } from "../lib/format";
import { useStore } from "../state/store";

type Range = "30" | "90" | "180";

export function Insights() {
  const { transactions } = useStore();
  const [range, setRange] = useState<Range>("90");
  const since = daysAgoIso(Number(range));
  const cats = useMemo(() => spendByCategory(transactions, since), [transactions, since]);
  const merchants = useMemo(() => topMerchants(transactions, since), [transactions, since]);
  const flows = useMemo(() => monthlyInOut(transactions, 6).map((f) => ({ ...f, net: f.moneyIn - f.moneyOut })), [transactions]);
  const totalSpend = cats.reduce((s, c) => s + c.amount, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Insights" subtitle="Where your money goes, and how it's trending." actions={<Tabs value={range} onChange={setRange} options={[{ value: "30", label: "30 days" }, { value: "90", label: "90 days" }, { value: "180", label: "6 months" }]} />} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Spend by category" data-testid="category-chart">
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <div className="h-56 w-56 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie isAnimationActive={false} data={cats} dataKey="amount" nameKey="category" innerRadius={60} outerRadius={95} paddingAngle={1}>
                    {cats.map((c) => (
                      <Cell key={c.category} fill={CATEGORY_COLORS[c.category]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => money(v)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="w-full space-y-1.5 text-sm">
              {cats.map((c) => (
                <li key={c.category}>
                  <Link to={`/transactions?category=${encodeURIComponent(c.category)}`} className="flex items-center justify-between gap-2 rounded px-1 hover:bg-zinc-50 dark:hover:bg-zinc-800">
                    <span className="flex items-center gap-2">
                      <span className="size-2.5 rounded-sm" style={{ background: CATEGORY_COLORS[c.category] }} />
                      {c.category}
                    </span>
                    <span className="tabular text-zinc-500">
                      {money(c.amount)} · {((c.amount / totalSpend) * 100).toFixed(0)}%
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </Panel>
        <Panel title="Top vendors">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={merchants} layout="vertical" margin={{ left: 24, right: 12 }}>
                <XAxis type="number" tickFormatter={(v: number) => moneyCompact(v)} tick={{ fontSize: 10, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: number) => money(v)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar isAnimationActive={false} dataKey="amount" name="Spend" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
      <Panel title="Net cash flow by month">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={flows} margin={{ left: 0, right: 12 }}>
              <CartesianGrid vertical={false} stroke="#e4e4e7" strokeOpacity={0.5} />
              <XAxis dataKey="month" tickFormatter={monthLabel} tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v: number) => moneyCompact(v)} tick={{ fontSize: 10, fill: "#a1a1aa" }} axisLine={false} tickLine={false} width={64} />
              <Tooltip formatter={(v: number) => money(v)} labelFormatter={(l: string) => monthLabel(l)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line isAnimationActive={false} type="monotone" dataKey="moneyIn" name="Money in" stroke="#10b981" strokeWidth={2} dot={false} />
              <Line isAnimationActive={false} type="monotone" dataKey="moneyOut" name="Money out" stroke="#f43f5e" strokeWidth={2} dot={false} />
              <Line isAnimationActive={false} type="monotone" dataKey="net" name="Net" stroke="#6366f1" strokeWidth={2} strokeDasharray="4 3" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>
    </div>
  );
}
