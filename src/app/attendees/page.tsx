import { MainLayout } from "@/components/layout/MainLayout";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { UsersIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { getAttendees, getCheckinSummary } from "@/lib/data/attendees";

export const dynamic = "force-dynamic";

export default async function AttendeesPage() {
  let attendees: Awaited<ReturnType<typeof getAttendees>> = [];
  let checkinSummary: Awaited<ReturnType<typeof getCheckinSummary>> = [];

  try {
    [attendees, checkinSummary] = await Promise.all([
      getAttendees(),
      getCheckinSummary(),
    ]);
  } catch {
    // Will show empty state
  }

  const totalAttendees = attendees.length;
  const checkedIn = attendees.filter((a) => a.checkedIn).length;
  const pending = totalAttendees - checkedIn;

  const statCards = [
    {
      label: "Total Attendees",
      value: String(totalAttendees),
      icon: <UsersIcon className="h-6 w-6 text-blue-600" />,
      iconBgColor: "bg-blue-50",
    },
    {
      label: "Checked In",
      value: String(checkedIn),
      icon: <UsersIcon className="h-6 w-6 text-green-600" />,
      iconBgColor: "bg-green-50",
    },
    {
      label: "Pending",
      value: String(pending),
      icon: <UsersIcon className="h-6 w-6 text-yellow-600" />,
      iconBgColor: "bg-yellow-50",
    },
    {
      label: "Events",
      value: String(checkinSummary.length),
      icon: <UsersIcon className="h-6 w-6 text-purple-600" />,
      iconBgColor: "bg-purple-50",
    },
  ];

  const recentCheckIns = attendees
    .filter((a) => a.checkedIn)
    .slice(0, 10);

  return (
    <MainLayout
      title="All Attendees"
      actions={
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            Export
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>

        {/* Attendees by Event */}
        <Card>
          <h2 className="mb-6 text-lg font-semibold text-gray-900">
            Attendees by Event
          </h2>
          {checkinSummary.length === 0 ? (
            <p className="py-8 text-center text-gray-500">No events found.</p>
          ) : (
            <div className="space-y-4">
              {checkinSummary.map((item) => (
                <div
                  key={item.eventId}
                  className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
                >
                  <div>
                    <h3 className="font-medium text-gray-900">{item.eventName}</h3>
                    <p className="text-sm text-gray-500">
                      {item.checkedIn} / {item.totalTickets} checked in
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-gray-900">
                      {item.totalAttendees} attendees
                    </span>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Check-ins */}
        <Card>
          <h2 className="mb-6 text-lg font-semibold text-gray-900">
            Recent Check-ins
          </h2>
          {recentCheckIns.length === 0 ? (
            <p className="py-8 text-center text-gray-500">No check-ins yet.</p>
          ) : (
            <div className="space-y-3">
              {recentCheckIns.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold">
                      {item.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-500">{item.eventName}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge variant="confirmed">Checked In</Badge>
                    {item.checkInTime && (
                      <span className="text-sm text-gray-500">{item.checkInTime}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </MainLayout>
  );
}
