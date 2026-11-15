import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getLocale, t } from "@/lib/i18n";
import { readTeamInvite } from "@/lib/team/teamInvite";
import { SignOutLink } from "./SignOutLink";

export const dynamic = "force-dynamic";

/** Shown to invited team members until the organizer's Team page adds them. */
export default async function InvitePendingPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const invite = readTeamInvite(user.publicMetadata);
  if (!invite || invite.appliedAt) redirect("/overview");

  const locale = await getLocale();
  const organizer = invite.organizerName || t(locale, "invitePending.yourOrganizer");

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900">{t(locale, "invitePending.title")}</h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          {t(locale, "invitePending.body").replace("{organizer}", organizer)}
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <Link
            href="/overview"
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            {t(locale, "invitePending.checkAgain")}
          </Link>
          <SignOutLink label={t(locale, "invitePending.signOut")} />
        </div>
      </div>
    </main>
  );
}
