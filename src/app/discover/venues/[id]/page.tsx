import { notFound } from "next/navigation";
import { getPublishedVenue, getEventsAtVenue } from "@/lib/data/discover";
import { DiscoverEventCard } from "@/components/discover/DiscoverEventCard";
import { MapPinIcon, BuildingIcon, CalendarIcon, UsersIcon, SearchIcon } from "@/components/icons";
import Link from "next/link";
import type { ComponentType, ReactNode, SVGProps } from "react";
import { getLocale, t } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";

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

export default async function PublicVenueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [venue, events] = await Promise.all([
    getPublishedVenue(id),
    getEventsAtVenue(id),
  ]);

  if (!venue) notFound();

  const locale = await getLocale();

  const fullAddress = [venue.address, venue.city, venue.region, venue.countryCode]
    .filter(Boolean)
    .join(", ");

  const location = [venue.city, venue.region, venue.countryCode]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* Back link */}
      <div className="mb-4">
        <Link
          href="/discover/venues"
          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:bg-white hover:text-gray-700"
        >
          &larr; {t(locale, "venueDetail.allVenues")}
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Hero Card */}
          <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-gray-200">
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-teal-800 px-6 py-10 sm:px-8 sm:py-14">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.08),_transparent_40%),radial-gradient(circle_at_bottom_left,_rgba(45,212,191,0.12),_transparent_40%)]" />
              <div className="relative">
                <div className="flex flex-wrap items-center gap-2">
                  {venue.venueType && (
                    <span className="inline-flex items-center rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-gray-700 backdrop-blur">
                      {venue.venueType}
                    </span>
                  )}
                </div>
                <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  {venue.name}
                </h1>
                {location && (
                  <p className="mt-3 flex items-center gap-1.5 text-sm text-slate-300">
                    <MapPinIcon className="h-4 w-4 text-slate-400" />
                    {location}
                  </p>
                )}
              </div>
            </div>

            {/* Metric strip */}
            <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-teal-800 px-6 pb-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <MetricCard
                  icon={BuildingIcon}
                  label={t(locale, "venueDetail.type")}
                  value={venue.venueType ?? t(locale, "common.venue")}
                  tone="sky"
                />
                <MetricCard
                  icon={UsersIcon}
                  label={t(locale, "common.capacity")}
                  value={
                    venue.capacity
                      ? venue.capacity.toLocaleString()
                      : t(locale, "common.notSet")
                  }
                  tone="emerald"
                />
                <MetricCard
                  icon={CalendarIcon}
                  label={t(locale, "venueDetail.upcoming")}
                  value={`${events.length} ${events.length !== 1 ? t(locale, "common.events") : t(locale, "common.event")}`}
                  tone="amber"
                />
              </div>
            </div>
          </section>

          {/* Venue Details */}
          <div className="mt-6 rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100">
            <SectionHeader
              icon={BuildingIcon}
              eyebrow={t(locale, "venueDetail.details")}
              title={t(locale, "venueDetail.venueInformation")}
              description={t(locale, "venueDetail.venueInformationDesc")}
            />
            <div className="mt-6 grid gap-3">
              {fullAddress && (
                <DetailRow icon={MapPinIcon} label={t(locale, "venueDetail.address")}>
                  <p className="font-medium text-gray-900">{fullAddress}</p>
                </DetailRow>
              )}
              {venue.venueType && (
                <DetailRow icon={BuildingIcon} label={t(locale, "venueDetail.venueType")}>
                  <p className="font-medium capitalize text-gray-900">
                    {venue.venueType}
                  </p>
                </DetailRow>
              )}
              {venue.capacity && (
                <DetailRow icon={UsersIcon} label={t(locale, "common.capacity")}>
                  <p className="font-medium text-gray-900">
                    {venue.capacity.toLocaleString()} {t(locale, "common.guests")}
                  </p>
                </DetailRow>
              )}
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="mt-6 rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100">
            <SectionHeader
              icon={CalendarIcon}
              eyebrow={t(locale, "nav.events")}
              title={`${t(locale, "venueDetail.upcomingAt")} ${venue.name}`}
              description={t(locale, "venueDetail.eventsAtVenueDesc")}
            />
            {events.length === 0 ? (
              <div className="mt-6 rounded-3xl border border-dashed border-gray-200 bg-gray-50 py-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
                  <SearchIcon className="h-5 w-5 text-gray-400" />
                </div>
                <p className="mt-4 font-medium text-gray-500">
                  {t(locale, "venueDetail.noEvents")}
                </p>
              </div>
            ) : (
              <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                {events.map((event) => (
                  <DiscoverEventCard key={event.id} event={event} locale={locale} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Map */}
          {venue.lat && venue.lng ? (
            <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100">
              <SectionHeader
                icon={MapPinIcon}
                eyebrow={t(locale, "eventDetail.location")}
                title={t(locale, "venueDetail.onTheMap")}
              />
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
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${venue.lat},${venue.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                <MapPinIcon className="h-4 w-4" />
                {t(locale, "common.getDirections")}
              </a>
            </div>
          ) : fullAddress ? (
            <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100">
              <SectionHeader
                icon={MapPinIcon}
                eyebrow={t(locale, "eventDetail.location")}
                title={t(locale, "venueDetail.directions")}
              />
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                <MapPinIcon className="h-4 w-4" />
                {t(locale, "common.getDirections")}
              </a>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
