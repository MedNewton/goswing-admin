import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapVenue, mapVenues } from "@/lib/mappers/venues";
import type { VenueRow, VenueInsert, VenueUpdate } from "@/types/database";

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Fetch all venues for the current user (only venues they created). */
export async function getVenues() {
  const sb = await createSupabaseServerClient();

  const { data, error } = await sb
    .from("venues")
    .select("*")
    .not("created_by_user_id", "is", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return mapVenues((data ?? []) as VenueRow[]);
}

/** Fetch a single venue by ID. */
export async function getVenue(id: string) {
  const sb = await createSupabaseServerClient();

  const { data, error } = await sb
    .from("venues")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return mapVenue(data as VenueRow);
}

/** Fetch venues for dropdown selection (id and name only, only user's venues). */
export async function getVenuesForSelect() {
  const sb = await createSupabaseServerClient();

  const { data, error } = await sb
    .from("venues")
    .select("id, name, city")
    .not("created_by_user_id", "is", null)
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Array<{ id: string; name: string; city: string | null }>;
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/** Create a new venue. */
export async function createVenue(venue: Omit<VenueInsert, "created_by_user_id">) {
  const sb = await createSupabaseServerClient();

  const { data, error } = await sb
    .from("venues")
    .insert(venue)
    .select("id")
    .single();

  if (error) throw error;
  return (data as { id: string }).id;
}

/** Update an existing venue. */
export async function updateVenue(id: string, updates: VenueUpdate) {
  const sb = await createSupabaseServerClient();

  const { error } = await sb
    .from("venues")
    .update(updates)
    .eq("id", id);

  if (error) throw error;
}

/** Delete a venue. */
export async function deleteVenue(id: string) {
  const sb = await createSupabaseServerClient();

  const { error } = await sb
    .from("venues")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
