"use client";

import { useState } from "react";
import Link from "next/link";
import { EventCard } from "@/components/events/EventCard";
import { EventCalendar } from "@/components/events/EventCalendar";
import { SearchBar } from "@/components/ui/SearchBar";
import { Button } from "@/components/ui/Button";
import type { Event } from "@/types";

interface EventsPageClientProps {
  events: Event[];
}

type ViewMode = "list" | "calendar";
type StatusFilter = "all" | "published" | "draft" | "completed" | "cancelled";
type SortBy = "date" | "attendees" | "rating" | "title";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All Status" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "date", label: "Date" },
  { value: "attendees", label: "Attendees" },
  { value: "rating", label: "Rating" },
  { value: "title", label: "Title" },
];

export function EventsPageClient({ events }: EventsPageClientProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("date");

  // Filter and sort events
  const filteredEvents = events
    .filter((event) => {
      if (statusFilter !== "all" && event.status !== statusFilter) return false;
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        event.title.toLowerCase().includes(query) ||
        event.location.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "attendees":
          return (b.attendeeCount ?? 0) - (a.attendeeCount ?? 0);
        case "rating":
          return (b.reviewScore ?? 0) - (a.reviewScore ?? 0);
        case "title":
          return a.title.localeCompare(b.title);
        case "date":
        default:
          return (b.startsAt ?? b.date).localeCompare(a.startsAt ?? a.date);
      }
    });

  return (
    <div className="space-y-6">
      {/* Search, Filters, and View Toggle */}
      <div className="flex flex-wrap items-center gap-4">
        <SearchBar
          placeholder="Search events..."
          className="flex-1 max-w-md"
          value={searchQuery}
          onChange={setSearchQuery}
        />

        {/* Status Dropdown */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Sort Dropdown */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              Sort: {opt.label}
            </option>
          ))}
        </select>

        {/* View Toggle */}
        <div className="ml-auto flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
          <button
            onClick={() => setViewMode("list")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              viewMode === "list"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            List
          </button>
          <button
            onClick={() => setViewMode("calendar")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              viewMode === "calendar"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Calendar
          </button>
        </div>
      </div>

      {/* Content based on view mode */}
      {filteredEvents.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-gray-500">
            {searchQuery || statusFilter !== "all"
              ? "No events match your filters."
              : "No events found. Create your first event to get started."}
          </p>
          {!searchQuery && statusFilter === "all" && (
            <Link href="/events/create">
              <Button variant="primary" className="mt-4">
                Create Event
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
