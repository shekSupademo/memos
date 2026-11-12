const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const usdCompact = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });

export const money = (cents: number) => usd.format(cents / 100);
export const moneyCompact = (cents: number) => usdCompact.format(cents / 100);
export const signedMoney = (cents: number) => (cents > 0 ? `+${money(cents)}` : money(cents));

export const shortDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
export const longDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
export const monthKey = (iso: string) => iso.slice(0, 7);
export const monthLabel = (key: string) =>
  new Date(`${key}-15T12:00:00`).toLocaleDateString("en-US", { month: "short" });

export const parseDollars = (input: string): number | null => {
  const cleaned = input.replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  return Math.round(Number(cleaned) * 100);
};

export const uid = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");
