import { MainLayout } from "@/components/layout/MainLayout";
import { getTeamMembers } from "@/lib/data/team";
import { TeamPageClient } from "@/components/team/TeamPageClient";
import { getLocale, t } from "@/lib/i18n";
import { checkAdminAccess } from "@/lib/auth/requireAdmin";
import { auth } from "@clerk/nextjs/server";
import {
  applyAcceptedInvitations,
  listPendingInvitations,
  type PendingInvitation,
} from "@/lib/team/invitations";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const denied = await checkAdminAccess();
  if (denied) return denied;

  const locale = await getLocale();
  const { userId } = await auth();
  let members: Awaited<ReturnType<typeof getTeamMembers>> = [];
  let pendingInvitations: PendingInvitation[] = [];

  // Add people who accepted an email invitation since the last visit.
  try {
    await applyAcceptedInvitations();
  } catch (err) {
    console.error("[team] applying accepted invitations failed:", err);
  }

  try {
    members = await getTeamMembers();
  } catch {
    // Will show empty state
  }

  try {
    pendingInvitations = await listPendingInvitations();
  } catch (err) {
    console.error("[team] listing invitations failed:", err);
  }

  return (
    <MainLayout>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">
        {t(locale, "teamPage.title")}
      </h1>
      <TeamPageClient
        members={members}
        pendingInvitations={pendingInvitations}
        currentUserId={userId ?? null}
      />
    </MainLayout>
  );
}
