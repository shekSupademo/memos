import { ArrowLeftRight, Copy } from "lucide-react";
import { useMemo } from "react";
import { Navigate, useParams } from "react-router-dom";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TransactionTable } from "../components/TransactionTable";
import { Button, PageHeader, Panel } from "../components/ui";
import { balanceSeries } from "../lib/analytics";
import { money, shortDate } from "../lib/format";
import { useStore } from "../state/store";
import { useToast } from "../state/toast";
import { useUI } from "../state/ui";

export function AccountDetail() {
  const { id } = useParams();
  const state = useStore();
  const ui = useUI();
  const toast = useToast();
  const account = state.accounts.find((a) => a.id === id);
  const series = useMemo(() => (account ? balanceSeries(state.accounts, state.transactions, 90, account.id) : []), [state.accounts, state.transactions, account]);
  if (!account) return <Navigate to="/" replace />;
  const routing = "021000089";
  const accountNumber = `80055501${account.last4}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={account.name}
        subtitle={`${account.type[0].toUpperCase()}${account.type.slice(1)} ••${account.last4}${account.apy ? ` · earning ${account.apy}% APY` : ""}`}
        actions={
          <Button onClick={() => ui.openTransfer()}>
            <ArrowLeftRight className="size-4" /> Transfer
          </Button>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <p className="text-sm text-zinc-500">Available balance</p>
          <p className="tabular mt-1 text-3xl font-semibold" data-testid="account-balance">
            {money(account.balance)}
          </p>
          <div className="mt-4 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series}>
                <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} minTickGap={40} />
                <YAxis hide domain={["dataMin - 200000", "dataMax + 200000"]} />
                <Tooltip formatter={(v: number) => money(v)} labelFormatter={(l: string) => shortDate(l)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Area isAnimationActive={false} type="monotone" dataKey="balance" stroke="#6366f1" strokeWidth={2} fill="#6366f122" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Account details">
          <dl className="space-y-3 text-sm">
            {[
              ["Routing number", routing],
              ["Account number", accountNumber],
              ["Bank", "Partner Bank, N.A."],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-2">
                <dt className="text-zinc-500">{k}</dt>
                <dd className="flex items-center gap-2 font-medium">
                  <span className="tabular">{v}</span>
                  {k !== "Bank" && (
                    <button
                      aria-label={`Copy ${k}`}
                      className="text-zinc-400 hover:text-zinc-700"
                      onClick={() => {
                        navigator.clipboard?.writeText(v).catch(() => {});
                        toast(`${k} copied`);
                      }}
                    >
                      <Copy className="size-3.5" />
                    </button>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>
      <TransactionTable accountId={account.id} />
    </div>
  );
}
