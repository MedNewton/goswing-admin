import type { ReactElement } from "react";
import { getUserRole } from "@/lib/data/role";
import { AccessDenied } from "@/components/layout/AccessDenied";
import type { OrganizerRole } from "@/types/database";

/** Default landing page per role (used by AccessDenied redirect). */
export const roleDefaultPage: Record<OrganizerRole, string> = {
  admin: "/overview",
  dj: "/music",
  entrance_manager: "/orders",
  finance_manager: "/finance",
};

/**
 * Check if the current user has admin access.
 * Returns null if allowed, or the AccessDenied component to render.
 */
export async function checkAdminAccess(): Promise<ReactElement | null> {
  const role = await getUserRole();
  if (role === "admin") return null;
  return <AccessDenied role={role} />;
}

/**
 * Check if the current user's role can access a specific page.
 * Pass allowed roles explicitly for pages shared by multiple roles.
 * Returns null if allowed, or the AccessDenied component to render.
 */
export async function checkRoleAccess(
  allowedRoles: OrganizerRole[],
): Promise<ReactElement | null> {
  const role = await getUserRole();
  if (allowedRoles.includes(role)) return null;
  return <AccessDenied role={role} />;
}
