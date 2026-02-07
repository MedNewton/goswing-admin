import { MainLayout } from "@/components/layout/MainLayout";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { UsersIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";

const stats = [
  {
    label: "Total Attendees",
    value: "259",
    icon: <UsersIcon className="h-6 w-6 text-blue-600" />,
    iconBgColor: "bg-blue-50",
  },
  {
    label: "Checked In",
    value: "127",
    icon: <UsersIcon className="h-6 w-6 text-green-600" />,
    iconBgColor: "bg-green-50",
  },
  {
    label: "Pending",
    value: "112",
    icon: <UsersIcon className="h-6 w-6 text-yellow-600" />,
    iconBgColor: "bg-yellow-50",
  },
  {
    label: "Cancelled",
    value: "20",
    icon: <UsersIcon className="h-6 w-6 text-red-600" />,
    iconBgColor: "bg-red-50",
  },
];

const eventAttendees = [
  { event: "Summer Jazz Night", date: "2024-06-15 at 20:00", status: "published" as const, count: 127, image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=100&h=100&fit=crop" },
  { event: "Wine Tasting Evening", date: "2024-06-12 at 18:30", status: "draft" as const, count: 43, image: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=100&h=100&fit=crop" },
  { event: "Tech Networking Mixer", date: "2024-05-28 at 19:00", status: "completed" as const, count: 89, image: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=100&h=100&fit=crop" },
];

const recentCheckIns = [
  { name: "Marie Dubois", event: "Summer Jazz Night", time: "3 min ago", checked: true },
  { name: "Jean Martin", event: "Wine Tasting Evening", time: "12 min ago", checked: true },
  { name: "Sophie Laurent", event: "Summer Jazz Night", time: "25 min ago", checked: true },
  { name: "Pierre Dubois", event: "Tech Networking Mixer", time: "1 hour ago", checked: true },
];

export default function AttendeesPage() {
  return (
    <MainLayout
      title="All Attendees"
      actions={
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            ✉️ Email All
          </Button>
          <Button variant="outline" size="sm">
            📤 Export
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>

        {/* Attendees by Event */}
        <Card>
          <h2 className="mb-6 text-lg font-semibold text-gray-900">
            Attendees by Event
          </h2>
          <div className="space-y-4">
            {eventAttendees.map((item) => (
              <div
                key={item.event}
                className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
              >
                <div className="flex items-center gap-4">
                  <img
                    src={item.image}
                    alt={item.event}
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                  <div>
                    <h3 className="font-medium text-gray-900">{item.event}</h3>
                    <p className="text-sm text-gray-500">{item.date}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <Badge variant={item.status}>{item.status}</Badge>
                  <span className="text-sm font-medium text-gray-900">
                    {item.count} attendees
                  </span>
                  <Button variant="outline" size="sm">
                    View Details →
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Check-ins */}
        <Card>
          <h2 className="mb-6 text-lg font-semibold text-gray-900">
            Recent Check-ins
          </h2>
          <div className="space-y-3">
            {recentCheckIns.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between py-2"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold">
                    {item.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-sm text-gray-500">{item.event}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge variant="confirmed">Checked In</Badge>
                  <span className="text-sm text-gray-500">{item.time}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
