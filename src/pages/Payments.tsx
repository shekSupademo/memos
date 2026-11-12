import { Plus, Send } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge, Button, Empty, Input, PageHeader, Panel, Tabs } from "../components/ui";
import { isoDay } from "../data/seed";
import { longDate, money } from "../lib/format";
import { useStore } from "../state/store";
import { useUI } from "../state/ui";

export function Payments() {
  const { recipients, transactions, accounts } = useStore();
  const ui = useUI();
  const [tab, setTab] = useState<"upcoming" | "recent">("upcoming");
  const [q, setQ] = useState("");
  const today = isoDay(new Date());

  const outgoing = transactions.filter((t) => t.amount < 0 && (t.method === "ach" || t.method === "wire"));
  const upcoming = outgoing.filter((t) => t.status === "pending" || t.date > today).sort((a, b) => a.date.localeCompare(b.date));
  const recent = outgoing.filter((t) => t.status !== "pending" && t.date <= today).slice(0, 30);
  const list = tab === "upcoming" ? upcoming : recent;

  const paidTo = useMemo(() => {
    const m = new Map<string, { total: number; last?: string }>();
    for (const t of outgoing) {
      const row = m.get(t.counterparty) ?? { total: 0 };
      row.total -= t.amount;
      if (!row.last || t.date > row.last) row.last = t.date;
      m.set(t.counterparty, row);
    }
    return m;
  }, [outgoing]);

  const filteredRecipients = recipients.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        subtitle="Pay vendors and contractors by ACH or wire."
        actions={
          <Button variant="primary" onClick={() => ui.openSend()} data-testid="payments-send">
            <Send className="size-4" /> Send money
          </Button>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Payments" className="lg:col-span-2" padded={false} action={<Tabs value={tab} onChange={setTab} options={[{ value: "upcoming", label: "Upcoming", count: upcoming.length }, { value: "recent", label: "Recent" }]} />}>
          {list.length === 0 ? (
            <Empty title={tab === "upcoming" ? "No upcoming payments" : "No payments yet"} body="Payments you send or schedule show up here." action={<Button onClick={() => ui.openSend()}>Send money</Button>} />
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800" data-testid="payment-list">
              {list.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                  <div>
                    <p className="font-medium">{t.counterparty}</p>
                    <p className="text-xs text-zinc-500">
                      {t.method.toUpperCase()} · from {accounts.find((a) => a.id === t.accountId)?.name} · {t.date > today ? `scheduled ${longDate(t.date)}` : longDate(t.date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge tone={t.status === "pending" ? "amber" : t.status === "failed" ? "red" : "green"}>{t.status === "posted" ? "sent" : t.status}</Badge>
                    <span className="tabular font-medium">{money(-t.amount)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Recipients" padded={false} action={<Button size="sm" variant="ghost" onClick={() => ui.openSend()}><Plus className="size-3.5" /> New</Button>}>
          <div className="p-3">
            <Input placeholder="Search recipients" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search recipients" />
          </div>
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800" data-testid="recipients">
            {filteredRecipients.map((r) => {
              const stats = paidTo.get(r.name);
              return (
                <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{r.name}</p>
                    <p className="truncate text-xs text-zinc-500">
                      {r.bank} ••{r.last4} · {stats ? `${money(stats.total)} paid` : "Never paid"}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => ui.openSend(r.id)} aria-label={`Pay ${r.name}`}>
                    Pay
                  </Button>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
