import { Suspense } from "react";
import { getPublishedEvents, getPublicTags, getCitiesWithCounts } from "@/lib/data/discover";
import { DiscoverEventCard } from "@/components/discover/DiscoverEventCard";
import { DiscoverFilters } from "@/components/discover/DiscoverFilters";
import { CalendarIcon, SearchIcon } from "@/components/icons";
import { getLocale, t } from "@/lib/i18n";
import type { ComponentType, SVGProps } from "react";

export const dynamic = "force-dynamic";

function PageHeader({ icon: Icon, eyebrow, title, description }: {
  icon: ComponentType<SVGProps<SVGSVGElement>>; eyebrow: string; title: string; description: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gray-950 text-white shadow-sm"><Icon className="h-5 w-5" /></div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">{eyebrow}</p>
        <h1 className="mt-1 text-2xl font-semibold text-gray-950">{title}</h1>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>
    </div>
  );
}

export default async function BrowseEventsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const { party_type, city, free } = params;
  const locale = await getLocale();

  const [events, partyTypes, citiesData] = await Promise.all([
    getPublishedEvents({ partyType: party_type, city, isFree: free === "true" }),
    getPublicTags("party_type"),
    getCitiesWithCounts(),
  ]);

  const filterOptions = partyTypes.map((tag) => ({ value: tag.slug, label: tag.label }));
  const cityNames = citiesData.map((c) => c.city);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100 sm:p-8">
        <PageHeader
          icon={CalendarIcon}
          eyebrow={t(locale, "browseEvents.eyebrow")}
          title={t(locale, "browseEvents.title")}
          description={t(locale, "browseEvents.description")}
        />
        <div className="mt-6">
          <Suspense fallback={null}>
            <DiscoverFilters
              filterKey="party_type"
              filterLabel={t(locale, "browseEvents.filterLabel")}
              filterOptions={filterOptions}
              cities={cityNames}
              showFreeToggle
              basePath="/discover/events"
            />
          </Suspense>
        </div>
        {events.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-gray-200 bg-gray-50 py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100"><SearchIcon className="h-5 w-5 text-gray-400" /></div>
            <p className="mt-4 font-medium text-gray-500">{t(locale, "browseEvents.noResults")}</p>
            {(party_type ?? city ?? free) && <p className="mt-1 text-sm text-gray-400">{t(locale, "common.tryAdjustingFilters")}</p>}
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (<DiscoverEventCard key={event.id} event={event} locale={locale} />))}
          </div>
        )}
      </div>
    </div>
  );
}
