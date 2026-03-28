"use server";

import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { updateTable } from "@/lib/supabase/mutations";

// ---------------------------------------------------------------------------
// Zod Schema
// ---------------------------------------------------------------------------

const updateProfileSchema = z.object({
  display_name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  phone_number: z.string().max(30).optional().or(z.literal("")),
  occupation: z.string().max(100).optional().or(z.literal("")),
  avatar_url: z.string().optional().or(z.literal("")),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export type ProfileActionResult =
  | { success: true }
  | { success: false; error: string };

function emptyStringToNull(value: string | null | undefined) {
  if (value) return value;
  return null;
}

/** Fetch the current user's profile for the settings page. */
export async function fetchProfile() {
  const { userId } = await auth();
  if (!userId) return null;

  const sb = createSupabaseAdminClient();

  const { data, error } = await sb
    .from("profiles")
    .select("user_id, display_name, email, phone_number, avatar_url, occupation")
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;

  return data as {
    user_id: string;
    display_name: string | null;
    email: string | null;
    phone_number: string | null;
    avatar_url: string | null;
    occupation: string | null;
  };
}

/** Update the current user's personal profile. */
export async function updateProfileAction(
  input: UpdateProfileInput,
): Promise<ProfileActionResult> {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    return { success: false, error: firstError?.message ?? "Validation failed" };
  }

  const data = parsed.data;
  const sb = createSupabaseAdminClient();

  const { error: updateError } = await updateTable(sb, "profiles", {
    display_name: data.display_name,
    email: data.email,
    phone_number: emptyStringToNull(data.phone_number),
    occupation: emptyStringToNull(data.occupation),
    avatar_url: emptyStringToNull(data.avatar_url),
  }).eq("user_id", userId);

  if (updateError) {
    console.error("[updateProfile] error:", updateError.message);
    return { success: false, error: updateError.message };
  }

  return { success: true };
}
