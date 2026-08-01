"use server";

// Venue server actions — Gooswing REST API backed (see lib/data/venues.ts).
import { z } from "zod";
import {
  createVenue,
  updateVenue,
  deleteVenue,
} from "@/lib/data/venues";
import { isApiError } from "@/lib/api/client";
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
  postal_code: z.string().optional().or(z.literal("")),
  timezone: z.string().optional().or(z.literal("")),
  capacity: z.coerce.number().int().positive().optional().or(z.literal("").transform(() => undefined)),
  organizer_id: z.string().uuid().optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
  free_access: z.boolean().optional(),
  free_for_ladies: z.boolean().optional(),
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
  postal_code: z.string().optional().or(z.literal("")).nullable(),
  timezone: z.string().optional().or(z.literal("")).nullable(),
  capacity: z.coerce.number().int().positive().optional().nullable(),
  organizer_id: z.string().uuid().optional().or(z.literal("")).nullable(),
  description: z.string().optional().or(z.literal("")).nullable(),
  free_access: z.boolean().optional().nullable(),
  free_for_ladies: z.boolean().optional().nullable(),
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

function normalizeOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (trimmed) return trimmed;
  return null;
}

/**
 * Like normalizeOptionalText, but keeps absent fields absent so PATCH partial
 * semantics hold: a field the caller never sent must not be nulled out on the
 * backend (undefined keys disappear when the body is JSON-serialized).
 */
function normalizeIfProvided(value: string | null | undefined) {
  if (value === undefined) return undefined;
  return normalizeOptionalText(value);
}

/** Map an API validation_failed error to the fieldErrors result shape when possible. */
function toFailureResult(err: unknown, fallback: string): VenueActionResult {
  if (isApiError(err)) {
    if (err.code === "validation_failed") {
      const details = err.details;
      const fieldErrors =
        details && typeof details === "object" && !Array.isArray(details)
          ? Object.fromEntries(
              Object.entries(details as Record<string, unknown>).map(([key, value]) => [
                key,
                Array.isArray(value) ? value.map(String) : [String(value)],
              ]),
            )
          : undefined;
      return { success: false, error: err.message, fieldErrors };
    }
    return { success: false, error: err.message };
  }
  const message = err instanceof Error ? err.message : fallback;
  return { success: false, error: message };
}

export async function createVenueAction(
  formData: CreateVenueInput
): Promise<VenueActionResult> {
  const parsed = createVenueSchema.safeParse(formData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path.join(".");
      fieldErrors[path] ??= [];
      fieldErrors[path].push(issue.message);
    }
    return { success: false, error: "Validation failed", fieldErrors };
  }

  const data = parsed.data;

  try {
    const venueId = await createVenue({
      name: data.name.trim(),
      address_line1: normalizeOptionalText(data.address_line1),
      city: normalizeOptionalText(data.city),
      region: normalizeOptionalText(data.region),
      country_code: normalizeOptionalText(data.country_code),
      venue_type: normalizeOptionalText(data.venue_type),
      lat: data.lat ?? null,
      lng: data.lng ?? null,
      postal_code: normalizeOptionalText(data.postal_code),
      timezone: normalizeOptionalText(data.timezone),
      capacity: typeof data.capacity === "number" ? data.capacity : null,
      organizer_id: normalizeOptionalText(data.organizer_id),
      description: normalizeOptionalText(data.description),
      free_access: data.free_access ?? false,
      free_for_ladies: data.free_for_ladies ?? false,
    });

    revalidatePath("/venues");
    return { success: true, venueId };
  } catch (err) {
    console.error("createVenueAction error:", err);
    return toFailureResult(err, "Failed to create venue");
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
      fieldErrors[path] ??= [];
      fieldErrors[path].push(issue.message);
    }
    return { success: false, error: "Validation failed", fieldErrors };
  }

  const data = parsed.data;

  try {
    await updateVenue(venueId, {
      name: data.name?.trim(),
      address_line1: normalizeIfProvided(data.address_line1),
      city: normalizeIfProvided(data.city),
      region: normalizeIfProvided(data.region),
      country_code: normalizeIfProvided(data.country_code),
      venue_type: normalizeIfProvided(data.venue_type),
      lat: data.lat,
      lng: data.lng,
      postal_code: normalizeIfProvided(data.postal_code),
      timezone: normalizeIfProvided(data.timezone),
      capacity: data.capacity,
      description: normalizeIfProvided(data.description),
      free_access: data.free_access ?? undefined,
      free_for_ladies: data.free_for_ladies ?? undefined,
    });

    revalidatePath("/venues");
    return { success: true, venueId };
  } catch (err) {
    console.error("updateVenueAction error:", err);
    return toFailureResult(err, "Failed to update venue");
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
    // 409 conflict (events still reference the venue) surfaces the API message.
    const message = err instanceof Error ? err.message : "Failed to delete venue";
    return { success: false, error: message };
  }
}
