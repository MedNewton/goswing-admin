"use client";

import { SignOutButton } from "@clerk/nextjs";

export function SignOutLink({ label }: { label: string }) {
  return (
    <SignOutButton redirectUrl="/login">
      <button type="button" className="text-sm text-gray-500 underline hover:text-gray-700">
        {label}
      </button>
    </SignOutButton>
  );
}
