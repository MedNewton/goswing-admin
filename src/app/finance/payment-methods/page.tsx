import { MainLayout } from "@/components/layout/MainLayout";
import { getOrganizerForCurrentUser } from "@/lib/data/events";
import { getPaymentMethods } from "@/lib/data/paymentMethods";
import { PaymentMethodsPageClient } from "@/components/finance/PaymentMethodsPageClient";
import { getLocale, t } from "@/lib/i18n";
import { checkRoleAccess } from "@/lib/auth/requireAdmin";
import type { OrganizerPaymentMethod } from "@/types";

export const dynamic = "force-dynamic";

export default async function PaymentMethodsPage() {
  const denied = await checkRoleAccess(["admin", "finance_manager"]);
  if (denied) return denied;

  const locale = await getLocale();
  let methods: OrganizerPaymentMethod[] = [];
  let organizerId = "";

  try {
    const org = await getOrganizerForCurrentUser();
    organizerId = org.id;
    methods = await getPaymentMethods(org.id);
  } catch {
    // Will show empty state
  }

  return (
    <MainLayout>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">
        {t(locale, "paymentMethodsPage.title")}
      </h1>
      <PaymentMethodsPageClient methods={methods} organizerId={organizerId} />
    </MainLayout>
  );
}
