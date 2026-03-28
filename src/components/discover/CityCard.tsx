import Link from "next/link";
import { CalendarIcon, BuildingIcon } from "@/components/icons";
import { t, type Locale } from "@/lib/i18n";
import type { CityInfo } from "@/lib/data/discover";

export function CityCard({ city, locale }: { city: CityInfo; locale: Locale }) {
  return (
    <Link
      href={`/discover/cities/${encodeURIComponent(city.city)}`}
      className="group relative block overflow-hidden rounded-2xl border border-gray-100 bg-white transition-all hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="h-1.5 bg-gray-900" />

      <div className="p-5">
        <h3 className="truncate text-base font-bold text-gray-900 group-hover:text-gray-700">
          {city.city}
        </h3>
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-gray-900" />
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            {t(locale, "common.city")}
          </span>
        </div>

        <div className="my-4 border-t border-dashed border-gray-100" />

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <CalendarIcon className="h-4 w-4 shrink-0 text-gray-400" />
            <span>
              <span className="font-semibold text-gray-900">
                {city.eventCount}
              </span>{" "}
              {city.eventCount === 1 ? t(locale, "common.event") : t(locale, "common.events")}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <BuildingIcon className="h-4 w-4 shrink-0 text-gray-400" />
            <span>
              <span className="font-semibold text-gray-900">
                {city.venueCount}
              </span>{" "}
              {city.venueCount === 1 ? t(locale, "common.venue") : t(locale, "common.venues")}
            </span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 right-4 opacity-0 transition-opacity group-hover:opacity-100">
        <span className="text-sm text-gray-400">&rarr;</span>
      </div>
    </Link>
  );
}
