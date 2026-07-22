import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { adminApiCall } from "@/lib/api/client";
import type { ApiProvisionResult } from "@/lib/api/types";

export const runtime = "nodejs";

export async function POST() {
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
    const result = await adminApiCall<ApiProvisionResult>(
      "/v1/admin/me/provision",
      {
        method: "POST",
        body: { email, firstName, lastName, imageUrl },
      },
    );
    return NextResponse.json(
      { ok: true, needsOnboarding: result.needsOnboarding },
      { status: 200 },
    );
  } catch (error) {
    console.error("[provisioning] self-heal failed", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
