"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { setClerkSupabaseTokenGetter } from "@/lib/supabase/token";

type Props = Readonly<{ children: ReactNode }>;

export default function SupabaseClerkBridge({ children }: Props) {
  const { isSignedIn, getToken } = useAuth();
  const hasTriggeredProvisioningRef = useRef(false);

  useLayoutEffect(() => {
    setClerkSupabaseTokenGetter(async () => {
      if (!isSignedIn) {
        return null;
      }

      try {
        return (await getToken({ template: "supabase" })) ?? null;
      } catch {
        return null;
      }
    });
  }, [isSignedIn, getToken]);

  useEffect(() => {
    if (!isSignedIn || hasTriggeredProvisioningRef.current) {
      return;
    }

    hasTriggeredProvisioningRef.current = true;
    void fetch("/api/provision/me", { method: "POST" });
  }, [isSignedIn]);

  return <>{children}</>;
}
