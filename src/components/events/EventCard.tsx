import Link from "next/link";
import type { Event } from "@/types";
import { Badge } from "@/components/ui/Badge";
import {
  CalendarIcon,
  ChevronRightIcon,
  MapPinIcon,
  UsersIcon,
} from "@/components/icons";

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  return (
    <Link
      href={`/events/${event.id}`}
      className="group block overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="relative h-56 overflow-hidden">
        <img
          src={event.image}
          alt={event.title}
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950/80 via-gray-950/15 to-transparent" />
        <div className="absolute left-4 top-4 flex items-center gap-2">
          <Badge variant={event.status}>
            {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
          </Badge>
          {event.category && (
            <Badge
              variant="secondary"
              className="bg-white/85 text-gray-700 backdrop-blur"
            >
              {event.category}
            </Badge>
          )}
        </div>
        <div className="absolute inset-x-0 bottom-0 p-4">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-white/70">
                Event Snapshot
              </p>
              <h3 className="mt-1 truncate text-2xl font-semibold text-white">
                {event.title}
              </h3>
            </div>
            <div className="rounded-full bg-white/12 p-2 text-white backdrop-blur transition-transform group-hover:translate-x-1">
              <ChevronRightIcon className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-green-50 p-4">
            <div className="flex items-center gap-2 text-green-700">
              <UsersIcon className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                Checked In
              </span>
            </div>
            <p className="mt-3 text-2xl font-semibold text-gray-950">
              {event.attendeeCount.toLocaleString()}
            </p>
          </div>
          <div className="rounded-2xl bg-blue-50 p-4">
            <div className="flex items-center gap-2 text-blue-700">
              <CalendarIcon className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                Reservations
              </span>
            </div>
            <p className="mt-3 text-2xl font-semibold text-gray-950">
              {(event.reservationCount ?? 0).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex items-start gap-3 rounded-2xl border border-gray-100 px-4 py-3">
            <CalendarIcon className="mt-0.5 h-4 w-4 text-gray-400" />
            <div>
              <p className="font-medium text-gray-900">{event.date}</p>
              {event.minPrice && (
                <p className="text-xs text-gray-500">
                  Starting at {event.minPrice}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-gray-100 px-4 py-3">
            <MapPinIcon className="mt-0.5 h-4 w-4 text-gray-400" />
            <div>
              <p className="line-clamp-2 font-medium text-gray-900">{event.location}</p>
              {event.organizerName && (
                <p className="text-xs text-gray-500">Hosted by {event.organizerName}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
