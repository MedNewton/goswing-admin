import type { SetAllCookies } from "@supabase/ssr";
import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { env } from "@/env";

export function createSupabaseMiddlewareClient(
  request: NextRequest,
  response: NextResponse,
  accessToken?: string | null,
) {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase public env vars are not configured.");
  }

  const setAllCookies: SetAllCookies = (cookiesToSet) => {
    cookiesToSet.forEach(({ name, value, options }) => {
      request.cookies.set(name, value);
      const cookieOptions = options as Parameters<
        typeof response.cookies.set
      >[2];
      response.cookies.set(name, value, cookieOptions);
    });
  };

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll: setAllCookies,
      },
      global: accessToken
        ? {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        : undefined,
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    },
  );
}
