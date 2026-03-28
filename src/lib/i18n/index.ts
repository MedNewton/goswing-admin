import { cookies } from "next/headers";
import en, { type TranslationKey } from "./en";
import fr from "./fr";

export type Locale = "fr" | "en";

const translations: Record<Locale, Record<string, string>> = { en, fr };

export const DEFAULT_LOCALE: Locale = "fr";

/** Read the preferred locale from the cookie (server-side). */
export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const value = cookieStore.get("locale")?.value;
  if (value === "en" || value === "fr") return value;
  return DEFAULT_LOCALE;
}

/** Translate a key for the given locale. Falls back to English, then the key itself. */
export function t(locale: Locale, key: TranslationKey): string {
  return translations[locale]?.[key] ?? translations.en[key] ?? key;
}
