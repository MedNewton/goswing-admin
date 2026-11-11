import { API_BASE_URL } from "@/lib/api/client";

const PRIVATE_HOST =
  /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.0\.0\.0$)/;

/**
 * Turn the URL returned by POST /v1/admin/uploads into one a browser can load.
 *
 * Uploaded files are served publicly by the API host
 * (https://web.gooswing.com/web/image/<id>), but the upload response can come
 * back relative ("/web/image/2801"), on an internal host
 * ("http://localhost:8069/..."), or over plain http. Any of those shows as a
 * broken image on an https page and fails z.string().url() ("Invalid url").
 */
export function normalizeUploadUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;

  const base = new URL(API_BASE_URL);
  let url: URL;
  try {
    url = new URL(trimmed, base);
  } catch {
    return trimmed;
  }

  const isOdooAsset = /^\/web\/(image|content)(\/|$)/.test(url.pathname);
  const isInternalHost = PRIVATE_HOST.test(url.hostname) || !url.hostname.includes(".");

  if (isOdooAsset || isInternalHost) {
    url.protocol = base.protocol;
    url.hostname = base.hostname;
    url.port = base.port; // drop internal ports like :8069
  } else if (url.protocol === "http:") {
    url.protocol = "https:"; // avoid mixed-content blocking on https pages
  }

  const normalized = url.toString();
  if (normalized !== trimmed) {
    console.warn("[uploads] normalized upload URL", { from: trimmed, to: normalized });
  }
  return normalized;
}
