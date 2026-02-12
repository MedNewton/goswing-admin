import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/env";
import { getClerkSupabaseToken } from "./token";

export function createSupabaseBrowserClient() {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase public env vars are not configured.");
  }

  return createBrowserClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      accessToken: getClerkSupabaseToken,
    },
  );
}
