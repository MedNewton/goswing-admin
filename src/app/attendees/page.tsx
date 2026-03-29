import { MainLayout } from "@/components/layout/MainLayout";
import { getAttendees, getCheckinSummary } from "@/lib/data/attendees";
import { AttendeesPageClient } from "@/components/attendees/AttendeesPageClient";
import { getLocale, t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function AttendeesPage() {
  const locale = await getLocale();
  let attendees: Awaited<ReturnType<typeof getAttendees>> = [];
  let checkinSummary: Awaited<ReturnType<typeof getCheckinSummary>> = [];

  try {
    [attendees, checkinSummary] = await Promise.all([
      getAttendees(),
      getCheckinSummary(),
    ]);
  } catch {
    // Will show empty state
  }

  return (
    <MainLayout>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">{t(locale, "attendeesPage.title")}</h1>
      <AttendeesPageClient attendees={attendees} checkinSummary={checkinSummary} />
    </MainLayout>
  );
}
