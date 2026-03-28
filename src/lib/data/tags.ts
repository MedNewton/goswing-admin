import { createSupabaseServerClient } from "@/lib/supabase/server";
import { insertInto } from "@/lib/supabase/mutations";

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Fetch tags filtered by type (e.g., 'category', 'party_type', 'music_style', 'extra_service'). */
export async function getTagsByType(type: string) {
  const sb = await createSupabaseServerClient();

  const { data, error } = await sb
    .from("tags")
    .select("id, label, slug, type")
    .eq("type", type)
    .order("label");

  if (error) throw error;
  return (data ?? []) as Array<{ id: string; label: string; slug: string; type: string }>;
}

/** Fetch all tags linked to an organizer via organizer_tags. */
export async function getOrganizerTags(organizerId: string) {
  const sb = await createSupabaseServerClient();

  const { data, error } = await sb
    .from("organizer_tags")
    .select("tag_id, tags ( id, label, slug, type )")
    .eq("organizer_id", organizerId);

  if (error) throw error;
  return ((data ?? []) as Array<{ tags: { id: string; label: string; slug: string; type: string } }>).map(
    (row) => row.tags,
  );
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/** Sync organizer_tags: delete old, insert new. */
export async function setOrganizerTags(organizerId: string, tagIds: string[]) {
  const sb = await createSupabaseServerClient();

  // Delete existing tags for this organizer
  const { error: deleteError } = await sb
    .from("organizer_tags")
    .delete()
    .eq("organizer_id", organizerId);

  if (deleteError) throw deleteError;

  // Insert new tags
  if (tagIds.length > 0) {
    const { error: insertError } = await insertInto(
      sb,
      "organizer_tags",
      tagIds.map((tag_id) => ({ organizer_id: organizerId, tag_id })),
    );
    if (insertError) throw insertError;
  }
}
