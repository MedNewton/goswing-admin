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

export function EventsPageClient({ events }: EventsPageClientProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [searchQuery, setSearchQuery] = useState("");

  // Filter events based on search query
  const filteredEvents = events.filter((event) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      event.title.toLowerCase().includes(query) ||
      event.location.toLowerCase().includes(query) ||
      event.status.toLowerCase().includes(query)
    );
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
        <Button variant="outline">All Status</Button>
        <Button variant="outline">More Filters</Button>

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
            📋 List
          </button>
          <button
            onClick={() => setViewMode("calendar")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              viewMode === "calendar"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            📅 Calendar
          </button>
        </div>
      </div>

      {/* Content based on view mode */}
      {filteredEvents.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-gray-500">
            {searchQuery
              ? "No events match your search."
              : "No events found. Create your first event to get started."}
          </p>
          {!searchQuery && (
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
