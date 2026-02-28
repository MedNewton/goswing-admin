"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { SearchBar } from "@/components/ui/SearchBar";
import { Button } from "@/components/ui/Button";
import { MapPinIcon } from "@/components/icons";
import { VenueCard } from "@/components/venues/VenueCard";
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
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((venue) => (
            <VenueCard key={venue.id} venue={venue} />
          ))}
        </div>
      )}
    </div>
  );
}
