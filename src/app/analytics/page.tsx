import { MainLayout } from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  CalendarIcon,
  ChartIcon,
  DollarIcon,
  StarIcon,
  UsersIcon,
} from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { getOverview } from "@/lib/data/overview";
import { getReviewsWithStats } from "@/lib/data/reviews";
import { formatCompactNumber } from "@/lib/utils/format";
import { getLocale, t } from "@/lib/i18n";
import { checkRoleAccess } from "@/lib/auth/requireAdmin";

export const dynamic = "force-dynamic";

function SummaryCard({
  icon: Icon,
  label,
  value,
  accentClass,
}: {
  icon: typeof UsersIcon;
  label: string;
  value: string;
  accentClass: string;
}) {
  return (
    <div className="rounded-3xl border border-white/12 bg-white/10 p-5 backdrop-blur">
      <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 ${accentClass}`}>
        <Icon className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-[0.18em]">{label}</span>
      </div>
      <p className="mt-4 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

export default async function AnalyticsPage() {
  const denied = await checkRoleAccess(["admin", "finance_manager"]);
  if (denied) return denied;

  const locale = await getLocale();
  let overviewStats = {
    totalEvents: 0,
    totalAttendees: 0,
    totalTickets: 0,
    avgRating: 0,
    totalRevenueFormatted: "$0.00",
  };
  let recentEvents: Awaited<ReturnType<typeof getOverview>>["recentEvents"] = [];
  let reviewStats = { average: 0, count: 0, distribution: {} as Record<number, number> };

  try {
    const [overview, reviewData] = await Promise.all([
      getOverview(),
      getReviewsWithStats(),
    ]);
    overviewStats = { ...overviewStats, ...overview.stats };
    recentEvents = overview.recentEvents;
    reviewStats = reviewData.stats;
  } catch {
    // Will show zero state
  }

  // Category distribution
  const categoryMap = new Map<string, number>();
  for (const event of recentEvents) {
    const cat = event.category ?? "Other";
    categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + 1);
  }
  const categoryEntries = [...categoryMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const totalCategorized = categoryEntries.reduce((sum, [, count]) => sum + count, 0);

  // Top events by attendance
  const topEvents = [...recentEvents]
    .sort((a, b) => b.attendeeCount - a.attendeeCount)
    .slice(0, 5);

  // Rating distribution
  const ratingDist = reviewStats.distribution;

  // Time slot analytics
  type TimeSlot = { key: string; labelKey: string; events: number; totalAttendees: number };
  const slots: TimeSlot[] = [
    { key: "morning", labelKey: "analyticsPage.morning", events: 0, totalAttendees: 0 },
    { key: "afternoon", labelKey: "analyticsPage.afternoon", events: 0, totalAttendees: 0 },
    { key: "evening", labelKey: "analyticsPage.evening", events: 0, totalAttendees: 0 },
    { key: "night", labelKey: "analyticsPage.night", events: 0, totalAttendees: 0 },
  ];

  for (const event of recentEvents) {
    if (!event.startsAt) continue;
    const hour = new Date(event.startsAt).getHours();
    let slotIdx: number;
    if (hour >= 6 && hour < 12) slotIdx = 0;
    else if (hour >= 12 && hour < 18) slotIdx = 1;
    else if (hour >= 18) slotIdx = 2;
    else slotIdx = 3;
    const slot = slots[slotIdx];
    if (slot) {
      slot.events += 1;
      slot.totalAttendees += event.attendeeCount;
    }
  }

  const slotColors = ["bg-amber-500", "bg-orange-500", "bg-indigo-500", "bg-slate-600"];
  const maxSlotEvents = Math.max(...slots.map((s) => s.events), 1);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Gradient Hero Header */}
        <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-800 p-8 text-white shadow-xl shadow-slate-200">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(99,102,241,0.22),_transparent_34%)]" />
          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/12 text-white backdrop-blur">
                <ChartIcon className="h-6 w-6" />
              </div>
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.3em] text-indigo-100/80">
                {t(locale, "analyticsPage.eyebrow")}
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                {t(locale, "analyticsPage.subtitle")}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200">
                {t(locale, "analyticsPage.description")}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/90 backdrop-blur">
                  {overviewStats.totalEvents} {t(locale, "analyticsPage.eventsShown")}
                </div>
                <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/90 backdrop-blur">
                  {reviewStats.count} {t(locale, "analyticsPage.reviewsShown")}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <SummaryCard
                icon={CalendarIcon}
                label={t(locale, "analyticsPage.totalEvents")}
                value={String(overviewStats.totalEvents)}
                accentClass="bg-indigo-50 text-indigo-700"
              />
              <SummaryCard
                icon={UsersIcon}
                label={t(locale, "analyticsPage.totalAttendees")}
                value={formatCompactNumber(overviewStats.totalAttendees)}
                accentClass="bg-sky-50 text-sky-700"
              />
              <SummaryCard
                icon={DollarIcon}
                label={t(locale, "analyticsPage.totalRevenue")}
                value={overviewStats.totalRevenueFormatted}
                accentClass="bg-emerald-50 text-emerald-700"
              />
              <SummaryCard
                icon={StarIcon}
                label={t(locale, "analyticsPage.avgRating")}
                value={overviewStats.avgRating > 0 ? overviewStats.avgRating.toFixed(1) : "--"}
                accentClass="bg-amber-50 text-amber-700"
              />
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Top Performing Events */}
          <Card className="rounded-[2rem] border border-gray-200 bg-white shadow-lg shadow-gray-100">
            <div className="border-b border-gray-100 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-950 text-white">
                  <UsersIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">
                    {t(locale, "analyticsPage.topEvents")}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-gray-950">
                    {t(locale, "analyticsPage.topEvents")}
                  </h2>
                </div>
              </div>
            </div>
            {topEvents.length === 0 ? (
              <p className="px-6 py-12 text-center text-gray-500">{t(locale, "analyticsPage.noEvents")}</p>
            ) : (
              <div className="space-y-3 p-6">
                {topEvents.map((event) => (
                  <div key={event.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-900">{event.title}</p>
                      <p className="text-sm text-gray-500">
                        {event.attendeeCount.toLocaleString()} {t(locale, "analyticsPage.attendees")}
                      </p>
                    </div>
                    <Badge variant={event.status === "published" ? "confirmed" : "secondary"}>
                      {event.status === "published" ? t(locale, "analyticsPage.live") : event.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Event Category Distribution */}
          <Card className="rounded-[2rem] border border-gray-200 bg-white shadow-lg shadow-gray-100">
            <div className="border-b border-gray-100 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-950 text-white">
                  <CalendarIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">
                    {t(locale, "analyticsPage.eventCategories")}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-gray-950">
                    {t(locale, "analyticsPage.eventCategories")}
                  </h2>
                </div>
              </div>
            </div>
            {categoryEntries.length === 0 ? (
              <p className="px-6 py-12 text-center text-gray-500">{t(locale, "analyticsPage.noCategorize")}</p>
            ) : (
              <div className="space-y-3 p-6">
                {categoryEntries.map(([category, count]) => {
                  const pct = totalCategorized > 0 ? Math.round((count / totalCategorized) * 100) : 0;
                  return (
                    <div key={category}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium capitalize text-gray-900">{category}</span>
                        <span className="text-gray-500">{count} ({pct}%)</span>
                      </div>
                      <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-indigo-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Rating Distribution */}
          <Card className="rounded-[2rem] border border-gray-200 bg-white shadow-lg shadow-gray-100">
            <div className="border-b border-gray-100 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-950 text-white">
                  <StarIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">
                    {t(locale, "analyticsPage.ratingDistribution")}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-gray-950">
                    {t(locale, "analyticsPage.ratingDistribution")}
                  </h2>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-6 p-6">
              <div className="text-center">
                <p className="text-5xl font-bold text-gray-900">
                  {reviewStats.average > 0 ? reviewStats.average.toFixed(1) : "--"}
                </p>
                <p className="mt-1 text-sm text-gray-500">{reviewStats.count} {t(locale, "analyticsPage.reviews")}</p>
              </div>
              <div className="flex-1 space-y-2">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = ratingDist[star] ?? 0;
                  const pct = reviewStats.count > 0 ? Math.round((count / reviewStats.count) * 100) : 0;
                  return (
                    <div key={star} className="flex items-center gap-2 text-sm">
                      <span className="w-3 text-gray-500">{star}</span>
                      <StarIcon className="h-3.5 w-3.5 text-amber-400" />
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                        <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-8 text-right text-xs text-gray-500">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Time Slot Analytics */}
          <Card className="rounded-[2rem] border border-gray-200 bg-white shadow-lg shadow-gray-100">
            <div className="border-b border-gray-100 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-950 text-white">
                  <ChartIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">
                    {t(locale, "analyticsPage.timeSlotAnalytics")}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-gray-950">
                    {t(locale, "analyticsPage.timeSlotDesc")}
                  </h2>
                </div>
              </div>
            </div>
            <div className="space-y-4 p-6">
              {slots.map((slot, idx) => {
                const pct = slot.events > 0 ? Math.round((slot.events / maxSlotEvents) * 100) : 0;
                const avgAtt = slot.events > 0 ? Math.round(slot.totalAttendees / slot.events) : 0;
                return (
                  <div key={slot.key}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-900">
                        {t(locale, slot.labelKey as "analyticsPage.morning")}
                      </span>
                      <span className="text-gray-500">
                        {slot.events} {t(locale, "analyticsPage.eventsInSlot")} &bull; {avgAtt} {t(locale, "analyticsPage.avgAttendance")}
                      </span>
                    </div>
                    <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full ${slotColors[idx]}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Quick Stats */}
        <Card className="rounded-[2rem] border border-gray-200 bg-white shadow-lg shadow-gray-100">
          <div className="border-b border-gray-100 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-950 text-white">
                <ChartIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">
                  {t(locale, "analyticsPage.quickStats")}
                </p>
                <h2 className="mt-1 text-xl font-semibold text-gray-950">
                  {t(locale, "analyticsPage.quickStats")}
                </h2>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 p-6 lg:grid-cols-4">
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                {t(locale, "analyticsPage.ticketsSold")}
              </p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">
                {formatCompactNumber(overviewStats.totalTickets)}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                {t(locale, "analyticsPage.activeEvents")}
              </p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">
                {recentEvents.filter((e) => e.status === "published").length}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                {t(locale, "analyticsPage.totalReviews")}
              </p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">
                {reviewStats.count}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                {t(locale, "analyticsPage.revenue")}
              </p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">
                {overviewStats.totalRevenueFormatted}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
