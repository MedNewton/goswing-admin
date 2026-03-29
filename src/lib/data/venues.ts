import { createSupabaseServerClient } from "@/lib/supabase/server";
import { insertInto, updateTable } from "@/lib/supabase/mutations";
import { mapVenue, mapVenues } from "@/lib/mappers/venues";
import type { VenueRow, VenueInsert, VenueUpdate } from "@/types/database";
import { getCurrentUserId } from "@/lib/data/auth";

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Fetch all venues for the current user (only venues they created). */
export async function getVenues() {
  const sb = await createSupabaseServerClient();
  const userId = await getCurrentUserId();

  const { data, error } = await sb
    .from("venues")
    .select("*")
    .eq("created_by_user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return mapVenues((data ?? []) as VenueRow[]);
}

/** Fetch a single venue by ID (only if owned by current user). */
export async function getVenue(id: string) {
  const sb = await createSupabaseServerClient();
  const userId = await getCurrentUserId();

  const { data, error } = await sb
    .from("venues")
    .select("*")
    .eq("id", id)
    .eq("created_by_user_id", userId)
    .single();

  if (error) throw error;
  return mapVenue(data as VenueRow);
}

/** Fetch venues for dropdown selection (id and name only, only user's venues). */
export async function getVenuesForSelect() {
  const sb = await createSupabaseServerClient();
  const userId = await getCurrentUserId();

  const { data, error } = await sb
    .from("venues")
    .select("id, name, city")
    .eq("created_by_user_id", userId)
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Array<{ id: string; name: string; city: string | null }>;
}

/** Fetch the single venue linked to an organizer (one-to-one). */
export async function getVenueByOrganizer(organizerId: string) {
  const sb = await createSupabaseServerClient();

  const { data, error } = await sb
    .from("venues")
    .select("*")
    .eq("organizer_id", organizerId)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapVenue(data as VenueRow);
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/** Create a new venue. */
export async function createVenue(venue: Omit<VenueInsert, "created_by_user_id">) {
  const sb = await createSupabaseServerClient();

  const { data, error } = await insertInto(
    sb,
    "venues",
    venue,
  )
    .select("id")
    .single();

  if (error) throw error;
  return (data as { id: string }).id;
}

/** Update an existing venue (only if owned by current user). */
export async function updateVenue(id: string, updates: VenueUpdate) {
  const sb = await createSupabaseServerClient();
  const userId = await getCurrentUserId();

  const { error } = await updateTable(sb, "venues", updates)
    .eq("id", id)
    .eq("created_by_user_id", userId);

  if (error) throw error;
}

/** Delete a venue (only if owned by current user). */
export async function deleteVenue(id: string) {
  const sb = await createSupabaseServerClient();
  const userId = await getCurrentUserId();

  const { error } = await sb
    .from("venues")
    .delete()
    .eq("id", id)
    .eq("created_by_user_id", userId);

  if (error) throw error;
}
