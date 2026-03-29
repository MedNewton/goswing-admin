import { auth } from "@clerk/nextjs/server";

/**
 * Get the current authenticated user's Clerk ID.
 * Throws if not authenticated — should only be called from protected routes.
 */
export async function getCurrentUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");
  return userId;
}
