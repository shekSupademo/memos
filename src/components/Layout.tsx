import { ArrowLeftRight, BarChart3, ChevronDown, CreditCard, FileText, Home, List, Menu, Moon, Search, Send, Settings, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { cx, money } from "../lib/format";
import { useApplyTheme } from "../lib/theme";
import { useDispatch, useStore } from "../state/store";
import { useUI } from "../state/ui";
import { CommandPalette } from "./CommandPalette";

const nav = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/transactions", label: "Transactions", icon: List },
  { to: "/payments", label: "Payments", icon: Send },
  { to: "/cards", label: "Cards", icon: CreditCard },
  { to: "/invoices", label: "Invoices", icon: FileText },
  { to: "/insights", label: "Insights", icon: BarChart3 },
];

export function Layout() {
  const { accounts, settings, transactions } = useStore();
  const dispatch = useDispatch();
  const ui = useUI();
  const [palette, setPalette] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [moveMenu, setMoveMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  useApplyTheme(settings.theme);

  useEffect(() => setMobileNav(false), [location.pathname]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((p) => !p);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
  useEffect(() => {
    if (!moveMenu) return;
    const h = (e: MouseEvent) => !menuRef.current?.contains(e.target as Node) && setMoveMenu(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [moveMenu]);

  const total = accounts.reduce((s, a) => s + a.balance, 0);
  const uncategorized = transactions.filter((t) => t.category === "Uncategorized").length;
  const dark = document.documentElement.classList.contains("dark");

  const sidebar = (
    <nav className="flex h-full flex-col gap-6 p-4" aria-label="Main">
      <div className="flex items-center gap-2 px-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">N</span>
        <span className="font-semibold tracking-tight">{settings.companyName}</span>
      </div>
      <ul className="space-y-0.5">
        {nav.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) => cx("flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium", isActive ? "bg-zinc-200/70 text-zinc-900 dark:bg-zinc-800 dark:text-white" : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900")}
            >
              <Icon className="size-4" />
              {label}
              {to === "/transactions" && uncategorized > 0 && <span className="ml-auto rounded-full bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">{uncategorized}</span>}
            </NavLink>
          </li>
        ))}
      </ul>
      <div>
        <p className="px-2.5 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-400">Accounts</p>
        <ul className="space-y-0.5">
          {accounts.map((a) => (
            <li key={a.id}>
              <NavLink to={`/accounts/${a.id}`} className={({ isActive }) => cx("flex justify-between rounded-lg px-2.5 py-1.5 text-sm", isActive ? "bg-zinc-200/70 dark:bg-zinc-800" : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900")}>
                <span>{a.name}</span>
                <span className="tabular text-xs text-zinc-500">{money(a.balance).replace(/\.\d\d$/, "")}</span>
              </NavLink>
            </li>
          ))}
        </ul>
        <p className="mt-2 flex justify-between px-2.5 text-xs text-zinc-500">
          <span>Total</span>
          <span className="tabular font-medium text-zinc-700 dark:text-zinc-300">{money(total).replace(/\.\d\d$/, "")}</span>
        </p>
      </div>
      <div className="mt-auto">
        <NavLink to="/settings" className={({ isActive }) => cx("flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium", isActive ? "bg-zinc-200/70 dark:bg-zinc-800" : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900")}>
          <Settings className="size-4" /> Settings
        </NavLink>
      </div>
    </nav>
  );

  return (
    <div className="flex h-full">
      <aside className="hidden w-60 shrink-0 border-r border-zinc-200 bg-zinc-50 lg:block dark:border-zinc-800 dark:bg-zinc-950">{sidebar}</aside>
      {mobileNav && (
        <div className="fixed inset-0 z-40 bg-zinc-950/40 lg:hidden" onMouseDown={(e) => e.target === e.currentTarget && setMobileNav(false)}>
          <aside className="h-full w-64 bg-zinc-50 dark:bg-zinc-950">{sidebar}</aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-zinc-200 bg-white/80 px-4 backdrop-blur lg:px-8 dark:border-zinc-800 dark:bg-zinc-950/80">
          <button className="rounded p-1.5 lg:hidden" aria-label="Open navigation" onClick={() => setMobileNav(true)}>
            <Menu className="size-5" />
          </button>
          <button onClick={() => setPalette(true)} data-testid="open-search" className="flex h-9 max-w-sm flex-1 items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-400 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900">
            <Search className="size-4" />
            <span className="flex-1 truncate whitespace-nowrap text-left">Search or jump to…</span>
            <kbd className="hidden rounded border border-zinc-200 px-1.5 text-[10px] sm:inline dark:border-zinc-700">⌘K</kbd>
          </button>
          <div className="ml-auto flex items-center gap-2">
            <button aria-label="Toggle dark mode" data-testid="theme-toggle" className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900" onClick={() => dispatch({ type: "settings/update", patch: { theme: dark ? "light" : "dark" } })}>
              {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            <div className="relative" ref={menuRef}>
              <button onClick={() => setMoveMenu((m) => !m)} data-testid="move-money" aria-expanded={moveMenu} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 text-sm font-medium text-white hover:bg-indigo-500">
                Move money <ChevronDown className="size-4" />
              </button>
              {moveMenu && (
                <div role="menu" className="absolute right-0 mt-2 w-56 overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
                  <button role="menuitem" className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800" onClick={() => { setMoveMenu(false); ui.openSend(); }}>
                    <Send className="size-4" /> Send money
                  </button>
                  <button role="menuitem" className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800" onClick={() => { setMoveMenu(false); ui.openTransfer(); }}>
                    <ArrowLeftRight className="size-4" /> Transfer between accounts
                  </button>
                </div>
              )}
            </div>
            <span className="ml-1 hidden size-8 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold sm:flex dark:bg-zinc-800" title={settings.userName}>
              {settings.userName.split(" ").map((p) => p[0]).join("")}
            </span>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 lg:px-8">
          <Outlet />
        </main>
      </div>
      <CommandPalette open={palette} onClose={() => setPalette(false)} />
    </div>
  );
}
