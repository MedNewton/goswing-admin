"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserId } from "@/lib/data/auth";
import { insertInto, updateTable } from "@/lib/supabase/mutations";
import { revalidatePath } from "next/cache";
import type { OrganizerRole } from "@/types/database";

export type TeamActionResult =
  | { success: true }
  | { success: false; error: string };

async function getOrganizerIdForOwner() {
  const sb = await createSupabaseServerClient();
  const userId = await getCurrentUserId();

  const { data, error } = await sb
    .from("organizers")
    .select("id")
    .eq("owner_user_id", userId)
    .limit(1)
    .single();

  if (error || !data)
    throw new Error("Organizer not found");

  return { sb, organizerId: (data as { id: string }).id, currentUserId: userId };
}

/** Add a user as a team member. */
export async function addTeamMemberAction(
  targetUserId: string,
  role: OrganizerRole,
): Promise<TeamActionResult> {
  try {
    const { sb, organizerId, currentUserId } = await getOrganizerIdForOwner();

    const { error } = await insertInto(sb, "organizer_members", {
      organizer_id: organizerId,
      user_id: targetUserId,
      role,
      invited_by: currentUserId,
    });

    if (error) throw error;

    revalidatePath("/team");
    return { success: true };
  } catch (err) {
    console.error("addTeamMember error:", err);
    const message = err instanceof Error ? err.message : "Failed to add member";
    return { success: false, error: message };
  }
}

/** Update a team member's role. */
export async function updateTeamMemberRoleAction(
  memberId: string,
  role: OrganizerRole,
): Promise<TeamActionResult> {
  try {
    const { sb } = await getOrganizerIdForOwner();

    const { error } = await updateTable(sb, "organizer_members", {
      role,
    }).eq("id", memberId);

    if (error) throw error;

    revalidatePath("/team");
    return { success: true };
  } catch (err) {
    console.error("updateTeamMemberRole error:", err);
    const message = err instanceof Error ? err.message : "Failed to update role";
    return { success: false, error: message };
  }
}

/** Remove a team member. */
export async function removeTeamMemberAction(
  memberId: string,
): Promise<TeamActionResult> {
  try {
    const { sb } = await getOrganizerIdForOwner();

    const { error } = await sb
      .from("organizer_members")
      .delete()
      .eq("id", memberId);

    if (error) throw error;

    revalidatePath("/team");
    return { success: true };
  } catch (err) {
    console.error("removeTeamMember error:", err);
    const message = err instanceof Error ? err.message : "Failed to remove member";
    return { success: false, error: message };
  }
}

/** Search for users available to add. */
export async function searchUsersAction(
  query: string,
): Promise<{ userId: string; displayName: string; email: string | null; avatarUrl: string | null }[]> {
  if (!query || query.trim().length < 2) return [];

  try {
    const { searchAvailableUsers } = await import("@/lib/data/team");
    return await searchAvailableUsers(query.trim());
  } catch (err) {
    console.error("searchUsers error:", err);
    return [];
  }
}
