// Website URL helpers shared by the onboarding form (client) and its server action.

/** Website as typed by a person: "www.site.com" → "https://www.site.com". */
export function normalizeWebsiteUrl(raw: string | null | undefined): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return "";
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/** True for an empty value or something that becomes a valid http(s) URL. */
export function isValidWebsiteUrl(raw: string | null | undefined): boolean {
  const normalized = normalizeWebsiteUrl(raw);
  if (!normalized) return true;
  try {
    const url = new URL(normalized);
    return (url.protocol === "http:" || url.protocol === "https:") && url.hostname.includes(".");
  } catch {
    return false;
  }
}
