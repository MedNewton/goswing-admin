import { getCityData } from "@/lib/data/discover";
import { DiscoverEventCard } from "@/components/discover/DiscoverEventCard";
import { DiscoverVenueCard } from "@/components/discover/DiscoverVenueCard";
import { MapPinIcon, CalendarIcon, BuildingIcon, SearchIcon } from "@/components/icons";
import { getLocale, t } from "@/lib/i18n";
import Link from "next/link";
import type { ComponentType, SVGProps } from "react";

export const dynamic = "force-dynamic";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

function SectionHeader({
  icon: Icon,
  eyebrow,
  title,
  description,
}: {
  icon: IconComponent;
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gray-950 text-white shadow-sm">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-xl font-semibold text-gray-950">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: IconComponent;
  label: string;
  value: string;
  tone: "emerald" | "sky" | "amber";
}) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-700",
    sky: "bg-sky-50 text-sky-700",
    amber: "bg-amber-50 text-amber-700",
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
      <div
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 ${tones[tone]}`}
      >
        <Icon className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-[0.18em]">
          {label}
        </span>
      </div>
      <p className="mt-4 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

export default async function CityDetailPage({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const locale = await getLocale();
  const { city: citySlug } = await params;
  const cityName = decodeURIComponent(citySlug);
  const { events, venues } = await getCityData(cityName);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* Back link */}
      <div className="mb-4">
        <Link
          href="/discover/cities"
          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:bg-white hover:text-gray-700"
        >
          &larr; {t(locale, "cities.allCities")}
        </Link>
      </div>

      {/* Hero */}
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 shadow-xl shadow-gray-200">
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-teal-800">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.08),_transparent_40%),radial-gradient(circle_at_bottom_left,_rgba(45,212,191,0.12),_transparent_40%)]" />

          {/* Text content */}
          <div className="relative px-6 pt-10 pb-8 sm:px-8 sm:pt-14">
            <span className="inline-flex items-center rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-gray-700 backdrop-blur">
              {t(locale, "common.city")}
            </span>
            <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {cityName}
            </h1>
            <p className="mt-3 flex items-center gap-1.5 text-sm text-slate-300">
              <MapPinIcon className="h-4 w-4 text-slate-400" />
              {events.length} {events.length === 1 ? t(locale, "common.event") : t(locale, "common.events")} &middot;{" "}
              {venues.length} {venues.length === 1 ? t(locale, "common.venue") : t(locale, "common.venues")}
            </p>
          </div>

          {/* Metric strip */}
          <div className="relative px-6 pb-6 sm:px-8">
            <div className="grid gap-4 sm:grid-cols-2">
            <MetricCard
              icon={CalendarIcon}
              label={t(locale, "common.events")}
              value={events.length.toString()}
              tone="sky"
            />
            <MetricCard
              icon={BuildingIcon}
              label={t(locale, "common.venues")}
              value={venues.length.toString()}
              tone="emerald"
            />
          </div>
          </div>
        </div>
      </section>

      {/* Events section */}
      <div className="mt-6 rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100 sm:p-8">
        <SectionHeader
          icon={CalendarIcon}
          eyebrow={t(locale, "cityDetail.whatsOn")}
          title={`${t(locale, "cityDetail.eventsIn")} ${cityName}`}
          description={t(locale, "cityDetail.eventsInDesc")}
        />
        {events.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-gray-200 bg-gray-50 py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
              <SearchIcon className="h-5 w-5 text-gray-400" />
            </div>
            <p className="mt-4 font-medium text-gray-500">
              {t(locale, "cityDetail.noEvents")}
            </p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <DiscoverEventCard key={event.id} event={event} locale={locale} />
            ))}
          </div>
        )}
      </div>

      {/* Venues section */}
      <div className="mt-6 rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100 sm:p-8">
        <SectionHeader
          icon={BuildingIcon}
          eyebrow={t(locale, "cityDetail.establishments")}
          title={`${t(locale, "cityDetail.venuesIn")} ${cityName}`}
          description={t(locale, "cityDetail.venuesInDesc")}
        />
        {venues.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-gray-200 bg-gray-50 py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
              <SearchIcon className="h-5 w-5 text-gray-400" />
            </div>
            <p className="mt-4 font-medium text-gray-500">
              {t(locale, "cityDetail.noVenues")}
            </p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {venues.map((venue) => (
              <DiscoverVenueCard key={venue.id} venue={venue} locale={locale} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
