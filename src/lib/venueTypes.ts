// Venue categories. Must match the mobile app's VENUE_TYPES
// (goswing: components/filters/FiltersDrawer.tsx), which filters venues by
// exact value, e.g. "Bar". Stored as-is in venue.venueType.
export const VENUE_TYPES = [
  "Restaurant",
  "Brasserie",
  "Bistro",
  "Bar",
  "Pub",
  "Lounge",
  "Guinguette",
  "Taverne",
  "Rooftop",
  "Discothèque",
  "Club",
  "Cabaret",
] as const;

export type VenueType = (typeof VENUE_TYPES)[number];

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[\s_-]+/g, " ")
    .trim();
}

/** Older values saved by the previous onboarding/create forms. */
const LEGACY: Record<string, VenueType> = {
  nightclub: "Club",
  "night club": "Club",
  discotheque: "Discothèque",
  tavern: "Taverne",
  "rooftop bar": "Rooftop",
};

/**
 * Map a stored venueType to one of VENUE_TYPES (case/accent-insensitive,
 * e.g. "bar" -> "Bar"). Returns null when empty or not a known category.
 */
export function toVenueType(raw: string | null | undefined): VenueType | null {
  if (!raw) return null;
  const key = fold(raw);
  if (!key) return null;
  return VENUE_TYPES.find((type) => fold(type) === key) ?? LEGACY[key] ?? null;
}

/** Label to display for a stored venueType. */
export function formatVenueType(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const known = toVenueType(raw);
  if (known) return known;
  const text = raw.replace(/_/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Options for a <Select>, keeping an unknown current value selectable. */
export function venueTypeOptions(
  placeholder: string,
  current?: string | null,
): Array<{ value: string; label: string }> {
  const options = [
    { value: "", label: placeholder },
    ...VENUE_TYPES.map((type) => ({ value: type, label: type })),
  ];
  if (current && !toVenueType(current)) {
    options.push({ value: current, label: formatVenueType(current) ?? current });
  }
  return options;
}
