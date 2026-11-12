import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Badge, Button, Empty, Field, Input, Modal, PageHeader, Panel, Tabs } from "../components/ui";
import { isoDay } from "../data/seed";
import type { Invoice, InvoiceItem, InvoiceStatus } from "../data/types";
import { longDate, money, parseDollars, uid } from "../lib/format";
import { invoiceTotal, useDispatch, useStore } from "../state/store";
import { useToast } from "../state/toast";

const tone = { draft: "gray", sent: "blue", paid: "green", overdue: "red" } as const;
type Filter = "all" | InvoiceStatus;

export function Invoices() {
  const { invoices } = useStore();
  const dispatch = useDispatch();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState<Filter>("all");
  const [creating, setCreating] = useState(params.get("new") === "1");
  const [viewing, setViewing] = useState<Invoice | null>(null);

  useEffect(() => {
    if (params.get("new") === "1") {
      setCreating(true);
      params.delete("new");
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  const list = invoices.filter((i) => filter === "all" || i.status === filter);
  const outstanding = invoices.filter((i) => i.status === "sent" || i.status === "overdue").reduce((s, i) => s + invoiceTotal(i), 0);
  const overdue = invoices.filter((i) => i.status === "overdue").reduce((s, i) => s + invoiceTotal(i), 0);
  const paid = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + invoiceTotal(i), 0);
  const count = (s: InvoiceStatus) => invoices.filter((i) => i.status === s).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        subtitle="Bill customers and track what you're owed."
        actions={
          <Button variant="primary" onClick={() => setCreating(true)} data-testid="new-invoice">
            <Plus className="size-4" /> New invoice
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Outstanding", outstanding],
          ["Overdue", overdue],
          ["Collected", paid],
        ].map(([k, v]) => (
          <Panel key={k as string}>
            <p className="text-sm text-zinc-500">{k}</p>
            <p className="tabular mt-1 text-xl font-semibold">{money(v as number)}</p>
          </Panel>
        ))}
      </div>
      <Panel
        padded={false}
        title="All invoices"
        action={
          <Tabs<Filter>
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All", count: invoices.length },
              { value: "draft", label: "Draft", count: count("draft") },
              { value: "sent", label: "Sent", count: count("sent") },
              { value: "overdue", label: "Overdue", count: count("overdue") },
              { value: "paid", label: "Paid", count: count("paid") },
            ]}
          />
        }
      >
        {list.length === 0 ? (
          <Empty title="No invoices here" action={<Button onClick={() => setCreating(true)}>Create invoice</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm" data-testid="invoice-table">
              <thead className="border-b border-zinc-100 text-left text-xs text-zinc-500 dark:border-zinc-800">
                <tr>
                  <th className="px-5 py-2.5 font-medium">Invoice</th>
                  <th className="px-5 py-2.5 font-medium">Customer</th>
                  <th className="px-5 py-2.5 font-medium">Due</th>
                  <th className="px-5 py-2.5 font-medium">Status</th>
                  <th className="px-5 py-2.5 text-right font-medium">Amount</th>
                  <th className="px-5 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {list.map((inv) => (
                  <tr key={inv.id} className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50" onClick={() => setViewing(inv)}>
                    <td className="px-5 py-3 font-medium">{inv.number}</td>
                    <td className="px-5 py-3">{inv.customer}</td>
                    <td className="px-5 py-3 text-zinc-500">{longDate(inv.dueDate)}</td>
                    <td className="px-5 py-3">
                      <Badge tone={tone[inv.status]}>{inv.status}</Badge>
                    </td>
                    <td className="tabular px-5 py-3 text-right font-medium">{money(invoiceTotal(inv))}</td>
                    <td className="px-5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      {inv.status === "draft" && (
                        <Button size="sm" onClick={() => { dispatch({ type: "invoice/setStatus", id: inv.id, status: "sent" }); toast(`${inv.number} sent to ${inv.email}`); }}>
                          Send
                        </Button>
                      )}
                      {(inv.status === "sent" || inv.status === "overdue") && (
                        <Button size="sm" onClick={() => { dispatch({ type: "invoice/setStatus", id: inv.id, status: "paid" }); toast(`${inv.number} marked paid`); }} data-testid="mark-paid">
                          Mark paid
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <InvoiceEditor open={creating} onClose={() => setCreating(false)} />

      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing?.number ?? ""} wide>
        {viewing && (
          <div className="space-y-4 text-sm">
            <div className="flex justify-between">
              <div>
                <p className="font-medium">{viewing.customer}</p>
                <p className="text-zinc-500">{viewing.email}</p>
              </div>
              <div className="text-right text-zinc-500">
                <p>Issued {longDate(viewing.issueDate)}</p>
                <p>Due {longDate(viewing.dueDate)}</p>
              </div>
            </div>
            <table className="w-full">
              <thead className="text-left text-xs text-zinc-500">
                <tr>
                  <th className="py-1.5 font-medium">Item</th>
                  <th className="py-1.5 text-right font-medium">Qty</th>
                  <th className="py-1.5 text-right font-medium">Price</th>
                  <th className="py-1.5 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {viewing.items.map((it, i) => (
                  <tr key={i}>
                    <td className="py-2">{it.description}</td>
                    <td className="tabular py-2 text-right">{it.quantity}</td>
                    <td className="tabular py-2 text-right">{money(it.unitPrice)}</td>
                    <td className="tabular py-2 text-right">{money(it.quantity * it.unitPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="tabular text-right text-lg font-semibold">Total {money(invoiceTotal(viewing))}</p>
            <div className="flex justify-between">
              <Button
                variant="ghost"
                onClick={() => {
                  dispatch({ type: "invoice/delete", id: viewing.id });
                  toast(`${viewing.number} deleted`);
                  setViewing(null);
                }}
              >
                <Trash2 className="size-4" /> Delete
              </Button>
              <Button onClick={() => setViewing(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

type DraftItem = { description: string; quantity: string; unitPrice: string };

function InvoiceEditor({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { invoices } = useStore();
  const dispatch = useDispatch();
  const toast = useToast();
  const due = new Date();
  due.setDate(due.getDate() + 30);
  const [customer, setCustomer] = useState("");
  const [email, setEmail] = useState("");
  const [dueDate, setDueDate] = useState(isoDay(due));
  const [items, setItems] = useState<DraftItem[]>([{ description: "", quantity: "1", unitPrice: "" }]);
  const [tried, setTried] = useState(false);

  const parsed: (InvoiceItem | null)[] = items.map((i) => {
    const q = Number(i.quantity);
    const p = parseDollars(i.unitPrice);
    return i.description.trim() && Number.isInteger(q) && q > 0 && p && p > 0 ? { description: i.description.trim(), quantity: q, unitPrice: p } : null;
  });
  const total = parsed.reduce((s, i) => s + (i ? i.quantity * i.unitPrice : 0), 0);
  const emailOk = /\S+@\S+\.\S+/.test(email);
  const valid = customer.trim() && emailOk && parsed.every(Boolean);
  const nextNumber = `INV-${Math.max(1039, ...invoices.map((i) => Number(i.number.split("-")[1]) || 0)) + 1}`;

  const save = (status: InvoiceStatus) => {
    setTried(true);
    if (!valid) return;
    dispatch({ type: "invoice/create", invoice: { id: uid("inv"), number: nextNumber, customer: customer.trim(), email, issueDate: isoDay(new Date()), dueDate, items: parsed as InvoiceItem[], status } });
    toast(status === "draft" ? `${nextNumber} saved as draft` : `${nextNumber} sent to ${email}`);
    setCustomer("");
    setEmail("");
    setItems([{ description: "", quantity: "1", unitPrice: "" }]);
    setTried(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`New invoice · ${nextNumber}`}
      wide
      testId="invoice-editor"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => save("draft")}>Save draft</Button>
          <Button variant="primary" onClick={() => save("sent")} data-testid="send-invoice">
            Send invoice
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Customer" error={tried && !customer.trim() ? "Required" : undefined}>
          <Input value={customer} onChange={(e) => setCustomer(e.target.value)} />
        </Field>
        <Field label="Billing email" error={tried && !emailOk ? "Enter a valid email" : undefined}>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Due date">
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </Field>
      </div>
      <div className="space-y-2">
        <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Line items</p>
        {items.map((it, i) => (
          <div key={i} className="grid grid-cols-[1fr_70px_110px_32px] gap-2">
            <Input aria-label="Description" placeholder="Description" value={it.description} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} className={tried && !parsed[i] ? "border-rose-400" : ""} />
            <Input aria-label="Quantity" inputMode="numeric" value={it.quantity} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)))} />
            <Input aria-label="Unit price" inputMode="decimal" placeholder="$0.00" value={it.unitPrice} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, unitPrice: e.target.value } : x)))} />
            <button aria-label="Remove line" disabled={items.length === 1} className="text-zinc-400 hover:text-rose-600 disabled:opacity-30" onClick={() => setItems(items.filter((_, j) => j !== i))}>
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
        <Button size="sm" variant="ghost" onClick={() => setItems([...items, { description: "", quantity: "1", unitPrice: "" }])}>
          <Plus className="size-3.5" /> Add line
        </Button>
      </div>
      <p className="tabular text-right text-lg font-semibold" data-testid="invoice-total">
        Total {money(total)}
      </p>
    </Modal>
  );
}
