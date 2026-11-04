import { auth } from "@clerk/nextjs/server";

/**
 * Thin fetch wrapper for the Gooswing REST API (https://web.gooswing.com).
 *
 * Two entry points:
 *   • adminApiCall()  — authenticated /v1/admin/* calls. Mints a fresh Clerk
 *                       session token per request (tokens expire in ~60s).
 *   • publicApiCall() — unauthenticated /v1/public/* calls used by the
 *                       server-rendered discover pages.
 */

const DEFAULT_BASE_URL = "https://web.gooswing.com";

export const API_BASE_URL: string =
  process.env.GOOSWING_API_BASE_URL ??
  process.env.NEXT_PUBLIC_GOOSWING_API_BASE_URL ??
  DEFAULT_BASE_URL;

export type ApiCallOptions = Readonly<{
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Plain object → JSON body; FormData → multipart body. */
  body?: unknown;
  headers?: Record<string, string>;
  /** Only meaningful for public calls; admin calls are always no-store. */
  revalidate?: number;
  /** Abort the request after this many milliseconds. */
  timeoutMs?: number;
}>;

type ApiErrorBody = Readonly<{
  error?: Readonly<{
    code?: string;
    message?: string;
    details?: unknown;
  }>;
}>;

export class ApiError extends Error {
  readonly code: string;
  readonly details: unknown;
  readonly status: number;

  constructor(
    code: string,
    message: string,
    details: unknown = null,
    status = 0,
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** True when the error is a 404 — used to map "missing" to null/empty. */
export function isNotFound(error: unknown): boolean {
  return isApiError(error) && error.status === 404;
}

function buildQueryString(query: ApiCallOptions["query"]): string {
  if (!query) return "";
  const parts = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
    );
  return parts.length > 0 ? `?${parts.join("&")}` : "";
}

async function rawApiCall<T>(
  path: string,
  token: string | null,
  opts: ApiCallOptions = {},
): Promise<T> {
  const isFormData =
    typeof FormData !== "undefined" && opts.body instanceof FormData;

  const cacheOptions: RequestInit & { next?: { revalidate: number } } =
    opts.revalidate !== undefined && token === null
      ? { next: { revalidate: opts.revalidate } }
      : { cache: "no-store" };

  const res = await fetch(`${API_BASE_URL}${path}${buildQueryString(opts.query)}`, {
    method: opts.method ?? "GET",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.body !== undefined && !isFormData
        ? { "Content-Type": "application/json" }
        : {}),
      ...(opts.headers ?? {}),
    },
    body:
      opts.body === undefined
        ? undefined
        : isFormData
          ? opts.body
          : JSON.stringify(opts.body),
    ...cacheOptions,
    ...(opts.timeoutMs !== undefined
      ? { signal: AbortSignal.timeout(opts.timeoutMs) }
      : {}),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
    const error = body?.error ?? {};
    throw new ApiError(
      error.code ?? `http_${res.status}`,
      error.message ?? res.statusText,
      error.details ?? null,
      res.status,
    );
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/**
 * Authenticated call to /v1/admin/*. A fresh Clerk session token is minted
 * per request — the default session token, NOT the legacy "supabase" template.
 */
export async function adminApiCall<T>(
  path: string,
  opts: ApiCallOptions = {},
): Promise<T> {
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) {
    throw new ApiError("unauthenticated", "No Clerk session", null, 401);
  }
  return rawApiCall<T>(path, token, opts);
}

/** Unauthenticated call to /v1/public/* (server-rendered discover pages). */
export async function publicApiCall<T>(
  path: string,
  opts: ApiCallOptions = {},
): Promise<T> {
  return rawApiCall<T>(path, null, opts);
}

/**
 * Authenticated call with an explicit token — for contexts where auth() is
 * not available the usual way (e.g. middleware passes the token it minted).
 */
export async function adminApiCallWithToken<T>(
  path: string,
  token: string,
  opts: ApiCallOptions = {},
): Promise<T> {
  return rawApiCall<T>(path, token, opts);
}
