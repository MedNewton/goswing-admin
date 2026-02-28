import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/Button";
import { getEvents } from "@/lib/data/events";
import { EventsPageClient } from "@/components/events/EventsPageClient";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  let events: Awaited<ReturnType<typeof getEvents>> = [];

  try {
    events = await getEvents();
  } catch {
    // Will show empty state
  }

  return (
    <MainLayout
      title="Events Management"
      actions={
        <Link href="/events/create">
          <Button variant="primary" size="sm">
            + Create Event
          </Button>
        </Link>
      }
    >
      <EventsPageClient events={events} />
    </MainLayout>
  );
}
