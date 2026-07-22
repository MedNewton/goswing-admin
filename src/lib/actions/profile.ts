"use server";

import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { adminApiCall, isApiError, isNotFound } from "@/lib/api/client";
import type { ApiAdminProfile } from "@/lib/api/types";

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

  let profile: ApiAdminProfile;
  try {
    profile = await adminApiCall<ApiAdminProfile>("/v1/admin/me/profile");
  } catch (error) {
    if (isNotFound(error)) return null;
    if (isApiError(error) && error.status === 401) return null;
    throw error;
  }

  return {
    user_id: profile.userId,
    display_name: profile.displayName ?? null,
    email: profile.email,
    phone_number: profile.phone,
    avatar_url: profile.avatarUrl,
    occupation: profile.occupation,
  } as {
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

  try {
    await adminApiCall<ApiAdminProfile>("/v1/admin/me/profile", {
      method: "PATCH",
      body: {
        displayName: data.display_name,
        email: data.email,
        phone: emptyStringToNull(data.phone_number),
        occupation: emptyStringToNull(data.occupation),
        avatarUrl: emptyStringToNull(data.avatar_url),
      },
    });
    return { success: true };
  } catch (error) {
    const message = isApiError(error)
      ? error.message
      : error instanceof Error
        ? error.message
        : "Failed to update profile";
    console.error("[updateProfile] error:", message);
    return { success: false, error: message };
  }
}
