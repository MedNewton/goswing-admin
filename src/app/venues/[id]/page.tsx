"use client";

import { MainLayout } from "@/components/layout/MainLayout";
import {
  BuildingIcon,
  CalendarIcon,
  UsersIcon,
  StarIcon,
  MapPinIcon,
  ShareIcon,
  ImageIcon,
  HeartIcon,
  LinkIcon,
  TagIcon,
  ExternalLinkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EditIcon,
  EyeIcon,
  GlobeIcon,
  MusicIcon,
} from "@/components/icons";
import { Badge } from "@/components/ui/Badge";
import { useState, useEffect, use, type ComponentType, type SVGProps } from "react";
import { fetchVenue } from "@/lib/actions/venues";
import {
  fetchVenueStats,
  fetchVenueOrganizer,
  fetchVenueEvents,
  fetchSimilarVenues,
  fetchVenueReviewsWithStats,
  fetchOrganizerGallery,
  fetchOrganizerTags,
  type VenueEventItem,
  type SimilarVenueItem,
  type TagItem,
} from "@/lib/actions/venueDetail";
import type { VenueStats, VenueOrganizer } from "@/lib/data/venueStats";
import type { Venue, GalleryItem, VenueReview } from "@/types";
import { getClientLocale, translate } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

function SectionHeader({
  icon: Icon,
  eyebrow,
  title,
  description,
}: {
  icon: IconComponent;
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gray-950 text-white shadow-sm">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-xl font-semibold text-gray-950">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        )}
      </div>
    </div>
  );
}

const cardClass =
  "rounded-[2rem] border border-gray-200/80 bg-gradient-to-br from-white via-white to-slate-50 shadow-lg shadow-gray-100";

function StarRating({ score, max = 5 }: { score: number; max?: number }) {
  const stars = [];
  for (let i = 1; i <= max; i++) {
    stars.push(
      <StarIcon
        key={i}
        className={`h-5 w-5 ${i <= Math.round(score) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
      />,
    );
  }
  return <div className="flex items-center gap-0.5">{stars}</div>;
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function VenueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [locale, setLocale] = useState<Locale>("fr");
  useEffect(() => {
    setLocale(getClientLocale());
  }, []);
  // Cast to allow keys that may not exist in the translation file yet;
  // translate() returns the key itself as fallback.
  const t = (key: string) => translate(locale, key as Parameters<typeof translate>[1]);

  // Data state
  const [venue, setVenue] = useState<Venue | null>(null);
  const [stats, setStats] = useState<VenueStats | null>(null);
  const [organizer, setOrganizer] = useState<VenueOrganizer | null>(null);
  const [events, setEvents] = useState<{
    live: VenueEventItem[];
    upcoming: VenueEventItem[];
    past: VenueEventItem[];
  } | null>(null);
  const [similarVenues, setSimilarVenues] = useState<SimilarVenueItem[]>([]);
  const [reviewData, setReviewData] = useState<{
    reviews: VenueReview[];
    stats: { count: number; average: number; distribution: Record<number, number> };
  } | null>(null);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Gallery carousel state
  const [galleryIndex, setGalleryIndex] = useState(0);

  // Load all data
  useEffect(() => {
    async function load() {
      try {
        const venueData = await fetchVenue(id);
        setVenue(venueData);

        // Fetch remaining data in parallel
        const promises = await Promise.allSettled([
          fetchVenueStats(id, venueData.organizerId),
          venueData.organizerId
            ? fetchVenueOrganizer(venueData.organizerId)
            : Promise.resolve(null),
          fetchVenueEvents(id),
          fetchSimilarVenues(id, venueData.city),
          fetchVenueReviewsWithStats(id),
          venueData.organizerId
            ? fetchOrganizerGallery(venueData.organizerId)
            : Promise.resolve([]),
          venueData.organizerId
            ? fetchOrganizerTags(venueData.organizerId)
            : Promise.resolve([]),
        ]);

        if (promises[0].status === "fulfilled") setStats(promises[0].value);
        if (promises[1].status === "fulfilled") setOrganizer(promises[1].value);
        if (promises[2].status === "fulfilled") {
          setEvents(promises[2].value);
        }
        if (promises[3].status === "fulfilled") setSimilarVenues(promises[3].value);
        if (promises[4].status === "fulfilled") {
          setReviewData(promises[4].value);
        }
        if (promises[5].status === "fulfilled") setGallery(promises[5].value);
        if (promises[6].status === "fulfilled") setTags(promises[6].value);
      } catch {
        setError("Failed to load venue.");
      } finally {
        setIsLoading(false);
      }
    }
    void load();
  }, [id]);

  // ---------------------------------------------------------------------------
  // Loading / Error states
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex h-96 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900" />
        </div>
      </MainLayout>
    );
  }

  if (error || !venue) {
    return (
      <MainLayout>
        <div className="flex h-96 flex-col items-center justify-center gap-4">
          <p className="text-lg font-semibold text-gray-700">
            {error ?? "Venue not found"}
          </p>
          <Link
            href="/venues"
            className="text-sm font-medium text-gray-500 hover:text-gray-900 underline"
          >
            Back to venues
          </Link>
        </div>
      </MainLayout>
    );
  }

  // Derived data
  const coverUrl = organizer?.coverImageUrl;
  const categoryTags = tags.filter((t) => t.type === "category");
  const partyTypeTags = tags.filter((t) => t.type === "party_type");
  const musicStyleTags = tags.filter((t) => t.type === "music_style");
  const extraServiceTags = tags.filter((t) => t.type === "extra_service");

  const socialLinks: Array<{ label: string; url: string; icon: IconComponent }> = [];
  if (organizer) {
    if (organizer.instagramHandle)
      socialLinks.push({
        label: "Instagram",
        url: `https://instagram.com/${organizer.instagramHandle}`,
        icon: LinkIcon,
      });
    if (organizer.facebookHandle)
      socialLinks.push({
        label: "Facebook",
        url: `https://facebook.com/${organizer.facebookHandle}`,
        icon: LinkIcon,
      });
    if (organizer.tiktokHandle)
      socialLinks.push({
        label: "TikTok",
        url: `https://tiktok.com/@${organizer.tiktokHandle}`,
        icon: LinkIcon,
      });
    if (organizer.snapchatHandle)
      socialLinks.push({
        label: "Snapchat",
        url: `https://snapchat.com/add/${organizer.snapchatHandle}`,
        icon: LinkIcon,
      });
    if (organizer.youtubeHandle)
      socialLinks.push({
        label: "YouTube",
        url: `https://youtube.com/${organizer.youtubeHandle}`,
        icon: LinkIcon,
      });
    if (organizer.twitterHandle)
      socialLinks.push({
        label: "Twitter / X",
        url: `https://x.com/${organizer.twitterHandle}`,
        icon: LinkIcon,
      });
    if (organizer.pinterestHandle)
      socialLinks.push({
        label: "Pinterest",
        url: `https://pinterest.com/${organizer.pinterestHandle}`,
        icon: LinkIcon,
      });
    if (organizer.googleBusinessUrl)
      socialLinks.push({
        label: "Google Business",
        url: organizer.googleBusinessUrl,
        icon: GlobeIcon,
      });
    if (organizer.websiteUrl)
      socialLinks.push({
        label: "Website",
        url: organizer.websiteUrl,
        icon: GlobeIcon,
      });
  }

  const addressParts = [venue.address, venue.city, venue.region, venue.countryCode].filter(Boolean);
  const fullAddress = addressParts.join(", ");

  const galleryPrev = () => setGalleryIndex((i) => (i > 0 ? i - 1 : gallery.length - 1));
  const galleryNext = () => setGalleryIndex((i) => (i < gallery.length - 1 ? i + 1 : 0));

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <MainLayout>
      <div className="space-y-8 py-2">
        {/* ----------------------------------------------------------------- */}
        {/* HEADER                                                            */}
        {/* ----------------------------------------------------------------- */}
        <div
          className="relative overflow-hidden rounded-[2rem] p-8 md:p-12"
          style={
            coverUrl
              ? {
                  backgroundImage: `url(${coverUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : undefined
          }
        >
          {/* Overlay */}
          <div
            className={`absolute inset-0 ${
              coverUrl
                ? "bg-black/60"
                : "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-950"
            }`}
          />

          {/* Content */}
          <div className="relative z-10">
            {/* Top actions */}
            <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
              <Link
                href="/venues"
                className="flex items-center gap-1.5 text-sm font-medium text-white/70 hover:text-white transition-colors"
              >
                <ChevronLeftIcon className="h-4 w-4" />
                {t("venues.title") || "Venues"}
              </Link>
              <div className="flex items-center gap-3">
                <Link
                  href={`/venues/${id}/guest`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm hover:bg-white/20 transition-colors"
                >
                  <EyeIcon className="h-4 w-4" />
                  View as Guest
                </Link>
                <Link
                  href={`/venues/${id}/edit`}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow-sm hover:bg-gray-100 transition-colors"
                >
                  <EditIcon className="h-4 w-4" />
                  Edit Venue
                </Link>
              </div>
            </div>

            {/* Venue name + type */}
            <div className="mb-8">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold text-white md:text-4xl">
                  {venue.name}
                </h1>
                {venue.venueType && (
                  <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                    {venue.venueType}
                  </span>
                )}
              </div>
              {fullAddress && (
                <p className="mt-2 flex items-center gap-1.5 text-sm text-white/70">
                  <MapPinIcon className="h-4 w-4" />
                  {fullAddress}
                </p>
              )}
            </div>

            {/* Stat subcards */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatSubcard
                icon={CalendarIcon}
                label={t("venueDetail.events") || "Events"}
                value={stats?.eventCount ?? 0}
              />
              <StatSubcard
                icon={UsersIcon}
                label={t("venueDetail.attendees") || "Attendees"}
                value={stats?.totalAttendees ?? 0}
              />
              <StatSubcard
                icon={StarIcon}
                label={t("venueDetail.reviewScore") || "Review Score"}
                value={stats?.reviewScore !== null && stats?.reviewScore !== undefined ? stats.reviewScore.toFixed(1) : "N/A"}
                suffix={stats?.reviewScore !== null && stats?.reviewScore !== undefined ? "/5" : undefined}
              />
              <StatSubcard
                icon={HeartIcon}
                label={t("venueDetail.followers") || "Followers"}
                value={stats?.followerCount ?? 0}
              />
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* ROW 1 — three medium cards                                        */}
        {/* ----------------------------------------------------------------- */}
        <div className="grid items-start gap-8 lg:grid-cols-3">
          {/* Description */}
          <div className={`${cardClass} p-8`}>
            <SectionHeader
              icon={BuildingIcon}
              eyebrow={t("venueDetail.about") || "About"}
              title={t("venueDetail.description") || "Description"}
            />
            <p className="mt-6 whitespace-pre-line text-sm leading-relaxed text-gray-600">
              {venue.description ?? organizer?.about ?? "No description available."}
            </p>
          </div>

          {/* Categories & Tags */}
          <div className={`${cardClass} p-8`}>
            <SectionHeader
              icon={TagIcon}
              eyebrow={t("venueDetail.overview") || "Overview"}
              title={t("venueDetail.categoriesAndTags") || "Categories & Tags"}
            />
            <div className="mt-6 space-y-5">
              {categoryTags.length > 0 && (
                <TagGroup label="Category" tags={categoryTags} />
              )}
              {partyTypeTags.length > 0 && (
                <TagGroup label="Party Types" tags={partyTypeTags} />
              )}
              {musicStyleTags.length > 0 && (
                <TagGroup label="Music Styles" tags={musicStyleTags} icon={MusicIcon} />
              )}
              {extraServiceTags.length > 0 && (
                <TagGroup label="Extra Services" tags={extraServiceTags} />
              )}
              {categoryTags.length === 0 &&
                partyTypeTags.length === 0 &&
                musicStyleTags.length === 0 &&
                extraServiceTags.length === 0 && (
                  <p className="text-sm text-gray-400">No tags configured.</p>
                )}
            </div>
          </div>

          {/* Reviews */}
          <div className={`${cardClass} p-8`}>
            <SectionHeader
              icon={StarIcon}
              eyebrow={t("venueDetail.reviews") || "Reviews"}
              title={t("venueDetail.rating") || "Rating"}
            />
            <div className="mt-6 flex items-center gap-4">
              <span className="text-5xl font-bold text-gray-900">
                {reviewData?.stats.average
                  ? reviewData.stats.average.toFixed(1)
                  : "N/A"}
              </span>
              <div>
                {reviewData?.stats.average ? (
                  <StarRating score={reviewData.stats.average} />
                ) : null}
                <p className="mt-1 text-sm text-gray-500">
                  {reviewData?.stats.count ?? 0}{" "}
                  {(reviewData?.stats.count ?? 0) === 1 ? "review" : "reviews"}
                </p>
              </div>
            </div>

            {reviewData && reviewData.stats.count > 0 && (
              <div className="mt-6 space-y-2">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = reviewData.stats.distribution[star] ?? 0;
                  const pct =
                    reviewData.stats.count > 0
                      ? (count / reviewData.stats.count) * 100
                      : 0;
                  return (
                    <div key={star} className="flex items-center gap-2 text-sm">
                      <span className="w-4 text-right text-gray-500">{star}</span>
                      <StarIcon className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                      <div className="flex-1 rounded-full bg-gray-100 h-2">
                        <div
                          className="h-2 rounded-full bg-yellow-400"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-gray-400">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* ROW 2 — two tall visual cards (Gallery + Location)                */}
        {/* ----------------------------------------------------------------- */}
        <div className="grid items-start gap-8 lg:grid-cols-2">
          {/* Gallery */}
          <div className={`${cardClass} p-8`}>
            <SectionHeader
              icon={ImageIcon}
              eyebrow={t("venueDetail.gallery") || "Gallery"}
              title={t("venueDetail.photos") || "Photos"}
            />
            {gallery.length > 0 ? (
              <div className="mt-6">
                <div className="relative overflow-hidden rounded-2xl">
                  {gallery[galleryIndex]?.mediaType === "video" ? (
                    <video
                      src={gallery[galleryIndex].mediaUrl}
                      className="aspect-[16/9] w-full object-cover"
                      controls
                    />
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={gallery[galleryIndex]?.mediaUrl}
                      alt={gallery[galleryIndex]?.caption ?? "Gallery image"}
                      className="aspect-[16/9] w-full object-cover"
                    />
                  )}
                  {gallery.length > 1 && (
                    <>
                      <button
                        onClick={galleryPrev}
                        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white hover:bg-black/60 transition-colors"
                      >
                        <ChevronLeftIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={galleryNext}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white hover:bg-black/60 transition-colors"
                      >
                        <ChevronRightIcon className="h-5 w-5" />
                      </button>
                    </>
                  )}
                </div>
                {gallery.length > 1 && (
                  <div className="mt-3 flex justify-center gap-1.5">
                    {gallery.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setGalleryIndex(i)}
                        className={`h-2 w-2 rounded-full transition-colors ${
                          i === galleryIndex ? "bg-gray-900" : "bg-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                )}
                <button
                  onClick={() => {
                    void navigator.clipboard.writeText(window.location.href);
                  }}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <ShareIcon className="h-4 w-4" />
                  Share
                </button>
              </div>
            ) : (
              <p className="mt-6 text-sm text-gray-400">No gallery images.</p>
            )}
          </div>

          {/* Location */}
          <div className={`${cardClass} p-8`}>
            <SectionHeader
              icon={MapPinIcon}
              eyebrow={t("venueDetail.location") || "Location"}
              title={t("venueDetail.address") || "Address & Map"}
            />
            <div className="mt-6 space-y-4">
              {venue.address && (
                <p className="text-sm text-gray-700">{venue.address}</p>
              )}
              {(venue.city ?? venue.region ?? venue.countryCode) && (
                <p className="text-sm text-gray-500">
                  {[venue.city, venue.region, venue.countryCode]
                    .filter(Boolean)
                    .join(", ")}
                  {venue.postalCode ? ` ${venue.postalCode}` : ""}
                </p>
              )}

              {venue.lat && venue.lng && (
                <>
                  <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200">
                    <iframe
                      title="Venue location"
                      width="100%"
                      height="280"
                      style={{ border: 0 }}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      src={`https://www.google.com/maps?q=${venue.lat},${venue.lng}&z=15&output=embed`}
                    />
                  </div>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${venue.lat},${venue.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
                  >
                    <ExternalLinkIcon className="h-4 w-4" />
                    Get Directions
                  </a>
                </>
              )}

              {!venue.lat && !venue.lng && !venue.address && (
                <p className="text-sm text-gray-400">No location data available.</p>
              )}
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* ROW 3 — Social links (horizontal pill row, full width)            */}
        {/* ----------------------------------------------------------------- */}
        {socialLinks.length > 0 && (
          <div className={`${cardClass} p-6`}>
            <div className="flex flex-wrap items-center gap-3">
              <div className="mr-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                <GlobeIcon className="h-4 w-4 text-gray-400" />
                {t("venueDetail.socialLinks") || "Social Links"}
              </div>
              {socialLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                >
                  <link.icon className="h-4 w-4 text-gray-400" />
                  {link.label}
                  <ExternalLinkIcon className="h-3.5 w-3.5 text-gray-300" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* EVENTS SECTIONS                                                   */}
        {/* ----------------------------------------------------------------- */}
        <div className="space-y-8">
          <EventSection
            icon={CalendarIcon}
            eyebrow="Now"
            title="Live Events"
            events={events?.live ?? []}
            emptyMessage="No live events right now."
          />
          <EventSection
            icon={CalendarIcon}
            eyebrow="Coming Up"
            title="Upcoming Events"
            events={events?.upcoming ?? []}
            emptyMessage="No upcoming events."
          />
          <EventSection
            icon={CalendarIcon}
            eyebrow="History"
            title="Past Events"
            events={events?.past ?? []}
            emptyMessage="No past events."
          />
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* SIMILAR VENUES                                                    */}
        {/* ----------------------------------------------------------------- */}
        {similarVenues.length > 0 && (
          <div className={`${cardClass} p-8`}>
            <SectionHeader
              icon={BuildingIcon}
              eyebrow="Discover"
              title="Similar Venues"
              description={`Other venues in ${venue.city ?? "this area"}`}
            />
            <div className="mt-6 flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
              {similarVenues.map((sv) => (
                <Link
                  key={sv.id}
                  href={`/venues/${sv.id}`}
                  className="flex-shrink-0 w-56 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                    <BuildingIcon className="h-5 w-5 text-gray-500" />
                  </div>
                  <h4 className="mt-3 text-sm font-semibold text-gray-900 truncate">
                    {sv.name}
                  </h4>
                  <p className="mt-1 text-xs text-gray-500">
                    {sv.city ?? ""}
                    {sv.venue_type ? ` \u00B7 ${sv.venue_type}` : ""}
                  </p>
                  {sv.capacity && (
                    <p className="mt-1 text-xs text-gray-400">
                      Capacity: {sv.capacity}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatSubcard({
  icon: Icon,
  label,
  value,
  suffix,
}: {
  icon: IconComponent;
  label: string;
  value: string | number;
  suffix?: string;
}) {
  return (
    <div className="rounded-2xl bg-white/10 p-5 backdrop-blur-sm">
      <div className="flex items-center gap-2 text-white/60">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold text-white">
        {value}
        {suffix && <span className="text-base font-normal text-white/60">{suffix}</span>}
      </p>
    </div>
  );
}

function TagGroup({
  label,
  tags,
  icon: Icon,
}: {
  label: string;
  tags: TagItem[];
  icon?: IconComponent;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        {Icon && <Icon className="h-4 w-4 text-gray-400" />}
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          {label}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Badge key={tag.id} variant="secondary" className="rounded-full">
            {tag.label}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function EventSection({
  icon: Icon,
  eyebrow,
  title,
  events,
  emptyMessage,
}: {
  icon: IconComponent;
  eyebrow: string;
  title: string;
  events: VenueEventItem[];
  emptyMessage: string;
}) {
  return (
    <div className={`${cardClass} p-8`}>
      <SectionHeader icon={Icon} eyebrow={eyebrow} title={title} />
      {events.length > 0 ? (
        <div className="mt-6 flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              className="flex-shrink-0 w-64 rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden"
            >
              {event.hero_image_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={event.hero_image_url}
                  alt={event.title}
                  className="aspect-[16/9] w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[16/9] w-full items-center justify-center bg-gray-100">
                  <CalendarIcon className="h-8 w-8 text-gray-300" />
                </div>
              )}
              <div className="p-4">
                <h4 className="text-sm font-semibold text-gray-900 truncate">
                  {event.title}
                </h4>
                <p className="mt-1 text-xs text-gray-500">
                  {new Date(event.starts_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
                <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
                  <UsersIcon className="h-3.5 w-3.5" />
                  {event.attendee_count} attendees
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="mt-6 text-sm text-gray-400">{emptyMessage}</p>
      )}
    </div>
  );
}
