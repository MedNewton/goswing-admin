import { MainLayout } from "@/components/layout/MainLayout";
import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { EventActions } from "@/components/events/EventActions";
import { getEvent } from "@/lib/data/events";
import { formatPrice, formatDate, formatTime, formatDateTime } from "@/lib/utils/format";
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
  const hasOrganizerLocation = organizer
    ? [organizer.city, organizer.country_code].some(Boolean)
    : false;
  const hasOrganizerContact = organizer
    ? [organizer.email, organizer.phone, organizer.website_url].some(Boolean)
    : false;
  const hasOrganizerSocials = organizer
    ? [organizer.instagram_handle, organizer.facebook_handle].some(Boolean)
    : false;
  const hasOrganizerPolicies = organizer
    ? [organizer.cancellation_policy, organizer.refund_policy].some(Boolean)
    : false;
  const hasVenueLocation = venue
    ? [venue.city, venue.region, venue.country_code].some(Boolean)
    : false;

  return (
    <>
      <MainLayout
        title="Event Details"
        actions={<EventActions eventId={id} />}
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
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant={event.status}>
                        {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                      </Badge>
                      {event.category && (
                        <Badge variant="info">
                          {event.category.charAt(0).toUpperCase() + event.category.slice(1)}
                        </Badge>
                      )}
                      {event.isFree && (
                        <Badge variant="info">Free</Badge>
                      )}
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
                  {event.endsAt && (
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🏁</span>
                      <span>Ends {formatDateTime(event.endsAt)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📍</span>
                    <span>{event.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👥</span>
                    <span>{event.attendeeCount} attendees</span>
                  </div>
                  {event.currency && (
                    <div className="flex items-center gap-2">
                      <span className="text-lg">💱</span>
                      <span>Currency: {event.currency}</span>
                    </div>
                  )}
                </div>

                {/* Description */}
                {event.description && (
                  <div className="mt-6">
                    <h2 className="text-lg font-semibold text-gray-900">Description</h2>
                    <p className="mt-2 whitespace-pre-line text-gray-700">{event.description}</p>
                  </div>
                )}

                {/* Tags */}
                {event.tags && event.tags.length > 0 && (
                  <div className="mt-6">
                    <h2 className="text-lg font-semibold text-gray-900">Tags</h2>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {event.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
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
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{organizer.name}</p>
                        {organizer.is_verified && (
                          <span className="text-blue-500" title="Verified">✓</span>
                        )}
                      </div>
                      {organizer.tagline && (
                        <p className="text-sm text-gray-600">{organizer.tagline}</p>
                      )}
                      {hasOrganizerLocation && (
                        <p className="text-sm text-gray-500">
                          {[organizer.city, organizer.country_code].filter(Boolean).join(", ")}
                        </p>
                      )}
                    </div>
                  </div>

                  {organizer.about && (
                    <div className="mt-4">
                      <h3 className="text-sm font-medium text-gray-700">About</h3>
                      <p className="mt-1 whitespace-pre-line text-sm text-gray-600">{organizer.about}</p>
                    </div>
                  )}

                  {organizer.specialties && organizer.specialties.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-sm font-medium text-gray-700">Specialties</h3>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {organizer.specialties.map((s) => (
                          <span key={s} className="rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Contact info */}
                  {hasOrganizerContact && (
                    <div className="mt-4 space-y-1">
                      <h3 className="text-sm font-medium text-gray-700">Contact</h3>
                      {organizer.email && (
                        <p className="text-sm text-gray-600">
                          ✉️ <a href={`mailto:${organizer.email}`} className="text-blue-600 hover:underline">{organizer.email}</a>
                        </p>
                      )}
                      {organizer.phone && (
                        <p className="text-sm text-gray-600">📞 {organizer.phone}</p>
                      )}
                      {organizer.website_url && (
                        <p className="text-sm text-gray-600">
                          🌐 <a href={organizer.website_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{organizer.website_url}</a>
                        </p>
                      )}
                    </div>
                  )}

                  {/* Social links */}
                  {hasOrganizerSocials && (
                    <div className="mt-4 flex gap-4">
                      {organizer.instagram_handle && (
                        <a
                          href={`https://instagram.com/${organizer.instagram_handle}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-gray-600 hover:text-gray-900"
                        >
                          Instagram: @{organizer.instagram_handle}
                        </a>
                      )}
                      {organizer.facebook_handle && (
                        <a
                          href={`https://facebook.com/${organizer.facebook_handle}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-gray-600 hover:text-gray-900"
                        >
                          Facebook: {organizer.facebook_handle}
                        </a>
                      )}
                    </div>
                  )}

                  {/* Policies */}
                  {hasOrganizerPolicies && (
                    <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
                      {organizer.cancellation_policy && (
                        <div>
                          <h3 className="text-sm font-medium text-gray-700">Cancellation Policy</h3>
                          <p className="mt-1 text-sm text-gray-600">{organizer.cancellation_policy}</p>
                        </div>
                      )}
                      {organizer.refund_policy && (
                        <div>
                          <h3 className="text-sm font-medium text-gray-700">Refund Policy</h3>
                          <p className="mt-1 text-sm text-gray-600">{organizer.refund_policy}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Ticket Types */}
              {ticketTypes && ticketTypes.length > 0 && (
                <div className="rounded-lg bg-white p-6 shadow-sm">
                  <h3 className="font-semibold text-gray-900">Ticket Types</h3>
                  <div className="mt-4 space-y-4">
                    {ticketTypes.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="rounded-lg border border-gray-200 p-4"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900">
                            {ticket.name}
                          </span>
                          <span className="font-semibold text-gray-900">
                            {formatPrice(ticket.price_cents, ticket.currency)}
                          </span>
                        </div>
                        {ticket.description && (
                          <p className="mt-1 text-sm text-gray-600">{ticket.description}</p>
                        )}
                        {ticket.capacity != null && (
                          <p className="mt-1 text-xs text-gray-500">
                            Capacity: {ticket.capacity}
                          </p>
                        )}
                        {ticket.benefits && Array.isArray(ticket.benefits) && ticket.benefits.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-medium text-gray-500">Benefits:</p>
                            <ul className="mt-1 list-inside list-disc text-xs text-gray-600">
                              {ticket.benefits.map((b, i) => (
                                <li key={i}>{typeof b === "string" ? b : JSON.stringify(b)}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {[ticket.sales_start_at, ticket.sales_end_at].some(Boolean) && (
                          <div className="mt-2 text-xs text-gray-500">
                            {ticket.sales_start_at && (
                              <p>Sales start: {formatDateTime(ticket.sales_start_at)}</p>
                            )}
                            {ticket.sales_end_at && (
                              <p>Sales end: {formatDateTime(ticket.sales_end_at)}</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Venue / Location */}
              {venue && (
                <div className="rounded-lg bg-white p-6 shadow-sm">
                  <h3 className="font-semibold text-gray-900">Venue</h3>
                  <p className="mt-2 font-medium text-gray-800">{venue.name}</p>
                  {venue.venue_type && (
                    <p className="text-sm text-gray-500 capitalize">{venue.venue_type}</p>
                  )}
                  {venue.address_line1 && (
                    <p className="mt-1 text-sm text-gray-600">{venue.address_line1}</p>
                  )}
                  {hasVenueLocation && (
                    <p className="text-sm text-gray-600">
                      {[venue.city, venue.region, venue.country_code].filter(Boolean).join(", ")}
                    </p>
                  )}
                  {venue.timezone && (
                    <p className="mt-1 text-xs text-gray-500">Timezone: {venue.timezone}</p>
                  )}
                  {venue.lat && venue.lng ? (
                    <div className="mt-4 h-48 overflow-hidden rounded-lg">
                      <iframe
                        title="Venue location"
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY ?? ""}&q=${venue.lat},${venue.lng}&zoom=15`}
                      />
                    </div>
                  ) : (
                    <div className="mt-4 flex h-48 items-center justify-center rounded-lg bg-gray-200 text-sm text-gray-500">
                      No map available
                    </div>
                  )}
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
