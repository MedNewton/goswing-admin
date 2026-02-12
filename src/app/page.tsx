import { MainLayout } from "@/components/layout/MainLayout";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import {
  CalendarIcon,
  UsersIcon,
  StarIcon,
  MoreIcon,
} from "@/components/icons";
import { getOverview } from "@/lib/data/overview";
import { formatCompactNumber } from "@/lib/utils/format";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function Home() {
  let overviewStats = { totalEvents: 0, totalAttendees: 0, totalTickets: 0, avgRating: 0, totalRevenueFormatted: "$0.00" };
  let recentEvents: Awaited<ReturnType<typeof getOverview>>["recentEvents"] = [];

  try {
    const overview = await getOverview();
    overviewStats = { ...overviewStats, ...overview.stats };
    recentEvents = overview.recentEvents;
  } catch {
    // Will show empty/zero state
  }

  const statCards = [
    {
      label: "Total Events",
      value: String(overviewStats.totalEvents),
      icon: <CalendarIcon className="h-6 w-6 text-blue-600" />,
      iconBgColor: "bg-blue-50",
    },
    {
      label: "Total Attendees",
      value: formatCompactNumber(overviewStats.totalAttendees),
      icon: <UsersIcon className="h-6 w-6 text-green-600" />,
      iconBgColor: "bg-green-50",
    },
    {
      label: "Total Tickets",
      value: formatCompactNumber(overviewStats.totalTickets),
      icon: <CalendarIcon className="h-6 w-6 text-purple-600" />,
      iconBgColor: "bg-purple-50",
    },
    {
      label: "Avg Rating",
      value: overviewStats.avgRating > 0 ? overviewStats.avgRating.toFixed(1) : "—",
      icon: <StarIcon className="h-6 w-6 text-yellow-600" />,
      iconBgColor: "bg-yellow-50",
    },
  ];

  return (
    <MainLayout title="Welcome back!">
      <div className="space-y-6">
        <p className="text-gray-600">Here&apos;s what&apos;s happening with your events</p>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>

        {/* Recent Events */}
        <Card>
          <h2 className="mb-6 text-lg font-semibold text-gray-900">
            Recent Events
          </h2>
          {recentEvents.length === 0 ? (
            <p className="py-8 text-center text-gray-500">
              No events yet. Create your first event to get started.
            </p>
          ) : (
            <div className="space-y-4">
              {recentEvents.map((event) => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="flex items-center justify-between rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={event.image}
                      alt={event.title}
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {event.title}
                      </h3>
                      <p className="text-sm text-gray-600">{event.date}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <Badge variant={event.status}>
                      {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                    </Badge>
                    <span className="text-sm font-medium text-gray-900">
                      {event.attendeeCount.toLocaleString()}
                    </span>
                    <button className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                      <MoreIcon className="h-5 w-5" />
                    </button>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </MainLayout>
  );
}
