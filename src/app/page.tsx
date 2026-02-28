import { MainLayout } from "@/components/layout/MainLayout";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import {
  CalendarIcon,
  ChevronRightIcon,
  DollarIcon,
  EyeIcon,
  MusicIcon,
  ShoppingBagIcon,
  UsersIcon,
  StarIcon,
} from "@/components/icons";
import { getOverview } from "@/lib/data/overview";
import { formatCompactNumber } from "@/lib/utils/format";
import Link from "next/link";

export const dynamic = "force-dynamic";

function SummaryCard({
  icon: Icon,
  label,
  value,
  accentClass,
}: {
  icon: typeof CalendarIcon;
  label: string;
  value: string;
  accentClass: string;
}) {
  return (
    <div className="rounded-3xl border border-white/12 bg-white/10 p-5 backdrop-blur">
      <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 ${accentClass}`}>
        <Icon className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-[0.18em]">
          {label}
        </span>
      </div>
      <p className="mt-4 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

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

  return (
    <MainLayout title="Welcome back!">
      <div className="space-y-6">
        <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-teal-800 p-8 text-white shadow-xl shadow-slate-200">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(45,212,191,0.22),_transparent_34%)]" />
          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/12 text-white backdrop-blur">
                <EyeIcon className="h-6 w-6" />
              </div>
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.3em] text-teal-100/75">
                Overview
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                Here&apos;s what&apos;s happening with your events.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200">
                Track attendance, recent activity, ratings, and ticket momentum from a single dashboard surface.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/90 backdrop-blur">
                  {overviewStats.totalRevenueFormatted ?? "$0.00"} revenue
                </div>
                <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/90 backdrop-blur">
                  {recentEvents.length.toLocaleString()} recent events
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <SummaryCard
                icon={CalendarIcon}
                label="Events"
                value={String(overviewStats.totalEvents)}
                accentClass="bg-sky-50 text-sky-700"
              />
              <SummaryCard
                icon={UsersIcon}
                label="Attendees"
                value={formatCompactNumber(overviewStats.totalAttendees)}
                accentClass="bg-emerald-50 text-emerald-700"
              />
              <SummaryCard
                icon={ShoppingBagIcon}
                label="Tickets"
                value={formatCompactNumber(overviewStats.totalTickets)}
                accentClass="bg-amber-50 text-amber-700"
              />
              <SummaryCard
                icon={StarIcon}
                label="Avg Rating"
                value={overviewStats.avgRating > 0 ? overviewStats.avgRating.toFixed(1) : "—"}
                accentClass="bg-rose-50 text-rose-700"
              />
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <Card className="rounded-[2rem] border border-gray-200 bg-white shadow-lg shadow-gray-100">
            <div className="border-b border-gray-100 px-6 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">
                Activity Feed
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-gray-950">
                Recent Events
              </h2>
            </div>
          {recentEvents.length === 0 ? (
            <p className="px-6 py-12 text-center text-gray-500">
              No events yet. Create your first event to get started.
            </p>
          ) : (
            <div className="space-y-4 p-6">
              {recentEvents.map((event) => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="group flex flex-col gap-4 rounded-[1.5rem] border border-gray-200 bg-gradient-to-r from-white to-slate-50 p-5 transition-all hover:-translate-y-0.5 hover:shadow-md lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <img
                      src={event.image}
                      alt={event.title}
                      className="h-16 w-16 rounded-2xl object-cover"
                    />
                    <div className="min-w-0">
                      <h3 className="truncate font-medium text-gray-900">
                        {event.title}
                      </h3>
                      <p className="mt-1 text-sm text-gray-600">{event.date}</p>
                      <p className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-gray-500">
                        {event.location}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Badge variant={event.status}>
                      {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                    </Badge>
                    <div className="rounded-full bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700">
                      {event.attendeeCount.toLocaleString()} checked in
                    </div>
                    <div className="rounded-full bg-white p-2 text-gray-400 shadow-sm transition-transform group-hover:translate-x-1">
                      <ChevronRightIcon className="h-4 w-4" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
          </Card>

          <div className="grid gap-6">
            <Card className="rounded-[2rem] border border-gray-200 bg-white shadow-lg shadow-gray-100">
              <div className="p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">
                  Revenue Snapshot
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-gray-950">
                  Business momentum
                </h2>
                <div className="mt-6 rounded-[1.5rem] bg-gradient-to-br from-slate-950 via-slate-900 to-teal-700 p-6 text-white">
                  <div className="flex items-center gap-3 text-teal-100">
                    <DollarIcon className="h-5 w-5" />
                    <span className="text-xs font-semibold uppercase tracking-[0.2em]">
                      Total Revenue
                    </span>
                  </div>
                  <p className="mt-4 text-3xl font-semibold">
                    {overviewStats.totalRevenueFormatted ?? "$0.00"}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="rounded-[2rem] border border-gray-200 bg-white shadow-lg shadow-gray-100">
              <div className="p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">
                  Quick Focus
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-gray-950">
                  What to watch next
                </h2>
                <div className="mt-6 space-y-3">
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                    <div className="flex items-center gap-3">
                      <UsersIcon className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm font-medium text-gray-900">
                        Total attendees: {formatCompactNumber(overviewStats.totalAttendees)}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                    <div className="flex items-center gap-3">
                      <MusicIcon className="h-4 w-4 text-sky-600" />
                      <span className="text-sm font-medium text-gray-900">
                        Keep music, reviews, and attendance pages aligned with active events.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
