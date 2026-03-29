import Link from "next/link";
import Image from "next/image";
import type { Event } from "@/types";
import { CalendarIcon, MapPinIcon } from "@/components/icons";
import { t, type Locale } from "@/lib/i18n";

export function DiscoverEventCard({ event, locale }: { event: Event; locale: Locale }) {
  return (
    <Link
      href={`/discover/events/${event.id}`}
      className="group relative block overflow-hidden rounded-2xl border border-gray-100 bg-white transition-all hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-gray-100">
        <Image
          src={event.image}
          alt={event.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {event.isFree && (
            <span className="rounded-full bg-emerald-500 px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm">
              {t(locale, "common.free")}
            </span>
          )}
          {!event.isFree && event.minPrice && (
            <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-semibold text-gray-900 shadow-sm backdrop-blur-sm">
              {event.minPrice}
            </span>
          )}
        </div>
      </div>

      <div className="p-5">
        <h3 className="truncate text-base font-bold text-gray-900 group-hover:text-gray-700">
          {event.title}
        </h3>

        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-100">
              <CalendarIcon className="h-3.5 w-3.5 text-gray-500" />
            </div>
            <span>{event.date}</span>
          </div>
          {event.location && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                <MapPinIcon className="h-3.5 w-3.5 text-gray-500" />
              </div>
              <span className="truncate">{event.location}</span>
            </div>
          )}
        </div>

        {event.tags && event.tags.length > 0 && (
          <>
            <div className="my-3 border-t border-dashed border-gray-100" />
            <div className="flex flex-wrap gap-1.5">
              {event.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="absolute bottom-4 right-4 opacity-0 transition-opacity group-hover:opacity-100">
        <span className="text-sm text-gray-400">&rarr;</span>
      </div>
    </Link>
  );
}
