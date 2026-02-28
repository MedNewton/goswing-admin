import { auth } from "@clerk/nextjs/server";
import type { SetAllCookies } from "@supabase/ssr";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/env";
import type { Database } from "@/types/database";

export async function createSupabaseServerClient() {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase public env vars are not configured.");
  }

  const cookieStore = await cookies();
  const { getToken } = await auth();

  let accessToken: string | null = null;
  try {
    accessToken = await getToken({ template: "supabase" });
  } catch {
    accessToken = null;
  }

  const setAllCookies: SetAllCookies = (cookiesToSet) => {
    try {
      cookiesToSet.forEach(({ name, value, options }) => {
        const cookieOptions = options as Parameters<typeof cookieStore.set>[2];
        cookieStore.set(name, value, cookieOptions);
      });
    } catch {
      // No-op in contexts where response cookie writes are not allowed.
    }
  };

  return createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
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
