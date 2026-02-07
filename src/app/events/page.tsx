import { MainLayout } from "@/components/layout/MainLayout";
import { EventCard } from "@/components/events/EventCard";
import { SearchBar } from "@/components/ui/SearchBar";
import { Button } from "@/components/ui/Button";

const mockEvents = [
  {
    id: "1",
    title: "Summer Jazz Night",
    description: "An evening of smooth jazz",
    image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=300&fit=crop",
    date: "2024-06-15 at 20:00",
    location: "Jazz Club",
    attendeeCount: 127150,
    status: "published" as const,
  },
  {
    id: "2",
    title: "Wine Tasting Evening",
    description: "Sample the finest wines",
    image: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&h=300&fit=crop",
    date: "2024-06-12 at 18:30",
    location: "Wine Bar Lounge",
    attendeeCount: 43980,
    status: "draft" as const,
  },
  {
    id: "3",
    title: "Tech Networking Mixer",
    description: "Connect with tech professionals",
    image: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=400&h=300&fit=crop",
    date: "2024-05-28 at 19:00",
    location: "Tech Hub - Room A",
    attendeeCount: 89100,
    status: "completed" as const,
  },
  {
    id: "4",
    title: "Art Gallery Opening",
    description: "Contemporary art exhibition",
    image: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=400&h=300&fit=crop",
    date: "2024-06-20 at 17:00",
    location: "Modern Art Museum",
    attendeeCount: 52300,
    status: "published" as const,
  },
  {
    id: "5",
    title: "Food Festival",
    description: "Taste cuisines from around the world",
    image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop",
    date: "2024-07-01 at 12:00",
    location: "Central Park",
    attendeeCount: 150000,
    status: "published" as const,
  },
  {
    id: "6",
    title: "Yoga Retreat Weekend",
    description: "Relax and rejuvenate",
    image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&h=300&fit=crop",
    date: "2024-06-25 at 08:00",
    location: "Mountain Resort",
    attendeeCount: 28500,
    status: "published" as const,
  },
];

export default function EventsPage() {
  return (
    <MainLayout
      title="Events Management"
      actions={
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            📋 List View
          </Button>
          <Button variant="ghost" size="sm">
            📅 Calendar View
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
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {mockEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
