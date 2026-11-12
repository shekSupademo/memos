import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AccountDetail } from "./pages/AccountDetail";
import { Cards } from "./pages/Cards";
import { Home } from "./pages/Home";
import { Insights } from "./pages/Insights";
import { Invoices } from "./pages/Invoices";
import { Payments } from "./pages/Payments";
import { Settings } from "./pages/Settings";
import { Transactions } from "./pages/Transactions";
import { StoreProvider } from "./state/store";
import { ToastProvider } from "./state/toast";
import { UIProvider } from "./state/ui";

// HashRouter keeps deep links working on GitHub Pages, which has no SPA fallback.
export function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <HashRouter>
          <UIProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="transactions" element={<Transactions />} />
                <Route path="accounts/:id" element={<AccountDetail />} />
                <Route path="payments" element={<Payments />} />
                <Route path="cards" element={<Cards />} />
                <Route path="invoices" element={<Invoices />} />
                <Route path="insights" element={<Insights />} />
                <Route path="settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </UIProvider>
        </HashRouter>
      </ToastProvider>
    </StoreProvider>
  );
}
