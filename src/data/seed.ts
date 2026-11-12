import type { Account, AppState, Card, Category, Invoice, Member, Recipient, Transaction, TxMethod } from "./types";

// Small deterministic PRNG so every fresh load shows the same demo data.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20261112);
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
const between = (min: number, max: number) => Math.round(min + rand() * (max - min));

export const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (n: number) => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return isoDay(d);
};

const accounts: Account[] = [
  { id: "acc_ops", name: "Operating", type: "checking", last4: "4821", balance: 0 },
  { id: "acc_pay", name: "Payroll", type: "checking", last4: "1197", balance: 0 },
  { id: "acc_sav", name: "Reserve", type: "savings", last4: "6604", balance: 0, apy: 3.25 },
  { id: "acc_tre", name: "Treasury", type: "treasury", last4: "9033", balance: 0, apy: 4.1 },
];

const opening: Record<string, number> = {
  acc_ops: 131_250_000,
  acc_pay: 9_800_000,
  acc_sav: 62_000_000,
  acc_tre: 150_000_000,
};

const cards: Card[] = [
  { id: "card_1", name: "Ops spend", holder: "Avery Chen", last4: "3011", kind: "physical", monthlyLimit: 2_500_000, frozen: false, accountId: "acc_ops", color: "from-indigo-500 to-violet-600" },
  { id: "card_2", name: "Ads", holder: "Jordan Patel", last4: "7720", kind: "virtual", monthlyLimit: 4_000_000, frozen: false, accountId: "acc_ops", color: "from-sky-500 to-cyan-600" },
  { id: "card_3", name: "Travel", holder: "Sam Rivera", last4: "5148", kind: "physical", monthlyLimit: 1_500_000, frozen: false, accountId: "acc_ops", color: "from-emerald-500 to-teal-600" },
  { id: "card_4", name: "SaaS tools", holder: "Avery Chen", last4: "2296", kind: "virtual", monthlyLimit: 800_000, frozen: true, accountId: "acc_ops", color: "from-amber-500 to-orange-600" },
];

const recipients: Recipient[] = [
  { id: "rec_1", name: "Brightline Studio", email: "billing@brightline.example", bank: "First Harbor Bank", last4: "2210", method: "ach" },
  { id: "rec_2", name: "Kestrel Legal LLP", email: "ar@kestrel.example", bank: "Union Pacific Trust", last4: "8841", method: "wire" },
  { id: "rec_3", name: "Maya Okafor", email: "maya@contractor.example", bank: "Cobalt Credit Union", last4: "0937", method: "ach" },
  { id: "rec_4", name: "Northwind Realty", email: "leasing@northwind.example", bank: "First Harbor Bank", last4: "5502", method: "ach" },
  { id: "rec_5", name: "Pixel Forge Inc.", email: "pay@pixelforge.example", bank: "Meridian Bank", last4: "7319", method: "wire" },
];

type Merchant = { name: string; category: Category; method: TxMethod; min: number; max: number; card?: string; income?: boolean };
const merchants: Merchant[] = [
  { name: "Cloudstack", category: "Software", method: "card", min: 4_000, max: 180_000, card: "card_4" },
  { name: "Figment Design", category: "Software", method: "card", min: 1_500, max: 45_000, card: "card_4" },
  { name: "Gridmail", category: "Software", method: "card", min: 900, max: 12_000, card: "card_4" },
  { name: "Searchly Ads", category: "Advertising", method: "card", min: 20_000, max: 450_000, card: "card_2" },
  { name: "Socialreach", category: "Advertising", method: "card", min: 15_000, max: 300_000, card: "card_2" },
  { name: "SkyHop Airlines", category: "Travel", method: "card", min: 18_000, max: 140_000, card: "card_3" },
  { name: "Harbor Hotels", category: "Travel", method: "card", min: 14_000, max: 90_000, card: "card_3" },
  { name: "RideNow", category: "Travel", method: "card", min: 1_200, max: 7_500, card: "card_3" },
  { name: "Green Fork Cafe", category: "Meals", method: "card", min: 1_100, max: 16_000, card: "card_1" },
  { name: "Lunchbox Catering", category: "Meals", method: "card", min: 20_000, max: 95_000, card: "card_1" },
  { name: "Paper & Co", category: "Office", method: "card", min: 2_000, max: 35_000, card: "card_1" },
  { name: "Desk Depot", category: "Office", method: "card", min: 8_000, max: 120_000, card: "card_1" },
  { name: "Maya Okafor", category: "Contractors", method: "ach", min: 250_000, max: 600_000 },
  { name: "Pixel Forge Inc.", category: "Contractors", method: "wire", min: 400_000, max: 1_200_000 },
  { name: "Volt Energy", category: "Utilities", method: "ach", min: 18_000, max: 60_000 },
  { name: "FiberLink", category: "Utilities", method: "ach", min: 9_900, max: 9_900 },
  { name: "Acme Robotics", category: "Revenue", method: "ach", min: 500_000, max: 1_800_000, income: true },
  { name: "Lumen Health", category: "Revenue", method: "wire", min: 600_000, max: 2_200_000, income: true },
  { name: "Orbit Retail", category: "Revenue", method: "ach", min: 200_000, max: 800_000, income: true },
  { name: "Stripe-like Payouts", category: "Revenue", method: "ach", min: 100_000, max: 450_000, income: true },
  { name: "Unknown merchant", category: "Uncategorized", method: "card", min: 500, max: 25_000, card: "card_1" },
];

function buildTransactions(): Transaction[] {
  const txs: Transaction[] = [];
  let n = 0;
  const id = () => `tx_${(++n).toString().padStart(4, "0")}`;

  for (let day = 180; day >= 0; day--) {
    const date = daysAgo(day);
    const dow = new Date(`${date}T12:00:00`).getDay();
    const count = dow === 0 || dow === 6 ? between(0, 2) : between(2, 5);
    for (let i = 0; i < count; i++) {
      const m = pick(merchants);
      const amt = between(m.min, m.max);
      txs.push({
        id: id(),
        date,
        counterparty: m.name,
        description: m.income ? `Payment from ${m.name}` : m.method === "card" ? `${m.name} purchase` : `${m.method.toUpperCase()} to ${m.name}`,
        amount: m.income ? amt : -amt,
        accountId: "acc_ops",
        category: m.category,
        status: day <= 2 && rand() < 0.5 ? "pending" : rand() < 0.015 ? "failed" : "posted",
        method: m.method,
        cardId: m.card,
        receipt: m.method === "card" && rand() < 0.6 ? `receipt-${n}.pdf` : undefined,
      });
    }
    const dom = new Date(`${date}T12:00:00`).getDate();
    if (dom === 1) {
      txs.push({ id: id(), date, counterparty: "Northwind Realty", description: "Office lease", amount: -1_150_000, accountId: "acc_ops", category: "Rent", status: "posted", method: "ach" });
      txs.push({ id: id(), date, counterparty: "Treasury yield", description: "Monthly interest", amount: between(450_000, 560_000), accountId: "acc_tre", category: "Revenue", status: "posted", method: "transfer" });
    }
    if (dom === 15 || dom === 28) {
      txs.push({ id: id(), date, counterparty: "Payroll run", description: "Semi-monthly payroll", amount: -between(5_800_000, 6_400_000), accountId: "acc_pay", category: "Payroll", status: "posted", method: "ach" });
      txs.push({ id: id(), date, counterparty: "Operating ↔ Payroll", description: "Fund payroll", amount: 6_500_000, accountId: "acc_pay", category: "Transfer", status: "posted", method: "transfer" });
      txs.push({ id: id(), date, counterparty: "Operating ↔ Payroll", description: "Fund payroll", amount: -6_500_000, accountId: "acc_ops", category: "Transfer", status: "posted", method: "transfer" });
    }
    if (dom === 20 && day % 3 === 0) {
      txs.push({ id: id(), date, counterparty: "State Revenue Dept.", description: "Quarterly estimated tax", amount: -2_400_000, accountId: "acc_ops", category: "Taxes", status: "posted", method: "ach" });
    }
  }
  return txs.reverse(); // newest first
}

function invoices(): Invoice[] {
  const customers = [
    ["Acme Robotics", "ap@acme.example"],
    ["Lumen Health", "finance@lumen.example"],
    ["Orbit Retail", "payables@orbit.example"],
    ["Juniper Schools", "accounts@juniper.example"],
    ["Copperline Media", "billing@copperline.example"],
  ] as const;
  const statuses = ["paid", "paid", "sent", "overdue", "draft", "paid", "sent", "paid"] as const;
  return statuses.map((status, i) => {
    const [customer, email] = customers[i % customers.length];
    const issued = 75 - i * 9;
    return {
      id: `inv_${i + 1}`,
      number: `INV-${String(1040 + i)}`,
      customer,
      email,
      issueDate: daysAgo(issued),
      dueDate: daysAgo(issued - 30),
      status,
      items: [
        { description: "Platform subscription", quantity: 1, unitPrice: between(400_000, 1_200_000) },
        { description: "Implementation hours", quantity: between(4, 24), unitPrice: 17_500 },
      ],
    };
  });
}

const members: Member[] = [
  { id: "mem_1", name: "Avery Chen", email: "avery@northbeam.example", role: "admin", status: "active" },
  { id: "mem_2", name: "Jordan Patel", email: "jordan@northbeam.example", role: "employee", status: "active" },
  { id: "mem_3", name: "Sam Rivera", email: "sam@northbeam.example", role: "employee", status: "active" },
  { id: "mem_4", name: "Priya Nair", email: "priya@ledgerworks.example", role: "bookkeeper", status: "active" },
  { id: "mem_5", name: "Leo Martins", email: "leo@northbeam.example", role: "employee", status: "invited" },
];

export function createSeed(): AppState {
  const transactions = buildTransactions();
  const accs = accounts.map((a) => ({
    ...a,
    balance: opening[a.id] + transactions.filter((t) => t.accountId === a.id && t.status !== "failed").reduce((s, t) => s + t.amount, 0),
  }));
  return {
    accounts: accs,
    transactions,
    cards,
    recipients,
    invoices: invoices(),
    members,
    settings: {
      companyName: "Northbeam Labs",
      userName: "Avery Chen",
      theme: "system",
      notifications: { largeTransactions: true, weeklySummary: true, cardDeclines: true, invoicePaid: false },
      largeTransactionThreshold: 1_000_000,
    },
  };
}
