"use server";

import { adminApiCall, isApiError, isNotFound } from "@/lib/api/client";
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
    await adminApiCall<{ id: string; status: string }>(
      `/v1/admin/orders/${reservationId}/status`,
      { method: "POST", body: { status: newStatus } },
    );

    revalidatePath("/orders");
    revalidatePath("/attendees");

    return { success: true };
  } catch (err) {
    console.error("updateReservationStatusAction error:", err);
    if (isNotFound(err)) {
      return { success: false, error: "Reservation not found or update not permitted." };
    }
    const message = isApiError(err)
      ? err.message
      : err instanceof Error
        ? err.message
        : "Failed to update status";
    return { success: false, error: message };
  }
}
