import { MainLayout } from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/Card";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Settings sections
// ---------------------------------------------------------------------------

const SECTIONS = [
  {
    title: "Notifications",
    description:
      "Manage your email and push notification preferences for events, orders, and reviews.",
    href: "#",
    items: [
      "Email notifications for new orders",
      "Push notifications for event updates",
      "Weekly summary reports",
    ],
  },
  {
    title: "Security & Password",
    description:
      "Update your password and manage your account security settings.",
    href: "#",
    items: [
      "Change your password",
      "View recent login activity",
    ],
  },
  {
    title: "Two-Factor Authentication",
    description:
      "Add an extra layer of security to your account with 2FA.",
    href: "#",
    items: [
      "Authenticator app setup",
      "Backup recovery codes",
    ],
  },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function GeneralSettingsPage() {
  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your account preferences, security, and notifications.
        </p>
      </div>

      <div className="mx-auto max-w-3xl space-y-6">
        {SECTIONS.map((section) => (
          <Card key={section.title}>
            <h2 className="text-lg font-semibold text-gray-900">
              {section.title}
            </h2>
            <p className="mt-1 text-sm text-gray-500">{section.description}</p>
            <ul className="mt-4 space-y-2">
              {section.items.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2 text-sm text-gray-700"
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gray-300" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-gray-400">Coming soon</p>
          </Card>
        ))}

        {/* Delete Account */}
        <Card>
          <h2 className="text-lg font-semibold text-red-600">
            Delete Account
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Permanently delete your account, events, and all associated data.
            This action cannot be undone.
          </p>
          <div className="mt-4">
            <button
              type="button"
              disabled
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 opacity-60"
            >
              Delete My Account
            </button>
            <p className="mt-2 text-xs text-gray-400">Coming soon</p>
          </div>
        </Card>

        {/* Back link */}
        <div className="pb-4">
          <Link
            href="/settings"
            className="text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            &larr; Back to Profile
          </Link>
        </div>
      </div>
    </MainLayout>
  );
}
