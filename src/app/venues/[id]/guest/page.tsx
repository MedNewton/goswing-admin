import { notFound } from "next/navigation";
import {
  getPublishedVenueDetail,
  getEventsAtVenue,
  getPublishedVenues,
} from "@/lib/data/discover";
import { getVenueReviewsWithStats } from "@/lib/data/venueReviews";
import { getOrganizerGallery } from "@/lib/data/gallery";
import { DiscoverEventCard } from "@/components/discover/DiscoverEventCard";
import {
  BuildingIcon,
  CalendarIcon,
  GlobeIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  StarIcon,
  UsersIcon,
} from "@/components/icons";
import { getLocale, t } from "@/lib/i18n";
import Image from "next/image";
import Link from "next/link";
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
  tone: "emerald" | "sky" | "amber" | "rose";
}) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-700",
    sky: "bg-sky-50 text-sky-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
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

export default async function VenueGuestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getPublishedVenueDetail(id);

  if (!data) notFound();

  const { venue, organizer } = data;
  const locale = await getLocale();

  // Fetch supplementary data in parallel
  const [events, reviewsData, gallery, similarVenues] = await Promise.all([
    getEventsAtVenue(id).catch(() => []),
    getVenueReviewsWithStats(id).catch(() => ({
      reviews: [],
      stats: { count: 0, average: 0, distribution: {} as Record<number, number> },
    })),
    organizer
      ? getOrganizerGallery(organizer.id).catch(() => [])
      : Promise.resolve([]),
    venue.city
      ? getPublishedVenues({ city: venue.city, limit: 4 })
          .then((v) => v.filter((sv) => sv.id !== id).slice(0, 3))
          .catch(() => [])
      : Promise.resolve([]),
  ]);

  const { reviews, stats } = reviewsData;

  const fullAddress = [
    venue.address,
    venue.city,
    venue.region,
    venue.countryCode,
  ]
    .filter(Boolean)
    .join(", ");

  const location = [venue.city, venue.region, venue.countryCode]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── Main Content (2 cols) ── */}
        <div className="lg:col-span-2">
          {/* Hero Card */}
          <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-gray-200">
            {/* Cover image or gradient background */}
            {organizer?.cover_image_url ? (
              <div className="relative h-[300px] overflow-hidden sm:h-[360px]">
                <Image
                  src={organizer.cover_image_url}
                  alt={venue.name}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/45 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                  <div className="flex flex-wrap items-center gap-2">
                    {venue.venueType && (
                      <span className="inline-flex items-center rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-gray-700 backdrop-blur">
                        {venue.venueType}
                      </span>
                    )}
                    {venue.freeAccess && (
                      <span className="inline-flex items-center rounded-full bg-emerald-100/85 px-3 py-1 text-xs font-semibold text-emerald-800 backdrop-blur">
                        {t(locale, "venueGuest.freeAccess")}
                      </span>
                    )}
                    {venue.freeForLadies && (
                      <span className="inline-flex items-center rounded-full bg-pink-100/85 px-3 py-1 text-xs font-semibold text-pink-800 backdrop-blur">
                        {t(locale, "venueGuest.freeForLadies")}
                      </span>
                    )}
                  </div>
                  <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                    {venue.name}
                  </h1>
                  {location && (
                    <p className="mt-3 flex items-center gap-1.5 text-sm text-slate-200">
                      <MapPinIcon className="h-4 w-4 text-slate-400" />
                      {location}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-teal-800 px-6 py-10 sm:px-8 sm:py-14">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.08),_transparent_40%),radial-gradient(circle_at_bottom_left,_rgba(45,212,191,0.12),_transparent_40%)]" />
                <div className="relative">
                  <div className="flex flex-wrap items-center gap-2">
                    {venue.venueType && (
                      <span className="inline-flex items-center rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-gray-700 backdrop-blur">
                        {venue.venueType}
                      </span>
                    )}
                    {venue.freeAccess && (
                      <span className="inline-flex items-center rounded-full bg-emerald-100/85 px-3 py-1 text-xs font-semibold text-emerald-800 backdrop-blur">
                        {t(locale, "venueGuest.freeAccess")}
                      </span>
                    )}
                    {venue.freeForLadies && (
                      <span className="inline-flex items-center rounded-full bg-pink-100/85 px-3 py-1 text-xs font-semibold text-pink-800 backdrop-blur">
                        {t(locale, "venueGuest.freeForLadies")}
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
            )}

            {/* Metric strip */}
            <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-teal-800 px-6 pb-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                  icon={StarIcon}
                  label={t(locale, "common.rating")}
                  value={
                    stats.average > 0
                      ? `${stats.average.toFixed(1)} / 5`
                      : "—"
                  }
                  tone="amber"
                />
                <MetricCard
                  icon={CalendarIcon}
                  label={t(locale, "venueDetail.upcoming")}
                  value={`${events.length} ${events.length !== 1 ? t(locale, "common.events") : t(locale, "common.event")}`}
                  tone="rose"
                />
              </div>
            </div>
          </section>

          {/* Gallery */}
          {gallery.length > 0 && (
            <div className="mt-6 rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100">
              <SectionHeader
                icon={CalendarIcon}
                eyebrow={t(locale, "venueGuest.gallery")}
                title={t(locale, "venueGuest.gallery")}
              />
              <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
                {gallery.map((item) => (
                  <div
                    key={item.id}
                    className="relative h-48 w-64 shrink-0 overflow-hidden rounded-2xl"
                  >
                    <Image
                      src={item.mediaUrl}
                      alt={item.caption ?? "Gallery"}
                      fill
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* About / Description */}
          {venue.description && (
            <div className="mt-6 rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100">
              <SectionHeader
                icon={BuildingIcon}
                eyebrow={t(locale, "venueGuest.about")}
                title={t(locale, "venueGuest.description")}
              />
              <div className="mt-4 rounded-3xl border border-gray-100 bg-gray-50 p-5">
                <p className="whitespace-pre-line text-sm leading-7 text-gray-700">
                  {venue.description}
                </p>
              </div>
            </div>
          )}

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
                <DetailRow
                  icon={MapPinIcon}
                  label={t(locale, "venueDetail.address")}
                >
                  <p className="font-medium text-gray-900">{fullAddress}</p>
                </DetailRow>
              )}
              {venue.venueType && (
                <DetailRow
                  icon={BuildingIcon}
                  label={t(locale, "venueDetail.venueType")}
                >
                  <p className="font-medium capitalize text-gray-900">
                    {venue.venueType}
                  </p>
                </DetailRow>
              )}
              {venue.capacity && (
                <DetailRow
                  icon={UsersIcon}
                  label={t(locale, "common.capacity")}
                >
                  <p className="font-medium text-gray-900">
                    {venue.capacity.toLocaleString()} {t(locale, "common.guests")}
                  </p>
                </DetailRow>
              )}
            </div>
          </div>

          {/* Reviews */}
          <div className="mt-6 rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100">
            <SectionHeader
              icon={StarIcon}
              eyebrow={t(locale, "venueGuest.reviews")}
              title={`${t(locale, "venueGuest.reviews")} (${stats.count})`}
            />
            {stats.count > 0 && (
              <div className="mt-4 flex items-center gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <div className="text-center">
                  <p className="text-3xl font-semibold text-gray-950">
                    {stats.average.toFixed(1)}
                  </p>
                  <div className="mt-1 flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <StarIcon
                        key={i}
                        className={`h-4 w-4 ${i < Math.round(stats.average) ? "text-amber-500" : "text-gray-200"}`}
                      />
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {stats.count} {t(locale, "venueGuest.reviews").toLowerCase()}
                  </p>
                </div>
                <div className="flex-1 space-y-1">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = stats.distribution[star] ?? 0;
                    const pct = stats.count > 0 ? (count / stats.count) * 100 : 0;
                    return (
                      <div key={star} className="flex items-center gap-2">
                        <span className="w-3 text-xs text-gray-500">{star}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                          <div
                            className="h-full rounded-full bg-amber-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {reviews.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">
                {t(locale, "venueGuest.noReviews")}
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {reviews.slice(0, 5).map((review) => (
                  <div
                    key={review.id}
                    className="rounded-2xl border border-gray-100 bg-gray-50 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900">
                        {review.userName}
                      </p>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <StarIcon
                            key={i}
                            className={`h-4 w-4 ${i < review.rating ? "text-amber-500" : "text-gray-200"}`}
                          />
                        ))}
                      </div>
                    </div>
                    {review.comment && (
                      <p className="mt-2 text-sm leading-6 text-gray-600">
                        {review.comment}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-gray-400">{review.date}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Events */}
          <div className="mt-6 rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100">
            <SectionHeader
              icon={CalendarIcon}
              eyebrow={t(locale, "nav.events")}
              title={t(locale, "venueGuest.upcomingEvents")}
            />
            {events.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">
                {t(locale, "venueGuest.noUpcomingEvents")}
              </p>
            ) : (
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {events.map((event) => (
                  <DiscoverEventCard
                    key={event.id}
                    event={event}
                    locale={locale}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Similar Venues */}
          {similarVenues.length > 0 && (
            <div className="mt-6 rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100">
              <SectionHeader
                icon={BuildingIcon}
                eyebrow={venue.city ?? ""}
                title={t(locale, "venueGuest.similarVenues")}
              />
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {similarVenues.map((sv) => (
                  <Link
                    key={sv.id}
                    href={`/venues/${sv.id}/guest`}
                    className="group rounded-2xl border border-gray-100 bg-gray-50 p-5 transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <p className="font-semibold text-gray-900 group-hover:text-gray-700">
                      {sv.name}
                    </p>
                    {sv.venueType && (
                      <p className="mt-1 text-sm capitalize text-gray-500">
                        {sv.venueType}
                      </p>
                    )}
                    {sv.city && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                        <MapPinIcon className="h-3 w-3" />
                        {sv.city}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-6">
          {/* Book CTA */}
          <div className="rounded-[2rem] border border-gray-200 bg-gradient-to-br from-gray-950 to-gray-800 p-6 text-center shadow-lg">
            <h3 className="text-lg font-semibold text-white">
              {t(locale, "venueGuest.bookEvent")}
            </h3>
            <p className="mt-2 text-sm text-gray-300">
              {t(locale, "venueGuest.downloadApp")}
            </p>
            <a
              href="https://goswing.app"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-100"
            >
              {t(locale, "venueGuest.bookEvent")}
            </a>
          </div>

          {/* Map */}
          {venue.lat && venue.lng && (
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
          )}

          {/* Organizer Card */}
          {organizer && (
            <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100">
              <SectionHeader
                icon={BuildingIcon}
                eyebrow={t(locale, "eventDetail.organizer")}
                title={organizer.name}
              />
              <div className="mt-4 flex items-center gap-4 rounded-3xl border border-gray-100 bg-gradient-to-r from-white to-slate-50 p-5">
                {organizer.logo_url ? (
                  <Image
                    src={organizer.logo_url}
                    alt={organizer.name}
                    width={48}
                    height={48}
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
                <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-sm leading-6 text-gray-700">
                    {organizer.about}
                  </p>
                </div>
              )}

              {/* Specialties */}
              {organizer.specialties && organizer.specialties.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                    {t(locale, "eventGuest.specialties")}
                  </h4>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {organizer.specialties.map((s) => (
                      <span
                        key={s}
                        className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact */}
              {(organizer.email ??
                organizer.phone ??
                organizer.website_url) && (
                <div className="mt-4 space-y-2">
                  {organizer.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MailIcon className="h-4 w-4 text-gray-400" />
                      {organizer.email}
                    </div>
                  )}
                  {organizer.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <PhoneIcon className="h-4 w-4 text-gray-400" />
                      {organizer.phone}
                    </div>
                  )}
                  {organizer.website_url && (
                    <div className="flex items-center gap-2 text-sm">
                      <GlobeIcon className="h-4 w-4 text-gray-400" />
                      <a
                        href={organizer.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {organizer.website_url}
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Social Links */}
              {(organizer.instagram_handle ??
                organizer.facebook_handle ??
                organizer.tiktok_handle ??
                organizer.snapchat_handle) && (
                <div className="mt-4">
                  <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                    {t(locale, "venueGuest.socialLinks")}
                  </h4>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {organizer.instagram_handle && (
                      <a
                        href={`https://instagram.com/${organizer.instagram_handle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
                      >
                        Instagram
                      </a>
                    )}
                    {organizer.facebook_handle && (
                      <a
                        href={`https://facebook.com/${organizer.facebook_handle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
                      >
                        Facebook
                      </a>
                    )}
                    {organizer.tiktok_handle && (
                      <a
                        href={`https://tiktok.com/@${organizer.tiktok_handle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
                      >
                        TikTok
                      </a>
                    )}
                    {organizer.snapchat_handle && (
                      <a
                        href={`https://snapchat.com/add/${organizer.snapchat_handle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
                      >
                        Snapchat
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
