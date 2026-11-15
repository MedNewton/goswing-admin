// Team invitations by email, built on Clerk invitations.
//
// The REST API can only add an existing user to the team (POST
// /v1/admin/team { userId, role }, organizer owner only); it has no invite
// route. So:
//   1. Email already has an account -> add them right away.
//   2. Otherwise -> Clerk sends a sign-up invitation. The invitation's public
//      metadata (copied onto the user when they sign up) records the team.
//   3. When the owner loads the Team page, accepted invitations are applied
//      with POST /v1/admin/team and the user is marked as applied.
// Until step 3 the invitee sees /invite-pending (see middleware.ts).

import { clerkClient } from "@clerk/nextjs/server";
import { adminApiCall, isApiError } from "@/lib/api/client";
import type { ApiAdminContext, ApiTeamMember } from "@/lib/api/types";
import type { OrganizerRole } from "@/types/database";
import { readTeamInvite, type TeamInviteMetadata } from "@/lib/team/teamInvite";

export { readTeamInvite, type TeamInviteMetadata };

export type PendingInvitation = Readonly<{
  id: string;
  email: string;
  role: OrganizerRole;
  createdAt: string;
}>;

async function getMyOrganizer(): Promise<{ id: string; name: string; userId: string }> {
  const context = await adminApiCall<ApiAdminContext>("/v1/admin/me/context");
  if (!context.organizer) throw new Error("No organizer for the current user");
  return { id: context.organizer.id, name: context.organizer.name, userId: context.userId };
}

export type InviteResult =
  | { status: "added" }
  | { status: "invited" }
  | { status: "already_member" };

export async function inviteByEmail(
  email: string,
  role: OrganizerRole,
  appOrigin: string,
): Promise<InviteResult> {
  const organizer = await getMyOrganizer();
  const clerk = await clerkClient();

  // Existing account: add directly (exact email match only, no browsing).
  const existing = await clerk.users.getUserList({ emailAddress: [email], limit: 1 });
  const user = existing.data[0];
  if (user) {
    try {
      await adminApiCall<ApiTeamMember>("/v1/admin/team", {
        method: "POST",
        body: { userId: user.id, role },
      });
      // Mark them as a team member so they aren't sent to organizer onboarding.
      if (!readTeamInvite(user.publicMetadata)) {
        await clerk.users.updateUserMetadata(user.id, {
          publicMetadata: {
            teamInvite: {
              organizerId: organizer.id,
              organizerName: organizer.name,
              role,
              invitedBy: organizer.userId,
              appliedAt: new Date().toISOString(),
            } satisfies TeamInviteMetadata,
          },
        });
      }
      return { status: "added" };
    } catch (err) {
      if (isApiError(err) && (err.status === 409 || err.code === "conflict")) {
        return { status: "already_member" };
      }
      throw err;
    }
  }

  const teamInvite: TeamInviteMetadata = {
    organizerId: organizer.id,
    organizerName: organizer.name,
    role,
    invitedBy: organizer.userId,
  };
  await clerk.invitations.createInvitation({
    emailAddress: email,
    redirectUrl: `${appOrigin}/accept-invite`,
    publicMetadata: { teamInvite },
    notify: true,
    ignoreExisting: true,
    expiresInDays: 30,
  });
  return { status: "invited" };
}

export async function listPendingInvitations(): Promise<PendingInvitation[]> {
  const organizer = await getMyOrganizer();
  const clerk = await clerkClient();
  const { data } = await clerk.invitations.getInvitationList({ status: "pending", limit: 100 });
  return data
    .map((inv) => ({ inv, invite: readTeamInvite(inv.publicMetadata) }))
    .filter(({ invite }) => invite?.organizerId === organizer.id)
    .map(({ inv, invite }) => ({
      id: inv.id,
      email: inv.emailAddress,
      role: invite!.role,
      createdAt: new Date(inv.createdAt).toISOString(),
    }));
}

export async function revokeInvitation(invitationId: string): Promise<void> {
  const organizer = await getMyOrganizer();
  const clerk = await clerkClient();
  const { data } = await clerk.invitations.getInvitationList({ status: "pending", limit: 100 });
  const inv = data.find((i) => i.id === invitationId);
  if (!inv || readTeamInvite(inv.publicMetadata)?.organizerId !== organizer.id) {
    throw new Error("Invitation not found");
  }
  await clerk.invitations.revokeInvitation(invitationId);
}

/**
 * Add users who accepted this organizer's invitations to the team.
 * Safe to call on every Team page load; returns how many were added.
 */
export async function applyAcceptedInvitations(): Promise<number> {
  const organizer = await getMyOrganizer();
  const clerk = await clerkClient();
  const { data } = await clerk.invitations.getInvitationList({ status: "accepted", limit: 100 });

  let added = 0;
  for (const inv of data) {
    const invite = readTeamInvite(inv.publicMetadata);
    if (invite?.organizerId !== organizer.id) continue;

    const users = await clerk.users.getUserList({ emailAddress: [inv.emailAddress], limit: 1 });
    const user = users.data[0];
    if (!user) continue;
    const userInvite = readTeamInvite(user.publicMetadata);
    if (userInvite?.appliedAt) continue;

    try {
      await adminApiCall<ApiTeamMember>("/v1/admin/team", {
        method: "POST",
        body: { userId: user.id, role: invite.role },
      });
      added += 1;
    } catch (err) {
      const alreadyMember = isApiError(err) && (err.status === 409 || err.code === "conflict");
      if (!alreadyMember) {
        console.error("[team] could not apply accepted invitation", {
          invitationId: inv.id,
          message: err instanceof Error ? err.message : String(err),
        });
        continue;
      }
    }

    await clerk.users.updateUserMetadata(user.id, {
      publicMetadata: {
        teamInvite: { ...invite, appliedAt: new Date().toISOString() },
      },
    });
  }
  return added;
}
