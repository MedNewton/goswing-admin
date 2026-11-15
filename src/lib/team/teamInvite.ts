// Team invitation data stored in Clerk public metadata (no server-only deps,
// so the middleware can use it).
import type { OrganizerRole } from "@/types/database";

export type TeamInviteMetadata = Readonly<{
  organizerId: string;
  organizerName: string;
  role: OrganizerRole;
  invitedBy: string;
  appliedAt?: string;
}>;

const ROLES: ReadonlySet<string> = new Set(["admin", "dj", "entrance_manager", "finance_manager"]);

export function readTeamInvite(metadata: unknown): TeamInviteMetadata | null {
  if (!metadata || typeof metadata !== "object") return null;
  const invite = (metadata as { teamInvite?: unknown }).teamInvite;
  if (!invite || typeof invite !== "object") return null;
  const v = invite as Record<string, unknown>;
  if (typeof v.organizerId !== "string" || typeof v.role !== "string" || !ROLES.has(v.role)) {
    return null;
  }
  return {
    organizerId: v.organizerId,
    organizerName: typeof v.organizerName === "string" ? v.organizerName : "",
    role: v.role as OrganizerRole,
    invitedBy: typeof v.invitedBy === "string" ? v.invitedBy : "",
    appliedAt: typeof v.appliedAt === "string" ? v.appliedAt : undefined,
  };
}

