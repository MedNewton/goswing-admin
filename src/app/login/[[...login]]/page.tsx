"use client";

import { ClerkFailed, SignIn, SignOutButton, useAuth } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import { CalendarIcon, ChartIcon, DollarIcon } from "@/components/icons";
import { LanguageSwitcher } from "@/components/discover/LanguageSwitcher";
import { getClientLocale, translate } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n";
import type { ComponentType, SVGProps } from "react";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

function FeatureItem({
  icon: Icon,
  title,
  description,
  tone,
}: {
  icon: IconComponent;
  title: string;
  description: string;
  tone: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="mt-0.5 text-xs text-slate-300">{description}</p>
      </div>
    </div>
  );
}

function SignInPanel({ locale }: { locale: Locale }) {
  const { isLoaded, isSignedIn } = useAuth();

  return (
    <>
      <ClerkFailed>
        <div className="w-full rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-semibold text-gray-900">
            {translate(locale, "login.failedTitle")}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {translate(locale, "login.failedDesc")}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            {translate(locale, "login.retry")}
          </button>
        </div>
      </ClerkFailed>

      {!isLoaded ? (
        // clerk-js is still downloading; without this the panel is empty.
        <div className="flex w-full flex-col items-center gap-3 py-16 text-sm text-gray-500">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
          {translate(locale, "login.loading")}
        </div>
      ) : isSignedIn ? (
        // <SignIn/> renders nothing for a signed-in user and silently
        // redirects, which looked like a blank page. Be explicit instead.
        <div className="w-full rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-medium text-gray-900">
            {translate(locale, "login.alreadySignedIn")}
          </p>
          <div className="mt-4 flex flex-col items-center gap-2">
            <a
              href="/overview"
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              {translate(locale, "login.continue")}
            </a>
            <SignOutButton redirectUrl="/login">
              <button
                type="button"
                className="text-sm text-gray-500 underline hover:text-gray-700"
              >
                {translate(locale, "login.signOut")}
              </button>
            </SignOutButton>
          </div>
        </div>
      ) : (
        <SignIn
          path="/login"
          routing="path"
          // Sign-up happens inside this page (/login/create) instead of
          // Clerk's hosted page, which sent new accounts to "/".
          withSignUp
          fallbackRedirectUrl="/overview"
          forceRedirectUrl="/overview"
          // New accounts go to /overview too; the middleware then sends
          // them to /onboarding.
          signUpFallbackRedirectUrl="/overview"
          signUpForceRedirectUrl="/overview"
        />
      )}
    </>
  );
}

export default function LoginPage() {
  const [locale, setLocale] = useState<Locale>("fr");
  useEffect(() => {
    setLocale(getClientLocale());
  }, []);

  return (
    <main className="flex min-h-screen bg-gray-50">
      {/* Left Panel — Branding */}
      <div className="relative hidden w-[480px] shrink-0 overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-teal-800 lg:flex lg:flex-col">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.16),_transparent_32%),radial-gradient(circle_at_bottom_left,_rgba(45,212,191,0.20),_transparent_34%)]" />

        <div className="relative flex flex-1 flex-col justify-between p-10">
          {/* Logo */}
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              GoSwing
            </h2>
          </div>

          {/* Content */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-teal-100/75">
              {translate(locale, "login.eyebrow")}
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
              {translate(locale, "login.title")}
            </h1>
            <p className="mt-3 max-w-sm text-sm leading-6 text-slate-300">
              {translate(locale, "login.subtitle")}
            </p>

            <div className="mt-10 space-y-5">
              <FeatureItem
                icon={CalendarIcon}
                title={translate(locale, "login.feature1Title")}
                description={translate(locale, "login.feature1Desc")}
                tone="bg-sky-500/20 text-sky-300"
              />
              <FeatureItem
                icon={ChartIcon}
                title={translate(locale, "login.feature2Title")}
                description={translate(locale, "login.feature2Desc")}
                tone="bg-emerald-500/20 text-emerald-300"
              />
              <FeatureItem
                icon={DollarIcon}
                title={translate(locale, "login.feature3Title")}
                description={translate(locale, "login.feature3Desc")}
                tone="bg-amber-500/20 text-amber-300"
              />
            </div>
          </div>

          {/* Footer */}
          <p className="text-xs text-slate-400">
            &copy; {new Date().getFullYear()} GoSwing. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right Panel — Sign In */}
      <div className="flex flex-1 flex-col">
        {/* Top bar with language switcher */}
        <div className="flex items-center justify-between px-6 py-4 sm:px-10">
          <h2 className="text-lg font-bold text-gray-900 lg:hidden">
            GoSwing
          </h2>
          <div className="ml-auto">
            <LanguageSwitcher />
          </div>
        </div>

        {/* Sign In form centered */}
        <div className="flex flex-1 items-center justify-center px-6 pb-10">
          <div className="w-full max-w-md">
            {/* Mobile-only heading */}
            <div className="mb-6 text-center lg:hidden">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">
                {translate(locale, "login.eyebrow")}
              </p>
              <h1 className="mt-1 text-2xl font-semibold text-gray-900">
                {translate(locale, "login.title")}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {translate(locale, "login.subtitle")}
              </p>
            </div>

            <div className="flex justify-center">
              <SignInPanel locale={locale} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
