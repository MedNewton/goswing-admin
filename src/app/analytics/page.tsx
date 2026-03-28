import { MainLayout } from "@/components/layout/MainLayout";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
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

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
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

  // Compute category distribution from recent events
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

  return (
    <MainLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Analytics Dashboard</h1>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            Export Report
          </Button>
        </div>
      </div>
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Events"
            value={String(overviewStats.totalEvents)}
            icon={<CalendarIcon className="h-6 w-6 text-blue-600" />}
            iconBgColor="bg-blue-50"
          />
          <StatCard
            label="Total Attendees"
            value={formatCompactNumber(overviewStats.totalAttendees)}
            icon={<UsersIcon className="h-6 w-6 text-green-600" />}
            iconBgColor="bg-green-50"
          />
          <StatCard
            label="Total Revenue"
            value={overviewStats.totalRevenueFormatted}
            icon={<DollarIcon className="h-6 w-6 text-orange-600" />}
            iconBgColor="bg-orange-50"
          />
          <StatCard
            label="Avg Event Rating"
            value={overviewStats.avgRating > 0 ? overviewStats.avgRating.toFixed(1) : "--"}
            icon={<StarIcon className="h-6 w-6 text-yellow-600" />}
            iconBgColor="bg-yellow-50"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Top Performing Events */}
          <Card>
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              Top Events by Attendance
            </h3>
            {topEvents.length === 0 ? (
              <p className="text-sm text-gray-500">No events yet.</p>
            ) : (
              <div className="space-y-4">
                {topEvents.map((event) => (
                  <div key={event.id} className="flex items-start justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-900">{event.title}</p>
                      <p className="text-sm text-gray-500">
                        {event.attendeeCount.toLocaleString()} attendees
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-gray-700">
                      {event.status === "published" ? "Live" : event.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Event Category Distribution */}
          <Card>
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              Event Categories
            </h3>
            {categoryEntries.length === 0 ? (
              <p className="text-sm text-gray-500">No events to categorize.</p>
            ) : (
              <div className="space-y-3">
                {categoryEntries.map(([category, count]) => {
                  const pct = totalCategorized > 0 ? Math.round((count / totalCategorized) * 100) : 0;
                  return (
                    <div key={category}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium capitalize text-gray-900">{category}</span>
                        <span className="text-gray-500">{count} ({pct}%)</span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-gray-900"
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
          <Card>
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              Rating Distribution
            </h3>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-4xl font-bold text-gray-900">
                  {reviewStats.average > 0 ? reviewStats.average.toFixed(1) : "--"}
                </p>
                <p className="text-sm text-gray-500">{reviewStats.count} reviews</p>
              </div>
              <div className="flex-1 space-y-1.5">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = ratingDist[star] ?? 0;
                  const pct = reviewStats.count > 0 ? Math.round((count / reviewStats.count) * 100) : 0;
                  return (
                    <div key={star} className="flex items-center gap-2 text-sm">
                      <span className="w-3 text-gray-500">{star}</span>
                      <StarIcon className="h-3.5 w-3.5 text-amber-400" />
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-amber-400"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-xs text-gray-500">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Quick Stats */}
          <Card>
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              Quick Stats
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Tickets Sold</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {formatCompactNumber(overviewStats.totalTickets)}
                </p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Active Events</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {recentEvents.filter((e) => e.status === "published").length}
                </p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Reviews</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {reviewStats.count}
                </p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Revenue</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {overviewStats.totalRevenueFormatted}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
