"use server";

import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { insertInto, updateTable } from "@/lib/supabase/mutations";
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
    const sb = await createSupabaseServerClient();

    const { data, error } = await insertInto(sb, "organizer_payment_methods", parsed.data)
      .select("id")
      .single();

    if (error) throw error;

    revalidatePath("/finance");
    revalidatePath("/settings");
    return { success: true, id: (data as { id: string }).id };
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
    const sb = await createSupabaseServerClient();

    const { error } = await sb
      .from("organizer_payment_methods")
      .delete()
      .eq("id", id);

    if (error) throw error;

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
  try {
    const sb = await createSupabaseServerClient();

    // Unset all defaults of same type
    const { error: unsetError } = await updateTable(sb, "organizer_payment_methods", {
      is_default: false,
    })
      .eq("organizer_id", organizerId)
      .eq("method_type", methodType);

    if (unsetError) throw unsetError;

    // Set the new default
    const { error } = await updateTable(sb, "organizer_payment_methods", {
      is_default: true,
    }).eq("id", id);

    if (error) throw error;

    revalidatePath("/finance");
    revalidatePath("/settings");
    return { success: true };
  } catch (err) {
    console.error("setDefaultPaymentMethodAction error:", err);
    const message = err instanceof Error ? err.message : "Failed to set default";
    return { success: false, error: message };
  }
}
