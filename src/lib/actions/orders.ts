"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export type UpdateReservationStatusResult =
  | { success: true }
  | { success: false; error: string };

const ALLOWED_STATUSES = ["pending", "confirmed", "checkedIn"] as const;

export async function updateReservationStatusAction(
  reservationId: string,
  newStatus: string,
): Promise<UpdateReservationStatusResult> {
  if (!ALLOWED_STATUSES.includes(newStatus as typeof ALLOWED_STATUSES[number])) {
    return { success: false, error: `Invalid status: ${newStatus}` };
  }

  try {
    const sb = createSupabaseAdminClient();

    const { data, error } = await sb
      .from("reservations")
      .update({ status: newStatus })
      .eq("id", reservationId)
      .select("id");

    if (error) throw error;

    if (!data || data.length === 0) {
      return { success: false, error: "Reservation not found or update not permitted." };
    }

    revalidatePath("/orders");
    revalidatePath("/attendees");

    return { success: true };
  } catch (err) {
    console.error("updateReservationStatusAction error:", err);
    const message = err instanceof Error ? err.message : "Failed to update status";
    return { success: false, error: message };
  }
}
