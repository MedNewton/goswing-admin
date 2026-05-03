"use client";

import { MainLayout } from "@/components/layout/MainLayout";
import {
  BuildingIcon,
  DollarIcon,
  ImageIcon,
  ShieldIcon,
  MapPinIcon,
  GlobeIcon,
  EyeIcon,
  PlusIcon,
  UsersIcon,
} from "@/components/icons";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { PlacesAutocomplete } from "@/components/ui/PlacesAutocomplete";
import { LocationMapPicker } from "@/components/ui/LocationMapPicker";
import {
  useState,
  useEffect,
  useTransition,
  useCallback,
  useRef,
  use,
  type ComponentType,
  type SVGProps,
} from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  fetchVenue,
  updateVenueAction,
  type VenueActionResult,
} from "@/lib/actions/venues";
import { createCustomTagAction } from "@/lib/actions/events";
import { uploadOrganizerImageAction } from "@/lib/actions/organizer";
import {
  fetchTagsByType,
  fetchOrganizerTags,
  syncOrganizerTags,
  fetchOrganizerGallery,
  addGalleryImage,
  removeGalleryImage,
  fetchVenueOrganizer,
  updateOrganizerAction,
  type UpdateOrganizerInput,
} from "@/lib/actions/venueEdit";
import type { Venue, GalleryItem } from "@/types";
import type { VenueOrganizer } from "@/lib/data/venueStats";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

interface TagOption {
  id: string;
  label: string;
  slug: string;
  type: string;
}

interface CustomPolicy {
  title: string;
  description: string;
}

// ---------------------------------------------------------------------------
// Zod Schema
// ---------------------------------------------------------------------------

const editVenueFormSchema = z.object({
  // Venue fields
  name: z.string().min(1, "Venue name is required"),
  capacity: z.union([z.coerce.number().int().positive(), z.literal(""), z.undefined()]).optional(),
  description: z.string().optional().or(z.literal("")),
  free_access: z.boolean().optional(),
  free_for_ladies: z.boolean().optional(),
  // Location fields
  address_line1: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  region: z.string().optional().or(z.literal("")),
  country_code: z.string().optional().or(z.literal("")),
  postal_code: z.string().optional().or(z.literal("")),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  // Organizer fields stored alongside
  website_url: z.string().optional().or(z.literal("")),
  google_business_url: z.string().optional().or(z.literal("")),
  // Social
  instagram_handle: z.string().optional().or(z.literal("")),
  tiktok_handle: z.string().optional().or(z.literal("")),
  facebook_handle: z.string().optional().or(z.literal("")),
  snapchat_handle: z.string().optional().or(z.literal("")),
  twitter_handle: z.string().optional().or(z.literal("")),
  youtube_handle: z.string().optional().or(z.literal("")),
  pinterest_handle: z.string().optional().or(z.literal("")),
  // Policies
  cancellation_policy: z.string().optional().or(z.literal("")),
  refund_policy: z.string().optional().or(z.literal("")),
});

type EditVenueFormValues = z.infer<typeof editVenueFormSchema>;

// ---------------------------------------------------------------------------
// Section Header
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Summary Card (used in the gradient hero)
// ---------------------------------------------------------------------------

function SummaryCard({
  icon: Icon,
  label,
  value,
  accentClass,
}: {
  icon: IconComponent;
  label: string;
  value: string;
  accentClass: string;
}) {
  return (
    <div className="rounded-3xl border border-white/12 bg-white/10 p-5 backdrop-blur">
      <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 ${accentClass}`}>
        <Icon className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-[0.18em]">{label}</span>
      </div>
      <p className="mt-4 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tag Pill Component
// ---------------------------------------------------------------------------

function TagPill({
  tag,
  selected,
  onToggle,
}: {
  tag: TagOption;
  selected: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(tag.id)}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
        selected
          ? "border-gray-900 bg-gray-900 text-white"
          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
      }`}
    >
      {selected && (
        <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none">
          <path d="M11.5 3.5L5.5 10L2.5 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {tag.label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Custom Tag Adder
// ---------------------------------------------------------------------------

function CustomTagAdder({
  type,
  onCreated,
}: {
  type: "party_type" | "music_style" | "extra_service";
  onCreated: (tag: TagOption) => void;
}) {
  const [value, setValue] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const trimmed = value.trim();
    if (!trimmed || adding) return;
    setAdding(true);
    setError(null);
    try {
      const result = await createCustomTagAction({ type, label: trimmed });
      if (result.success) {
        onCreated({
          id: result.tag.id,
          label: result.tag.label,
          slug: result.tag.slug,
          type: result.tag.type,
        });
        setValue("");
      } else {
        setError(result.error);
      }
    } catch {
      setError("Failed to add tag.");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="mt-3">
      <div className="flex items-stretch gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void submit();
            }
          }}
          disabled={adding}
          placeholder="Add your own…"
          maxLength={80}
          className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 disabled:bg-gray-50"
        />
        <button
          type="button"
          onClick={() => void submit()}
          disabled={adding || value.trim().length === 0}
          className="rounded-xl bg-gray-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {adding ? "Adding…" : "Add"}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function EditVenuePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Tags state
  const [categoryTags, setCategoryTags] = useState<TagOption[]>([]);
  const [partyTypeTags, setPartyTypeTags] = useState<TagOption[]>([]);
  const [musicStyleTags, setMusicStyleTags] = useState<TagOption[]>([]);
  const [extraServiceTags, setExtraServiceTags] = useState<TagOption[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  // Gallery state
  // Items with id starting with "new-" are pending uploads not yet persisted.
  // pendingGalleryDeletions holds DB ids of items the user removed but
  // which still need to be deleted server-side on save.
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [pendingGalleryDeletions, setPendingGalleryDeletions] = useState<string[]>([]);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);

  // Cover image state
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  // Custom policies state
  const [customPolicies, setCustomPolicies] = useState<CustomPolicy[]>([]);

  // Social media expandable
  const [showExtraSocials, setShowExtraSocials] = useState(false);

  // File input refs
  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);


  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<EditVenueFormValues>({
    resolver: zodResolver(editVenueFormSchema),
    defaultValues: {
      name: "",
      capacity: "" as unknown as undefined,
      description: "",
      free_access: false,
      free_for_ladies: false,
      address_line1: "",
      city: "",
      region: "",
      country_code: "",
      postal_code: "",
      website_url: "",
      google_business_url: "",
      instagram_handle: "",
      tiktok_handle: "",
      facebook_handle: "",
      snapchat_handle: "",
      twitter_handle: "",
      youtube_handle: "",
      pinterest_handle: "",
      cancellation_policy: "",
      refund_policy: "",
    },
  });

  const freeAccess = watch("free_access");
  const lat = watch("lat");
  const lng = watch("lng");
  const venueName = watch("name");
  const venueCity = watch("city");
  const venueRegion = watch("region");
  const venueCountryCode = watch("country_code");
  const venueCapacity = watch("capacity");
  const venueFreeForLadies = watch("free_for_ladies");

  // Track whether tags/gallery/cover/policies have been changed (not tracked by RHF)
  const [extraDirty, setExtraDirty] = useState(false);
  const markExtraDirty = useCallback(() => setExtraDirty(true), []);

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  useEffect(() => {
    async function load() {
      try {
        const venueData = await fetchVenue(id);
        setVenue(venueData);

        // Load organizer
        let org: VenueOrganizer | null = null;
        if (venueData.organizerId) {
          org = await fetchVenueOrganizer(venueData.organizerId);
          setCoverImageUrl(org?.coverImageUrl ?? null);
          setCustomPolicies(org?.customPolicies ?? []);

          // Load tags
          const [categories, partyTypes, musicStyles, extraServices, orgTags] =
            await Promise.all([
              fetchTagsByType("category"),
              fetchTagsByType("party_type"),
              fetchTagsByType("music_style"),
              fetchTagsByType("extra_service"),
              fetchOrganizerTags(venueData.organizerId),
            ]);
          setCategoryTags(categories);
          setPartyTypeTags(partyTypes);
          setMusicStyleTags(musicStyles);
          setExtraServiceTags(extraServices);

          const orgTagIds = new Set(orgTags.map((t) => t.id));
          setSelectedTagIds(orgTagIds);

          // Determine selected category from tags
          const selectedCat = categories.find((c) => orgTagIds.has(c.id));
          setSelectedCategory(selectedCat?.id ?? "");

          // Load gallery
          const galleryData = await fetchOrganizerGallery(venueData.organizerId);
          setGallery(galleryData);

          // If any extra social handles exist, show the section
          if (org?.twitterHandle || org?.youtubeHandle || org?.pinterestHandle) {
            setShowExtraSocials(true);
          }
        }

        // Reset form with loaded data
        reset({
          name: venueData.name,
          capacity: venueData.capacity ?? ("" as unknown as undefined),
          description: venueData.description ?? "",
          free_access: venueData.freeAccess,
          free_for_ladies: venueData.freeForLadies,
          address_line1: venueData.address ?? "",
          city: venueData.city ?? "",
          region: venueData.region ?? "",
          country_code: venueData.countryCode ?? "",
          postal_code: venueData.postalCode ?? "",
          lat: venueData.lat ?? undefined,
          lng: venueData.lng ?? undefined,
          website_url: org?.websiteUrl ?? "",
          google_business_url: org?.googleBusinessUrl ?? "",
          instagram_handle: org?.instagramHandle ?? "",
          tiktok_handle: org?.tiktokHandle ?? "",
          facebook_handle: org?.facebookHandle ?? "",
          snapchat_handle: org?.snapchatHandle ?? "",
          twitter_handle: org?.twitterHandle ?? "",
          youtube_handle: org?.youtubeHandle ?? "",
          pinterest_handle: org?.pinterestHandle ?? "",
          cancellation_policy: org?.cancellationPolicy ?? "",
          refund_policy: org?.refundPolicy ?? "",
        });
      } catch {
        setServerError("Failed to load venue data.");
      } finally {
        setIsLoading(false);
      }
    }
    void load();
  }, [id, reset]);

  // ---------------------------------------------------------------------------
  // Tag toggling
  // ---------------------------------------------------------------------------

  const toggleTag = useCallback(
    (tagId: string) => {
      setSelectedTagIds((prev) => {
        const next = new Set(prev);
        if (next.has(tagId)) {
          next.delete(tagId);
        } else {
          next.add(tagId);
        }
        return next;
      });
      markExtraDirty();
    },
    [markExtraDirty],
  );

  const handleCategoryChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newCatId = e.target.value;
      setSelectedTagIds((prev) => {
        const next = new Set(prev);
        // Remove old category tags
        for (const cat of categoryTags) {
          next.delete(cat.id);
        }
        // Add new one
        if (newCatId) {
          next.add(newCatId);
        }
        return next;
      });
      setSelectedCategory(newCatId);
      markExtraDirty();
    },
    [categoryTags, markExtraDirty],
  );

  // ---------------------------------------------------------------------------
  // Cover image upload
  // ---------------------------------------------------------------------------

  const handleCoverUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setIsUploadingCover(true);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const result = await uploadOrganizerImageAction(fd);
        if (result.success) {
          setCoverImageUrl(result.url);
          markExtraDirty();
        } else {
          setServerError(result.error);
        }
      } catch {
        setServerError("Failed to upload cover image.");
      } finally {
        setIsUploadingCover(false);
        if (coverInputRef.current) coverInputRef.current.value = "";
      }
    },
    [markExtraDirty],
  );

  // ---------------------------------------------------------------------------
  // Gallery management
  // ---------------------------------------------------------------------------

  const handleGalleryUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      // Reset the input immediately so picking the same file again still
      // fires onChange after this handler runs.
      if (galleryInputRef.current) galleryInputRef.current.value = "";
      if (files.length === 0) return;
      setIsUploadingGallery(true);
      setServerError(null);
      try {
        for (const file of files) {
          const fd = new FormData();
          fd.append("file", file);
          const uploadResult = await uploadOrganizerImageAction(fd);
          if (!uploadResult.success) {
            setServerError(uploadResult.error);
            continue;
          }
          // Stage locally with a temp id; persisted on Save Changes.
          setGallery((prev) => [
            ...prev,
            {
              id: `new-${crypto.randomUUID()}`,
              mediaUrl: uploadResult.url,
              mediaType: "image" as const,
              sortOrder: prev.length,
            },
          ]);
          markExtraDirty();
        }
      } catch (err) {
        console.error("gallery upload failed", err);
        setServerError("Failed to upload gallery image.");
      } finally {
        setIsUploadingGallery(false);
      }
    },
    [markExtraDirty],
  );

  const handleRemoveGalleryImage = useCallback(
    (imageId: string) => {
      // If it's a pending (not-yet-persisted) item, just drop it locally.
      // Otherwise, queue the DB id for deletion on Save Changes.
      setGallery((prev) => prev.filter((item) => item.id !== imageId));
      if (!imageId.startsWith("new-")) {
        setPendingGalleryDeletions((prev) => [...prev, imageId]);
      }
      markExtraDirty();
    },
    [markExtraDirty],
  );

  // ---------------------------------------------------------------------------
  // Custom policies
  // ---------------------------------------------------------------------------

  const addCustomPolicy = useCallback(() => {
    setCustomPolicies((prev) => [...prev, { title: "", description: "" }]);
    markExtraDirty();
  }, [markExtraDirty]);

  const removeCustomPolicy = useCallback(
    (index: number) => {
      setCustomPolicies((prev) => prev.filter((_, i) => i !== index));
      markExtraDirty();
    },
    [markExtraDirty],
  );

  const updateCustomPolicy = useCallback(
    (index: number, field: "title" | "description", value: string) => {
      setCustomPolicies((prev) =>
        prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)),
      );
      markExtraDirty();
    },
    [markExtraDirty],
  );

  // ---------------------------------------------------------------------------
  // Place select
  // ---------------------------------------------------------------------------

  const handlePlaceSelect = useCallback(
    (place: {
      name: string;
      address: string;
      city: string | null;
      region: string | null;
      countryCode: string | null;
      lat: number | null;
      lng: number | null;
      placeId: string;
    }) => {
      if (place.address) setValue("address_line1", place.address, { shouldDirty: true });
      if (place.city) setValue("city", place.city, { shouldDirty: true });
      if (place.region) setValue("region", place.region, { shouldDirty: true });
      if (place.countryCode) setValue("country_code", place.countryCode, { shouldDirty: true });
      if (place.lat) setValue("lat", place.lat, { shouldDirty: true });
      if (place.lng) setValue("lng", place.lng, { shouldDirty: true });
    },
    [setValue],
  );

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------

  const onSubmit = (data: EditVenueFormValues) => {
    setServerError(null);
    setSuccessMessage(null);
    startTransition(async () => {
      try {
        // 1. Update venue table fields
        const venueResult: VenueActionResult = await updateVenueAction(id, {
          name: data.name,
          address_line1: data.address_line1,
          city: data.city,
          region: data.region,
          country_code: data.country_code,
          postal_code: data.postal_code,
          capacity: typeof data.capacity === "number" ? data.capacity : null,
          lat: data.lat,
          lng: data.lng,
          description: data.description,
          free_access: data.free_access,
          free_for_ladies: data.free_for_ladies,
        });

        if (!venueResult.success) {
          setServerError(venueResult.error);
          return;
        }

        // 2. Update organizer fields. If the venue has no organizer linked,
        // try to recover by linking it to the current user's organizer
        // (legacy data sometimes has venues.organizer_id = NULL).
        if (!venue?.organizerId) {
          setServerError(
            "This venue is not linked to an organizer. Cannot save gallery / cover / social fields. Set venues.organizer_id in the database, or contact support.",
          );
          return;
        }

        if (venue?.organizerId) {
          const organizerInput: UpdateOrganizerInput = {
            cover_image_url: coverImageUrl,
            website_url: data.website_url ?? null,
            google_business_url: data.google_business_url ?? null,
            instagram_handle: data.instagram_handle ?? null,
            tiktok_handle: data.tiktok_handle ?? null,
            facebook_handle: data.facebook_handle ?? null,
            snapchat_handle: data.snapchat_handle ?? null,
            twitter_handle: data.twitter_handle ?? null,
            youtube_handle: data.youtube_handle ?? null,
            pinterest_handle: data.pinterest_handle ?? null,
            cancellation_policy: data.cancellation_policy ?? null,
            refund_policy: data.refund_policy ?? null,
            custom_policies: customPolicies.filter((p) => p.title.trim() !== ""),
          };

          const orgResult = await updateOrganizerAction(venue.organizerId, organizerInput);
          if (!orgResult.success) {
            setServerError(orgResult.error);
            return;
          }

          // 3. Sync tags
          await syncOrganizerTags(venue.organizerId, Array.from(selectedTagIds));

          // 4. Apply pending gallery deletions
          for (const deleteId of pendingGalleryDeletions) {
            try {
              await removeGalleryImage(deleteId);
            } catch (err) {
              console.error("removeGalleryImage failed", err);
              setServerError("Failed to remove a gallery image.");
              return;
            }
          }

          // 5. Apply pending gallery additions (items with temp ids)
          const pendingAdds = gallery.filter((item) => item.id.startsWith("new-"));
          const persistedIds = new Map<string, string>(); // tempId -> realId
          for (const item of pendingAdds) {
            try {
              const newId = await addGalleryImage(venue.organizerId, {
                image_url: item.mediaUrl,
                media_type: item.mediaType,
                sort_order: gallery.findIndex((g) => g.id === item.id),
              });
              persistedIds.set(item.id, newId);
            } catch (err) {
              console.error("addGalleryImage failed", err);
              setServerError("Failed to save a gallery image.");
              return;
            }
          }

          // Swap temp ids with real ids in local state
          if (persistedIds.size > 0) {
            setGallery((prev) =>
              prev.map((item) =>
                persistedIds.has(item.id)
                  ? { ...item, id: persistedIds.get(item.id)! }
                  : item,
              ),
            );
          }
          setPendingGalleryDeletions([]);
        }

        setSuccessMessage("Venue updated successfully.");
        setExtraDirty(false);

        // Refresh data
        const updated = await fetchVenue(id);
        setVenue(updated);
        reset({
          name: updated.name,
          capacity: updated.capacity ?? ("" as unknown as undefined),
          description: updated.description ?? "",
          free_access: updated.freeAccess,
          free_for_ladies: updated.freeForLadies,
          address_line1: updated.address ?? "",
          city: updated.city ?? "",
          region: updated.region ?? "",
          country_code: updated.countryCode ?? "",
          postal_code: updated.postalCode ?? "",
          lat: updated.lat ?? undefined,
          lng: updated.lng ?? undefined,
          website_url: data.website_url,
          google_business_url: data.google_business_url,
          instagram_handle: data.instagram_handle,
          tiktok_handle: data.tiktok_handle,
          facebook_handle: data.facebook_handle,
          snapchat_handle: data.snapchat_handle,
          twitter_handle: data.twitter_handle,
          youtube_handle: data.youtube_handle,
          pinterest_handle: data.pinterest_handle,
          cancellation_policy: data.cancellation_policy,
          refund_policy: data.refund_policy,
        });
      } catch (err) {
        console.error("venue edit save failed", err);
        const message = err instanceof Error ? err.message : "Unknown error";
        setServerError(`Save failed: ${message}`);
      }
    });
  };

  const formIsDirty = isDirty || extraDirty;

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" />
            <p className="mt-4 text-sm text-gray-500">Loading venue...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!venue) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <p className="text-lg font-medium text-gray-900">Venue not found</p>
            <Button
              variant="primary"
              size="sm"
              className="mt-4"
              onClick={() => router.push("/venues")}
            >
              Back to Venues
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const locationLabel = [venueCity, venueRegion, venueCountryCode]
    .filter(Boolean)
    .join(", ") || "Location not set";
  const venueTypeLabel =
    categoryTags.find((t) => t.id === selectedCategory)?.label ?? "Type not set";
  const capacityLabel =
    typeof venueCapacity === "number" && venueCapacity > 0
      ? venueCapacity.toLocaleString()
      : "—";
  const freeEntryLabel = freeAccess
    ? venueFreeForLadies
      ? "Ladies only"
      : "Everyone"
    : "No";
  const tagsCount = selectedTagIds.size;

  return (
    <MainLayout>
      {/* Top bar */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => router.push(`/venues/${id}`)}
          >
            &larr; Back
          </Button>
          <h1 className="text-2xl font-semibold text-gray-900">Edit Venue</h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => window.open(`/discover/venues/${id}`, "_blank")}
          >
            <EyeIcon className="h-4 w-4" />
            View as Guest
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="button"
            disabled={isPending || !formIsDirty}
            onClick={handleSubmit(onSubmit)}
          >
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-4xl space-y-6">
        {/* Server Error */}
        {serverError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {serverError}
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {successMessage}
          </div>
        )}

        {/* ================================================================= */}
        {/* Editor Hero — gradient summary                                     */}
        {/* ================================================================= */}
        <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-teal-800 p-8 text-white shadow-xl shadow-slate-200">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(45,212,191,0.22),_transparent_34%)]" />
          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-teal-100/75">
                Venue Editor
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                {venueName || "Untitled venue"}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200">
                Update the venue details, branding, and policies that guests see.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/90 backdrop-blur">
                  {tagsCount} {tagsCount === 1 ? "tag" : "tags"} selected
                </div>
                <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/90 backdrop-blur">
                  {freeAccess ? "Free entry" : "Paid entry"}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
              <SummaryCard
                icon={MapPinIcon}
                label="Location"
                value={locationLabel}
                accentClass="bg-emerald-50 text-emerald-700"
              />
              <SummaryCard
                icon={BuildingIcon}
                label="Type"
                value={venueTypeLabel}
                accentClass="bg-sky-50 text-sky-700"
              />
              <SummaryCard
                icon={UsersIcon}
                label="Capacity"
                value={capacityLabel}
                accentClass="bg-amber-50 text-amber-700"
              />
              <SummaryCard
                icon={DollarIcon}
                label="Free Entry"
                value={freeEntryLabel}
                accentClass="bg-rose-50 text-rose-700"
              />
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* 1. Cover Image Card                                               */}
        {/* ================================================================= */}
        <Card className="rounded-[2rem] border border-gray-200/80 bg-gradient-to-br from-white via-white to-slate-50 shadow-lg shadow-gray-100">
          <SectionHeader
            icon={ImageIcon}
            eyebrow="Media"
            title="Cover Image"
            description="The main image displayed at the top of your venue page."
          />
          <div className="mt-6">
            {coverImageUrl ? (
              <div className="relative overflow-hidden rounded-2xl border border-gray-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverImageUrl}
                  alt="Cover"
                  className="h-56 w-full object-cover"
                />
                <div className="absolute bottom-3 right-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    type="button"
                    disabled={isUploadingCover}
                    onClick={() => coverInputRef.current?.click()}
                  >
                    {isUploadingCover ? "Uploading..." : "Change Image"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 py-12">
                <ImageIcon className="h-8 w-8 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">No cover image set</p>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  className="mt-3"
                  disabled={isUploadingCover}
                  onClick={() => coverInputRef.current?.click()}
                >
                  {isUploadingCover ? "Uploading..." : "Upload Image"}
                </Button>
              </div>
            )}
            <input
              ref={coverInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleCoverUpload}
            />
          </div>
        </Card>

        {/* ================================================================= */}
        {/* 2. Gallery Card                                                   */}
        {/* ================================================================= */}
        <Card className="rounded-[2rem] border border-gray-200/80 bg-gradient-to-br from-white via-white to-slate-50 shadow-lg shadow-gray-100">
          <SectionHeader
            icon={ImageIcon}
            eyebrow="Media"
            title="Gallery"
            description="Showcase your venue with additional photos."
          />
          <div className="mt-6">
            {gallery.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {gallery.map((item) => (
                  <div
                    key={item.id}
                    className="group relative overflow-hidden rounded-xl border border-gray-200"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.mediaUrl}
                      alt={item.caption ?? "Gallery image"}
                      className="h-32 w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveGalleryImage(item.id)}
                      className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      title="Remove image"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none">
                        <path d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                ))}
                {/* Add image tile */}
                <button
                  type="button"
                  disabled={isUploadingGallery}
                  onClick={() => galleryInputRef.current?.click()}
                  className="flex h-32 flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 text-gray-400 transition-colors hover:border-gray-400 hover:text-gray-500"
                >
                  <PlusIcon className="h-5 w-5" />
                  <span className="mt-1 text-xs">{isUploadingGallery ? "Uploading..." : "Add Image"}</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 py-10">
                <ImageIcon className="h-8 w-8 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">No gallery images yet</p>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  className="mt-3"
                  disabled={isUploadingGallery}
                  onClick={() => galleryInputRef.current?.click()}
                >
                  {isUploadingGallery ? "Uploading..." : "Add Image"}
                </Button>
              </div>
            )}
            <input
              ref={galleryInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleGalleryUpload}
            />
          </div>
        </Card>

        {/* ================================================================= */}
        {/* 3. Details Card                                                   */}
        {/* ================================================================= */}
        <Card className="rounded-[2rem] border border-gray-200/80 bg-gradient-to-br from-white via-white to-slate-50 shadow-lg shadow-gray-100">
          <SectionHeader
            icon={BuildingIcon}
            eyebrow="Details"
            title="Venue Information"
            description="Core details about your venue."
          />
          <div className="mt-6 space-y-6">
            {/* Name */}
            <Input
              label="Venue Name"
              placeholder="Enter venue name"
              error={errors.name?.message}
              {...register("name")}
            />

            {/* Category dropdown */}
            <Select
              label="Type / Category"
              options={[
                { value: "", label: "Select a category..." },
                ...categoryTags.map((t) => ({ value: t.id, label: t.label })),
              ]}
              value={selectedCategory}
              onChange={handleCategoryChange}
            />

            {/* Party types */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Party Types
              </label>
              <div className="flex flex-wrap gap-2">
                {partyTypeTags.map((tag) => (
                  <TagPill
                    key={tag.id}
                    tag={tag}
                    selected={selectedTagIds.has(tag.id)}
                    onToggle={toggleTag}
                  />
                ))}
              </div>
              <CustomTagAdder
                type="party_type"
                onCreated={(tag) => {
                  setPartyTypeTags((prev) =>
                    prev.some((t) => t.id === tag.id) ? prev : [...prev, tag],
                  );
                  setSelectedTagIds((prev) => {
                    if (prev.has(tag.id)) return prev;
                    const next = new Set(prev);
                    next.add(tag.id);
                    return next;
                  });
                  markExtraDirty();
                }}
              />
            </div>

            {/* Music styles */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Music Styles
              </label>
              <div className="flex flex-wrap gap-2">
                {musicStyleTags.map((tag) => (
                  <TagPill
                    key={tag.id}
                    tag={tag}
                    selected={selectedTagIds.has(tag.id)}
                    onToggle={toggleTag}
                  />
                ))}
              </div>
              <CustomTagAdder
                type="music_style"
                onCreated={(tag) => {
                  setMusicStyleTags((prev) =>
                    prev.some((t) => t.id === tag.id) ? prev : [...prev, tag],
                  );
                  setSelectedTagIds((prev) => {
                    if (prev.has(tag.id)) return prev;
                    const next = new Set(prev);
                    next.add(tag.id);
                    return next;
                  });
                  markExtraDirty();
                }}
              />
            </div>

            {/* Extra services */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Extra Services
              </label>
              <div className="flex flex-wrap gap-2">
                {extraServiceTags.map((tag) => (
                  <TagPill
                    key={tag.id}
                    tag={tag}
                    selected={selectedTagIds.has(tag.id)}
                    onToggle={toggleTag}
                  />
                ))}
              </div>
              <CustomTagAdder
                type="extra_service"
                onCreated={(tag) => {
                  setExtraServiceTags((prev) =>
                    prev.some((t) => t.id === tag.id) ? prev : [...prev, tag],
                  );
                  setSelectedTagIds((prev) => {
                    if (prev.has(tag.id)) return prev;
                    const next = new Set(prev);
                    next.add(tag.id);
                    return next;
                  });
                  markExtraDirty();
                }}
              />
            </div>

            {/* Capacity */}
            <Input
              label="Total Venue Capacity"
              placeholder="e.g. 500"
              type="number"
              min="1"
              {...register("capacity")}
            />

            {/* Free access */}
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                  {...register("free_access")}
                />
                <span className="text-sm font-medium text-gray-700">Free Entry</span>
              </label>
              {freeAccess && (
                <div className="ml-7 space-y-2">
                  <label className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="free_access_type"
                      checked={!watch("free_for_ladies")}
                      onChange={() => setValue("free_for_ladies", false, { shouldDirty: true })}
                      className="h-4 w-4 border-gray-300 text-gray-900 focus:ring-gray-900"
                    />
                    <span className="text-sm text-gray-700">Free for everyone</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="free_access_type"
                      checked={watch("free_for_ladies") === true}
                      onChange={() => setValue("free_for_ladies", true, { shouldDirty: true })}
                      className="h-4 w-4 border-gray-300 text-gray-900 focus:ring-gray-900"
                    />
                    <span className="text-sm text-gray-700">Free for ladies only</span>
                  </label>
                </div>
              )}
            </div>

            {/* Website & Google Business */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Website URL"
                placeholder="https://example.com"
                {...register("website_url")}
              />
              <Input
                label="Google Business URL"
                placeholder="https://g.co/..."
                {...register("google_business_url")}
              />
            </div>

            {/* Description */}
            <Textarea
              label="Description"
              placeholder="Describe your venue..."
              rows={4}
              {...register("description")}
            />
          </div>
        </Card>

        {/* ================================================================= */}
        {/* 4. Social Media Card                                              */}
        {/* ================================================================= */}
        <Card className="rounded-[2rem] border border-gray-200/80 bg-gradient-to-br from-white via-white to-slate-50 shadow-lg shadow-gray-100">
          <SectionHeader
            icon={GlobeIcon}
            eyebrow="Social"
            title="Social Media"
            description="Connect your social media profiles."
          />
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Instagram"
                placeholder="@yourhandle"
                {...register("instagram_handle")}
              />
              <Input
                label="TikTok"
                placeholder="@yourhandle"
                {...register("tiktok_handle")}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Facebook"
                placeholder="Page name or URL"
                {...register("facebook_handle")}
              />
              <Input
                label="Snapchat"
                placeholder="@yourhandle"
                {...register("snapchat_handle")}
              />
            </div>

            {/* Expandable extra socials */}
            {!showExtraSocials ? (
              <button
                type="button"
                onClick={() => setShowExtraSocials(true)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                <PlusIcon className="h-4 w-4" />
                Add others (Twitter, YouTube, Pinterest)
              </button>
            ) : (
              <div className="space-y-4 rounded-2xl border border-gray-100 bg-gray-50/50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                  Additional Platforms
                </p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Input
                    label="Twitter / X"
                    placeholder="@yourhandle"
                    {...register("twitter_handle")}
                  />
                  <Input
                    label="YouTube"
                    placeholder="Channel name or URL"
                    {...register("youtube_handle")}
                  />
                </div>
                <Input
                  label="Pinterest"
                  placeholder="@yourhandle"
                  {...register("pinterest_handle")}
                />
              </div>
            )}
          </div>
        </Card>

        {/* ================================================================= */}
        {/* 5. Policies Card                                                  */}
        {/* ================================================================= */}
        <Card className="rounded-[2rem] border border-gray-200/80 bg-gradient-to-br from-white via-white to-slate-50 shadow-lg shadow-gray-100">
          <SectionHeader
            icon={ShieldIcon}
            eyebrow="Legal"
            title="Policies"
            description="Set cancellation, refund, and custom policies for your venue."
          />
          <div className="mt-6 space-y-6">
            <Textarea
              label="Cancellation Policy"
              placeholder="Describe your cancellation policy..."
              rows={3}
              {...register("cancellation_policy")}
            />
            <Textarea
              label="Refund Policy"
              placeholder="Describe your refund policy..."
              rows={3}
              {...register("refund_policy")}
            />

            {/* Custom policies */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Custom Policies
                </label>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={addCustomPolicy}
                >
                  <PlusIcon className="h-4 w-4" />
                  Add Policy
                </Button>
              </div>
              {customPolicies.length === 0 && (
                <p className="text-sm text-gray-400">No custom policies added.</p>
              )}
              <div className="space-y-3">
                {customPolicies.map((policy, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-gray-200 bg-white p-4"
                  >
                    <div className="mb-3 flex items-start justify-between">
                      <Input
                        label="Policy Title"
                        placeholder="e.g. Dress Code"
                        value={policy.title}
                        onChange={(e) => updateCustomPolicy(index, "title", e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => removeCustomPolicy(index)}
                        className="ml-3 mt-6 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-red-500 hover:bg-red-50"
                        title="Remove policy"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 14 14" fill="none">
                          <path d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>
                    <Textarea
                      label="Description"
                      placeholder="Policy details..."
                      rows={2}
                      value={policy.description}
                      onChange={(e) => updateCustomPolicy(index, "description", e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* ================================================================= */}
        {/* 6. Location Card                                                  */}
        {/* ================================================================= */}
        <Card className="rounded-[2rem] border border-gray-200/80 bg-gradient-to-br from-white via-white to-teal-50/50 shadow-lg shadow-gray-100">
          <SectionHeader
            icon={MapPinIcon}
            eyebrow="Location"
            title="Venue Location"
            description="Set the physical address and map pin for your venue."
          />
          <div className="mt-6 space-y-4">
            <PlacesAutocomplete
              label="Search Location"
              placeholder="Search for an address or place..."
              onPlaceSelect={handlePlaceSelect}
              defaultValue={venue.address ?? ""}
            />

            {lat != null && lng != null && (
              <LocationMapPicker
                lat={lat}
                lng={lng}
                onLocationChange={(newLat, newLng) => {
                  setValue("lat", newLat, { shouldDirty: true });
                  setValue("lng", newLng, { shouldDirty: true });
                }}
              />
            )}

            <div className="rounded-3xl border border-gray-200 bg-white/80 p-5">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                Address Details
              </p>
              <div className="space-y-4">
                <Input
                  label="Street Address"
                  placeholder="123 Main St"
                  error={errors.address_line1?.message}
                  {...register("address_line1")}
                />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Input
                    label="City"
                    placeholder="City"
                    error={errors.city?.message}
                    {...register("city")}
                  />
                  <Input
                    label="Region / State"
                    placeholder="Region"
                    error={errors.region?.message}
                    {...register("region")}
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Input
                    label="Country Code"
                    placeholder="US, FR, etc."
                    error={errors.country_code?.message}
                    {...register("country_code")}
                  />
                  <Input
                    label="Postal Code"
                    placeholder="75001"
                    error={errors.postal_code?.message}
                    {...register("postal_code")}
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* ================================================================= */}
        {/* Bottom save button                                                */}
        {/* ================================================================= */}
        <div className="flex justify-end gap-3 pb-8">
          <Button
            variant="outline"
            type="button"
            onClick={() => router.push(`/venues/${id}`)}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={isPending || !formIsDirty}
          >
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </MainLayout>
  );
}
