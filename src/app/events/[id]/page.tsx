import { MainLayout } from "@/components/layout/MainLayout";
import { Footer } from "@/components/layout/Footer";
import {
  BuildingIcon,
  CalendarIcon,
  DollarIcon,
  GlobeIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  StarIcon,
  UsersIcon,
} from "@/components/icons";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { EventActions } from "@/components/events/EventActions";
import { getEvent } from "@/lib/data/events";
import { formatPrice, formatDate, formatTime, formatDateTime } from "@/lib/utils/format";
import { notFound } from "next/navigation";
import type { ComponentType, ReactNode, SVGProps } from "react";

export const dynamic = "force-dynamic";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

function SectionHeader({
  icon: Icon,
  eyebrow,
  title,
  description,
}: {
  icon: IconComponent;
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gray-950 text-white shadow-sm">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-xl font-semibold text-gray-950">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: IconComponent;
  label: string;
  value: string;
  tone: "emerald" | "sky" | "amber";
}) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-700",
    sky: "bg-sky-50 text-sky-700",
    amber: "bg-amber-50 text-amber-700",
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
      <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 ${tones[tone]}`}>
        <Icon className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-[0.18em]">
          {label}
        </span>
      </div>
      <p className="mt-4 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: IconComponent;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-gray-100 px-4 py-3">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
          {label}
        </p>
        <div className="mt-1 text-sm text-gray-700">{children}</div>
      </div>
    </div>
  );
}

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
  const venueLocation = venue
    ? [venue.city, venue.region, venue.country_code].filter(Boolean).join(", ")
    : "";
  const organizerLocation = organizer
    ? [organizer.city, organizer.country_code].filter(Boolean).join(", ")
    : "";

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
              <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-gray-200">
                <div className="relative h-[420px] overflow-hidden">
                  <img
                    src={event.image}
                    alt={event.title}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/45 to-transparent" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.16),_transparent_32%),radial-gradient(circle_at_bottom_left,_rgba(45,212,191,0.18),_transparent_34%)]" />
                  <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={event.status}>
                        {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                      </Badge>
                      {event.category && (
                        <Badge
                          variant="info"
                          className="bg-white/85 text-gray-700 backdrop-blur"
                        >
                          {event.category.charAt(0).toUpperCase() + event.category.slice(1)}
                        </Badge>
                      )}
                      {event.isFree && (
                        <Badge
                          variant="info"
                          className="bg-emerald-100 text-emerald-800"
                        >
                          Free
                        </Badge>
                      )}
                    </div>
                    <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                      {event.title}
                    </h1>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200">
                      Event schedule, pricing, organizer profile, and venue details in one place.
                    </p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-teal-800 p-6">
                  <div className="grid gap-4 md:grid-cols-3">
                    <MetricCard
                      icon={DollarIcon}
                      label="Price"
                      value={event.minPrice ?? "Free"}
                      tone="amber"
                    />
                    <MetricCard
                      icon={UsersIcon}
                      label="Attendees"
                      value={event.attendeeCount.toLocaleString()}
                      tone="emerald"
                    />
                    <MetricCard
                      icon={CalendarIcon}
                      label="Currency"
                      value={event.currency ?? "Not set"}
                      tone="sky"
                    />
                  </div>
                </div>
              </section>

              <div className="mt-6 rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100">
                <SectionHeader
                  icon={CalendarIcon}
                  eyebrow="Overview"
                  title="Event Details"
                  description="Timing, location, attendance, and descriptive details for this event."
                />

                <div className="mt-6 grid gap-3">
                  <DetailRow icon={CalendarIcon} label="Schedule">
                    <p className="font-medium text-gray-900">
                      {formatDate(event.startsAt)}
                      {event.startsAt && ` • ${formatTime(event.startsAt)}`}
                      {event.endsAt && ` - ${formatTime(event.endsAt)}`}
                    </p>
                  </DetailRow>
                  {event.endsAt && (
                    <DetailRow icon={CalendarIcon} label="Ends">
                      <p className="font-medium text-gray-900">
                        {formatDateTime(event.endsAt)}
                      </p>
                    </DetailRow>
                  )}
                  <DetailRow icon={MapPinIcon} label="Location">
                    <p className="font-medium text-gray-900">{event.location}</p>
                  </DetailRow>
                  <DetailRow icon={UsersIcon} label="Attendance">
                    <p className="font-medium text-gray-900">
                      {event.attendeeCount.toLocaleString()} attendees
                    </p>
                  </DetailRow>
                  {event.currency && (
                    <DetailRow icon={DollarIcon} label="Currency">
                      <p className="font-medium text-gray-900">{event.currency}</p>
                    </DetailRow>
                  )}
                </div>

                {event.description && (
                  <div className="mt-8 rounded-3xl border border-gray-100 bg-gray-50 p-5">
                    <h2 className="text-lg font-semibold text-gray-900">Description</h2>
                    <p className="mt-3 whitespace-pre-line text-sm leading-7 text-gray-700">
                      {event.description}
                    </p>
                  </div>
                )}

                {event.tags && event.tags.length > 0 && (
                  <div className="mt-8">
                    <h2 className="text-lg font-semibold text-gray-900">Tags</h2>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {event.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-700"
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
                <div className="mt-6 rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100">
                  <SectionHeader
                    icon={BuildingIcon}
                    eyebrow="Organizer"
                    title="Organizer Profile"
                    description="Primary contact, background, specialties, and support policies."
                  />

                  <div className="mt-6 flex items-center gap-4 rounded-3xl border border-gray-100 bg-gradient-to-r from-white to-slate-50 p-5">
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
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{organizer.name}</p>
                        {organizer.is_verified && (
                          <span
                            className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700"
                            title="Verified"
                          >
                            <StarIcon className="h-3.5 w-3.5" />
                            Verified
                          </span>
                        )}
                      </div>
                      {organizer.tagline && (
                        <p className="text-sm text-gray-600">{organizer.tagline}</p>
                      )}
                      {hasOrganizerLocation && (
                        <p className="text-sm text-gray-500">
                          {organizerLocation}
                        </p>
                      )}
                    </div>
                  </div>

                  {organizer.about && (
                    <div className="mt-6 rounded-3xl border border-gray-100 bg-gray-50 p-5">
                      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
                        About
                      </h3>
                      <p className="mt-3 whitespace-pre-line text-sm leading-7 text-gray-700">
                        {organizer.about}
                      </p>
                    </div>
                  )}

                  {organizer.specialties && organizer.specialties.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
                        Specialties
                      </h3>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {organizer.specialties.map((s) => (
                          <span
                            key={s}
                            className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Contact info */}
                  {hasOrganizerContact && (
                    <div className="mt-6">
                      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
                        Contact
                      </h3>
                      <div className="mt-3 grid gap-3">
                      {organizer.email && (
                          <DetailRow icon={MailIcon} label="Email">
                            <a
                              href={`mailto:${organizer.email}`}
                              className="font-medium text-blue-600 hover:underline"
                            >
                              {organizer.email}
                            </a>
                          </DetailRow>
                      )}
                      {organizer.phone && (
                          <DetailRow icon={PhoneIcon} label="Phone">
                            <p className="font-medium text-gray-900">{organizer.phone}</p>
                          </DetailRow>
                      )}
                      {organizer.website_url && (
                          <DetailRow icon={GlobeIcon} label="Website">
                            <a
                              href={organizer.website_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-blue-600 hover:underline"
                            >
                              {organizer.website_url}
                            </a>
                          </DetailRow>
                      )}
                      </div>
                    </div>
                  )}

                  {/* Social links */}
                  {hasOrganizerSocials && (
                    <div className="mt-6">
                      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
                        Socials
                      </h3>
                      <div className="mt-3 flex flex-wrap gap-3">
                      {organizer.instagram_handle && (
                        <a
                          href={`https://instagram.com/${organizer.instagram_handle}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-gray-300 hover:text-gray-900"
                        >
                          Instagram: @{organizer.instagram_handle}
                        </a>
                      )}
                      {organizer.facebook_handle && (
                        <a
                          href={`https://facebook.com/${organizer.facebook_handle}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-gray-300 hover:text-gray-900"
                        >
                          Facebook: {organizer.facebook_handle}
                        </a>
                      )}
                      </div>
                    </div>
                  )}

                  {/* Policies */}
                  {hasOrganizerPolicies && (
                    <div className="mt-6 grid gap-4 border-t border-gray-100 pt-6 md:grid-cols-2">
                      {organizer.cancellation_policy && (
                        <div className="rounded-3xl border border-gray-100 bg-gray-50 p-5">
                          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
                            Cancellation Policy
                          </h3>
                          <p className="mt-3 text-sm leading-7 text-gray-700">{organizer.cancellation_policy}</p>
                        </div>
                      )}
                      {organizer.refund_policy && (
                        <div className="rounded-3xl border border-gray-100 bg-gray-50 p-5">
                          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
                            Refund Policy
                          </h3>
                          <p className="mt-3 text-sm leading-7 text-gray-700">{organizer.refund_policy}</p>
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
                <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100">
                  <SectionHeader
                    icon={DollarIcon}
                    eyebrow="Tickets"
                    title="Ticket Types"
                    description="Pricing, capacity, perks, and sales windows."
                  />
                  <div className="mt-4 space-y-4">
                    {ticketTypes.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="rounded-3xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900">
                            {ticket.name}
                          </span>
                          <span className="rounded-full bg-gray-900 px-3 py-1 text-sm font-semibold text-white">
                            {formatPrice(ticket.price_cents, ticket.currency)}
                          </span>
                        </div>
                        {ticket.description && (
                          <p className="mt-3 text-sm text-gray-600">{ticket.description}</p>
                        )}
                        <div className="mt-3 grid gap-2">
                          {ticket.capacity != null && (
                            <p className="text-xs font-medium uppercase tracking-[0.16em] text-gray-500">
                              Capacity: <span className="normal-case tracking-normal text-gray-700">{ticket.capacity}</span>
                            </p>
                          )}
                        {ticket.benefits && Array.isArray(ticket.benefits) && ticket.benefits.length > 0 && (
                            <div>
                              <p className="text-xs font-medium uppercase tracking-[0.16em] text-gray-500">Benefits</p>
                              <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-gray-600">
                              {ticket.benefits.map((b, i) => (
                                <li key={i}>{typeof b === "string" ? b : JSON.stringify(b)}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {[ticket.sales_start_at, ticket.sales_end_at].some(Boolean) && (
                            <div className="text-xs text-gray-500">
                            {ticket.sales_start_at && (
                              <p>Sales start: {formatDateTime(ticket.sales_start_at)}</p>
                            )}
                            {ticket.sales_end_at && (
                              <p>Sales end: {formatDateTime(ticket.sales_end_at)}</p>
                            )}
                          </div>
                        )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Venue / Location */}
              {venue && (
                <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100">
                  <SectionHeader
                    icon={MapPinIcon}
                    eyebrow="Venue"
                    title="Location Details"
                    description="Assigned venue profile and map preview for this event."
                  />
                  <div className="mt-6 rounded-3xl border border-gray-100 bg-gradient-to-br from-white to-slate-50 p-5">
                    <p className="font-semibold text-gray-900">{venue.name}</p>
                  {venue.venue_type && (
                      <p className="mt-1 text-sm capitalize text-gray-500">{venue.venue_type}</p>
                  )}
                  {venue.address_line1 && (
                      <p className="mt-4 text-sm text-gray-600">{venue.address_line1}</p>
                  )}
                  {hasVenueLocation && (
                      <p className="text-sm text-gray-600">
                        {venueLocation}
                    </p>
                  )}
                  {venue.timezone && (
                      <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-gray-500">
                        Timezone: <span className="normal-case tracking-normal text-gray-700">{venue.timezone}</span>
                      </p>
                  )}
                  </div>
                  {venue.lat && venue.lng ? (
                    <div className="mt-4 overflow-hidden rounded-[1.5rem] border border-gray-200">
                      <iframe
                        title="Venue location"
                        width="100%"
                        height="260"
                        style={{ border: 0 }}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY ?? ""}&q=${venue.lat},${venue.lng}&zoom=15`}
                      />
                    </div>
                  ) : (
                    <div className="mt-4 flex h-48 items-center justify-center rounded-[1.5rem] border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-500">
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
