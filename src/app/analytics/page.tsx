import { MainLayout } from "@/components/layout/MainLayout";
import { StatCard } from "@/components/ui/StatCard";
import { LineChart } from "@/components/charts/LineChart";
import { AreaChart } from "@/components/charts/AreaChart";
import { PieChart } from "@/components/charts/PieChart";
import { Card } from "@/components/ui/Card";
import { EyeIcon, UsersIcon, ChartIcon, StarIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";

const stats = [
  {
    label: "Page Views",
    value: "12.8K",
    icon: <EyeIcon className="h-6 w-6 text-blue-600" />,
    iconBgColor: "bg-blue-50",
    trend: { value: "12.5% vs last month", isPositive: true },
  },
  {
    label: "Form Bookings",
    value: "830",
    icon: <UsersIcon className="h-6 w-6 text-green-600" />,
    iconBgColor: "bg-green-50",
    trend: { value: "8.2% vs last month", isPositive: true },
  },
  {
    label: "Conversion Rate",
    value: "6.5%",
    icon: <ChartIcon className="h-6 w-6 text-orange-600" />,
    iconBgColor: "bg-orange-50",
    trend: { value: "3.1% vs last month", isPositive: false },
  },
  {
    label: "Avg Event Rating",
    value: "4.7",
    icon: <StarIcon className="h-6 w-6 text-yellow-600" />,
    iconBgColor: "bg-yellow-50",
    trend: { value: "0.3 vs last month", isPositive: true },
  },
];

const eventTypes = [
  { label: "Music", value: 35, color: "#3b82f6" },
  { label: "Food & Drink", value: 25, color: "#10b981" },
  { label: "Business", value: 20, color: "#f59e0b" },
  { label: "Sports", value: 15, color: "#ef4444" },
  { label: "Other", value: 5, color: "#6b7280" },
];

const topEvents = [
  { name: "Summer Music Festival", views: "1253 views", bookings: "64 bookings", revenue: "€4450" },
  { name: "Wine Tasting Evening", views: "982 views", bookings: "51 bookings", revenue: "€3350" },
  { name: "Tech Startup Meetup", views: "765 views", bookings: "43 bookings", revenue: "€2250" },
  { name: "Food Truck Rally", views: "620 views", bookings: "38 bookings", revenue: "€1900" },
];

export default function AnalyticsPage() {
  return (
    <MainLayout
      title="Analytics Dashboard"
      actions={
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            📊 Export Report
          </Button>
          <Button variant="outline" size="sm">
            🔄 Refresh
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

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <LineChart title="Views vs Bookings" />
          <AreaChart title="Monthly Revenue" />
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <PieChart title="Event Types Distribution" data={eventTypes} />

          {/* Top Performing Events */}
          <Card>
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              Top Performing Events
            </h3>
            <div className="space-y-4">
              {topEvents.map((event) => (
                <div key={event.name} className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{event.name}</p>
                    <p className="text-sm text-gray-500">
                      {event.views} · {event.bookings}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {event.revenue}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
