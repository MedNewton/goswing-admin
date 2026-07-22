"use server";

import { adminApiCall } from "@/lib/api/client";
import type { ApiTeamMember } from "@/lib/api/types";
import { revalidatePath } from "next/cache";
import type { OrganizerRole } from "@/types/database";

export type TeamActionResult =
  | { success: true }
  | { success: false; error: string };

/** Add a user as a team member. */
export async function addTeamMemberAction(
  targetUserId: string,
  role: OrganizerRole,
): Promise<TeamActionResult> {
  try {
    await adminApiCall<ApiTeamMember>("/v1/admin/team", {
      method: "POST",
      body: { userId: targetUserId, role },
    });

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
    await adminApiCall<ApiTeamMember>(`/v1/admin/team/${memberId}`, {
      method: "PATCH",
      body: { role },
    });

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
    await adminApiCall<void>(`/v1/admin/team/${memberId}`, {
      method: "DELETE",
    });

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
