import { MainLayout } from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  CalendarIcon,
  ChevronRightIcon,
  DollarIcon,
  EyeIcon,
  MusicIcon,
  StarIcon,
  UsersIcon,
} from "@/components/icons";
import { getEvent, getEventOverview } from "@/lib/data/events";
import { getOrders } from "@/lib/data/orders";
import { getSongSuggestions } from "@/lib/data/music";
import { getAttendees } from "@/lib/data/attendees";
import { getReviews } from "@/lib/data/reviews";
import { getLocale, t } from "@/lib/i18n";
import { checkAdminAccess } from "@/lib/auth/requireAdmin";
import { formatDateTime } from "@/lib/utils/format";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { ComponentType, SVGProps } from "react";

export const dynamic = "force-dynamic";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

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
      <div
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 ${tones[tone]}`}
      >
        <Icon className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-[0.18em]">
          {label}
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold text-gray-950">{value}</p>
    </div>
  );
}

export default async function EventOverviewPage({
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

  try {
    [eventData, overview] = await Promise.all([
      getEvent(id),
      getEventOverview(id),
    ]);
  } catch {
    notFound();
  }

  if (!eventData || !overview) notFound();

  const { event } = eventData;

  // Fetch preview data for center sections
  const [orders, songs, checkins, reviews] = await Promise.all([
    getOrders({ eventId: id }).catch(() => []),
    getSongSuggestions({ eventId: id }).catch(() => []),
    getAttendees({ eventId: id }).catch(() => []),
    getReviews({ eventId: id }).catch(() => []),
  ]);

  // Pie chart data for ticket breakdown
  const totalTicketRevenue = overview.ticketSalesBreakdown.reduce(
    (sum, tier) => sum + tier.revenue,
    0,
  );

  return (
    <MainLayout>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {t(locale, "eventOverview.title")}
          </h1>
          <p className="mt-1 text-sm text-gray-500">{event.title}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/events/${id}/guest`}>
            <Button variant="outline" size="sm">
              <EyeIcon className="mr-1.5 h-4 w-4" />
              {t(locale, "eventOverview.viewAsGuest")}
            </Button>
          </Link>
          <Link href={`/events/${id}/edit`}>
            <Button variant="primary" size="sm">
              {t(locale, "eventOverview.editEvent")}
            </Button>
          </Link>
        </div>
      </div>

      {/* Top 4 Stat Cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
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
          value={
            overview.reviewScore != null
              ? `${overview.reviewScore.toFixed(1)} / 5`
              : "—"
          }
          tone="amber"
        />
      </div>

      {/* Main Content: center + right sidebar */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── Center: 2 cols ── */}
        <div className="space-y-6 lg:col-span-2">
          {/* Orders Preview */}
          <Card>
            <div className="mb-4 flex items-center justify-between">
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
              <p className="text-sm text-gray-500">
                {t(locale, "eventOverview.noOrders")}
              </p>
            ) : (
              <div className="space-y-2">
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
          </Card>

          {/* Songs Preview */}
          <Card>
            <div className="mb-4 flex items-center justify-between">
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
              <p className="text-sm text-gray-500">
                {t(locale, "eventOverview.noSongs")}
              </p>
            ) : (
              <div className="space-y-2">
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
          </Card>

          {/* Check-ins Preview */}
          <Card>
            <div className="mb-4 flex items-center justify-between">
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
              <p className="text-sm text-gray-500">
                {t(locale, "eventOverview.noCheckins")}
              </p>
            ) : (
              <div className="space-y-2">
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
          </Card>

          {/* Reviews Preview */}
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {t(locale, "eventOverview.recentReviews")}
              </h2>
              <Link
                href={`/reviews?eventId=${id}`}
                className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                {t(locale, "common.viewAll")}
                <ChevronRightIcon className="h-4 w-4" />
              </Link>
            </div>
            {reviews.length === 0 ? (
              <p className="text-sm text-gray-500">
                {t(locale, "eventOverview.noReviews")}
              </p>
            ) : (
              <div className="space-y-2">
                {reviews.slice(0, 5).map((review) => (
                  <div
                    key={review.id}
                    className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900">
                        {review.userName}
                      </p>
                      <div className="flex items-center gap-1">
                        <StarIcon className="h-4 w-4 text-amber-500" />
                        <span className="text-sm font-semibold text-gray-900">
                          {review.rating}
                        </span>
                      </div>
                    </div>
                    {review.comment && (
                      <p className="mt-1 line-clamp-2 text-sm text-gray-600">
                        {review.comment}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* ── Right Sidebar: 1 col ── */}
        <div className="space-y-6">
          {/* Total Sold Tickets */}
          <Card>
            <div className="flex items-center gap-2 text-sky-700">
              <CalendarIcon className="h-5 w-5" />
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em]">
                {t(locale, "eventOverview.ticketsSold")}
              </h3>
            </div>
            <p className="mt-3 text-3xl font-semibold text-gray-950">
              {overview.totalTicketsSold.toLocaleString()}
            </p>
          </Card>

          {/* Total Revenue */}
          <Card>
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
          </Card>

          {/* Revenue per Ticket Type */}
          <Card>
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
                  const pct =
                    totalTicketRevenue > 0
                      ? (tier.revenue / totalTicketRevenue) * 100
                      : 0;
                  return (
                    <div key={tier.ticketTypeName}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-900">
                          {tier.ticketTypeName}
                        </span>
                        <span className="font-semibold text-gray-900">
                          {tier.revenueFormatted}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full bg-sky-500 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-10 text-right text-xs text-gray-500">
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {tier.ticketsSold} {t(locale, "eventOverview.sold")}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Conversion & Cancellation Rates */}
          <Card>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-gray-700">
              {t(locale, "eventOverview.performanceMetrics")}
            </h3>
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {t(locale, "eventOverview.conversionRate")}
                </p>
                <p className="mt-1 text-xl font-semibold text-gray-900">
                  {overview.conversionRate != null
                    ? `${overview.conversionRate.toFixed(1)}%`
                    : "N/A"}
                </p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {t(locale, "eventOverview.cancellationRate")}
                </p>
                <p className="mt-1 text-xl font-semibold text-gray-900">
                  {overview.cancellationRate != null
                    ? `${overview.cancellationRate.toFixed(1)}%`
                    : "N/A"}
                </p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {t(locale, "eventOverview.reviews")}
                </p>
                <p className="mt-1 text-xl font-semibold text-gray-900">
                  {overview.reviewCount}{" "}
                  {overview.reviewCount !== 1
                    ? t(locale, "eventOverview.reviews")
                    : t(locale, "eventOverview.review")}
                  {overview.reviewScore != null && (
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      ({t(locale, "eventOverview.avg")}{" "}
                      {overview.reviewScore.toFixed(1)} / 5)
                    </span>
                  )}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
