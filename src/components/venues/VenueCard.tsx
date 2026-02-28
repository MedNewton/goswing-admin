"use client";

import type { Venue } from "@/types";
import { MoreIcon, MapPinIcon } from "@/components/icons";
import { Badge } from "@/components/ui/Badge";
import { useRouter } from "next/navigation";

interface VenueCardProps {
  venue: Venue;
  onEdit?: (venue: Venue) => void;
  onDelete?: (venue: Venue) => void;
}

export function VenueCard({ venue, onEdit, onDelete }: VenueCardProps) {
  const router = useRouter();

  const handleCardClick = () => {
    router.push(`/venues/${venue.id}`);
  };

  const locationParts = [venue.city, venue.region, venue.countryCode].filter(Boolean);
  const locationString = locationParts.length > 0 ? locationParts.join(", ") : "No location set";

  return (
    <div
      className="group relative cursor-pointer overflow-hidden rounded-lg bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
      onClick={handleCardClick}
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
            <MapPinIcon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{venue.name}</h3>
            {venue.venueType && (
              <Badge variant="draft">{venue.venueType}</Badge>
            )}
          </div>
        </div>
        <div className="relative">
          <button
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            onClick={(e) => {
              e.stopPropagation();
              // Simple toggle for actions
              const menu = e.currentTarget.nextElementSibling;
              if (menu) menu.classList.toggle("hidden");
            }}
          >
            <MoreIcon className="h-5 w-5" />
          </button>
          <div className="absolute right-0 top-8 z-10 hidden w-32 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
            {onEdit && (
              <button
                className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                onClick={(e) => {
                  e.stopPropagation();
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
                  onDelete(venue);
                }}
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-1.5 text-sm text-gray-600">
        {venue.address && <p>📍 {venue.address}</p>}
        <p>🏙️ {locationString}</p>
      </div>
    </div>
  );
}
