import { TransactionTable } from "../components/TransactionTable";
import { PageHeader } from "../components/ui";

export function Transactions() {
  return (
    <>
      <PageHeader title="Transactions" subtitle="Search, filter, categorize and export activity across every account." />
      <TransactionTable />
    </>
  );
}
