import { MainLayout } from "@/components/layout/MainLayout";
import { EventCard } from "@/components/events/EventCard";
import { SearchBar } from "@/components/ui/SearchBar";
import { Button } from "@/components/ui/Button";
import { getEvents } from "@/lib/data/events";

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
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            List View
          </Button>
          <Button variant="ghost" size="sm">
            Calendar View
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Search and Filters */}
        <div className="flex items-center gap-4">
          <SearchBar
            placeholder="Search events..."
            className="flex-1 max-w-md"
          />
          <Button variant="outline">All Status</Button>
          <Button variant="outline">More Filters</Button>
        </div>

        {/* Events Grid */}
        {events.length === 0 ? (
          <p className="py-12 text-center text-gray-500">
            No events found. Create your first event to get started.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
