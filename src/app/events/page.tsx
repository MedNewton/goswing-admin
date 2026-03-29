import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/Button";
import { getCheckinSummary } from "@/lib/data/attendees";
import { getEvents } from "@/lib/data/events";
import { EventsPageClient } from "@/components/events/EventsPageClient";
import { getLocale, t } from "@/lib/i18n";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const locale = await getLocale();
  let events: Awaited<ReturnType<typeof getEvents>> = [];

  try {
    const [eventsData, checkinSummary] = await Promise.all([
      getEvents(),
      getCheckinSummary(),
    ]);
    const checkinSummaryByEventId = new Map(
      checkinSummary.map((item) => [item.eventId, item] as const),
    );
    events = eventsData.map((event) => {
      const summary = checkinSummaryByEventId.get(event.id);
      return {
        ...event,
        attendeeCount: summary?.checkedIn ?? 0,
        reservationCount: summary?.totalReservations ?? 0,
      };
    });
  } catch {
    // Will show empty state
  }

  return (
    <MainLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">{t(locale, "eventsPage.title")}</h1>
        <Link href="/events/create">
          <Button variant="primary" size="sm">
            {t(locale, "eventsPage.createEvent")}
          </Button>
        </Link>
      </div>
      <EventsPageClient events={events} />
    </MainLayout>
  );
}
