import type { UserJSON, WebhookEvent } from "@clerk/nextjs/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { provisionUser } from "@/lib/provisioning/userProvisioning";

export const runtime = "nodejs";

function isUserProvisioningEvent(
  event: WebhookEvent,
): event is Extract<WebhookEvent, { type: "user.created" | "user.updated" }> {
  return event.type === "user.created" || event.type === "user.updated";
}

function getPrimaryEmailAddress(user: UserJSON) {
  return (
    user.email_addresses.find(
      (candidate) => candidate.id === user.primary_email_address_id,
    )?.email_address ??
    user.email_addresses[0]?.email_address ??
    null
  );
}

export async function POST(request: NextRequest) {
  let event: WebhookEvent;
  try {
    event = await verifyWebhook(request);
  } catch (error) {
    console.error("[clerk-webhook] verification failed", error);
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!isUserProvisioningEvent(event)) {
    return NextResponse.json({ ok: true, skipped: true }, { status: 200 });
  }

  const user = event.data;

  try {
    await provisionUser({
      userId: user.id,
      email: getPrimaryEmailAddress(user),
      firstName: user.first_name ?? null,
      lastName: user.last_name ?? null,
      imageUrl: user.image_url ?? null,
    });
  } catch (error) {
    console.error("[clerk-webhook] provisioning failed", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
