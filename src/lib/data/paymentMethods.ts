import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapPaymentMethods } from "@/lib/mappers/paymentMethods";
import type { OrganizerPaymentMethodRow } from "@/types/database";

/** Fetch all payment methods for an organizer. */
export async function getPaymentMethods(organizerId: string) {
  const sb = await createSupabaseServerClient();

  const { data, error } = await sb
    .from("organizer_payment_methods")
    .select("*")
    .eq("organizer_id", organizerId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return mapPaymentMethods((data ?? []) as OrganizerPaymentMethodRow[]);
}

/** Fetch payment methods filtered by type. */
export async function getPaymentMethodsByType(
  organizerId: string,
  methodType: "payment" | "withdrawal",
) {
  const sb = await createSupabaseServerClient();

  const { data, error } = await sb
    .from("organizer_payment_methods")
    .select("*")
    .eq("organizer_id", organizerId)
    .eq("method_type", methodType)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return mapPaymentMethods((data ?? []) as OrganizerPaymentMethodRow[]);
}
