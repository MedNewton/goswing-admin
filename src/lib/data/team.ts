import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserId } from "@/lib/data/auth";
import type { OrganizerRole } from "@/types/database";

export interface TeamMember {
  memberId: string;
  userId: string;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  role: OrganizerRole;
  joinedAt: string;
}

interface MemberRow {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
}

interface ProfileRow {
  user_id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

async function getOrganizerIdForOwner() {
  const sb = await createSupabaseServerClient();
  const userId = await getCurrentUserId();

  const { data, error } = await sb
    .from("organizers")
    .select("id")
    .eq("owner_user_id", userId)
    .limit(1)
    .single();

  if (error || !data) return { sb, organizerId: null };
  return { sb, organizerId: (data as { id: string }).id };
}

/**
 * Get all team members for the current user's organizer.
 */
export async function getTeamMembers(): Promise<TeamMember[]> {
  const { sb, organizerId } = await getOrganizerIdForOwner();
  if (!organizerId) return [];

  const { data, error } = await sb
    .from("organizer_members")
    .select("id, user_id, role, created_at")
    .eq("organizer_id", organizerId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  const members = data as MemberRow[];
  const userIds = members.map((m) => m.user_id);

  const { data: profiles } = await sb
    .from("profiles")
    .select("user_id, display_name, email, avatar_url")
    .in("user_id", userIds);

  const profileMap = new Map(
    ((profiles as ProfileRow[] | null) ?? []).map((p) => [p.user_id, p]),
  );

  return members.map((m) => {
    const profile = profileMap.get(m.user_id);
    return {
      memberId: m.id,
      userId: m.user_id,
      displayName: profile?.display_name ?? "Unknown",
      email: profile?.email ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      role: m.role as OrganizerRole,
      joinedAt: m.created_at,
    };
  });
}

/**
 * Search profiles that are NOT already members of the current organizer.
 */
export async function searchAvailableUsers(
  query: string,
): Promise<{ userId: string; displayName: string; email: string | null; avatarUrl: string | null }[]> {
  const { sb, organizerId } = await getOrganizerIdForOwner();
  if (!organizerId) return [];

  // Get existing member user_ids
  const { data: existing } = await sb
    .from("organizer_members")
    .select("user_id")
    .eq("organizer_id", organizerId);

  const existingIds = new Set(
    ((existing as { user_id: string }[] | null) ?? []).map((e) => e.user_id),
  );

  // Search profiles by name or email
  const searchTerm = `%${query}%`;
  const { data: profiles, error } = await sb
    .from("profiles")
    .select("user_id, display_name, email, avatar_url")
    .or(`display_name.ilike.${searchTerm},email.ilike.${searchTerm}`)
    .limit(20);

  if (error || !profiles) return [];

  return (profiles as ProfileRow[])
    .filter((p) => !existingIds.has(p.user_id))
    .map((p) => ({
      userId: p.user_id,
      displayName: p.display_name ?? "Unknown",
      email: p.email ?? null,
      avatarUrl: p.avatar_url ?? null,
    }));
}
