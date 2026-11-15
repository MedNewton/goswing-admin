"use server";

import { adminApiCall } from "@/lib/api/client";
import type { ApiTeamMember } from "@/lib/api/types";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { inviteByEmail, revokeInvitation } from "@/lib/team/invitations";
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

export type InviteActionResult =
  | { success: true; status: "added" | "invited" | "already_member" }
  | { success: false; error: string };

const ROLE_VALUES = ["admin", "dj", "entrance_manager", "finance_manager"] as const;

/** Invite someone by email: adds an existing account, or emails an invitation. */
export async function inviteTeamMemberAction(
  email: string,
  role: OrganizerRole,
): Promise<InviteActionResult> {
  const parsedEmail = z.string().trim().toLowerCase().email().safeParse(email);
  if (!parsedEmail.success) {
    return { success: false, error: "invalid_email" };
  }
  if (!(ROLE_VALUES as readonly string[]).includes(role)) {
    return { success: false, error: "invalid_role" };
  }

  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    const result = await inviteByEmail(parsedEmail.data, role, `${proto}://${host}`);
    revalidatePath("/team");
    return { success: true, status: result.status };
  } catch (err) {
    console.error("inviteTeamMember error:", err);
    const message = err instanceof Error ? err.message : "Failed to send invitation";
    return { success: false, error: message };
  }
}

/** Cancel a pending email invitation. */
export async function revokeTeamInvitationAction(
  invitationId: string,
): Promise<TeamActionResult> {
  try {
    await revokeInvitation(invitationId);
    revalidatePath("/team");
    return { success: true };
  } catch (err) {
    console.error("revokeTeamInvitation error:", err);
    const message = err instanceof Error ? err.message : "Failed to cancel invitation";
    return { success: false, error: message };
  }
}
