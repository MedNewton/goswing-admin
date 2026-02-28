"use client";

import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useState, useEffect, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
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
// Zod Schema (mirrors server-side)
// ---------------------------------------------------------------------------

const onboardingFormSchema = z.object({
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

type OnboardingFormValues = z.infer<typeof onboardingFormSchema>;

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

export default function OnboardingPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
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
    formState: { errors },
  } = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingFormSchema),
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

  // Load existing organizer data to pre-fill the form
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
  }, [reset, router]);

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

  const onSubmit = (data: OnboardingFormValues) => {
    setServerError(null);
    startTransition(async () => {
      try {
        const result: OnboardingResult = await completeOnboardingAction({
          ...data,
          established_year: data.established_year ? Number(data.established_year) : undefined,
          response_time_hours: data.response_time_hours ? Number(data.response_time_hours) : undefined,
        } as Parameters<typeof completeOnboardingAction>[0]);
        if (result.success) {
          window.location.href = "/";
          return;
        } else {
          setServerError(result.error);
        }
      } catch {
        setServerError("An unexpected error occurred. Please try again.");
      }
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome to GoSwing
          </h1>
          <p className="mt-2 text-gray-600">
            Set up your organizer profile to start creating events
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Server Error */}
          {serverError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {serverError}
            </div>
          )}

          {/* Logo & Cover Images */}
          <Card>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Branding
            </h2>
            <div className="space-y-6">
              {/* Logo */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Logo
                </label>
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

              {/* Cover Image */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Cover Image
                </label>
                <div className="relative h-40 w-full overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
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
                <div className="mt-2 flex gap-2">
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

          {/* Organization Basics */}
          <Card>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Organization Details
            </h2>
            <div className="space-y-4">
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
                rows={4}
                error={errors.about?.message}
                {...register("about")}
              />
            </div>
          </Card>

          {/* Location & Contact */}
          <Card>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Location & Contact
            </h2>
            <div className="space-y-4">
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

          {/* Online Presence */}
          <Card>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Online Presence
              <span className="ml-2 text-sm font-normal text-gray-400">(optional)</span>
            </h2>
            <div className="space-y-4">
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

          {/* Additional Details */}
          <Card>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Additional Details
              <span className="ml-2 text-sm font-normal text-gray-400">(optional)</span>
            </h2>
            <div className="space-y-4">
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

          {/* Policies */}
          <Card>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Policies
              <span className="ml-2 text-sm font-normal text-gray-400">(optional)</span>
            </h2>
            <div className="space-y-4">
              <Textarea
                label="Cancellation Policy"
                placeholder="Describe your cancellation policy..."
                rows={3}
                error={errors.cancellation_policy?.message}
                {...register("cancellation_policy")}
              />
              <Textarea
                label="Refund Policy"
                placeholder="Describe your refund policy..."
                rows={3}
                error={errors.refund_policy?.message}
                {...register("refund_policy")}
              />
            </div>
          </Card>

          {/* Submit */}
          <div className="flex justify-end">
            <Button variant="primary" type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Complete Setup"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
