"use server";

import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { updateTable, insertInto } from "@/lib/supabase/mutations";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Zod Schema
// ---------------------------------------------------------------------------

const onboardingSchema = z.object({
  // Personal / organizer info
  name: z.string().min(1, "Organization name is required").max(100),
  tagline: z.string().max(200).optional().or(z.literal("")),
  about: z.string().max(2000).optional().or(z.literal("")),
  city: z.string().min(1, "City is required"),
  country_code: z.string().min(1, "Country is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional().or(z.literal("")),
  website_url: z.string().url("Invalid URL").optional().or(z.literal("")),
  instagram_handle: z.string().max(100).optional().or(z.literal("")),
  facebook_handle: z.string().max(100).optional().or(z.literal("")),
  tiktok_handle: z.string().max(100).optional().or(z.literal("")),
  logo_url: z.string().optional().or(z.literal("")),
  cover_image_url: z.string().optional().or(z.literal("")),

  // Venue info
  venue_name: z.string().min(1, "Venue name is required").max(200),
  venue_type: z.string().optional().or(z.literal("")),
  venue_address: z.string().optional().or(z.literal("")),
  venue_city: z.string().optional().or(z.literal("")),
  venue_region: z.string().optional().or(z.literal("")),
  venue_country_code: z.string().optional().or(z.literal("")),
  venue_postal_code: z.string().optional().or(z.literal("")),
  venue_capacity: z.coerce.number().int().positive().optional().or(z.literal("").transform(() => undefined)),
  venue_lat: z.coerce.number().optional(),
  venue_lng: z.coerce.number().optional(),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export type OnboardingResult =
  | { success: true }
  | { success: false; error: string };

function emptyStringToNull(value: string | null | undefined) {
  if (value) return value;
  return null;
}

export async function completeOnboardingAction(
  input: OnboardingInput,
): Promise<OnboardingResult> {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    return { success: false, error: firstError?.message ?? "Validation failed" };
  }

  const data = parsed.data;

  const sb = createSupabaseAdminClient();

  // Get the current user's organizer by owner_user_id
  const { data: organizer, error: fetchError } = await sb
    .from("organizers")
    .select("id")
    .eq("owner_user_id", userId)
    .limit(1)
    .single();

  if (fetchError || !organizer) {
    console.error("[completeOnboarding] fetch error:", fetchError?.message);
    return { success: false, error: "Could not find your organizer profile" };
  }

  const organizerId = (organizer as { id: string }).id;

  // Update organizer profile
  const { error: updateError } = await updateTable(sb, "organizers", {
    name: data.name,
    tagline: emptyStringToNull(data.tagline),
    about: emptyStringToNull(data.about),
    city: data.city,
    country_code: data.country_code,
    email: data.email,
    phone: emptyStringToNull(data.phone),
    website_url: emptyStringToNull(data.website_url),
    instagram_handle: emptyStringToNull(data.instagram_handle),
    facebook_handle: emptyStringToNull(data.facebook_handle),
    tiktok_handle: emptyStringToNull(data.tiktok_handle),
    logo_url: emptyStringToNull(data.logo_url),
    cover_image_url: emptyStringToNull(data.cover_image_url),
  }).eq("id", organizerId);

  if (updateError) {
    console.error("[completeOnboarding] update error:", updateError.message);
    if (updateError.code === "23505") {
      return { success: false, error: "An organization with this name already exists" };
    }
    return { success: false, error: updateError.message };
  }

  // Create venue (one per organizer) — check if one already exists first
  const { data: existingVenue } = await sb
    .from("venues")
    .select("id")
    .eq("organizer_id", organizerId)
    .limit(1)
    .maybeSingle();

  if (!existingVenue) {
    const { error: venueError } = await insertInto(sb, "venues", {
      name: data.venue_name.trim(),
      organizer_id: organizerId,
      address_line1: emptyStringToNull(data.venue_address),
      city: emptyStringToNull(data.venue_city) ?? data.city,
      region: emptyStringToNull(data.venue_region),
      country_code: emptyStringToNull(data.venue_country_code) ?? data.country_code,
      postal_code: emptyStringToNull(data.venue_postal_code),
      venue_type: emptyStringToNull(data.venue_type),
      capacity: typeof data.venue_capacity === "number" ? data.venue_capacity : null,
      lat: data.venue_lat ?? null,
      lng: data.venue_lng ?? null,
      created_by_user_id: userId,
    });

    if (venueError) {
      console.error("[completeOnboarding] venue creation error:", venueError.message);
      return { success: false, error: `Failed to create venue: ${venueError.message}` };
    }
  } else {
    // Update existing venue
    const { error: venueUpdateError } = await updateTable(sb, "venues", {
      name: data.venue_name.trim(),
      address_line1: emptyStringToNull(data.venue_address),
      city: emptyStringToNull(data.venue_city) ?? data.city,
      region: emptyStringToNull(data.venue_region),
      country_code: emptyStringToNull(data.venue_country_code) ?? data.country_code,
      postal_code: emptyStringToNull(data.venue_postal_code),
      venue_type: emptyStringToNull(data.venue_type),
      capacity: typeof data.venue_capacity === "number" ? data.venue_capacity : null,
      lat: data.venue_lat ?? null,
      lng: data.venue_lng ?? null,
    }).eq("id", (existingVenue as { id: string }).id);

    if (venueUpdateError) {
      console.error("[completeOnboarding] venue update error:", venueUpdateError.message);
    }
  }

  return { success: true };
}

// ---------------------------------------------------------------------------
// Image Upload
// ---------------------------------------------------------------------------

export type UploadImageResult =
  | { success: true; url: string }
  | { success: false; error: string };

export async function uploadOrganizerImageAction(
  formData: FormData,
): Promise<UploadImageResult> {
  try {
    const file = formData.get("file") as File | null;
    if (!file) {
      return { success: false, error: "No file provided" };
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: "Invalid file type. Use JPEG, PNG, WebP, or GIF." };
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return { success: false, error: "File too large. Maximum size is 5MB." };
    }

    const sb = await createSupabaseServerClient();

    const ext = file.name.split(".").pop() ?? "jpg";
    const fileName = `${crypto.randomUUID()}.${ext}`;
    const filePath = `organizer-images/${fileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await sb.storage
      .from("event-images")
      .upload(filePath, uint8Array, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return { success: false, error: `Upload failed: ${uploadError.message}` };
    }

    const { data: urlData } = sb.storage
      .from("event-images")
      .getPublicUrl(filePath);

    return { success: true, url: urlData.publicUrl };
  } catch (err) {
    console.error("uploadOrganizerImageAction error:", err);
    const message = err instanceof Error ? err.message : "Failed to upload image";
    return { success: false, error: message };
  }
}

/** Fetch the current user's organizer data for pre-filling the onboarding form. */
export async function fetchOrganizerForOnboarding() {
  const { userId } = await auth();
  if (!userId) return null;

  const sb = createSupabaseAdminClient();

  const { data, error } = await sb
    .from("organizers")
    .select("id, name, tagline, about, city, country_code, email, phone, website_url, instagram_handle, facebook_handle, tiktok_handle, logo_url, cover_image_url")
    .eq("owner_user_id", userId)
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  const organizer = data as {
    id: string;
    name: string;
    tagline: string | null;
    about: string | null;
    city: string | null;
    country_code: string | null;
    email: string | null;
    phone: string | null;
    website_url: string | null;
    instagram_handle: string | null;
    facebook_handle: string | null;
    tiktok_handle: string | null;
    logo_url: string | null;
    cover_image_url: string | null;
  };

  // Also fetch the existing venue for this organizer (if any)
  const { data: venue } = await sb
    .from("venues")
    .select("id, name, venue_type, address_line1, city, region, country_code, postal_code, capacity, lat, lng")
    .eq("organizer_id", organizer.id)
    .limit(1)
    .maybeSingle();

  return {
    ...organizer,
    venue: venue as {
      id: string;
      name: string;
      venue_type: string | null;
      address_line1: string | null;
      city: string | null;
      region: string | null;
      country_code: string | null;
      postal_code: string | null;
      capacity: number | null;
      lat: number | null;
      lng: number | null;
    } | null,
  };
}
