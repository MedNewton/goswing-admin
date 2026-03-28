"use client";

import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { BellIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";

export function TopHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      {/* Logo */}
      <Link href="/overview" className="text-xl font-bold text-gray-900">
        GoSwing
      </Link>

      {/* Right Side Actions */}
      <div className="flex items-center gap-4">
        {/* Create Event Button */}
        <SignedIn>
          <Link href="/events/create">
            <Button variant="primary" size="sm">
              Create Event
            </Button>
          </Link>
        </SignedIn>

        {/* Notifications */}
        <SignedIn>
          <button
            aria-label="Notifications"
            className="rounded-lg p-2 text-gray-700 transition-colors hover:bg-gray-100"
          >
            <BellIcon className="h-5 w-5" />
          </button>
        </SignedIn>

        <SignedOut>
          <Link
            href="/login"
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Log In
          </Link>
        </SignedOut>

        <SignedIn>
          <UserButton afterSignOutUrl="/login" />
        </SignedIn>
      </div>
    </header>
  );
}
