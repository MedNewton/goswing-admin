import { adminApiCall } from "@/lib/api/client";
import type { ApiItems, ApiTeamMember, ApiUserMatch } from "@/lib/api/types";
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

/**
 * Search profiles that are NOT already members of the current organizer.
 */
export async function searchAvailableUsers(
  query: string,
): Promise<{ userId: string; displayName: string; email: string | null; avatarUrl: string | null }[]> {
  const q = query.trim();
  // API returns [] for queries under 2 chars — skip the network call.
  if (q.length < 2) return [];

  const { items } = await adminApiCall<ApiItems<ApiUserMatch>>(
    "/v1/admin/team/user-search",
    { query: { q } },
  );
  return items.map((u) => ({
    userId: u.userId,
    displayName: u.displayName,
    email: u.email,
    avatarUrl: u.avatarUrl,
  }));
}
