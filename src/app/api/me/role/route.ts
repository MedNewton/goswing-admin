import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ role: "admin" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_DATABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ role: "admin" });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data } = await supabase
    .from("organizer_members")
    .select("role")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (!data) {
    // Fallback: check if owner
    const { data: orgData } = await supabase
      .from("organizers")
      .select("id")
      .eq("owner_user_id", userId)
      .limit(1)
      .maybeSingle();

    return NextResponse.json({ role: orgData ? "admin" : "dj" });
  }

  const validRoles = ["admin", "dj", "entrance_manager", "finance_manager"] as const;
  type Role = (typeof validRoles)[number];
  const rawRole = (data as { role: string | null }).role;
  const role: Role = (validRoles as readonly string[]).includes(rawRole ?? "")
    ? (rawRole as Role)
    : "admin";
  return NextResponse.json({ role });
}
