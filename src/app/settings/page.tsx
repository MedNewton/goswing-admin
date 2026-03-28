"use client";

import { MainLayout } from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useState, useEffect, useTransition, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  fetchProfile,
  updateProfileAction,
  type ProfileActionResult,
} from "@/lib/actions/profile";
import { uploadOrganizerImageAction } from "@/lib/actions/organizer";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Zod Schema
// ---------------------------------------------------------------------------

const profileFormSchema = z.object({
  display_name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  phone_number: z.string().max(30).optional().or(z.literal("")),
  occupation: z.string().max(100).optional().or(z.literal("")),
  avatar_url: z.string().optional().or(z.literal("")),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

// ---------------------------------------------------------------------------
// Settings Links
// ---------------------------------------------------------------------------

const SETTINGS_LINKS = [
  {
    label: "General Settings",
    description: "App preferences and display options",
    href: "/settings/general",
  },
  {
    label: "Notifications",
    description: "Manage email and push notification preferences",
    href: "/settings/general",
  },
  {
    label: "Security & Password",
    description: "Change password, enable two-factor authentication",
    href: "/settings/general",
  },
  {
    label: "Delete Account",
    description: "Permanently delete your account and data",
    href: "/settings/general",
    danger: true,
  },
];

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function ProfileSettingsPage() {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Avatar states
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      display_name: "",
      email: "",
      phone_number: "",
      occupation: "",
      avatar_url: "",
    },
  });

  // Load profile data
  useEffect(() => {
    void (async () => {
      try {
        const profile = await fetchProfile();
        if (profile) {
          reset({
            display_name: profile.display_name ?? "",
            email: profile.email ?? "",
            phone_number: profile.phone_number ?? "",
            occupation: profile.occupation ?? "",
            avatar_url: profile.avatar_url ?? "",
          });
          if (profile.avatar_url) setAvatarPreview(profile.avatar_url);
        }
      } catch {
        // Continue with empty form
      } finally {
        setLoading(false);
      }
    })();
  }, [reset]);

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);
    setAvatarError(null);
    setIsUploadingAvatar(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await uploadOrganizerImageAction(formData);
      if (result.success) {
        setValue("avatar_url", result.url);
        setAvatarPreview(result.url);
      } else {
        setAvatarError(result.error);
        setAvatarPreview(null);
        setValue("avatar_url", "");
      }
    } catch {
      setAvatarError("Failed to upload image.");
      setAvatarPreview(null);
      setValue("avatar_url", "");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview(null);
    setValue("avatar_url", "");
    setAvatarError(null);
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  };

  const onSubmit = (data: ProfileFormValues) => {
    setServerError(null);
    setSuccessMessage(null);
    startTransition(async () => {
      try {
        const result: ProfileActionResult = await updateProfileAction(data);
        if (result.success) {
          setSuccessMessage("Profile updated successfully.");
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
      <MainLayout>
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">My Profile</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your personal information and account settings.
        </p>
      </div>

      <div className="mx-auto max-w-3xl space-y-6">
        {/* Messages */}
        {serverError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {serverError}
          </div>
        )}
        {successMessage && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Profile Picture */}
          <Card>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Profile Picture
            </h2>
            <div className="flex items-center gap-5">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-dashed border-gray-300 bg-gray-50">
                {avatarPreview ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={avatarPreview}
                      alt="Profile"
                      className="h-full w-full object-cover"
                    />
                    {isUploadingAvatar && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center text-gray-400">
                    <span className="text-3xl">+</span>
                  </div>
                )}
              </div>
              <div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleAvatarSelect}
                  className="hidden"
                  id="avatar-input"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                  >
                    {isUploadingAvatar
                      ? "Uploading..."
                      : avatarPreview
                        ? "Change Photo"
                        : "Upload Photo"}
                  </Button>
                  {avatarPreview && !isUploadingAvatar && (
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="text-red-600 hover:text-red-700"
                    >
                      Remove
                    </Button>
                  )}
                </div>
                {avatarError && (
                  <p className="mt-1 text-sm text-red-600">{avatarError}</p>
                )}
                <p className="mt-1 text-xs text-gray-400">
                  Square image, max 5MB
                </p>
              </div>
            </div>
          </Card>

          {/* Personal Information */}
          <Card>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Personal Information
            </h2>
            <div className="space-y-4">
              <Input
                label="Full Name"
                placeholder="Your name"
                error={errors.display_name?.message}
                {...register("display_name")}
              />
              <Input
                label="Email"
                type="email"
                placeholder="you@example.com"
                error={errors.email?.message}
                {...register("email")}
              />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Phone Number"
                  type="tel"
                  placeholder="+1 234 567 890"
                  error={errors.phone_number?.message}
                  {...register("phone_number")}
                />
                <Input
                  label="Occupation"
                  placeholder="e.g., Event Manager"
                  error={errors.occupation?.message}
                  {...register("occupation")}
                />
              </div>
            </div>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button variant="primary" type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </form>

        {/* Settings & Account */}
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Account & Settings
          </h2>
          <div className="divide-y divide-gray-100">
            {SETTINGS_LINKS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
              >
                <div>
                  <p
                    className={`text-sm font-medium ${
                      item.danger ? "text-red-600" : "text-gray-900"
                    }`}
                  >
                    {item.label}
                  </p>
                  <p className="text-xs text-gray-500">{item.description}</p>
                </div>
                <span className="text-gray-400">&rsaquo;</span>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
