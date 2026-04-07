import { MainLayout } from "@/components/layout/MainLayout";
import { getTeamMembers } from "@/lib/data/team";
import { TeamPageClient } from "@/components/team/TeamPageClient";
import { getLocale, t } from "@/lib/i18n";
import { checkAdminAccess } from "@/lib/auth/requireAdmin";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const denied = await checkAdminAccess();
  if (denied) return denied;

  const locale = await getLocale();
  let members: Awaited<ReturnType<typeof getTeamMembers>> = [];

  try {
    members = await getTeamMembers();
  } catch {
    // Will show empty state
  }

  return (
    <MainLayout>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">
        {t(locale, "teamPage.title")}
      </h1>
      <TeamPageClient members={members} />
    </MainLayout>
  );
}
