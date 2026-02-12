import { MainLayout } from "@/components/layout/MainLayout";
import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { getEvent } from "@/lib/data/events";
import { formatPrice, formatDate, formatTime } from "@/lib/utils/format";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EventDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let eventData: Awaited<ReturnType<typeof getEvent>> | null = null;

  try {
    eventData = await getEvent(id);
  } catch {
    notFound();
  }

  if (!eventData) notFound();

  const { event, ticketTypes, organizer, venue } = eventData;

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
                    <p className="text-2xl font-bold text-gray-900">
                      {event.minPrice ?? "Free"}
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-3 text-gray-700">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📅</span>
                    <span>
                      {formatDate(event.startsAt)}
                      {event.startsAt && ` • ${formatTime(event.startsAt)}`}
                      {event.endsAt && ` - ${formatTime(event.endsAt)}`}
                    </span>
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

                {event.description && (
                  <div className="mt-6">
                    <p className="text-gray-700">{event.description}</p>
                  </div>
                )}

                {event.tags && event.tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {event.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Organizer */}
              {organizer && (
                <div className="mt-6 rounded-lg bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Organizer
                  </h2>
                  <div className="mt-4 flex items-center gap-4">
                    {organizer.logo_url ? (
                      <img
                        src={organizer.logo_url}
                        alt={organizer.name}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <Avatar
                        initials={organizer.name
                          .split(" ")
                          .map((w) => w[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                        size="lg"
                      />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{organizer.name}</p>
                      {organizer.tagline && (
                        <p className="text-sm text-gray-600">{organizer.tagline}</p>
                      )}
                    </div>
                    <Button variant="outline" size="sm" className="ml-auto">
                      View Profile
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Ticket Prices */}
              {ticketTypes && ticketTypes.length > 0 && (
                <div className="rounded-lg bg-white p-6 shadow-sm">
                  <h3 className="font-semibold text-gray-900">Ticket Prices</h3>
                  <div className="mt-4 space-y-3">
                    {ticketTypes.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
                      >
                        <span className="text-sm font-medium text-gray-700">
                          {ticket.name}
                        </span>
                        <span className="font-semibold text-gray-900">
                          {formatPrice(ticket.price_cents, ticket.currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Location */}
              {venue && (
                <div className="rounded-lg bg-white p-6 shadow-sm">
                  <h3 className="font-semibold text-gray-900">Location</h3>
                  <p className="mt-2 text-sm text-gray-600">{event.location}</p>
                  {venue.address_line1 && (
                    <p className="mt-1 text-sm text-gray-500">{venue.address_line1}</p>
                  )}
                  <div className="mt-4 h-48 rounded-lg bg-gray-200">
                    <div className="flex h-full items-center justify-center text-sm text-gray-500">
                      Map View
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </MainLayout>
      <Footer />
    </>
  );
}
