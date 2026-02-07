import { MainLayout } from "@/components/layout/MainLayout";
import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { EventCard } from "@/components/events/EventCard";
import type { Event } from "@/types";

export default async function EventDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Mock event data
  const event = {
    id: id,
    title: "Summer Jazz Night",
    date: "July 14, 2024",
    time: "19:00 - 23:00",
    location: "Blue Note Jazz Club, New York",
    image: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800",
    price: 25,
    status: "published" as const,
    attendeeCount: 234,
    description:
      "Join us for an unforgettable evening of smooth jazz, featuring renowned artists and emerging talents. Experience the magic of live music in an intimate setting.",
  };

  const thumbnails = [
    "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=200",
    "https://images.unsplash.com/photo-1511735111819-9a3f7709049c?w=200",
    "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200",
  ];

  const tickets = [
    { name: "Early Bird", price: 20 },
    { name: "Standard", price: 25 },
    { name: "VIP", price: 50 },
  ];

  const features = [
    {
      title: "Live DJ Entertainment",
      description: "Professional DJ spinning the best tracks all night",
    },
    {
      title: "Refreshment & Entertainment",
      description: "Complimentary drinks and appetizers included",
    },
  ];

  const organizer = {
    name: "Guest Organizer",
    avatar: "",
    events: "12 Events",
  };

  const similarEvents: Event[] = [
    {
      id: "2",
      title: "Weekend House",
      date: "Aug 5, 2024",
      location: "Miami Beach",
      image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400",
      status: "published",
      attendeeCount: 156,
    },
    {
      id: "3",
      title: "Acoustic Sessions",
      date: "Aug 12, 2024",
      location: "Brooklyn Cafe",
      image: "https://images.unsplash.com/photo-1511735111819-9a3f7709049c?w=400",
      status: "published",
      attendeeCount: 89,
    },
  ];

  const comments = [
    {
      user: "Sarah M.",
      avatar: "",
      comment: "Can&apos;t wait for this event!",
      time: "2 hours ago",
    },
  ];

  return (
    <>
      <MainLayout
        title="Event Details"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              Edit Event
            </Button>
          </div>
        }
      >
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Event Image */}
              <div className="overflow-hidden rounded-lg bg-white shadow-sm">
                <img
                  src={event.image}
                  alt={event.title}
                  className="h-96 w-full object-cover"
                />

                {/* Thumbnails */}
                <div className="flex gap-2 p-4">
                  {thumbnails.map((thumb, idx) => (
                    <img
                      key={idx}
                      src={thumb}
                      alt={`Thumbnail ${idx + 1}`}
                      className="h-16 w-16 cursor-pointer rounded-lg object-cover transition-opacity hover:opacity-75"
                    />
                  ))}
                </div>
              </div>

              {/* Event Info */}
              <div className="mt-6 rounded-lg bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                      {event.title}
                    </h1>
                    <div className="mt-2">
                      <Badge variant={event.status}>
                        {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Price</p>
                    <p className="text-2xl font-bold text-gray-900">€{event.price}</p>
                  </div>
                </div>

                <div className="mt-6 space-y-3 text-gray-700">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📅</span>
                    <span>{event.date} • {event.time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📍</span>
                    <span>{event.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👥</span>
                    <span>{event.attendeeCount} attendees</span>
                  </div>
                </div>

                <div className="mt-6">
                  <p className="text-gray-700">{event.description}</p>
                </div>
              </div>

              {/* Event Features */}
              <div className="mt-6 rounded-lg bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-gray-900">
                  Event Features
                </h2>
                <div className="mt-4 space-y-4">
                  {features.map((feature, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-100">
                        <span className="text-xl">✓</span>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {feature.title}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Organizer */}
              <div className="mt-6 rounded-lg bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-gray-900">
                  Guest Organizer
                </h2>
                <div className="mt-4 flex items-center gap-4">
                  <Avatar initials="GO" size="lg" />
                  <div>
                    <p className="font-medium text-gray-900">{organizer.name}</p>
                    <p className="text-sm text-gray-600">{organizer.events}</p>
                  </div>
                  <Button variant="outline" size="sm" className="ml-auto">
                    View Profile
                  </Button>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Ticket Prices */}
              <div className="rounded-lg bg-white p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900">Ticket Prices</h3>
                <div className="mt-4 space-y-3">
                  {tickets.map((ticket, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
                    >
                      <span className="text-sm font-medium text-gray-700">
                        {ticket.name}
                      </span>
                      <span className="font-semibold text-gray-900">
                        €{ticket.price}
                      </span>
                    </div>
                  ))}
                </div>
                <Button variant="primary" className="mt-4 w-full">
                  Book now with us
                </Button>
              </div>

              {/* Location */}
              <div className="rounded-lg bg-white p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900">Location</h3>
                <p className="mt-2 text-sm text-gray-600">{event.location}</p>
                <div className="mt-4 h-48 rounded-lg bg-gray-200">
                  {/* Map placeholder */}
                  <div className="flex h-full items-center justify-center text-sm text-gray-500">
                    Map View
                  </div>
                </div>
              </div>

              {/* Comments */}
              <div className="rounded-lg bg-white p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900">Comments (1)</h3>
                <div className="mt-4 space-y-4">
                  {comments.map((comment, idx) => (
                    <div key={idx} className="flex gap-3">
                      <Avatar initials="SM" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">
                            {comment.user}
                          </p>
                          <p className="text-xs text-gray-500">{comment.time}</p>
                        </div>
                        <p className="mt-1 text-sm text-gray-700">
                          {comment.comment}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" className="mt-4 w-full">
                  View All Comments
                </Button>
              </div>
            </div>
          </div>

          {/* Similar Events */}
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900">Similar Events</h2>
            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {similarEvents.map((evt) => (
                <EventCard key={evt.id} event={evt} />
              ))}
            </div>
          </div>
        </div>
      </MainLayout>
      <Footer />
    </>
  );
}
