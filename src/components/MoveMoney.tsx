import { ArrowLeft, Check, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { isoDay } from "../data/seed";
import type { Recipient } from "../data/types";
import { cx, longDate, money, parseDollars, uid } from "../lib/format";
import { useDispatch, useStore } from "../state/store";
import { useToast } from "../state/toast";
import { Button, Field, Input, Modal, Select } from "./ui";

type Step = "recipient" | "amount" | "review" | "done";

export function SendMoneyModal({ open, onClose, initialRecipientId }: { open: boolean; onClose: () => void; initialRecipientId?: string }) {
  const { recipients, accounts } = useStore();
  const dispatch = useDispatch();
  const toast = useToast();
  const checking = accounts.filter((a) => a.type === "checking");

  const [step, setStep] = useState<Step>(initialRecipientId ? "amount" : "recipient");
  const [recipientId, setRecipientId] = useState(initialRecipientId ?? "");
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Omit<Recipient, "id">>({ name: "", email: "", bank: "", last4: "", method: "ach" });
  const [amountText, setAmountText] = useState("");
  const [accountId, setAccountId] = useState(checking[0]?.id ?? "");
  const [date, setDate] = useState(isoDay(new Date()));
  const [memo, setMemo] = useState("");
  const [touched, setTouched] = useState(false);

  const recipient = recipients.find((r) => r.id === recipientId);
  const account = accounts.find((a) => a.id === accountId);
  const amount = parseDollars(amountText);
  const today = isoDay(new Date());

  const amountError = !touched ? undefined : amount === null || amount <= 0 ? "Enter an amount greater than $0" : account && amount > account.balance ? `Exceeds available balance of ${money(account.balance)}` : undefined;
  const dateError = date < today ? "Date can't be in the past" : undefined;
  const draftValid = draft.name.trim() && /\S+@\S+\.\S+/.test(draft.email) && draft.bank.trim() && /^\d{4}$/.test(draft.last4);

  const filtered = useMemo(() => recipients.filter((r) => r.name.toLowerCase().includes(query.toLowerCase())), [recipients, query]);

  const close = () => {
    onClose();
    setTimeout(() => {
      setStep(initialRecipientId ? "amount" : "recipient");
      setAmountText("");
      setMemo("");
      setTouched(false);
      setAdding(false);
    }, 0);
  };

  const submit = () => {
    if (!recipient || !amount) return;
    dispatch({ type: "payment/send", recipientId: recipient.id, accountId, amount, date, memo });
    toast(`${money(amount)} to ${recipient.name} ${date === today ? "is on its way" : `scheduled for ${longDate(date)}`}`);
    setStep("done");
  };

  const steps: Step[] = ["recipient", "amount", "review"];
  return (
    <Modal open={open} onClose={close} title="Send money" testId="send-money-modal">
      {step !== "done" && (
        <ol className="flex items-center gap-2 text-xs text-zinc-500" aria-label="Progress">
          {steps.map((s, i) => (
            <li key={s} className={cx("flex items-center gap-2", steps.indexOf(step) >= i && "font-medium text-indigo-600 dark:text-indigo-400")}>
              <span className={cx("flex size-5 items-center justify-center rounded-full border text-[10px]", steps.indexOf(step) >= i ? "border-indigo-600 bg-indigo-600 text-white" : "border-zinc-300")}>{i + 1}</span>
              {s === "recipient" ? "Recipient" : s === "amount" ? "Amount" : "Review"}
              {i < 2 && <span className="mx-1 h-px w-6 bg-zinc-200 dark:bg-zinc-700" />}
            </li>
          ))}
        </ol>
      )}

      {step === "recipient" && !adding && (
        <div className="space-y-3">
          <Input placeholder="Search recipients" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search recipients" />
          <ul className="max-h-64 divide-y divide-zinc-100 overflow-y-auto rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800" data-testid="recipient-list">
            {filtered.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => {
                    setRecipientId(r.id);
                    setStep("amount");
                  }}
                  className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  <span>
                    <span className="block font-medium">{r.name}</span>
                    <span className="text-xs text-zinc-500">
                      {r.bank} ••{r.last4} · {r.method.toUpperCase()}
                    </span>
                  </span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && <li className="px-3 py-6 text-center text-sm text-zinc-500">No recipients match “{query}”</li>}
          </ul>
          <Button variant="ghost" onClick={() => setAdding(true)}>
            <Plus className="size-4" /> Add new recipient
          </Button>
        </div>
      )}

      {step === "recipient" && adding && (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!draftValid) return;
            const r = { ...draft, id: uid("rec") };
            dispatch({ type: "recipient/add", recipient: r });
            setRecipientId(r.id);
            setAdding(false);
            setStep("amount");
          }}
        >
          <Field label="Name">
            <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </Field>
          <Field label="Email">
            <Input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Bank">
              <Input value={draft.bank} onChange={(e) => setDraft({ ...draft, bank: e.target.value })} />
            </Field>
            <Field label="Account last 4" hint="4 digits">
              <Input inputMode="numeric" maxLength={4} value={draft.last4} onChange={(e) => setDraft({ ...draft, last4: e.target.value.replace(/\D/g, "") })} />
            </Field>
          </div>
          <Field label="Method">
            <Select value={draft.method} onChange={(e) => setDraft({ ...draft, method: e.target.value as "ach" | "wire" })}>
              <option value="ach">ACH (1–2 business days, free)</option>
              <option value="wire">Domestic wire (same day)</option>
            </Select>
          </Field>
          <div className="flex justify-between pt-2">
            <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
              <ArrowLeft className="size-4" /> Back
            </Button>
            <Button type="submit" variant="primary" disabled={!draftValid}>
              Save recipient
            </Button>
          </div>
        </form>
      )}

      {step === "amount" && recipient && (
        <div className="space-y-4">
          <div className="rounded-lg bg-zinc-50 px-3 py-2.5 text-sm dark:bg-zinc-800">
            To <span className="font-medium">{recipient.name}</span> · {recipient.method.toUpperCase()} ••{recipient.last4}
          </div>
          <Field label="Amount" error={amountError}>
            <Input autoFocus inputMode="decimal" placeholder="$0.00" value={amountText} onChange={(e) => setAmountText(e.target.value)} onBlur={() => setTouched(true)} data-testid="amount-input" />
          </Field>
          <Field label="From account" hint={account ? `Available ${money(account.balance)}` : undefined}>
            <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              {checking.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ••{a.last4}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Send on" error={dateError}>
            <Input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Memo (optional)">
            <Input value={memo} maxLength={80} onChange={(e) => setMemo(e.target.value)} placeholder="e.g. October retainer" />
          </Field>
          <div className="flex justify-between pt-2">
            <Button variant="ghost" onClick={() => setStep("recipient")}>
              <ArrowLeft className="size-4" /> Back
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setTouched(true);
                if (amount && amount > 0 && account && amount <= account.balance && !dateError) setStep("review");
              }}
            >
              Review
            </Button>
          </div>
        </div>
      )}

      {step === "review" && recipient && amount && account && (
        <div className="space-y-4">
          <dl className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 text-sm dark:divide-zinc-800 dark:border-zinc-800" data-testid="payment-review">
            {[
              ["Amount", money(amount)],
              ["To", `${recipient.name} (${recipient.bank} ••${recipient.last4})`],
              ["From", `${account.name} ••${account.last4}`],
              ["Method", recipient.method === "wire" ? "Domestic wire" : "ACH"],
              ["Date", date === today ? "Today" : longDate(date)],
              ["Memo", memo || "—"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 px-3 py-2.5">
                <dt className="text-zinc-500">{k}</dt>
                <dd className="text-right font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep("amount")}>
              <ArrowLeft className="size-4" /> Edit
            </Button>
            <Button variant="primary" onClick={submit} data-testid="confirm-send">
              Send {money(amount)}
            </Button>
          </div>
        </div>
      )}

      {step === "done" && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950">
            <Check className="size-6" />
          </span>
          <p className="font-medium">Payment submitted</p>
          <p className="text-sm text-zinc-500">It shows as pending in Transactions until it settles.</p>
          <Button variant="primary" onClick={close}>
            Done
          </Button>
        </div>
      )}
    </Modal>
  );
}

export function TransferModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { accounts } = useStore();
  const dispatch = useDispatch();
  const toast = useToast();
  const [fromId, setFromId] = useState(accounts[0]?.id ?? "");
  const [toId, setToId] = useState(accounts[2]?.id ?? "");
  const [amountText, setAmountText] = useState("");
  const from = accounts.find((a) => a.id === fromId);
  const amount = parseDollars(amountText);
  const error = !amountText ? undefined : amount === null || amount <= 0 ? "Enter a valid amount" : from && amount > from.balance ? "Not enough funds in this account" : fromId === toId ? "Pick two different accounts" : undefined;
  const valid = amount && amount > 0 && !error;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Transfer between accounts"
      testId="transfer-modal"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!valid}
            onClick={() => {
              if (!amount) return;
              dispatch({ type: "transfer", fromId, toId, amount });
              toast(`Moved ${money(amount)} to ${accounts.find((a) => a.id === toId)?.name}`);
              setAmountText("");
              onClose();
            }}
          >
            Transfer
          </Button>
        </>
      }
    >
      <Field label="From">
        <Select value={fromId} onChange={(e) => setFromId(e.target.value)}>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} — {money(a.balance)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="To">
        <Select value={toId} onChange={(e) => setToId(e.target.value)}>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} — {money(a.balance)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Amount" error={error}>
        <Input inputMode="decimal" placeholder="$0.00" value={amountText} onChange={(e) => setAmountText(e.target.value)} />
      </Field>
    </Modal>
  );
}
