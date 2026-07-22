"use server";

import { z } from "zod";
import { auth, currentUser } from "@clerk/nextjs/server";
import { adminApiCall, isApiError } from "@/lib/api/client";
import type {
  ApiOnboardingData,
  ApiOnboardingResult,
  ApiUploadResult,
} from "@/lib/api/types";

// ---------------------------------------------------------------------------
// Zod Schema
// ---------------------------------------------------------------------------

const customPolicySchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
});

const onboardingSchema = z.object({
  // Personal profile
  display_name: z.string().min(1, "Your name is required").max(120),
  personal_phone_number: z.string().max(40).optional().or(z.literal("")),
  avatar_url: z.string().optional().or(z.literal("")),

  // Organization info
  name: z.string().min(1, "Organization name is required").max(100),
  tagline: z.string().max(200).optional().or(z.literal("")),
  about: z.string().max(2000).optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  country_code: z.string().optional().or(z.literal("")),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional().or(z.literal("")),
  website_url: z.string().url("Invalid URL").optional().or(z.literal("")),
  instagram_handle: z.string().max(100).optional().or(z.literal("")),
  facebook_handle: z.string().max(100).optional().or(z.literal("")),
  tiktok_handle: z.string().max(100).optional().or(z.literal("")),
  logo_url: z.string().optional().or(z.literal("")),
  cover_image_url: z.string().optional().or(z.literal("")),
  gallery_image_urls: z.array(z.string().url()).optional().default([]),
  custom_policies: z.array(customPolicySchema).optional().default([]),

  // Venue info
  venue_name: z.string().min(1, "Venue name is required").max(200),
  venue_type: z.string().optional().or(z.literal("")),
  venue_description: z.string().max(5000).optional().or(z.literal("")),
  venue_free_access: z.boolean().optional().default(false),
  venue_free_for_ladies: z.boolean().optional().default(false),
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
  const galleryImageUrls = data.gallery_image_urls ?? [];

  const body = {
    personal: {
      displayName: data.display_name.trim(),
      phone: emptyStringToNull(data.personal_phone_number),
      avatarUrl: emptyStringToNull(data.avatar_url),
    },
    organizer: {
      name: data.name,
      tagline: emptyStringToNull(data.tagline),
      about: emptyStringToNull(data.about),
      city: emptyStringToNull(data.city) ?? emptyStringToNull(data.venue_city),
      countryCode:
        emptyStringToNull(data.country_code) ?? emptyStringToNull(data.venue_country_code),
      email: data.email,
      phone: emptyStringToNull(data.phone),
      websiteUrl: emptyStringToNull(data.website_url),
      instagramHandle: emptyStringToNull(data.instagram_handle),
      facebookHandle: emptyStringToNull(data.facebook_handle),
      tiktokHandle: emptyStringToNull(data.tiktok_handle),
      logoUrl: emptyStringToNull(data.logo_url),
      coverImageUrl: emptyStringToNull(data.cover_image_url),
      customPolicies: data.custom_policies ?? [],
    },
    venue: {
      name: data.venue_name.trim(),
      venueType: emptyStringToNull(data.venue_type),
      description: emptyStringToNull(data.venue_description),
      freeAccess: data.venue_free_access ?? false,
      freeForLadies: data.venue_free_for_ladies ?? false,
      addressLine1: emptyStringToNull(data.venue_address),
      city: emptyStringToNull(data.venue_city) ?? emptyStringToNull(data.city),
      region: emptyStringToNull(data.venue_region),
      countryCode:
        emptyStringToNull(data.venue_country_code) ?? emptyStringToNull(data.country_code),
      postalCode: emptyStringToNull(data.venue_postal_code),
      capacity: typeof data.venue_capacity === "number" ? data.venue_capacity : null,
      lat: data.venue_lat ?? null,
      lng: data.venue_lng ?? null,
    },
    // Only send when non-empty: the API replaces the whole gallery when the
    // field is present, while today an empty list leaves existing rows alone.
    ...(galleryImageUrls.length > 0 ? { galleryImageUrls } : {}),
  };

  try {
    await adminApiCall<ApiOnboardingResult>("/v1/admin/me/onboarding", {
      method: "POST",
      body,
    });
    return { success: true };
  } catch (error) {
    if (isApiError(error)) {
      console.error("[completeOnboarding] error:", error.message);
      if (error.status === 409 || error.code === "conflict") {
        return { success: false, error: "An organization with this name already exists" };
      }
      return { success: false, error: error.message };
    }
    console.error("[completeOnboarding] error:", error);
    const message = error instanceof Error ? error.message : "Failed to complete onboarding";
    return { success: false, error: message };
  }
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

    const uploadForm = new FormData();
    uploadForm.append("file", file);
    uploadForm.append("kind", "organizerImage");

    const result = await adminApiCall<ApiUploadResult>("/v1/admin/uploads", {
      method: "POST",
      body: uploadForm,
    });

    return { success: true, url: result.url };
  } catch (err) {
    console.error("uploadOrganizerImageAction error:", err);
    const message = err instanceof Error ? `Upload failed: ${err.message}` : "Failed to upload image";
    return { success: false, error: message };
  }
}

/** Fetch the current user's profile + organizer data for pre-filling onboarding. */
export async function fetchOrganizerForOnboarding() {
  const { userId } = await auth();
  if (!userId) return null;

  let data: ApiOnboardingData;
  try {
    data = await adminApiCall<ApiOnboardingData>("/v1/admin/me/onboarding");
  } catch (error) {
    console.error("[fetchOrganizerForOnboarding] error:", error);
    return null;
  }

  // The API already applies Clerk fallbacks server-side; keep a cheap
  // client-side fallback for first-time users with missing fields.
  let clerkDisplayName: string | null = null;
  let clerkAvatarUrl: string | null = null;
  if (!data.personal.displayName || !data.personal.avatarUrl) {
    try {
      const user = await currentUser();
      if (user) {
        const composed = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
        clerkDisplayName = composed.length > 0 ? composed : null;
        clerkAvatarUrl = user.imageUrl ?? null;
      }
    } catch {
      // Ignore — prefill is best-effort.
    }
  }

  const personal = {
    display_name: data.personal.displayName ?? clerkDisplayName ?? "",
    phone_number: data.personal.phone ?? "",
    avatar_url: data.personal.avatarUrl ?? clerkAvatarUrl ?? "",
  };

  const org = data.organizer;
  const organizer = org
    ? {
        id: org.id,
        name: org.name,
        tagline: org.tagline,
        about: org.about,
        city: org.city,
        country_code: org.countryCode,
        email: org.email,
        phone: org.phone,
        website_url: org.websiteUrl,
        instagram_handle: org.instagramHandle,
        facebook_handle: org.facebookHandle,
        tiktok_handle: org.tiktokHandle,
        logo_url: org.logoUrl,
        cover_image_url: org.coverImageUrl,
        custom_policies: (org.customPolicies ?? []) as Array<{
          title: string;
          description: string;
        }>,
      }
    : null;

  const apiVenue = data.venue;
  const venue = apiVenue
    ? {
        id: apiVenue.id,
        name: apiVenue.name,
        venue_type: apiVenue.venueType,
        description: apiVenue.description,
        free_access: apiVenue.freeAccess,
        free_for_ladies: apiVenue.freeForLadies,
        address_line1: apiVenue.addressLine1,
        city: apiVenue.city,
        region: apiVenue.region,
        country_code: apiVenue.countryCode,
        postal_code: apiVenue.postalCode,
        capacity: apiVenue.capacity,
        lat: apiVenue.lat,
        lng: apiVenue.lng,
      }
    : null;

  return { personal, organizer, venue };
}
