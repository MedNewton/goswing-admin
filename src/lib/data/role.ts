import { adminApiCall } from "@/lib/api/client";
import type { ApiAdminContext } from "@/lib/api/types";
import type { OrganizerRole } from "@/types/database";

/**
 * Get the current user's dashboard role via GET /v1/admin/me/context.
 * Falls back to "admin" on failure (owner may not have a member row yet).
 */
export async function getUserRole(): Promise<OrganizerRole> {
  try {
    const context = await adminApiCall<ApiAdminContext>("/v1/admin/me/context");
    return context.role;
  } catch (error) {
    console.error(
      "[getUserRole] context fetch failed:",
      error instanceof Error ? error.message : String(error),
    );
    // Fall back to admin for safety (owner may not have a member row yet)
    return "admin";
  }
}
