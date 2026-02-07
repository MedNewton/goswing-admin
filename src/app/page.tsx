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

const stats = [
  {
    label: "Total Events",
    value: "12",
    icon: <CalendarIcon className="h-6 w-6 text-blue-600" />,
    iconBgColor: "bg-blue-50",
  },
  {
    label: "Total Attendees",
    value: "1,247",
    icon: <UsersIcon className="h-6 w-6 text-green-600" />,
    iconBgColor: "bg-green-50",
  },
  {
    label: "Total Tickets",
    value: "68,432",
    icon: <CalendarIcon className="h-6 w-6 text-purple-600" />,
    iconBgColor: "bg-purple-50",
  },
  {
    label: "Avg Rating",
    value: "4.8",
    icon: <StarIcon className="h-6 w-6 text-yellow-600" />,
    iconBgColor: "bg-yellow-50",
  },
];

const recentEvents = [
  {
    id: "1",
    title: "Summer Jazz Night",
    date: "2024-06-15 at 20:00",
    image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=100&h=100&fit=crop",
    status: "published" as const,
    attendees: 127150,
  },
  {
    id: "2",
    title: "Wine Tasting Evening",
    date: "2024-06-12 at 18:30",
    image: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=100&h=100&fit=crop",
    status: "draft" as const,
    attendees: 43980,
  },
  {
    id: "3",
    title: "Tech Networking Mixer",
    date: "2024-05-28 at 19:00",
    image: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=100&h=100&fit=crop",
    status: "completed" as const,
    attendees: 89100,
  },
];

export default function Home() {
  return (
    <MainLayout title="Welcome back, Guest User!">
      <div className="space-y-6">
        {/* Subtitle */}
        <p className="text-gray-600">Here&apos;s what&apos;s happening with your events</p>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>

        {/* Recent Events */}
        <Card>
          <h2 className="mb-6 text-lg font-semibold text-gray-900">
            Recent Events
          </h2>
          <div className="space-y-4">
            {recentEvents.map((event) => (
              <div
                key={event.id}
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
                    {event.attendees.toLocaleString()}
                  </span>
                  <button className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                    <MoreIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
