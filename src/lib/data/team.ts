import { adminApiCall } from "@/lib/api/client";
import type { ApiItems, ApiTeamMember } from "@/lib/api/types";
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

/**
 * Get all team members for the current user's organizer.
 */
export async function getTeamMembers(): Promise<TeamMember[]> {
  const { items } = await adminApiCall<ApiItems<ApiTeamMember>>(
    "/v1/admin/team",
  );
  return items.map((m) => ({
    memberId: m.memberId,
    userId: m.userId,
    displayName: m.displayName,
    email: m.email,
    avatarUrl: m.avatarUrl,
    role: m.role,
    joinedAt: m.joinedAt,
  }));
}
