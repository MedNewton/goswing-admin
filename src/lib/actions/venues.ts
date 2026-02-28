"use server";

import { z } from "zod";
import {
  createVenue,
  updateVenue,
  deleteVenue,
} from "@/lib/data/venues";
import { revalidatePath } from "next/cache";

// ---------------------------------------------------------------------------
// Zod Schema
// ---------------------------------------------------------------------------

const createVenueSchema = z.object({
  name: z.string().min(1, "Venue name is required"),
  address_line1: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  region: z.string().optional().or(z.literal("")),
  country_code: z.string().optional().or(z.literal("")),
  venue_type: z.string().optional().or(z.literal("")),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
});

const updateVenueSchema = z.object({
  name: z.string().min(1, "Venue name is required").optional(),
  address_line1: z.string().optional().or(z.literal("")).nullable(),
  city: z.string().optional().or(z.literal("")).nullable(),
  region: z.string().optional().or(z.literal("")).nullable(),
  country_code: z.string().optional().or(z.literal("")).nullable(),
  venue_type: z.string().optional().or(z.literal("")).nullable(),
  lat: z.coerce.number().optional().nullable(),
  lng: z.coerce.number().optional().nullable(),
});

export type CreateVenueInput = z.infer<typeof createVenueSchema>;
export type UpdateVenueInput = z.infer<typeof updateVenueSchema>;

// ---------------------------------------------------------------------------
// Server Actions
// ---------------------------------------------------------------------------

export type VenueActionResult =
  | { success: true; venueId: string }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

export type DeleteVenueResult =
  | { success: true }
  | { success: false; error: string };

export async function createVenueAction(
  formData: CreateVenueInput
): Promise<VenueActionResult> {
  const parsed = createVenueSchema.safeParse(formData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path.join(".");
      if (!fieldErrors[path]) fieldErrors[path] = [];
      fieldErrors[path].push(issue.message);
    }
    return { success: false, error: "Validation failed", fieldErrors };
  }

  const data = parsed.data;

  try {
    const venueId = await createVenue({
      name: data.name.trim(),
      address_line1: data.address_line1?.trim() || null,
      city: data.city?.trim() || null,
      region: data.region?.trim() || null,
      country_code: data.country_code?.trim() || null,
      venue_type: data.venue_type?.trim() || null,
      lat: data.lat ?? null,
      lng: data.lng ?? null,
    });

    revalidatePath("/venues");
    return { success: true, venueId };
  } catch (err) {
    console.error("createVenueAction error:", err);
    const message = err instanceof Error ? err.message : "Failed to create venue";
    return { success: false, error: message };
  }
}

export async function updateVenueAction(
  venueId: string,
  formData: UpdateVenueInput
): Promise<VenueActionResult> {
  const parsed = updateVenueSchema.safeParse(formData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path.join(".");
      if (!fieldErrors[path]) fieldErrors[path] = [];
      fieldErrors[path].push(issue.message);
    }
    return { success: false, error: "Validation failed", fieldErrors };
  }

  const data = parsed.data;

  try {
    await updateVenue(venueId, {
      name: data.name?.trim(),
      address_line1: data.address_line1?.trim() || null,
      city: data.city?.trim() || null,
      region: data.region?.trim() || null,
      country_code: data.country_code?.trim() || null,
      venue_type: data.venue_type?.trim() || null,
      lat: data.lat ?? null,
      lng: data.lng ?? null,
    });

    revalidatePath("/venues");
    return { success: true, venueId };
  } catch (err) {
    console.error("updateVenueAction error:", err);
    const message = err instanceof Error ? err.message : "Failed to update venue";
    return { success: false, error: message };
  }
}

/** Fetch venues for dropdown selection (callable from client components). */
export async function fetchVenuesForSelect(): Promise<
  Array<{ id: string; name: string; city: string | null }>
> {
  const { getVenuesForSelect } = await import("@/lib/data/venues");
  return getVenuesForSelect();
}

/** Fetch a single venue by ID (callable from client components). */
export async function fetchVenue(venueId: string) {
  const { getVenue } = await import("@/lib/data/venues");
  return getVenue(venueId);
}

export async function deleteVenueAction(
  venueId: string
): Promise<DeleteVenueResult> {
  try {
    await deleteVenue(venueId);
    revalidatePath("/venues");
    return { success: true };
  } catch (err) {
    console.error("deleteVenueAction error:", err);
    const message = err instanceof Error ? err.message : "Failed to delete venue";
    return { success: false, error: message };
  }
}
