import { MainLayout } from "@/components/layout/MainLayout";
import { getAttendees, getCheckinSummary } from "@/lib/data/attendees";
import { AttendeesPageClient } from "@/components/attendees/AttendeesPageClient";

export const dynamic = "force-dynamic";

export default async function AttendeesPage() {
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
    <MainLayout title="All Attendees">
      <AttendeesPageClient attendees={attendees} checkinSummary={checkinSummary} />
    </MainLayout>
  );
}
