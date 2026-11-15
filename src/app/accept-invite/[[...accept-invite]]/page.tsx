"use client";

import { SignUp } from "@clerk/nextjs";

/**
 * Landing page of team invitation emails (Clerk invitation redirect URL).
 * <SignUp> reads the invitation ticket from the URL, so the invited email is
 * prefilled and verified.
 */
export default function AcceptInvitePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6 py-10">
      <SignUp
        path="/accept-invite"
        routing="path"
        signInUrl="/login"
        forceRedirectUrl="/overview"
        fallbackRedirectUrl="/overview"
      />
    </main>
  );
}
