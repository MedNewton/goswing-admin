"use client";

import en, { type TranslationKey } from "./en";
import fr from "./fr";
import type { Locale } from "./index";

const translations: Record<Locale, Record<string, string>> = { en, fr };

/** Client-side translation helper. */
export function translate(locale: Locale, key: TranslationKey): string {
  return translations[locale]?.[key] ?? translations.en[key] ?? key;
}

/** Read locale from cookie on the client. */
export function getClientLocale(): Locale {
  if (typeof document === "undefined") return "fr";
  const match = document.cookie.match(/(?:^|; )locale=([^;]*)/);
  const value = match?.[1];
  if (value === "en" || value === "fr") return value;
  return "fr";
}

/** Set the locale cookie and reload. */
export function setLocale(locale: Locale) {
  document.cookie = `locale=${locale};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
  window.location.reload();
}
