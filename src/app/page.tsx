import {
  getFeaturedEvents,
  getPublishedEvents,
  getPublishedVenues,
  getPublicTags,
  getCitiesWithCounts,
} from "@/lib/data/discover";
import { DiscoverHeader } from "@/components/discover/DiscoverHeader";
import { Footer } from "@/components/layout/Footer";
import { HeroSlider } from "@/components/discover/HeroSlider";
import { FeaturedEvents } from "@/components/discover/FeaturedEvents";
import { FeaturedVenues } from "@/components/discover/FeaturedVenues";
import { FeaturedCities } from "@/components/discover/FeaturedCities";
import { SlideablePills } from "@/components/discover/SlideablePills";
import { AppDownloadSection } from "@/components/discover/AppDownloadSection";
import { BlogSection } from "@/components/discover/BlogSection";
import { MusicIcon, BuildingIcon } from "@/components/icons";
import { getLocale, t } from "@/lib/i18n";
import Link from "next/link";
import type { ComponentType, SVGProps } from "react";

export const dynamic = "force-dynamic";

function PillSectionHeader({
  icon: Icon,
  eyebrow,
  title,
  viewAllHref,
  viewAllLabel,
}: {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  eyebrow: string;
  title: string;
  viewAllHref: string;
  viewAllLabel: string;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gray-950 text-white shadow-sm">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">
            {eyebrow}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-gray-950">{title}</h2>
        </div>
      </div>
      <Link
        href={viewAllHref}
        className="shrink-0 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-gray-900 hover:bg-gray-900 hover:text-white"
      >
        {viewAllLabel} &rarr;
      </Link>
    </div>
  );
}

export default async function HomePage() {
  const [heroEvents, allEvents, venues, partyTypes, venueTypes, cities] =
    await Promise.all([
      getFeaturedEvents(5),
      getPublishedEvents({ limit: 6 }),
      getPublishedVenues({ limit: 6 }),
      getPublicTags("party_type"),
      getPublicTags("category"),
      getCitiesWithCounts(),
    ]);

  const locale = await getLocale();
  const topCities = cities.slice(0, 6);

  return (
    <div className="flex min-h-screen flex-col bg-gray-50/50">
      <DiscoverHeader />
      <main className="flex-1">
        <HeroSlider events={heroEvents} />

        <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6">
          {(partyTypes.length > 0 || venueTypes.length > 0) && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {partyTypes.length > 0 && (
                <section className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100">
                  <PillSectionHeader
                    icon={MusicIcon}
                    eyebrow={t(locale, "home.categories")}
                    title={t(locale, "home.browseByPartyType")}
                    viewAllHref="/discover/categories/events"
                    viewAllLabel={t(locale, "common.viewAll")}
                  />
                  <SlideablePills
                    pills={partyTypes.map((tag) => ({
                      label: tag.label,
                      href: `/discover/events?party_type=${tag.slug}`,
                    }))}
                  />
                </section>
              )}
              {venueTypes.length > 0 && (
                <section className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100">
                  <PillSectionHeader
                    icon={BuildingIcon}
                    eyebrow={t(locale, "featured.venues")}
                    title={t(locale, "home.browseByVenueType")}
                    viewAllHref="/discover/categories/venues"
                    viewAllLabel={t(locale, "common.viewAll")}
                  />
                  <SlideablePills
                    pills={venueTypes.map((tag) => ({
                      label: tag.label,
                      href: `/discover/venues?venue_type=${tag.slug}`,
                    }))}
                  />
                </section>
              )}
            </div>
          )}

          <FeaturedEvents events={allEvents} />
          <FeaturedVenues venues={venues} />
          <FeaturedCities cities={topCities} />
          <AppDownloadSection />
          <BlogSection />
        </div>
      </main>
      <Footer />
    </div>
  );
}
