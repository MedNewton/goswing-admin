import type { OrganizerPaymentMethodRow } from "@/types/database";
import type { OrganizerPaymentMethod } from "@/types";
import { formatDate } from "@/lib/utils/format";

export function mapPaymentMethod(row: OrganizerPaymentMethodRow): OrganizerPaymentMethod {
  return {
    id: row.id,
    organizerId: row.organizer_id,
    methodType: row.method_type,
    provider: row.provider,
    providerAccountId: row.provider_account_id ?? undefined,
    label: row.label ?? undefined,
    isDefault: row.is_default,
    details: row.details as Record<string, unknown>,
    createdAt: formatDate(row.created_at),
  };
}

export function mapPaymentMethods(rows: OrganizerPaymentMethodRow[]): OrganizerPaymentMethod[] {
  return rows.map(mapPaymentMethod);
}
