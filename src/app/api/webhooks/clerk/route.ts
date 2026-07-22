import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

// Provisioning now happens via POST /v1/admin/me/provision, which derives the
// acting user from their own Clerk JWT — a server-side webhook cannot act on
// another user's behalf. The app self-provisions on first authenticated render
// (see ProvisionBridge → /api/provision/me), so this webhook only acknowledges.
export async function POST(request: NextRequest) {
  try {
    await verifyWebhook(request);
  } catch (error) {
    console.error("[clerk-webhook] verification failed", error);
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
