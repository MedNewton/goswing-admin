import Link from "next/link";
import type { Event } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { MoreIcon } from "@/components/icons";

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  return (
    <Link
      href={`/events/${event.id}`}
      className="group block overflow-hidden rounded-lg bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      {/* Event Image */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={event.image}
          alt={event.title}
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
        />
        <div className="absolute right-2 top-2">
          <Badge variant={event.status}>
            {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
          </Badge>
        </div>
      </div>

      {/* Event Details */}
      <div className="p-4">
        <div className="mb-2 flex items-start justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{event.title}</h3>
          <button className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <MoreIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-1 text-sm text-gray-600">
          <p>📅 {event.date}</p>
          <p>📍 {event.location}</p>
          <p className="font-medium text-gray-900">
            {event.attendeeCount.toLocaleString()} attendees
          </p>
        </div>
      </div>
    </Link>
  );
}
