import { MainLayout } from "@/components/layout/MainLayout";
import { getVenues } from "@/lib/data/venues";
import { VenuesPageClient } from "@/components/venues/VenuesPageClient";
import { getLocale, t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function VenuesPage() {
  const locale = await getLocale();
  let venues: Awaited<ReturnType<typeof getVenues>> = [];

  try {
    venues = await getVenues();
  } catch {
    // Will show empty state
  }

  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">{t(locale, "venuesPage.title")}</h1>
      </div>
      <VenuesPageClient venues={venues} />
    </MainLayout>
  );
}
