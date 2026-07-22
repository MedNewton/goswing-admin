import { adminApiCall } from "@/lib/api/client";
import type { ApiFinancePaymentMethod, ApiItems } from "@/lib/api/types";
import type { OrganizerPaymentMethod } from "@/types";
import { formatDate } from "@/lib/utils/format";

function mapApiPaymentMethod(
  item: ApiFinancePaymentMethod,
): OrganizerPaymentMethod {
  return {
    id: item.id,
    organizerId: item.organizerId,
    methodType: item.methodType,
    provider: item.provider,
    providerAccountId: item.providerAccountId ?? undefined,
    label: item.label ?? undefined,
    isDefault: item.isDefault,
    details: item.details,
    createdAt: formatDate(item.createdAt),
  };
}

/** Fetch all payment methods for an organizer. */
export async function getPaymentMethods(organizerId: string) {
  void organizerId; // scoped server-side to the caller's organizer
  const { items } = await adminApiCall<ApiItems<ApiFinancePaymentMethod>>(
    "/v1/admin/finance/payment-methods",
  );
  return items.map(mapApiPaymentMethod);
}

/** Fetch payment methods filtered by type. */
export async function getPaymentMethodsByType(
  organizerId: string,
  methodType: "payment" | "withdrawal",
) {
  void organizerId; // scoped server-side to the caller's organizer
  const { items } = await adminApiCall<ApiItems<ApiFinancePaymentMethod>>(
    "/v1/admin/finance/payment-methods",
    { query: { type: methodType } },
  );
  return items.map(mapApiPaymentMethod);
}
