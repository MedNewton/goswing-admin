import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapSongs, type SongQueryRow } from "@/lib/mappers/music";

/** Fetch all song suggestions for events owned by current user. */
export async function getSongSuggestions(filters?: {
  eventId?: string;
}) {
  const sb = await createSupabaseServerClient();

  let query = sb
    .from("event_song_suggestions")
    .select(`
      *,
      events ( title )
    `)
    .order("created_at", { ascending: false });

  if (filters?.eventId) {
    query = query.eq("event_id", filters.eventId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return mapSongs((data ?? []) as SongQueryRow[]);
}
