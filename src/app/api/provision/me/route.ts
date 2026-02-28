import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { env } from "@/env";
import { provisionUser } from "@/lib/provisioning/userProvisioning";

export const runtime = "nodejs";

export async function POST() {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ ok: true, skipped: true }, { status: 200 });
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let email: string | null = null;
  let firstName: string | null = null;
  let lastName: string | null = null;
  let imageUrl: string | null = null;

  try {
    const user = await currentUser();
    if (user) {
      firstName = user.firstName ?? null;
      lastName = user.lastName ?? null;
      imageUrl = user.imageUrl ?? null;
      email = user.emailAddresses.find(
        (candidate) => candidate.id === user.primaryEmailAddressId,
      )?.emailAddress ?? null;
    }
  } catch {
    // Continue with minimal payload when Clerk profile details are unavailable.
  }

  try {
    const result = await provisionUser({
      userId,
      email,
      firstName,
      lastName,
      imageUrl,
    });
    return NextResponse.json({ ok: true, needsOnboarding: result.needsOnboarding }, { status: 200 });
  } catch (error) {
    console.error("[provisioning] self-heal failed", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
