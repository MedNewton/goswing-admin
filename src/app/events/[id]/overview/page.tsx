import { MainLayout } from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  CalendarIcon,
  ChartIcon,
  DollarIcon,
  MusicIcon,
  StarIcon,
  UsersIcon,
} from "@/components/icons";
import { getEvent, getEventOverview } from "@/lib/data/events";
import { notFound } from "next/navigation";
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
  tone: "emerald" | "sky" | "amber" | "purple" | "rose";
}) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-700",
    sky: "bg-sky-50 text-sky-700",
    amber: "bg-amber-50 text-amber-700",
    purple: "bg-purple-50 text-purple-700",
    rose: "bg-rose-50 text-rose-700",
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

export default async function EventOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

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

  return (
    <MainLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Event Overview</h1>
          <p className="mt-1 text-sm text-gray-500">{event.title}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/events/${id}`}>
            <Button variant="outline" size="sm">View Event</Button>
          </Link>
          <Link href={`/events/${id}/edit`}>
            <Button variant="primary" size="sm">Edit Event</Button>
          </Link>
        </div>
      </div>

      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard
            icon={CalendarIcon}
            label="Reservations"
            value={overview.reservationsCount.toLocaleString()}
            tone="sky"
          />
          <StatCard
            icon={UsersIcon}
            label="Checked In"
            value={overview.checkedInCount.toLocaleString()}
            tone="emerald"
          />
          <StatCard
            icon={DollarIcon}
            label="Revenue"
            value={overview.totalRevenueFormatted}
            tone="amber"
          />
          <StatCard
            icon={MusicIcon}
            label="Songs"
            value={overview.songSuggestionsCount.toLocaleString()}
            tone="purple"
          />
          <StatCard
            icon={StarIcon}
            label="Rating"
            value={overview.reviewScore != null ? overview.reviewScore.toFixed(1) : "--"}
            tone="rose"
          />
          <StatCard
            icon={ChartIcon}
            label="Tickets Sold"
            value={overview.totalTicketsSold.toLocaleString()}
            tone="sky"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Ticket Sales Breakdown */}
          <Card>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Ticket Sales Breakdown
            </h2>
            {overview.ticketSalesBreakdown.length === 0 ? (
              <p className="text-sm text-gray-500">No ticket sales yet.</p>
            ) : (
              <div className="space-y-3">
                {overview.ticketSalesBreakdown.map((tier) => (
                  <div
                    key={tier.ticketTypeName}
                    className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{tier.ticketTypeName}</p>
                      <p className="text-sm text-gray-500">
                        {tier.ticketsSold} sold
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      {tier.revenueFormatted}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Rates & Reviews */}
          <Card>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Performance Metrics
            </h2>
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Cancellation Rate
                </p>
                <p className="mt-1 text-xl font-semibold text-gray-900">
                  {overview.cancellationRate != null
                    ? `${overview.cancellationRate.toFixed(1)}%`
                    : "N/A"}
                </p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Reviews
                </p>
                <p className="mt-1 text-xl font-semibold text-gray-900">
                  {overview.reviewCount} review{overview.reviewCount !== 1 ? "s" : ""}
                  {overview.reviewScore != null && (
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      (avg {overview.reviewScore.toFixed(1)} / 5)
                    </span>
                  )}
                </p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Total Revenue
                </p>
                <p className="mt-1 text-xl font-semibold text-gray-900">
                  {overview.totalRevenueFormatted}
                </p>
                <p className="text-sm text-gray-500">
                  from {overview.totalTicketsSold} tickets
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
