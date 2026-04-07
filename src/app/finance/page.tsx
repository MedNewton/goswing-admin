import { MainLayout } from "@/components/layout/MainLayout";
import { getFinanceOverview } from "@/lib/data/finance";
import { getUpcomingPayouts } from "@/lib/data/payouts";
import { FinancePageClient } from "@/components/finance/FinancePageClient";
import { getLocale, t } from "@/lib/i18n";
import { checkRoleAccess } from "@/lib/auth/requireAdmin";
import type { Transaction, Payout } from "@/types";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  const denied = await checkRoleAccess(["admin", "finance_manager"]);
  if (denied) return denied;

  const locale = await getLocale();
  let transactions: Transaction[] = [];
  let financeStats = { transactionCount: 0, totalGross: 0, totalFees: 0, totalNet: 0 };
  let upcomingPayouts: Payout[] = [];

  try {
    const [financeData, payoutsData] = await Promise.all([
      getFinanceOverview(),
      getUpcomingPayouts(),
    ]);
    transactions = financeData.transactions;
    financeStats = financeData.stats;
    upcomingPayouts = payoutsData;
  } catch {
    // Will show empty state
  }

  // Compute this-month stats
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthGross = transactions
    .filter((t) => {
      const d = new Date(t.orderedAt ?? t.date);
      return d >= monthStart;
    })
    .reduce((sum, t) => sum + t.grossAmount, 0);

  const pendingPayoutTotal = upcomingPayouts.reduce((sum, p) => sum + p.amountCents, 0);
  const payoutCurrency = upcomingPayouts[0]?.currency ?? transactions[0]?.currency ?? "USD";

  return (
    <MainLayout>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">{t(locale, "financePage.title")}</h1>
      <FinancePageClient
        transactions={transactions}
        stats={financeStats}
        upcomingPayouts={upcomingPayouts}
        thisMonthGross={thisMonthGross}
        pendingPayoutTotal={pendingPayoutTotal}
        payoutCurrency={payoutCurrency}
      />
    </MainLayout>
  );
}
