import { MainLayout } from "@/components/layout/MainLayout";
import { Footer } from "@/components/layout/Footer";
import {
  BuildingIcon,
  CalendarIcon,
  ChevronRightIcon,
  DollarIcon,
  EyeIcon,
  GlobeIcon,
  MailIcon,
  MapPinIcon,
  MusicIcon,
  PhoneIcon,
  SettingsIcon,
  StarIcon,
  UsersIcon,
} from "@/components/icons";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { EventActions } from "@/components/events/EventActions";
import { getEvent, getEventOverview } from "@/lib/data/events";
import { getEventGallery } from "@/lib/data/gallery";
import { getReviews } from "@/lib/data/reviews";
import { getOrders } from "@/lib/data/orders";
import { getSongSuggestions } from "@/lib/data/music";
import { getAttendees } from "@/lib/data/attendees";
import { formatPrice, formatDate, formatTime, formatDateTime } from "@/lib/utils/format";
import { getLocale, t } from "@/lib/i18n";
import { checkAdminAccess } from "@/lib/auth/requireAdmin";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { ComponentType, ReactNode, SVGProps } from "react";
import type { GalleryItem, Review } from "@/types";

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

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: IconComponent;
  label: string;
  value: string;
  tone: "emerald" | "sky" | "amber" | "purple" | "rose" | "blue";
}) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-700",
    sky: "bg-sky-50 text-sky-700",
    amber: "bg-amber-50 text-amber-700",
    purple: "bg-purple-50 text-purple-700",
    rose: "bg-rose-50 text-rose-700",
    blue: "bg-blue-50 text-blue-700",
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 ${tones[tone]}`}>
        <Icon className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-[0.18em]">
          {label}
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold text-gray-950">{value}</p>
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
  tone: "emerald" | "sky" | "amber" | "violet";
}) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-700",
    sky: "bg-sky-50 text-sky-700",
    amber: "bg-amber-50 text-amber-700",
    violet: "bg-violet-50 text-violet-700",
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

function TagPills({ label, tags, color }: { label: string; tags: string[]; color: string }) {
  if (tags.length === 0) return null;
  const colorMap: Record<string, string> = {
    teal: "bg-teal-400/20 text-teal-100",
    violet: "bg-violet-400/20 text-violet-100",
    amber: "bg-amber-400/20 text-amber-100",
  };
  const pillClass = colorMap[color] ?? "bg-white/15 text-white/80";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
        {label}
      </span>
      {tags.map((tag) => (
        <span
          key={tag}
          className={`rounded-full px-3 py-1 text-xs font-medium ${pillClass}`}
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

export default async function EventDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const denied = await checkAdminAccess();
  if (denied) return denied;
  const locale = await getLocale();

  let eventData: Awaited<ReturnType<typeof getEvent>> | null = null;
  let overview: Awaited<ReturnType<typeof getEventOverview>> | null = null;
  let gallery: GalleryItem[] = [];
  let reviews: Review[] = [];

  try {
    [eventData, overview, gallery, reviews] = await Promise.all([
      getEvent(id),
      getEventOverview(id),
      getEventGallery(id),
      getReviews({ eventId: id }),
    ]);
  } catch {
    notFound();
  }

  if (!eventData || !overview) notFound();

  const [orders, songs, checkins] = await Promise.all([
    getOrders({ eventId: id }).catch(() => []),
    getSongSuggestions({ eventId: id }).catch(() => []),
    getAttendees({ eventId: id }).catch(() => []),
  ]);

  const totalTicketRevenue = overview.ticketSalesBreakdown.reduce(
    (sum, tier) => sum + tier.revenue,
    0,
  );

  const { event, ticketTypes, organizer, venue } = eventData;

  // Compute total capacity from ticket tiers
  const totalCapacity = ticketTypes
    ? ticketTypes.reduce((sum, tt) => sum + (tt.capacity ?? 0), 0)
    : 0;

  // Determine if event has ended
  const isEnded = event.endsAt ? new Date(event.endsAt) < new Date() : false;

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
      <MainLayout>
        <div className="mb-6 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-gray-900">{t(locale, "adminEvent.pageTitle")}</h1>
          <div className="flex items-center gap-2">
            <Link href={`/events/${id}/guest`}>
              <Button variant="outline" size="sm">
                <EyeIcon className="mr-1.5 h-4 w-4" />
                {t(locale, "eventOverview.viewAsGuest")}
              </Button>
            </Link>
            <EventActions eventId={id} />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 xl:grid-cols-4">
          {/* Main Content */}
          <div className="lg:col-span-2 xl:col-span-3">
              <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-gray-200">
                <div className="relative h-[420px] overflow-hidden">
                  <Image
                    src={event.image}
                    alt={event.title}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/45 to-transparent" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.16),_transparent_32%),radial-gradient(circle_at_bottom_left,_rgba(45,212,191,0.18),_transparent_34%)]" />
                  <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={event.status}>
                        {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                      </Badge>
                      {event.partyTypes && event.partyTypes.length > 0 && (
                        event.partyTypes.map((pt) => (
                          <Badge
                            key={pt}
                            variant="info"
                            className="bg-white/85 text-gray-700 backdrop-blur"
                          >
                            {pt}
                          </Badge>
                        ))
                      )}
                      {event.isFree && (
                        <Badge
                          variant="info"
                          className="bg-emerald-100 text-emerald-800"
                        >
                          {t(locale, "adminEvent.free")}
                        </Badge>
                      )}
                    </div>
                    <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                      {event.title}
                    </h1>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200">
                      {t(locale, "adminEvent.subtitle")}
                    </p>
                  </div>
                </div>

                {/* Gradient metric cards — redesigned for Phase 3 */}
                <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-teal-800 p-6">
                  <div className="grid gap-4 md:grid-cols-4">
                    <MetricCard
                      icon={CalendarIcon}
                      label={t(locale, "adminEvent.schedule")}
                      value={isEnded ? t(locale, "adminEvent.complete") : (formatDate(event.startsAt) + (event.startsAt ? ` • ${formatTime(event.startsAt)}` : ""))}
                      tone="sky"
                    />
                    <MetricCard
                      icon={DollarIcon}
                      label={t(locale, "adminEvent.price")}
                      value={event.minPrice ?? t(locale, "adminEvent.free")}
                      tone="amber"
                    />
                    <MetricCard
                      icon={UsersIcon}
                      label={t(locale, "adminEvent.totalCapacity")}
                      value={totalCapacity > 0 ? totalCapacity.toLocaleString() : "—"}
                      tone="emerald"
                    />
                    <MetricCard
                      icon={UsersIcon}
                      label={t(locale, "adminEvent.attendees")}
                      value={event.attendeeCount.toLocaleString()}
                      tone="violet"
                    />
                  </div>

                  {/* Tag pills in gradient area */}
                  {((event.partyTypes?.length ?? 0) > 0 || (event.musicStyles?.length ?? 0) > 0 || (event.extraServices?.length ?? 0) > 0) && (
                    <div className="mt-5 flex flex-wrap gap-4">
                      <TagPills label={t(locale, "adminEvent.partyType")} tags={event.partyTypes ?? []} color="teal" />
                      <TagPills label={t(locale, "adminEvent.musicStyle")} tags={event.musicStyles ?? []} color="violet" />
                      <TagPills label={t(locale, "adminEvent.extraServices")} tags={event.extraServices ?? []} color="amber" />
                    </div>
                  )}
                </div>
              </section>

              {/* Quick stats from overview */}
              <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard
                  icon={CalendarIcon}
                  label={t(locale, "eventOverview.reservations")}
                  value={overview.reservationsCount.toLocaleString()}
                  tone="blue"
                />
                <StatCard
                  icon={MusicIcon}
                  label={t(locale, "eventOverview.songs")}
                  value={overview.songSuggestionsCount.toLocaleString()}
                  tone="purple"
                />
                <StatCard
                  icon={UsersIcon}
                  label={t(locale, "eventOverview.checkedIn")}
                  value={overview.checkedInCount.toLocaleString()}
                  tone="emerald"
                />
                <StatCard
                  icon={StarIcon}
                  label={t(locale, "eventOverview.rating")}
                  value={overview.reviewScore != null ? `${overview.reviewScore.toFixed(1)} / 5` : "—"}
                  tone="amber"
                />
              </div>

              <div className="mt-6 rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100">
                <SectionHeader
                  icon={CalendarIcon}
                  eyebrow={t(locale, "adminEvent.overviewEyebrow")}
                  title={t(locale, "adminEvent.overviewTitle")}
                  description={t(locale, "adminEvent.overviewDesc")}
                />

                <div className="mt-6 grid gap-3">
                  <DetailRow icon={CalendarIcon} label={t(locale, "adminEvent.schedule")}>
                    <p className="font-medium text-gray-900">
                      {formatDate(event.startsAt)}
                      {event.startsAt && ` • ${formatTime(event.startsAt)}`}
                      {event.endsAt && ` - ${formatTime(event.endsAt)}`}
                    </p>
                  </DetailRow>
                  {event.endsAt && (
                    <DetailRow icon={CalendarIcon} label={t(locale, "adminEvent.ends")}>
                      <p className="font-medium text-gray-900">
                        {formatDateTime(event.endsAt)}
                      </p>
                    </DetailRow>
                  )}
                  <DetailRow icon={MapPinIcon} label={t(locale, "adminEvent.location")}>
                    <p className="font-medium text-gray-900">{event.location}</p>
                  </DetailRow>
                  <DetailRow icon={UsersIcon} label={t(locale, "adminEvent.attendance")}>
                    <p className="font-medium text-gray-900">
                      {event.attendeeCount.toLocaleString()} {t(locale, "adminEvent.attendees")}
                    </p>
                  </DetailRow>
                </div>

                {event.description && (
                  <div className="mt-8 rounded-3xl border border-gray-100 bg-gray-50 p-5">
                    <h2 className="text-lg font-semibold text-gray-900">{t(locale, "adminEvent.description")}</h2>
                    <p className="mt-3 whitespace-pre-line text-sm leading-7 text-gray-700">
                      {event.description}
                    </p>
                  </div>
                )}

                {/* Party Types */}
                {event.partyTypes && event.partyTypes.length > 0 && (
                  <div className="mt-8">
                    <h2 className="text-lg font-semibold text-gray-900">{t(locale, "adminEvent.partyType")}</h2>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {event.partyTypes.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-700"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Music Styles */}
                {event.musicStyles && event.musicStyles.length > 0 && (
                  <div className="mt-8">
                    <h2 className="text-lg font-semibold text-gray-900">{t(locale, "adminEvent.musicStyle")}</h2>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {event.musicStyles.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-sm font-medium text-violet-700"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Extra Services */}
                {event.extraServices && event.extraServices.length > 0 && (
                  <div className="mt-8">
                    <h2 className="text-lg font-semibold text-gray-900">{t(locale, "adminEvent.extraServices")}</h2>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {event.extraServices.map((tag) => (
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

              {/* Recent Orders */}
              <div className="mt-6 rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {t(locale, "eventOverview.recentOrders")}
                  </h2>
                  <Link
                    href={`/orders?eventId=${id}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900"
                  >
                    {t(locale, "common.viewAll")}
                    <ChevronRightIcon className="h-4 w-4" />
                  </Link>
                </div>
                {orders.length === 0 ? (
                  <p className="mt-4 text-sm text-gray-500">
                    {t(locale, "eventOverview.noOrders")}
                  </p>
                ) : (
                  <div className="mt-4 space-y-2">
                    {orders.slice(0, 5).map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-gray-900">
                            {order.customerName}
                          </p>
                          <p className="text-sm text-gray-500">
                            {order.offerType}
                            {order.itemCount && order.itemCount > 1
                              ? ` +${order.itemCount - 1}`
                              : ""}
                          </p>
                        </div>
                        <div className="ml-4 flex items-center gap-3">
                          <Badge
                            variant={
                              order.status === "confirmed"
                                ? "confirmed"
                                : order.status === "checkedIn"
                                  ? "checkedIn"
                                  : order.status === "cancelled"
                                    ? "cancelled"
                                    : "pending"
                            }
                          >
                            {order.status}
                          </Badge>
                          <span className="text-sm font-semibold text-gray-900">
                            {order.amountFormatted}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Songs */}
              <div className="mt-6 rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {t(locale, "eventOverview.recentSongs")}
                  </h2>
                  <Link
                    href={`/music?eventId=${id}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900"
                  >
                    {t(locale, "common.viewAll")}
                    <ChevronRightIcon className="h-4 w-4" />
                  </Link>
                </div>
                {songs.length === 0 ? (
                  <p className="mt-4 text-sm text-gray-500">
                    {t(locale, "eventOverview.noSongs")}
                  </p>
                ) : (
                  <div className="mt-4 space-y-2">
                    {songs.slice(0, 5).map((song) => (
                      <div
                        key={song.id}
                        className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3"
                      >
                        {song.artworkUrl ? (
                          <Image
                            src={song.artworkUrl}
                            alt={song.title}
                            width={40}
                            height={40}
                            className="rounded-lg"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                            <MusicIcon className="h-5 w-5 text-purple-600" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-gray-900">
                            {song.title}
                          </p>
                          <p className="truncate text-sm text-gray-500">
                            {song.artist}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Check-ins */}
              <div className="mt-6 rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {t(locale, "eventOverview.recentCheckins")}
                  </h2>
                  <Link
                    href={`/attendees?eventId=${id}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900"
                  >
                    {t(locale, "common.viewAll")}
                    <ChevronRightIcon className="h-4 w-4" />
                  </Link>
                </div>
                {checkins.length === 0 ? (
                  <p className="mt-4 text-sm text-gray-500">
                    {t(locale, "eventOverview.noCheckins")}
                  </p>
                ) : (
                  <div className="mt-4 space-y-2">
                    {checkins.slice(0, 5).map((attendee) => (
                      <div
                        key={attendee.id}
                        className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-gray-900">
                            {attendee.name}
                          </p>
                          <p className="truncate text-sm text-gray-500">
                            {attendee.ticketType ?? attendee.email}
                          </p>
                        </div>
                        {attendee.checkInTime && (
                          <span className="ml-4 text-xs text-gray-400">
                            {formatDateTime(attendee.checkInTime)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Event Gallery */}
              {gallery.length > 0 && (
                <div className="mt-6 rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100">
                  <SectionHeader
                    icon={StarIcon}
                    eyebrow={t(locale, "adminEvent.mediaEyebrow")}
                    title={t(locale, "adminEvent.gallery")}
                    description={`${gallery.length} ${gallery.length !== 1 ? t(locale, "adminEvent.photos") : t(locale, "adminEvent.photo")}`}
                  />
                  <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {gallery.map((item) => (
                      <div
                        key={item.id}
                        className="group relative aspect-square overflow-hidden rounded-2xl border border-gray-200"
                      >
                        <Image
                          src={item.mediaUrl}
                          alt={item.caption ?? t(locale, "adminEvent.eventPhoto")}
                          fill
                          className="object-cover transition-transform group-hover:scale-105"
                        />
                        {item.caption && (
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                            <p className="text-xs text-white">{item.caption}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reviews */}
              {reviews.length > 0 && (
                <div className="mt-6 rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100">
                  <div className="flex items-start justify-between gap-3">
                    <SectionHeader
                      icon={StarIcon}
                      eyebrow={t(locale, "adminEvent.feedbackEyebrow")}
                      title={t(locale, "adminEvent.reviews")}
                      description={`${reviews.length} ${reviews.length !== 1 ? t(locale, "adminEvent.reviews") : t(locale, "adminEvent.review")}`}
                    />
                    <Link
                      href={`/reviews?eventId=${id}`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900"
                    >
                      {t(locale, "common.viewAll")}
                      <ChevronRightIcon className="h-4 w-4" />
                    </Link>
                  </div>
                  <div className="mt-6 space-y-4">
                    {reviews.slice(0, 5).map((review) => (
                      <div
                        key={review.id}
                        className="rounded-2xl border border-gray-100 bg-gray-50 p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {review.userAvatar ? (
                              <Image
                                src={review.userAvatar}
                                alt={review.userName}
                                width={32}
                                height={32}
                                className="h-8 w-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-600">
                                {review.userName.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {review.userName}
                              </p>
                              <p className="text-xs text-gray-500">{review.date}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <StarIcon
                                key={i}
                                className={`h-4 w-4 ${
                                  i < review.rating
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-gray-200"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        {review.comment && (
                          <p className="mt-3 text-sm text-gray-700">{review.comment}</p>
                        )}
                      </div>
                    ))}
                    {reviews.length > 5 && (
                      <p className="text-center text-sm text-gray-500">
                        +{reviews.length - 5} {t(locale, "adminEvent.moreReviews")}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Organizer */}
              {organizer && (
                <div className="mt-6 rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100">
                  <SectionHeader
                    icon={BuildingIcon}
                    eyebrow={t(locale, "adminEvent.organizerEyebrow")}
                    title={t(locale, "adminEvent.organizerTitle")}
                    description={t(locale, "adminEvent.organizerDesc")}
                  />

                  <div className="mt-6 flex items-center gap-4 rounded-3xl border border-gray-100 bg-gradient-to-r from-white to-slate-50 p-5">
                    {organizer.logo_url ? (
                      <Image
                        src={organizer.logo_url}
                        alt={organizer.name}
                        width={48}
                        height={48}
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
                            title={t(locale, "adminEvent.verified")}
                          >
                            <StarIcon className="h-3.5 w-3.5" />
                            {t(locale, "adminEvent.verified")}
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
                        {t(locale, "adminEvent.about")}
                      </h3>
                      <p className="mt-3 whitespace-pre-line text-sm leading-7 text-gray-700">
                        {organizer.about}
                      </p>
                    </div>
                  )}

                  {organizer.specialties && organizer.specialties.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
                        {t(locale, "adminEvent.specialties")}
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
                        {t(locale, "adminEvent.contact")}
                      </h3>
                      <div className="mt-3 grid gap-3">
                      {organizer.email && (
                          <DetailRow icon={MailIcon} label={t(locale, "adminEvent.email")}>
                            <a
                              href={`mailto:${organizer.email}`}
                              className="font-medium text-blue-600 hover:underline"
                            >
                              {organizer.email}
                            </a>
                          </DetailRow>
                      )}
                      {organizer.phone && (
                          <DetailRow icon={PhoneIcon} label={t(locale, "adminEvent.phone")}>
                            <p className="font-medium text-gray-900">{organizer.phone}</p>
                          </DetailRow>
                      )}
                      {organizer.website_url && (
                          <DetailRow icon={GlobeIcon} label={t(locale, "adminEvent.website")}>
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
                        {t(locale, "adminEvent.socials")}
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
                            {t(locale, "adminEvent.cancellationPolicy")}
                          </h3>
                          <p className="mt-3 text-sm leading-7 text-gray-700">{organizer.cancellation_policy}</p>
                        </div>
                      )}
                      {organizer.refund_policy && (
                        <div className="rounded-3xl border border-gray-100 bg-gray-50 p-5">
                          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
                            {t(locale, "adminEvent.refundPolicy")}
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
              {/* Total Tickets Sold */}
              <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100">
                <div className="flex items-center gap-2 text-sky-700">
                  <CalendarIcon className="h-5 w-5" />
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em]">
                    {t(locale, "eventOverview.ticketsSold")}
                  </h3>
                </div>
                <p className="mt-3 text-3xl font-semibold text-gray-950">
                  {overview.totalTicketsSold.toLocaleString()}
                </p>
              </div>

              {/* Total Revenue */}
              <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100">
                <div className="flex items-center gap-2 text-amber-700">
                  <DollarIcon className="h-5 w-5" />
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em]">
                    {t(locale, "eventOverview.totalRevenue")}
                  </h3>
                </div>
                <p className="mt-3 text-3xl font-semibold text-gray-950">
                  {overview.totalRevenueFormatted}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {t(locale, "eventOverview.fromTickets")}{" "}
                  {overview.totalTicketsSold}{" "}
                  {t(locale, "eventOverview.tickets")}
                </p>
              </div>

              {/* Revenue per Ticket Type */}
              <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100">
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-gray-700">
                  {t(locale, "eventOverview.revenuePerType")}
                </h3>
                {overview.ticketSalesBreakdown.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    {t(locale, "eventOverview.noTicketSales")}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {overview.ticketSalesBreakdown.map((tier) => {
                      const pct = totalTicketRevenue > 0 ? (tier.revenue / totalTicketRevenue) * 100 : 0;
                      return (
                        <div key={tier.ticketTypeName}>
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-gray-900">{tier.ticketTypeName}</span>
                            <span className="font-semibold text-gray-900">{tier.revenueFormatted}</span>
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                              <div
                                className="h-full rounded-full bg-sky-500 transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="w-10 text-right text-xs text-gray-500">{pct.toFixed(0)}%</span>
                          </div>
                          <p className="mt-0.5 text-xs text-gray-500">
                            {tier.ticketsSold} {t(locale, "eventOverview.sold")}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Performance Metrics */}
              <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100">
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-gray-700">
                  {t(locale, "eventOverview.performanceMetrics")}
                </h3>
                <div className="space-y-4">
                  <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      {t(locale, "eventOverview.conversionRate")}
                    </p>
                    <p className="mt-1 text-xl font-semibold text-gray-900">
                      {overview.conversionRate != null ? `${overview.conversionRate.toFixed(1)}%` : "N/A"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      {t(locale, "eventOverview.cancellationRate")}
                    </p>
                    <p className="mt-1 text-xl font-semibold text-gray-900">
                      {overview.cancellationRate != null ? `${overview.cancellationRate.toFixed(1)}%` : "N/A"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      {t(locale, "eventOverview.reviews")}
                    </p>
                    <p className="mt-1 text-xl font-semibold text-gray-900">
                      {overview.reviewCount}{" "}
                      {overview.reviewCount !== 1 ? t(locale, "eventOverview.reviews") : t(locale, "eventOverview.review")}
                      {overview.reviewScore != null && (
                        <span className="ml-2 text-sm font-normal text-gray-500">
                          ({t(locale, "eventOverview.avg")} {overview.reviewScore.toFixed(1)} / 5)
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Ticket Types */}
              {ticketTypes && ticketTypes.length > 0 && (
                <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100">
                  <SectionHeader
                    icon={DollarIcon}
                    eyebrow={t(locale, "adminEvent.ticketsEyebrow")}
                    title={t(locale, "adminEvent.ticketsTitle")}
                    description={t(locale, "adminEvent.ticketsDesc")}
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
                          {/* Hide price when is_free */}
                          {!ticket.is_free && (
                            <span className="rounded-full bg-gray-900 px-3 py-1 text-sm font-semibold text-white">
                              {formatPrice(ticket.price_cents, ticket.currency)}
                            </span>
                          )}
                          {ticket.is_free && (
                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">
                              {t(locale, "adminEvent.free")}
                            </span>
                          )}
                        </div>
                        {ticket.description && (
                          <p className="mt-3 text-sm text-gray-600">{ticket.description}</p>
                        )}
                        <div className="mt-3 grid gap-2">
                          {ticket.capacity != null && (
                            <p className="text-xs font-medium uppercase tracking-[0.16em] text-gray-500">
                              {t(locale, "adminEvent.capacityLabel")} <span className="normal-case tracking-normal text-gray-700">{ticket.capacity}</span>
                            </p>
                          )}
                          {ticket.free_for_ladies && (
                            <p className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-600">
                              {t(locale, "adminEvent.freeForLadies")}
                            </p>
                          )}
                        {ticket.benefits && Array.isArray(ticket.benefits) && ticket.benefits.length > 0 && (
                            <div>
                              <p className="text-xs font-medium uppercase tracking-[0.16em] text-gray-500">{t(locale, "adminEvent.benefits")}</p>
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
                              <p>{t(locale, "adminEvent.salesStart")} {formatDateTime(ticket.sales_start_at)}</p>
                            )}
                            {ticket.sales_end_at && (
                              <p>{t(locale, "adminEvent.salesEnd")} {formatDateTime(ticket.sales_end_at)}</p>
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
                    eyebrow={t(locale, "adminEvent.venueEyebrow")}
                    title={t(locale, "adminEvent.venueTitle")}
                    description={t(locale, "adminEvent.venueDesc")}
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
                  {venue.capacity != null && (
                      <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-gray-500">
                        {t(locale, "adminEvent.venueCapacity")} <span className="normal-case tracking-normal text-gray-700">{venue.capacity.toLocaleString()}</span>
                      </p>
                  )}
                  {venue.timezone && (
                      <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-gray-500">
                        {t(locale, "adminEvent.timezone")} <span className="normal-case tracking-normal text-gray-700">{venue.timezone}</span>
                      </p>
                  )}
                  </div>
                  {venue.lat && venue.lng ? (
                    <>
                      <div className="mt-4 overflow-hidden rounded-[1.5rem] border border-gray-200">
                        <iframe
                          title={t(locale, "adminEvent.venueLocation")}
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
                        {t(locale, "adminEvent.getDirections")}
                      </a>
                    </>
                  ) : (
                    <div className="mt-4 flex h-48 items-center justify-center rounded-[1.5rem] border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-500">
                      {t(locale, "adminEvent.noMapAvailable")}
                    </div>
                  )}
                </div>
              )}

              {/* Event Settings — waitlist removed */}
              <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100">
                <SectionHeader
                  icon={SettingsIcon}
                  eyebrow={t(locale, "adminEvent.settingsEyebrow")}
                  title={t(locale, "adminEvent.settingsTitle")}
                  description={t(locale, "adminEvent.settingsDesc")}
                />
                <div className="mt-6 grid gap-3">
                  <DetailRow icon={SettingsIcon} label={t(locale, "adminEvent.approvalMode")}>
                    <p className="font-medium text-gray-900">
                      {event.approvalMode === "manual" ? t(locale, "adminEvent.manualApproval") : t(locale, "adminEvent.autoApproval")}
                    </p>
                  </DetailRow>
                  <DetailRow icon={GlobeIcon} label={t(locale, "adminEvent.sharing")}>
                    <p className="font-medium text-gray-900">
                      {event.sharingEnabled ? t(locale, "adminEvent.sharingEnabled") : t(locale, "adminEvent.sharingDisabled")}
                    </p>
                  </DetailRow>
                </div>
              </div>

              {/* Event Policies */}
              {event.policies && event.policies.length > 0 && (
                <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100">
                  <SectionHeader
                    icon={StarIcon}
                    eyebrow={t(locale, "adminEvent.policiesEyebrow")}
                    title={t(locale, "adminEvent.policiesTitle")}
                    description={t(locale, "adminEvent.policiesDesc")}
                  />
                  <div className="mt-6 space-y-4">
                    {event.policies.map((policy, i) => (
                      <div key={i} className="rounded-3xl border border-gray-100 bg-gray-50 p-5">
                        <h3 className="text-sm font-semibold text-gray-900">{policy.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-gray-700">{policy.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>
        </div>
      </MainLayout>
      <Footer />
    </>
  );
}
