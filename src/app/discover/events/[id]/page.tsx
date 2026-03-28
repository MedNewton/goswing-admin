import { notFound } from "next/navigation";
import { getPublishedEvent } from "@/lib/data/discover";
import {
  BuildingIcon,
  CalendarIcon,
  DollarIcon,
  MapPinIcon,
  StarIcon,
  UsersIcon,
} from "@/components/icons";
import { formatMoney, formatDateTime, formatDate, formatTime } from "@/lib/utils/format";
import Link from "next/link";
import type { ComponentType, ReactNode, SVGProps } from "react";
import { getLocale, t } from "@/lib/i18n";

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
      <div
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 ${tones[tone]}`}
      >
        <Icon className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-[0.18em]">
          {label}
        </span>
      </div>
      <p className="mt-4 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

export default async function PublicEventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getPublishedEvent(id);

  if (!data) notFound();

  const { event, ticketTypes, organizer, venue } = data;

  const locale = await getLocale();

  const venueAddress = venue
    ? [venue.address_line1, venue.city, venue.region, venue.country_code]
        .filter(Boolean)
        .join(", ")
    : null;

  const mapsUrl =
    venue?.lat && venue?.lng
      ? `https://www.google.com/maps/dir/?api=1&destination=${venue.lat},${venue.lng}`
      : venueAddress
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venueAddress)}`
        : null;

  const venueLocation = venue
    ? [venue.city, venue.region, venue.country_code].filter(Boolean).join(", ")
    : "";

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Hero Card */}
          <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-gray-200">
            <div className="relative h-[360px] overflow-hidden sm:h-[420px]">
              {event.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={event.image}
                  alt={event.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gray-200">
                  <CalendarIcon className="h-16 w-16 text-gray-400" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/45 to-transparent" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.16),_transparent_32%),radial-gradient(circle_at_bottom_left,_rgba(45,212,191,0.18),_transparent_34%)]" />
              <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                <div className="flex flex-wrap items-center gap-2">
                  {event.isFree && (
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                      {t(locale, "common.free")}
                    </span>
                  )}
                  {!event.isFree && event.minPrice && (
                    <span className="inline-flex items-center rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-gray-700 backdrop-blur">
                      {t(locale, "common.from")} {event.minPrice}
                    </span>
                  )}
                  {event.tags && event.tags.length > 0 && (
                    <span className="inline-flex items-center rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-gray-700 backdrop-blur">
                      {event.tags[0]}
                    </span>
                  )}
                </div>
                <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  {event.title}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200">
                  {event.startsAt ? formatDate(event.startsAt) : event.date}
                  {event.location ? ` • ${event.location}` : ""}
                </p>
              </div>
            </div>

            {/* Metric strip */}
            <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-teal-800 p-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <MetricCard
                  icon={DollarIcon}
                  label={t(locale, "eventDetail.price")}
                  value={event.minPrice ?? t(locale, "common.free")}
                  tone="amber"
                />
                <MetricCard
                  icon={CalendarIcon}
                  label={t(locale, "eventDetail.date")}
                  value={
                    event.startsAt
                      ? formatDate(event.startsAt)
                      : event.date ?? t(locale, "common.tba")
                  }
                  tone="sky"
                />
                <MetricCard
                  icon={MapPinIcon}
                  label={t(locale, "eventDetail.location")}
                  value={event.location ?? t(locale, "common.tba")}
                  tone="emerald"
                />
              </div>
            </div>
          </section>

          {/* Event Details Section */}
          <div className="mt-6 rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100">
            <SectionHeader
              icon={CalendarIcon}
              eyebrow={t(locale, "eventDetail.overview")}
              title={t(locale, "eventDetail.title")}
              description={t(locale, "eventDetail.description")}
            />

            <div className="mt-6 grid gap-3">
              <DetailRow icon={CalendarIcon} label={t(locale, "eventDetail.schedule")}>
                <p className="font-medium text-gray-900">
                  {event.startsAt && formatDate(event.startsAt)}
                  {event.startsAt && ` • ${formatTime(event.startsAt)}`}
                  {event.endsAt && ` - ${formatTime(event.endsAt)}`}
                </p>
              </DetailRow>
              {event.endsAt && (
                <DetailRow icon={CalendarIcon} label={t(locale, "eventDetail.ends")}>
                  <p className="font-medium text-gray-900">
                    {formatDateTime(event.endsAt)}
                  </p>
                </DetailRow>
              )}
              <DetailRow icon={MapPinIcon} label={t(locale, "eventDetail.location")}>
                <p className="font-medium text-gray-900">
                  {event.location ?? t(locale, "common.toBeAnnounced")}
                </p>
                {venueAddress && (
                  <p className="text-xs text-gray-500">{venueAddress}</p>
                )}
              </DetailRow>
            </div>

            {/* Description */}
            {event.description && (
              <div className="mt-8 rounded-3xl border border-gray-100 bg-gray-50 p-5">
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
                  {t(locale, "eventDetail.aboutThisEvent")}
                </h3>
                <p className="mt-3 whitespace-pre-line text-sm leading-7 text-gray-700">
                  {event.description}
                </p>
              </div>
            )}

            {/* Tags */}
            {event.tags && event.tags.length > 0 && (
              <div className="mt-8">
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
                  {t(locale, "eventDetail.tags")}
                </h3>
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

          {/* Policies */}
          {event.policies &&
            Array.isArray(event.policies) &&
            event.policies.length > 0 && (
              <div className="mt-6 rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100">
                <SectionHeader
                  icon={StarIcon}
                  eyebrow={t(locale, "eventDetail.guidelines")}
                  title={t(locale, "eventDetail.eventPolicies")}
                  description={t(locale, "eventDetail.eventPoliciesDesc")}
                />
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {(
                    event.policies as Array<{
                      title: string;
                      description: string;
                    }>
                  ).map((policy, i) => (
                    <div
                      key={i}
                      className="rounded-3xl border border-gray-100 bg-gray-50 p-5"
                    >
                      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
                        {policy.title}
                      </h3>
                      <p className="mt-3 text-sm leading-7 text-gray-700">
                        {policy.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Organizer */}
          {organizer && (
            <div className="mt-6 rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100">
              <SectionHeader
                icon={BuildingIcon}
                eyebrow={t(locale, "eventDetail.organizer")}
                title={t(locale, "eventDetail.organizerProfile")}
                description={t(locale, "eventDetail.organizerProfileDesc")}
              />

              <div className="mt-6 flex items-center gap-4 rounded-3xl border border-gray-100 bg-gradient-to-r from-white to-slate-50 p-5">
                {organizer.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={organizer.logo_url}
                    alt={organizer.name}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600">
                    {organizer.name.charAt(0)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">{organizer.name}</p>
                  {organizer.tagline && (
                    <p className="text-sm text-gray-600">{organizer.tagline}</p>
                  )}
                </div>
              </div>

              {organizer.about && (
                <div className="mt-6 rounded-3xl border border-gray-100 bg-gray-50 p-5">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
                    {t(locale, "eventDetail.about")}
                  </h3>
                  <p className="mt-3 whitespace-pre-line text-sm leading-7 text-gray-700">
                    {organizer.about}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Tickets */}
          {ticketTypes.length > 0 && (
            <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100">
              <SectionHeader
                icon={DollarIcon}
                eyebrow={t(locale, "eventDetail.tickets")}
                title={t(locale, "eventDetail.ticketTypes")}
                description={t(locale, "eventDetail.ticketTypesDesc")}
              />
              <div className="mt-4 space-y-4">
                {ticketTypes.map((tt) => (
                  <div
                    key={tt.id}
                    className="rounded-3xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">
                        {tt.name}
                      </span>
                      <span className="rounded-full bg-gray-900 px-3 py-1 text-sm font-semibold text-white">
                        {tt.price_cents === 0
                          ? t(locale, "common.free")
                          : formatMoney(tt.price_cents, tt.currency)}
                      </span>
                    </div>
                    {tt.description && (
                      <p className="mt-3 text-sm text-gray-600">
                        {tt.description}
                      </p>
                    )}
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
                eyebrow={t(locale, "eventDetail.venue")}
                title={t(locale, "eventDetail.locationDetails")}
                description={t(locale, "eventDetail.locationDetailsDesc")}
              />
              <div className="mt-6 rounded-3xl border border-gray-100 bg-gradient-to-br from-white to-slate-50 p-5">
                <p className="font-semibold text-gray-900">{venue.name}</p>
                {venue.venue_type && (
                  <p className="mt-1 text-sm capitalize text-gray-500">
                    {venue.venue_type}
                  </p>
                )}
                {venue.address_line1 && (
                  <p className="mt-4 text-sm text-gray-600">
                    {venue.address_line1}
                  </p>
                )}
                {venueLocation && (
                  <p className="text-sm text-gray-600">{venueLocation}</p>
                )}
              </div>

              {venue.lat && venue.lng ? (
                <>
                  <div className="mt-4 overflow-hidden rounded-[1.5rem] border border-gray-200">
                    <iframe
                      title="Venue location"
                      width="100%"
                      height="220"
                      style={{ border: 0 }}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY ?? ""}&q=${venue.lat},${venue.lng}&zoom=15`}
                    />
                  </div>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${venue.lat},${venue.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <MapPinIcon className="h-4 w-4" />
                    {t(locale, "common.getDirections")}
                  </a>
                </>
              ) : mapsUrl ? (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <MapPinIcon className="h-4 w-4" />
                  {t(locale, "common.getDirections")}
                </a>
              ) : null}

              <Link
                href={`/discover/venues/${venue.id}`}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
              >
                {t(locale, "eventDetail.viewVenueDetails")} &rarr;
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
