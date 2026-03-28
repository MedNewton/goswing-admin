import Link from "next/link";
import type { Venue } from "@/types";
import { MapPinIcon, UsersIcon } from "@/components/icons";
import { t, type Locale } from "@/lib/i18n";

const ACCENT_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  club: { bg: "bg-violet-50", text: "text-violet-700", dot: "bg-violet-400" },
  nightclub: { bg: "bg-violet-50", text: "text-violet-700", dot: "bg-violet-400" },
  bar: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  lounge: { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-400" },
  restaurant: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-400" },
  rooftop: { bg: "bg-sky-50", text: "text-sky-700", dot: "bg-sky-400" },
  "beach club": { bg: "bg-cyan-50", text: "text-cyan-700", dot: "bg-cyan-400" },
  "concert hall": { bg: "bg-indigo-50", text: "text-indigo-700", dot: "bg-indigo-400" },
  pub: { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-400" },
  hotel: { bg: "bg-pink-50", text: "text-pink-700", dot: "bg-pink-400" },
};

const DEFAULT_ACCENT = { bg: "bg-gray-50", text: "text-gray-700", dot: "bg-gray-400" };

function getAccent(venueType: string | null | undefined) {
  if (!venueType) return DEFAULT_ACCENT;
  const key = venueType.toLowerCase().replace(/-/g, " ").replace(/_/g, " ");
  for (const [k, v] of Object.entries(ACCENT_COLORS)) {
    if (key.includes(k)) return v;
  }
  return DEFAULT_ACCENT;
}

export function DiscoverVenueCard({ venue, locale }: { venue: Venue; locale: Locale }) {
  const location = [venue.city, venue.region].filter(Boolean).join(", ");
  const accent = getAccent(venue.venueType);

  return (
    <Link
      href={`/discover/venues/${venue.id}`}
      className="group relative block overflow-hidden rounded-2xl border border-gray-100 bg-white transition-all hover:-translate-y-1 hover:shadow-lg"
    >
      <div className={`h-1.5 ${accent.dot}`} />

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-bold text-gray-900 group-hover:text-gray-700">
              {venue.name}
            </h3>
            {venue.venueType && (
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${accent.dot}`} />
                <span
                  className={`text-xs font-semibold uppercase tracking-wider ${accent.text}`}
                >
                  {venue.venueType}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="my-4 border-t border-dashed border-gray-100" />

        <div className="space-y-2">
          {location && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPinIcon className="h-4 w-4 shrink-0 text-gray-400" />
              <span className="truncate">{location}</span>
            </div>
          )}
          {venue.address && (
            <p className="truncate pl-6 text-xs text-gray-400">
              {venue.address}
            </p>
          )}
        </div>

        {venue.capacity && (
          <div className="mt-4 flex items-center gap-1.5 rounded-lg bg-gray-50 px-3 py-2">
            <UsersIcon className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-xs font-medium text-gray-600">
              {t(locale, "common.capacity")} {venue.capacity.toLocaleString()}
            </span>
          </div>
        )}
      </div>

      <div className="absolute bottom-4 right-4 opacity-0 transition-opacity group-hover:opacity-100">
        <span className="text-sm text-gray-400">&rarr;</span>
      </div>
    </Link>
  );
}
