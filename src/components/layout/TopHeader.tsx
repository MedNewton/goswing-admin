"use client";

import { useState, useEffect } from "react";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { BellIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { getClientLocale, translate, setLocale as persistLocale } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n";

export function TopHeader() {
  const [locale, setLocale] = useState<Locale>("fr");
  useEffect(() => { setLocale(getClientLocale()); }, []);

  const handleLocaleChange = (next: Locale) => {
    if (next === locale) return;
    persistLocale(next);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      {/* Logo */}
      <Link href="/overview" className="text-xl font-bold text-gray-900">
        GoSwing
      </Link>

      {/* Right Side Actions */}
      <div className="flex items-center gap-4">
        {/* Language Switcher */}
        <div
          role="group"
          aria-label="Language"
          className="inline-flex overflow-hidden rounded-lg border border-gray-300 bg-white text-xs font-semibold"
        >
          <button
            type="button"
            onClick={() => handleLocaleChange("fr")}
            aria-pressed={locale === "fr"}
            className={`px-2.5 py-1 transition-colors ${
              locale === "fr"
                ? "bg-gray-900 text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            FR
          </button>
          <button
            type="button"
            onClick={() => handleLocaleChange("en")}
            aria-pressed={locale === "en"}
            className={`px-2.5 py-1 transition-colors ${
              locale === "en"
                ? "bg-gray-900 text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            EN
          </button>
        </div>

        {/* Create Event Button */}
        <SignedIn>
          <Link href="/events/create">
            <Button variant="primary" size="sm">
              {translate(locale, "header.createEvent")}
            </Button>
          </Link>
        </SignedIn>

        {/* Notifications */}
        <SignedIn>
          <button
            aria-label={translate(locale, "header.notifications")}
            className="rounded-lg p-2 text-gray-700 transition-colors hover:bg-gray-100"
          >
            <BellIcon className="h-5 w-5" />
          </button>
        </SignedIn>

        <SignedOut>
          <Link
            href="/login"
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            {translate(locale, "header.logIn")}
          </Link>
        </SignedOut>

        <SignedIn>
          <UserButton afterSignOutUrl="/login" />
        </SignedIn>
      </div>
    </header>
  );
}
