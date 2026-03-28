import { Suspense } from "react";
import { getPublishedVenues, getPublicTags, getCitiesWithCounts } from "@/lib/data/discover";
import { DiscoverVenueCard } from "@/components/discover/DiscoverVenueCard";
import { DiscoverFilters } from "@/components/discover/DiscoverFilters";
import { BuildingIcon, SearchIcon } from "@/components/icons";
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

export default async function BrowseVenuesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const { venue_type, city } = params;
  const locale = await getLocale();

  const [venues, venueTypes, citiesData] = await Promise.all([
    getPublishedVenues({ venueType: venue_type, city }),
    getPublicTags("category"),
    getCitiesWithCounts(),
  ]);

  const filterOptions = venueTypes.map((tag) => ({ value: tag.slug, label: tag.label }));
  const cityNames = citiesData.map((c) => c.city);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100 sm:p-8">
        <PageHeader
          icon={BuildingIcon}
          eyebrow={t(locale, "browseVenues.eyebrow")}
          title={t(locale, "browseVenues.title")}
          description={t(locale, "browseVenues.description")}
        />
        <div className="mt-6">
          <Suspense fallback={null}>
            <DiscoverFilters
              filterKey="venue_type"
              filterLabel={t(locale, "browseVenues.filterLabel")}
              filterOptions={filterOptions}
              cities={cityNames}
              basePath="/discover/venues"
            />
          </Suspense>
        </div>
        {venues.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-gray-200 bg-gray-50 py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100"><SearchIcon className="h-5 w-5 text-gray-400" /></div>
            <p className="mt-4 font-medium text-gray-500">{t(locale, "browseVenues.noResults")}</p>
            {(venue_type ?? city) && <p className="mt-1 text-sm text-gray-400">{t(locale, "common.tryAdjustingFilters")}</p>}
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {venues.map((venue) => (<DiscoverVenueCard key={venue.id} venue={venue} locale={locale} />))}
          </div>
        )}
      </div>
    </div>
  );
}
