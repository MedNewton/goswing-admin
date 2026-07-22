"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef, type ReactNode } from "react";

type Props = Readonly<{ children: ReactNode }>;

/**
 * Fires the one-shot self-provisioning call (POST /api/provision/me →
 * POST /v1/admin/me/provision) on first authenticated render.
 * Replaces the old SupabaseClerkBridge — no client-side token bridging is
 * needed anymore since all data access happens server-side via the REST API.
 */
export default function ProvisionBridge({ children }: Props) {
  const { isSignedIn } = useAuth();
  const hasTriggeredProvisioningRef = useRef(false);

  useEffect(() => {
    if (!isSignedIn || hasTriggeredProvisioningRef.current) {
      return;
    }

    hasTriggeredProvisioningRef.current = true;
    void fetch("/api/provision/me", { method: "POST" });
  }, [isSignedIn]);

  return <>{children}</>;
}
