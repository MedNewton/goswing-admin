import { MainLayout } from "@/components/layout/MainLayout";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { ChartIcon, EyeIcon } from "@/components/icons";
import { getLocale, t } from "@/lib/i18n";

const campaigns = [
  {
    name: "Summer Events Promo",
    category: "Social",
    type: "Email",
    status: "active" as const,
    reach: 2450,
    clicks: 145,
    conversions: 23,
  },
  {
    name: "Instagram Stories",
    category: "Social",
    type: "Social",
    status: "active" as const,
    reach: 5200,
    clicks: 312,
    conversions: 45,
  },
  {
    name: "Google Ads - Music",
    category: "Paid",
    type: "Paid",
    status: "paused" as const,
    reach: 1800,
    clicks: 89,
    conversions: 12,
  },
  {
    name: "Facebook Events",
    category: "Social",
    type: "Social",
    status: "active" as const,
    reach: 3600,
    clicks: 178,
    conversions: 28,
  },
];

const socialPerformance = [
  { platform: "Instagram", followers: "5.4K", engagement: "4.2%" },
  { platform: "Facebook", followers: "3.8K", engagement: "3.8%" },
  { platform: "Twitter", followers: "980", engagement: "2.1%" },
];

const quickActions = [
  { icon: "✉️", label: "Send Email Newsletter" },
  { icon: "📱", label: "Share on Social Media" },
  { icon: "📸", label: "Create Instagram Story" },
  { icon: "📢", label: "Boost Facebook Post" },
  { icon: "🔗", label: "Create Landing Page" },
  { icon: "🎯", label: "Generate QR Codes" },
];

export default async function MarketingPage() {
  const locale = await getLocale();

  const stats = [
    {
      label: t(locale, "marketingPage.totalReach"),
      value: "13.4K",
      icon: <EyeIcon className="h-6 w-6 text-blue-600" />,
      iconBgColor: "bg-blue-50",
      trend: { value: "15.2% this month", isPositive: true },
    },
    {
      label: t(locale, "marketingPage.ctr"),
      value: "5.8%",
      icon: <ChartIcon className="h-6 w-6 text-orange-600" />,
      iconBgColor: "bg-orange-50",
      trend: { value: "2.1% this month", isPositive: false },
    },
    {
      label: t(locale, "marketingPage.conversions"),
      value: "108",
      icon: <ChartIcon className="h-6 w-6 text-green-600" />,
      iconBgColor: "bg-green-50",
      trend: { value: "18.7% this month", isPositive: true },
    },
  ];

  return (
    <MainLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">{t(locale, "marketingPage.title")}</h1>
      </div>
      <div className="relative space-y-6">
        {/* Coming Soon Overlay */}
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <div className="rounded-2xl bg-white/90 px-8 py-6 text-center shadow-lg backdrop-blur">
            <p className="text-2xl font-bold text-gray-900">{t(locale, "marketingPage.comingSoon")}</p>
            <p className="mt-2 text-sm text-gray-500">
              {t(locale, "marketingPage.comingSoonDesc")}
            </p>
          </div>
        </div>
        <div className="select-none blur-sm">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>

        {/* Active Campaigns */}
        <Card padding="none">
          <div className="p-6 pb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {t(locale, "marketingPage.activeCampaigns")}
            </h2>
          </div>
          <Table>
            <TableHeader>
              <TableHead>{t(locale, "marketingPage.campaign")}</TableHead>
              <TableHead>{t(locale, "marketingPage.typeCol")}</TableHead>
              <TableHead>{t(locale, "marketingPage.statusCol")}</TableHead>
              <TableHead>{t(locale, "marketingPage.reach")}</TableHead>
              <TableHead>{t(locale, "marketingPage.clicks")}</TableHead>
              <TableHead>{t(locale, "marketingPage.conversions")}</TableHead>
              <TableHead>{t(locale, "common.actions")}</TableHead>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => (
                <TableRow key={campaign.name}>
                  <TableCell>
                    <div>
                      <div className="font-medium text-gray-900">
                        {campaign.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {campaign.category}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {campaign.type}
                  </TableCell>
                  <TableCell>
                    <Badge variant={campaign.status}>{campaign.status}</Badge>
                  </TableCell>
                  <TableCell className="font-medium text-gray-900">
                    {campaign.reach.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-gray-900">
                    {campaign.clicks}
                  </TableCell>
                  <TableCell className="font-medium text-green-600">
                    {campaign.conversions}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <button className="text-gray-400 hover:text-gray-600">
                        👁️
                      </button>
                      <button className="text-gray-400 hover:text-gray-600">
                        ✏️
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Social Media Performance */}
          <Card>
            <h2 className="mb-6 text-lg font-semibold text-gray-900">
              {t(locale, "marketingPage.socialPerformance")}
            </h2>
            <div className="space-y-4">
              {socialPerformance.map((item) => (
                <div
                  key={item.platform}
                  className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                      <span className="text-lg">
                        {item.platform === "Instagram"
                          ? "📸"
                          : item.platform === "Facebook"
                            ? "👥"
                            : "🐦"}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {item.platform}
                      </div>
                      <div className="text-sm text-gray-500">
                        {item.followers} {t(locale, "marketingPage.followers")}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">
                      {item.engagement}
                    </div>
                    <div className="text-sm text-gray-500">{t(locale, "marketingPage.engagement")}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Quick Actions */}
          <Card>
            <h2 className="mb-6 text-lg font-semibold text-gray-900">
              {t(locale, "marketingPage.quickActions")}
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 text-left transition-colors hover:bg-gray-50"
                >
                  <span className="text-2xl">{action.icon}</span>
                  <span className="text-sm font-medium text-gray-900">
                    {action.label}
                  </span>
                </button>
              ))}
            </div>
          </Card>
        </div>
        </div>
      </div>
    </MainLayout>
  );
}
