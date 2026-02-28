"use client";

import { MainLayout } from "@/components/layout/MainLayout";
import {
  BuildingIcon,
  CalendarIcon,
  GlobeIcon,
  MailIcon,
  MapPinIcon,
  SettingsIcon,
  StarIcon,
} from "@/components/icons";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import {
  useState,
  useEffect,
  useTransition,
  useRef,
  type ComponentType,
  type SVGProps,
} from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  completeOnboardingAction,
  fetchOrganizerForOnboarding,
  uploadOrganizerImageAction,
  type OnboardingResult,
} from "@/lib/actions/organizer";

// ---------------------------------------------------------------------------
// Zod Schema
// ---------------------------------------------------------------------------

const settingsFormSchema = z.object({
  name: z.string().min(1, "Organization name is required").max(100),
  tagline: z.string().max(200).optional().or(z.literal("")),
  about: z.string().max(2000).optional().or(z.literal("")),
  city: z.string().min(1, "City is required"),
  country_code: z.string().min(1, "Country is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional().or(z.literal("")),
  website_url: z.union([z.string().url("Invalid URL"), z.literal("")]).optional(),
  instagram_handle: z.string().max(100).optional().or(z.literal("")),
  facebook_handle: z.string().max(100).optional().or(z.literal("")),
  logo_url: z.string().optional().or(z.literal("")),
  cover_image_url: z.string().optional().or(z.literal("")),
  established_year: z.string().optional().or(z.literal("")),
  specialties: z.string().optional().or(z.literal("")),
  cancellation_policy: z.string().max(2000).optional().or(z.literal("")),
  refund_policy: z.string().max(2000).optional().or(z.literal("")),
  response_time_hours: z.string().optional().or(z.literal("")),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

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
        <span className="text-xs font-semibold uppercase tracking-[0.18em]">
          {label}
        </span>
      </div>
      <p className="mt-4 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Country options
// ---------------------------------------------------------------------------

const COUNTRY_OPTIONS = [
  { value: "", label: "Select a country" },
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
  { value: "FR", label: "France" },
  { value: "DE", label: "Germany" },
  { value: "ES", label: "Spain" },
  { value: "IT", label: "Italy" },
  { value: "NL", label: "Netherlands" },
  { value: "BE", label: "Belgium" },
  { value: "CH", label: "Switzerland" },
  { value: "AT", label: "Austria" },
  { value: "PT", label: "Portugal" },
  { value: "SE", label: "Sweden" },
  { value: "NO", label: "Norway" },
  { value: "DK", label: "Denmark" },
  { value: "FI", label: "Finland" },
  { value: "IE", label: "Ireland" },
  { value: "CA", label: "Canada" },
  { value: "AU", label: "Australia" },
  { value: "NZ", label: "New Zealand" },
  { value: "MA", label: "Morocco" },
  { value: "TN", label: "Tunisia" },
  { value: "DZ", label: "Algeria" },
  { value: "EG", label: "Egypt" },
  { value: "AE", label: "United Arab Emirates" },
  { value: "SA", label: "Saudi Arabia" },
  { value: "JP", label: "Japan" },
  { value: "KR", label: "South Korea" },
  { value: "BR", label: "Brazil" },
  { value: "MX", label: "Mexico" },
  { value: "IN", label: "India" },
];

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Image states
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [coverError, setCoverError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      name: "",
      tagline: "",
      about: "",
      city: "",
      country_code: "",
      email: "",
      phone: "",
      website_url: "",
      instagram_handle: "",
      facebook_handle: "",
      logo_url: "",
      cover_image_url: "",
      established_year: "",
      specialties: "",
      cancellation_policy: "",
      refund_policy: "",
      response_time_hours: "",
    },
  });

  // Load existing organizer data
  useEffect(() => {
    void (async () => {
      try {
        const org = await fetchOrganizerForOnboarding();
        if (org) {
          reset({
            name: org.name ?? "",
            tagline: org.tagline ?? "",
            about: org.about ?? "",
            city: org.city ?? "",
            country_code: org.country_code ?? "",
            email: org.email ?? "",
            phone: org.phone ?? "",
            website_url: org.website_url ?? "",
            instagram_handle: org.instagram_handle ?? "",
            facebook_handle: org.facebook_handle ?? "",
            logo_url: org.logo_url ?? "",
            cover_image_url: org.cover_image_url ?? "",
            established_year: org.established_year?.toString() ?? "",
            specialties: org.specialties?.join(", ") ?? "",
            cancellation_policy: org.cancellation_policy ?? "",
            refund_policy: org.refund_policy ?? "",
            response_time_hours: org.response_time_hours?.toString() ?? "",
          });
          if (org.logo_url) setLogoPreview(org.logo_url);
          if (org.cover_image_url) setCoverPreview(org.cover_image_url);
        }
      } catch {
        // Continue with empty form
      } finally {
        setLoading(false);
      }
    })();
  }, [reset]);

  const handleImageUpload = async (
    file: File,
    setPreview: (url: string | null) => void,
    setUploading: (v: boolean) => void,
    setError: (err: string | null) => void,
    fieldName: "logo_url" | "cover_image_url",
  ) => {
    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);
    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const result = await uploadOrganizerImageAction(formData);
      if (result.success) {
        setValue(fieldName, result.url);
        setPreview(result.url);
      } else {
        setError(result.error);
        setPreview(null);
        setValue(fieldName, "");
      }
    } catch {
      setError("Failed to upload image. Please try again.");
      setPreview(null);
      setValue(fieldName, "");
    } finally {
      setUploading(false);
    }
  };

  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleImageUpload(file, setLogoPreview, setIsUploadingLogo, setLogoError, "logo_url");
  };

  const handleCoverSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleImageUpload(file, setCoverPreview, setIsUploadingCover, setCoverError, "cover_image_url");
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    setValue("logo_url", "");
    setLogoError(null);
    if (logoInputRef.current) logoInputRef.current.value = "";
  };

  const handleRemoveCover = () => {
    setCoverPreview(null);
    setValue("cover_image_url", "");
    setCoverError(null);
    if (coverInputRef.current) coverInputRef.current.value = "";
  };

  const onSubmit = (data: SettingsFormValues) => {
    setServerError(null);
    setSuccessMessage(null);
    startTransition(async () => {
      try {
        const result: OnboardingResult = await completeOnboardingAction({
          ...data,
          established_year: data.established_year ? Number(data.established_year) : undefined,
          response_time_hours: data.response_time_hours ? Number(data.response_time_hours) : undefined,
        } as Parameters<typeof completeOnboardingAction>[0]);
        if (result.success) {
          setSuccessMessage("Settings saved successfully.");
        } else {
          setServerError(result.error);
        }
      } catch {
        setServerError("An unexpected error occurred. Please try again.");
      }
    });
  };

  const nameValue = watch("name");
  const cityValue = watch("city");
  const countryCodeValue = watch("country_code");
  const emailValue = watch("email");
  const websiteValue = watch("website_url");
  const establishedYearValue = watch("established_year");
  const normalizedWebsiteValue = websiteValue.trim() ? websiteValue : undefined;
  const normalizedEstablishedYearValue = establishedYearValue.trim()
    ? establishedYearValue
    : undefined;

  if (loading) {
    return (
      <MainLayout title="Settings">
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Settings">
      <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-7xl space-y-6">
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

        <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-teal-800 p-8 text-white shadow-xl shadow-slate-200">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(45,212,191,0.22),_transparent_34%)]" />
          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/12 text-white backdrop-blur">
                <SettingsIcon className="h-6 w-6" />
              </div>
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.3em] text-teal-100/75">
                Organizer Profile
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                {nameValue || "Your organization profile"}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200">
                Manage your brand presence, contact details, online links, and operational policies from one profile editor.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/90 backdrop-blur">
                  {cityValue || "City not set"}
                  {countryCodeValue ? `, ${countryCodeValue}` : ""}
                </div>
                <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/90 backdrop-blur">
                  {emailValue || "Email not set"}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <SummaryCard
                icon={BuildingIcon}
                label="Profile"
                value={nameValue || "Incomplete"}
                accentClass="bg-sky-50 text-sky-700"
              />
              <SummaryCard
                icon={MapPinIcon}
                label="Location"
                value={cityValue || "Not set"}
                accentClass="bg-emerald-50 text-emerald-700"
              />
              <SummaryCard
                icon={GlobeIcon}
                label="Website"
                value={normalizedWebsiteValue ?? "Not set"}
                accentClass="bg-amber-50 text-amber-700"
              />
              <SummaryCard
                icon={CalendarIcon}
                label="Established"
                value={normalizedEstablishedYearValue ?? "Not set"}
                accentClass="bg-rose-50 text-rose-700"
              />
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.95fr)]">
          <Card className="rounded-[2rem] border border-gray-200/80 bg-gradient-to-br from-white via-white to-slate-50 shadow-lg shadow-gray-100">
            <SectionHeader
              icon={BuildingIcon}
              eyebrow="Identity"
              title="Organization Details"
              description="Core public-facing profile fields for your organizer page."
            />
            <div className="mt-6 space-y-4">
              <Input
                label="Organization Name"
                placeholder="e.g., Swing City Events"
                error={errors.name?.message}
                {...register("name")}
              />
              <Input
                label="Tagline (optional)"
                placeholder="A short description of what you do"
                error={errors.tagline?.message}
                {...register("tagline")}
              />
              <Textarea
                label="About (optional)"
                placeholder="Tell people about your organization..."
                rows={5}
                error={errors.about?.message}
                {...register("about")}
              />
            </div>
          </Card>

          <Card className="rounded-[2rem] border border-gray-200/80 bg-white shadow-lg shadow-gray-100">
            <SectionHeader
              icon={StarIcon}
              eyebrow="Branding"
              title="Logo & Cover"
              description="Keep your organizer visuals aligned with listings and public pages."
            />
            <div className="mt-6 space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Logo</label>
                <div className="flex items-center gap-4">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-dashed border-gray-300 bg-gray-50">
                    {logoPreview ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={logoPreview} alt="Logo preview" className="h-full w-full object-cover" />
                        {isUploadingLogo && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-400">
                        <span className="text-2xl">+</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleLogoSelect}
                      className="hidden"
                      id="logo-input"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={isUploadingLogo}
                      >
                        {isUploadingLogo ? "Uploading..." : logoPreview ? "Change" : "Upload Logo"}
                      </Button>
                      {logoPreview && !isUploadingLogo && (
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          onClick={handleRemoveLogo}
                          className="text-red-600 hover:text-red-700"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    {logoError && <p className="mt-1 text-sm text-red-600">{logoError}</p>}
                    <p className="mt-1 text-xs text-gray-400">Square image, max 5MB</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Cover Image</label>
                <div className="relative h-44 w-full overflow-hidden rounded-[1.5rem] border-2 border-dashed border-gray-300 bg-gray-50">
                  {coverPreview ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={coverPreview} alt="Cover preview" className="h-full w-full object-cover" />
                      {isUploadingCover && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex h-full items-center justify-center text-gray-400">
                      <span className="text-4xl">+</span>
                    </div>
                  )}
                </div>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleCoverSelect}
                  className="hidden"
                  id="cover-input"
                />
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    disabled={isUploadingCover}
                  >
                    {isUploadingCover ? "Uploading..." : coverPreview ? "Change Cover" : "Upload Cover"}
                  </Button>
                  {coverPreview && !isUploadingCover && (
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={handleRemoveCover}
                      className="text-red-600 hover:text-red-700"
                    >
                      Remove
                    </Button>
                  )}
                </div>
                {coverError && <p className="mt-1 text-sm text-red-600">{coverError}</p>}
                <p className="mt-1 text-xs text-gray-400">Recommended: 1200 x 400px, max 5MB</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="rounded-[2rem] border border-gray-200/80 bg-gradient-to-br from-white via-white to-teal-50/50 shadow-lg shadow-gray-100">
            <SectionHeader
              icon={MapPinIcon}
              eyebrow="Contact"
              title="Location & Contact"
              description="Primary operating city, country, and attendee-facing contact details."
            />
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="City"
                  placeholder="e.g., Paris"
                  error={errors.city?.message}
                  {...register("city")}
                />
                <Select
                  label="Country"
                  options={COUNTRY_OPTIONS}
                  error={errors.country_code?.message}
                  {...register("country_code")}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Email"
                  type="email"
                  placeholder="contact@yourorg.com"
                  error={errors.email?.message}
                  {...register("email")}
                />
                <Input
                  label="Phone (optional)"
                  type="tel"
                  placeholder="+33 1 23 45 67 89"
                  error={errors.phone?.message}
                  {...register("phone")}
                />
              </div>
            </div>
          </Card>

          <Card className="rounded-[2rem] border border-gray-200/80 bg-gradient-to-br from-white via-white to-slate-50 shadow-lg shadow-gray-100">
            <SectionHeader
              icon={GlobeIcon}
              eyebrow="Links"
              title="Online Presence"
              description="Website and social channels connected to your organizer brand."
            />
            <div className="mt-6 space-y-4">
              <Input
                label="Website"
                type="url"
                placeholder="https://yourorg.com"
                error={errors.website_url?.message}
                {...register("website_url")}
              />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Instagram"
                  placeholder="@yourhandle"
                  error={errors.instagram_handle?.message}
                  {...register("instagram_handle")}
                />
                <Input
                  label="Facebook"
                  placeholder="@yourpage"
                  error={errors.facebook_handle?.message}
                  {...register("facebook_handle")}
                />
              </div>
            </div>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="rounded-[2rem] border border-gray-200/80 bg-gradient-to-br from-white via-white to-amber-50/50 shadow-lg shadow-gray-100">
            <SectionHeader
              icon={CalendarIcon}
              eyebrow="Profile Data"
              title="Additional Details"
              description="Internal context fields that help shape your organizer profile."
            />
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Established Year"
                  type="number"
                  placeholder="e.g., 2020"
                  min="1900"
                  max="2100"
                  error={errors.established_year?.message}
                  {...register("established_year")}
                />
                <Input
                  label="Avg. Response Time (hours)"
                  type="number"
                  placeholder="e.g., 24"
                  min="0"
                  step="0.5"
                  error={errors.response_time_hours?.message}
                  {...register("response_time_hours")}
                />
              </div>
              <Input
                label="Specialties"
                placeholder="e.g., Swing, Jazz, Live Music (comma-separated)"
                error={errors.specialties?.message}
                {...register("specialties")}
              />
            </div>
          </Card>

          <Card className="rounded-[2rem] border border-gray-200/80 bg-gradient-to-br from-white via-white to-slate-50 shadow-lg shadow-gray-100">
            <SectionHeader
              icon={MailIcon}
              eyebrow="Policies"
              title="Organizer Policies"
              description="Set attendee-facing guidelines for cancellations and refunds."
            />
            <div className="mt-6 space-y-4">
              <Textarea
                label="Cancellation Policy"
                placeholder="Describe your cancellation policy..."
                rows={4}
                error={errors.cancellation_policy?.message}
                {...register("cancellation_policy")}
              />
              <Textarea
                label="Refund Policy"
                placeholder="Describe your refund policy..."
                rows={4}
                error={errors.refund_policy?.message}
                {...register("refund_policy")}
              />
            </div>
          </Card>
        </div>

        <div className="flex justify-end pb-6">
          <Button variant="primary" type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </MainLayout>
  );
}
