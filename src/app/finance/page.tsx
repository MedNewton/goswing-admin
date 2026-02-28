import { MainLayout } from "@/components/layout/MainLayout";
import { getFinanceOverview } from "@/lib/data/finance";
import { FinancePageClient } from "@/components/finance/FinancePageClient";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  let transactions: Awaited<ReturnType<typeof getFinanceOverview>>["transactions"] = [];
  let financeStats = { transactionCount: 0, totalGross: 0, totalFees: 0, totalNet: 0 };

  try {
    const data = await getFinanceOverview();
    transactions = data.transactions;
    financeStats = data.stats;
  } catch {
    // Will show empty state
  }

  return (
    <MainLayout title="Finance Dashboard">
      <FinancePageClient transactions={transactions} stats={financeStats} />
    </MainLayout>
  );
}
