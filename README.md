# Northbeam

A frontend-only business banking dashboard. It's a realistic, interaction-heavy UI for testing tools that watch code changes and check their effect on the user-facing app.

There's no backend. All data is generated sample data and is kept in the browser's `localStorage`. **Settings → Company → Reset demo data** restores the original data.

## Pages and flows

| Route | What you can do |
|---|---|
| `#/` Home | Total balance chart (30D/90D/6M), money in and out, burn and runway, a "Needs attention" list, account tiles, cash flow chart, recent transactions |
| `#/transactions` | Search, filter (account, category, status, direction, date range, minimum amount, missing receipt), sort, paginate, bulk-categorize, CSV export, a detail drawer with category, note and receipt upload |
| `#/accounts/:id` | Per-account balance chart, routing and account numbers with copy buttons, that account's transactions |
| `#/payments` | Upcoming and recent payments, recipients with search and a "Pay" button |
| `#/cards` | Freeze and unfreeze, edit name and monthly limit, issue new virtual or physical cards, spend-vs-limit bars |
| `#/invoices` | Status tabs, an invoice editor with line items and validation, send, mark paid (which posts a revenue transaction), view, delete |
| `#/insights` | Spend by category (click through to filtered transactions), top vendors, net cash flow by month |
| `#/settings` | Company profile and theme, team invites with roles (the last admin can't be removed), notification toggles and threshold, reset data |

Also available everywhere:
- **Move money**: a three-step send-money wizard (recipient, amount, review) that can add a recipient and checks the balance and date, plus transfers between accounts.
- **⌘K / Ctrl+K**: a command palette that searches pages, actions and transactions.
- **Dark mode**.
- **Mobile navigation**.

Key elements carry `data-testid` attributes for automated checks.

## Develop

```bash
pnpm install
pnpm dev      # http://localhost:5173
pnpm build    # type-check and build to dist/
```

## Deploy

`.github/workflows/pages.yml` builds every push to `main` and publishes it to GitHub Pages, which is free. Pull requests run the same build as a check. One-time setup: **Settings → Pages → Source: GitHub Actions**.

Stack: React 19, React Router 7 (hash routing for Pages), Tailwind CSS 4, Recharts, Vite 6, TypeScript.
