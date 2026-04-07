import { MainLayout } from "@/components/layout/MainLayout";
import { getTransactions } from "@/lib/data/finance";
import { TransactionsPageClient } from "@/components/finance/TransactionsPageClient";
import { getLocale, t } from "@/lib/i18n";
import { checkRoleAccess } from "@/lib/auth/requireAdmin";
import type { Transaction } from "@/types";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const denied = await checkRoleAccess(["admin", "finance_manager"]);
  if (denied) return denied;

  const locale = await getLocale();
  let transactions: Transaction[] = [];

  try {
    transactions = await getTransactions();
  } catch {
    // Will show empty state
  }

  return (
    <MainLayout>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">
        {t(locale, "transactionsPage.title")}
      </h1>
      <TransactionsPageClient transactions={transactions} />
    </MainLayout>
  );
}
