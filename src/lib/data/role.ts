import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserId } from "@/lib/data/auth";
import type { OrganizerRole } from "@/types/database";

/**
 * Get the current user's dashboard role.
 * Returns "admin" if owner or admin member, "dj" if DJ member.
 * Falls back to "admin" for the organizer owner (backwards compat).
 */
export async function getUserRole(): Promise<OrganizerRole> {
  const userId = await getCurrentUserId();
  const sb = await createSupabaseServerClient();

  const { data, error } = await sb
    .from("organizer_members")
    .select("role")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[getUserRole] query failed:", error.message);
    // Fall back to admin for safety (owner may not have a member row yet)
    return "admin";
  }

  const row = data as { role: string } | null;

  if (!row) {
    // No member row — check if user is an organizer owner (legacy/pre-migration)
    const { data: orgData } = await sb
      .from("organizers")
      .select("id")
      .eq("owner_user_id", userId)
      .limit(1)
      .maybeSingle();

    return orgData ? "admin" : "dj";
  }

  const validRoles: OrganizerRole[] = ["admin", "dj", "entrance_manager", "finance_manager"];
  return validRoles.includes(row.role as OrganizerRole)
    ? (row.role as OrganizerRole)
    : "admin";
}
