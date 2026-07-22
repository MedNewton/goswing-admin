"use server";

import { z } from "zod";
import { adminApiCall } from "@/lib/api/client";
import type { ApiFinancePaymentMethod } from "@/lib/api/types";
import { revalidatePath } from "next/cache";

const createPaymentMethodSchema = z.object({
  organizer_id: z.string().uuid(),
  method_type: z.enum(["payment", "withdrawal"]),
  provider: z.string().min(1).default("stripe"),
  provider_account_id: z.string().optional(),
  label: z.string().optional(),
  is_default: z.boolean().default(false),
  details: z.record(z.unknown()).default({}),
});

export type PaymentMethodActionResult =
  | { success: true; id: string }
  | { success: false; error: string };

export type DeletePaymentMethodResult =
  | { success: true }
  | { success: false; error: string };

/** Create a new payment/withdrawal method for an organizer. */
export async function createPaymentMethodAction(
  input: z.infer<typeof createPaymentMethodSchema>,
): Promise<PaymentMethodActionResult> {
  const parsed = createPaymentMethodSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Validation failed" };
  }

  try {
    // organizer_id is resolved server-side from the caller — not sent
    const created = await adminApiCall<ApiFinancePaymentMethod>(
      "/v1/admin/finance/payment-methods",
      {
        method: "POST",
        body: {
          methodType: parsed.data.method_type,
          provider: parsed.data.provider,
          providerAccountId: parsed.data.provider_account_id ?? null,
          label: parsed.data.label ?? null,
          isDefault: parsed.data.is_default,
          details: parsed.data.details,
        },
      },
    );

    revalidatePath("/finance");
    revalidatePath("/settings");
    return { success: true, id: created.id };
  } catch (err) {
    console.error("createPaymentMethodAction error:", err);
    const message = err instanceof Error ? err.message : "Failed to create payment method";
    return { success: false, error: message };
  }
}

/** Delete a payment/withdrawal method. */
export async function deletePaymentMethodAction(
  id: string,
): Promise<DeletePaymentMethodResult> {
  try {
    await adminApiCall<void>(`/v1/admin/finance/payment-methods/${id}`, {
      method: "DELETE",
    });

    revalidatePath("/finance");
    revalidatePath("/settings");
    return { success: true };
  } catch (err) {
    console.error("deletePaymentMethodAction error:", err);
    const message = err instanceof Error ? err.message : "Failed to delete payment method";
    return { success: false, error: message };
  }
}

/** Set a payment method as the default (unsets others of same type). */
export async function setDefaultPaymentMethodAction(
  id: string,
  organizerId: string,
  methodType: "payment" | "withdrawal",
): Promise<DeletePaymentMethodResult> {
  void organizerId;
  void methodType; // the API unsets same-type defaults server-side
  try {
    await adminApiCall<ApiFinancePaymentMethod>(
      `/v1/admin/finance/payment-methods/${id}/default`,
      { method: "POST" },
    );

    revalidatePath("/finance");
    revalidatePath("/settings");
    return { success: true };
  } catch (err) {
    console.error("setDefaultPaymentMethodAction error:", err);
    const message = err instanceof Error ? err.message : "Failed to set default";
    return { success: false, error: message };
  }
}
