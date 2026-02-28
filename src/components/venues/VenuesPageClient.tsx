"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { SearchBar } from "@/components/ui/SearchBar";
import { Button } from "@/components/ui/Button";
import { MapPinIcon } from "@/components/icons";
import type { Venue } from "@/types";

interface VenuesPageClientProps {
  venues: Venue[];
}

export function VenuesPageClient({ venues }: VenuesPageClientProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return venues;
    const q = search.toLowerCase();
    return venues.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        (v.address?.toLowerCase().includes(q) ?? false) ||
        (v.city?.toLowerCase().includes(q) ?? false) ||
        (v.region?.toLowerCase().includes(q) ?? false) ||
        (v.venueType?.toLowerCase().includes(q) ?? false),
    );
  }, [venues, search]);

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="flex items-center gap-4">
        <SearchBar
          placeholder="Search venues..."
          className="flex-1 max-w-md"
          value={search}
          onChange={setSearch}
        />
      </div>

      {/* Venues Grid */}
      {venues.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <MapPinIcon className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-gray-900">No venues yet</h3>
          <p className="mb-6 max-w-sm text-sm text-gray-500">
            Create your first venue to use it when creating events. You can add details like address, city, and type.
          </p>
          <Link href="/venues/create">
            <Button variant="primary" size="sm">+ Create Your First Venue</Button>
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-12 text-center text-gray-500">No venues match your search.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((venue) => (
            <Link
              key={venue.id}
              href={`/venues/${venue.id}`}
              className="group relative overflow-hidden rounded-lg bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                    <MapPinIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{venue.name}</h3>
                    {venue.venueType && (
                      <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        {venue.venueType}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-1.5 text-sm text-gray-600">
                {venue.address && <p>📍 {venue.address}</p>}
                <p>
                  🏙️{" "}
                  {[venue.city, venue.region, venue.countryCode].filter(Boolean).join(", ") || "No location set"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
