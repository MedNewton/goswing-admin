"use client";

import { MainLayout } from "@/components/layout/MainLayout";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  SettingsIcon,
  UsersIcon,
  MailIcon,
  BellIcon,
  ChevronRightIcon,
} from "@/components/icons";
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
import type { ComponentType, SVGProps } from "react";

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

const SETTINGS_LINKS: {
  label: string;
  description: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  tone: string;
  danger?: boolean;
}[] = [
  {
    label: "General Settings",
    description: "App preferences and display options",
    href: "/settings/general",
    icon: SettingsIcon,
    tone: "bg-sky-50 text-sky-600",
  },
  {
    label: "Notifications",
    description: "Manage email and push notification preferences",
    href: "/settings/general",
    icon: BellIcon,
    tone: "bg-amber-50 text-amber-600",
  },
  {
    label: "Security & Password",
    description: "Change password, enable two-factor authentication",
    href: "/settings/general",
    icon: SettingsIcon,
    tone: "bg-emerald-50 text-emerald-600",
  },
  {
    label: "Delete Account",
    description: "Permanently delete your account and data",
    href: "/settings/general",
    icon: UsersIcon,
    tone: "bg-red-50 text-red-600",
    danger: true,
  },
];

// ---------------------------------------------------------------------------
// Shared UI
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

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function ProfileSettingsPage() {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
      {/* Hero Header */}
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-teal-800 p-8 text-white shadow-xl shadow-slate-200">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(45,212,191,0.22),_transparent_34%)]" />
        <div className="relative flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/12 text-white backdrop-blur">
            <UsersIcon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-teal-100/75">
              Account
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              My Profile
            </h1>
            <p className="mt-1 max-w-lg text-sm text-slate-300">
              Manage your personal information and account settings.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto mt-6 max-w-3xl space-y-6">
        {/* Messages */}
        {serverError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {serverError}
          </div>
        )}
        {successMessage && (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Profile Picture */}
          <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100 sm:p-8">
            <SectionHeader
              icon={UsersIcon}
              eyebrow="Avatar"
              title="Profile Picture"
              description="Upload a photo so people can recognize you."
            />
            <div className="mt-6 flex items-center gap-5">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-dashed border-gray-200 bg-gray-50">
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
                  <div className="flex h-full items-center justify-center text-gray-300">
                    <UsersIcon className="h-8 w-8" />
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
          </div>

          {/* Personal Information */}
          <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100 sm:p-8">
            <SectionHeader
              icon={MailIcon}
              eyebrow="Personal"
              title="Personal Information"
              description="Your name, email, and contact details."
            />
            <div className="mt-6 space-y-4">
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
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button variant="primary" type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </form>

        {/* Account & Settings */}
        <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100 sm:p-8">
          <SectionHeader
            icon={SettingsIcon}
            eyebrow="Configuration"
            title="Account & Settings"
            description="Manage your preferences, notifications, and security."
          />
          <div className="mt-6 space-y-3">
            {SETTINGS_LINKS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="group flex items-center gap-4 rounded-2xl border border-gray-100 px-5 py-4 transition-all hover:-translate-y-0.5 hover:border-gray-200 hover:shadow-md"
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.tone}`}>
                  <item.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-medium ${
                      item.danger ? "text-red-600" : "text-gray-900"
                    }`}
                  >
                    {item.label}
                  </p>
                  <p className="text-xs text-gray-500">{item.description}</p>
                </div>
                <div className="rounded-full bg-gray-100 p-1.5 text-gray-400 transition-transform group-hover:translate-x-0.5">
                  <ChevronRightIcon className="h-4 w-4" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
