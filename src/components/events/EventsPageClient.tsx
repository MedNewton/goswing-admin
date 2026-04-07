"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { EventCard } from "@/components/events/EventCard";
import { EventCalendar } from "@/components/events/EventCalendar";
import { SearchBar } from "@/components/ui/SearchBar";
import { Button } from "@/components/ui/Button";
import type { Event } from "@/types";
import { getClientLocale, translate } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n";

interface EventsPageClientProps {
  events: Event[];
}

type ViewMode = "list" | "calendar";
type StatusFilter = "all" | "published" | "draft" | "completed" | "cancelled" | "live";
type SortBy = "date_desc" | "date_asc" | "attendees_desc" | "attendees_asc" | "review_desc" | "review_asc" | "title";

const STATUS_OPTIONS: { value: StatusFilter; labelKey: string }[] = [
  { value: "all", labelKey: "eventsPage.allStatus" },
  { value: "live", labelKey: "eventsPage.statusLive" },
  { value: "published", labelKey: "common.published" },
  { value: "draft", labelKey: "common.draft" },
  { value: "completed", labelKey: "common.completed" },
  { value: "cancelled", labelKey: "common.cancelled" },
];

const SORT_OPTIONS: { value: SortBy; labelKey: string }[] = [
  { value: "date_desc", labelKey: "eventsPage.sortDateDesc" },
  { value: "date_asc", labelKey: "eventsPage.sortDateAsc" },
  { value: "attendees_desc", labelKey: "eventsPage.sortAttendeesDesc" },
  { value: "attendees_asc", labelKey: "eventsPage.sortAttendeesAsc" },
  { value: "review_desc", labelKey: "eventsPage.sortReviewDesc" },
  { value: "review_asc", labelKey: "eventsPage.sortReviewAsc" },
  { value: "title", labelKey: "eventsPage.sortTitle" },
];

export function EventsPageClient({ events }: EventsPageClientProps) {
  const [locale, setLocale] = useState<Locale>("fr");
  useEffect(() => { setLocale(getClientLocale()); }, []);

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("date_desc");
  const [partyTypeFilter, setPartyTypeFilter] = useState<string>("all");

  // Extract unique party types from events
  const partyTypes = useMemo(() => {
    const types = new Set<string>();
    for (const event of events) {
      for (const pt of event.partyTypes ?? []) {
        types.add(pt);
      }
    }
    return Array.from(types).sort();
  }, [events]);

  // Filter and sort events
  const filteredEvents = events
    .filter((event) => {
      if (statusFilter !== "all" && event.status !== statusFilter) return false;
      if (partyTypeFilter !== "all" && !(event.partyTypes ?? []).includes(partyTypeFilter)) return false;
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        event.title.toLowerCase().includes(query) ||
        event.location.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "date_asc":
          return (a.startsAt ?? a.date).localeCompare(b.startsAt ?? b.date);
        case "attendees_desc":
          return (b.attendeeCount ?? 0) - (a.attendeeCount ?? 0);
        case "attendees_asc":
          return (a.attendeeCount ?? 0) - (b.attendeeCount ?? 0);
        case "review_desc":
          return (b.reviewScore ?? 0) - (a.reviewScore ?? 0);
        case "review_asc":
          return (a.reviewScore ?? 0) - (b.reviewScore ?? 0);
        case "title":
          return a.title.localeCompare(b.title);
        case "date_desc":
        default:
          return (b.startsAt ?? b.date).localeCompare(a.startsAt ?? a.date);
      }
    });

  return (
    <div className="space-y-6">
      {/* Layout: toggle left, search stretched, filters right */}
      <div className="flex flex-wrap items-center gap-3">
        {/* View Toggle — left */}
        <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
          <button
            onClick={() => setViewMode("list")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              viewMode === "list"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {translate(locale, "eventsPage.listView")}
          </button>
          <button
            onClick={() => setViewMode("calendar")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              viewMode === "calendar"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {translate(locale, "eventsPage.calendarView")}
          </button>
        </div>

        {/* Search — stretched between */}
        <SearchBar
          placeholder={translate(locale, "eventsPage.searchPlaceholder")}
          className="min-w-0 flex-1"
          value={searchQuery}
          onChange={setSearchQuery}
        />

        {/* Filters — right */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {translate(locale, opt.labelKey as Parameters<typeof translate>[1])}
              </option>
            ))}
          </select>

          {/* Party Type Filter */}
          {partyTypes.length > 0 && (
            <select
              value={partyTypeFilter}
              onChange={(e) => setPartyTypeFilter(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            >
              <option value="all">{translate(locale, "eventsPage.allPartyTypes")}</option>
              {partyTypes.map((pt) => (
                <option key={pt} value={pt}>{pt}</option>
              ))}
            </select>
          )}

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {translate(locale, "eventsPage.sortPrefix")} {translate(locale, opt.labelKey as Parameters<typeof translate>[1])}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content based on view mode */}
      {filteredEvents.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-gray-500">
            {searchQuery || statusFilter !== "all" || partyTypeFilter !== "all"
              ? translate(locale, "eventsPage.noMatchingEvents")
              : `${translate(locale, "eventsPage.noEvents")}. ${translate(locale, "eventsPage.noEventsDesc")}`}
          </p>
          {!searchQuery && statusFilter === "all" && partyTypeFilter === "all" && (
            <Link href="/events/create">
              <Button variant="primary" className="mt-4">
                {translate(locale, "eventsPage.createFirst")}
              </Button>
            </Link>
          )}
        </div>
      ) : viewMode === "list" ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <EventCalendar events={filteredEvents} />
      )}
    </div>
  );
}
