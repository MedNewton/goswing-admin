"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Event } from "@/types";
import { Badge } from "@/components/ui/Badge";
import {
  CalendarIcon,
  ChevronRightIcon,
  EditIcon,
  MapPinIcon,
  MusicIcon,
  StarIcon,
  UsersIcon,
} from "@/components/icons";
import { getClientLocale, translate } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n";

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  const [locale, setLocale] = useState<Locale>("fr");
  useEffect(() => { setLocale(getClientLocale()); }, []);

  return (
    <div className="group relative overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
      <Link href={`/events/${event.id}`} className="block">
        <div className="relative h-56 overflow-hidden">
          <Image
            src={event.image}
            alt={event.title}
            fill
            className="object-cover transition-transform group-hover:scale-105"
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
                  {translate(locale, "eventCard.snapshot")}
                </p>
                <h3 className="mt-1 truncate text-2xl font-semibold text-white">
                  {event.title}
                </h3>
              </div>
            </div>
          </div>
        </div>
      </Link>

      <div className="space-y-5 p-5">
        {/* 4-Metric Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-green-50 p-4">
            <div className="flex items-center gap-2 text-green-700">
              <UsersIcon className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                {translate(locale, "eventCard.checkedIn")}
              </span>
            </div>
            <p className="mt-3 text-2xl font-semibold text-gray-950">
              {(event.checkedInCount ?? event.attendeeCount).toLocaleString()}
            </p>
          </div>
          <div className="rounded-2xl bg-blue-50 p-4">
            <div className="flex items-center gap-2 text-blue-700">
              <CalendarIcon className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                {translate(locale, "eventCard.reservations")}
              </span>
            </div>
            <p className="mt-3 text-2xl font-semibold text-gray-950">
              {(event.reservationCount ?? 0).toLocaleString()}
            </p>
          </div>
          <div className="rounded-2xl bg-purple-50 p-4">
            <div className="flex items-center gap-2 text-purple-700">
              <MusicIcon className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                {translate(locale, "eventCard.songs")}
              </span>
            </div>
            <p className="mt-3 text-2xl font-semibold text-gray-950">
              {(event.songSuggestionsCount ?? 0).toLocaleString()}
            </p>
          </div>
          <div className="rounded-2xl bg-amber-50 p-4">
            <div className="flex items-center gap-2 text-amber-700">
              <StarIcon className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                {translate(locale, "eventCard.rating")}
              </span>
            </div>
            <p className="mt-3 text-2xl font-semibold text-gray-950">
              {event.reviewScore != null ? event.reviewScore.toFixed(1) : "—"}
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
                  {translate(locale, "eventCard.startingAt")} {event.minPrice}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-gray-100 px-4 py-3">
            <MapPinIcon className="mt-0.5 h-4 w-4 text-gray-400" />
            <div>
              <p className="line-clamp-2 font-medium text-gray-900">{event.location}</p>
              {event.organizerName && (
                <p className="text-xs text-gray-500">{translate(locale, "eventCard.hostedBy")} {event.organizerName}</p>
              )}
            </div>
          </div>
        </div>

        {/* Dual Action Icons */}
        <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
          <Link
            href={`/events/${event.id}`}
            className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
            title={translate(locale, "eventCard.viewEvent")}
          >
            <ChevronRightIcon className="h-5 w-5" />
          </Link>
          <Link
            href={`/events/${event.id}/edit`}
            className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
            title={translate(locale, "eventCard.editEvent")}
          >
            <EditIcon className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
