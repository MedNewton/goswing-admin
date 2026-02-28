"use client";

import type { Venue } from "@/types";
import {
  BuildingIcon,
  ChevronRightIcon,
  MapPinIcon,
  MoreIcon,
} from "@/components/icons";
import { Badge } from "@/components/ui/Badge";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface VenueCardProps {
  venue: Venue;
  onEdit?: (venue: Venue) => void;
  onDelete?: (venue: Venue) => void;
}

export function VenueCard({ venue, onEdit, onDelete }: VenueCardProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleCardClick = () => {
    router.push(`/venues/${venue.id}`);
  };

  const locationParts = [venue.city, venue.region, venue.countryCode].filter(Boolean);
  const locationString = locationParts.length > 0 ? locationParts.join(", ") : "No location set";
  const hasCoordinates = venue.lat != null && venue.lng != null;
  const venueTypeLabel = venue.venueType ? venue.venueType.replace(/_/g, " ") : null;

  return (
    <div
      className="group relative cursor-pointer overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
      onClick={handleCardClick}
    >
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-800 to-teal-700 p-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),_transparent_34%),radial-gradient(circle_at_bottom_left,_rgba(45,212,191,0.28),_transparent_36%)]" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/12 text-white backdrop-blur">
                <BuildingIcon className="h-5 w-5" />
              </div>
              {venueTypeLabel && (
                <Badge
                  variant="secondary"
                  className="bg-white/85 text-gray-700 backdrop-blur"
                >
                  {venueTypeLabel}
                </Badge>
              )}
            </div>
            <h3 className="mt-4 truncate text-2xl font-semibold text-white">
              {venue.name}
            </h3>
            <p className="mt-1 text-sm text-white/70">
              Venue Profile
            </p>
          </div>
          <div className="relative">
            {onEdit || onDelete ? (
              <>
                <button
                  className="rounded-full bg-white/12 p-2 text-white backdrop-blur transition-colors hover:bg-white/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen((open) => !open);
                  }}
                >
                  <MoreIcon className="h-5 w-5" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-12 z-10 w-32 rounded-2xl border border-gray-200 bg-white py-1 shadow-lg">
                    {onEdit && (
                      <button
                        className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpen(false);
                          onEdit(venue);
                        }}
                      >
                        Edit
                      </button>
                    )}
                    {onDelete && (
                      <button
                        className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpen(false);
                          onDelete(venue);
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-full bg-white/12 p-2 text-white backdrop-blur transition-transform group-hover:translate-x-1">
                <ChevronRightIcon className="h-5 w-5" />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-emerald-50 p-4">
            <div className="flex items-center gap-2 text-emerald-700">
              <MapPinIcon className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                Location
              </span>
            </div>
            <p className="mt-3 line-clamp-2 text-sm font-semibold text-gray-950">
              {locationString}
            </p>
          </div>
          <div className="rounded-2xl bg-sky-50 p-4">
            <div className="flex items-center gap-2 text-sky-700">
              <BuildingIcon className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                Geo Status
              </span>
            </div>
            <p className="mt-3 text-sm font-semibold text-gray-950">
              {hasCoordinates ? "Coordinates set" : "Map pending"}
            </p>
          </div>
        </div>

        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex items-start gap-3 rounded-2xl border border-gray-100 px-4 py-3">
            <MapPinIcon className="mt-0.5 h-4 w-4 text-gray-400" />
            <div>
              <p className="font-medium text-gray-900">
                {venue.address ?? "No street address set"}
              </p>
              <p className="text-xs text-gray-500">
                {locationString}
              </p>
            </div>
          </div>

          {hasCoordinates && (
            <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-3 text-xs text-gray-500">
              {venue.lat}, {venue.lng}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
