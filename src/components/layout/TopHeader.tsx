"use client";

import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { BellIcon, PlusIcon } from "@/components/icons";

interface TopHeaderProps {
  title: string;
  actions?: React.ReactNode;
}

export function TopHeader({ title, actions }: TopHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      {/* Page Title */}
      <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>

      {/* Right Side Actions */}
      <div className="flex items-center gap-4">
        {/* Custom Actions (optional) */}
        {actions}

        {/* Create Button */}
        <SignedIn>
          <Link
            href="/events/create"
            aria-label="Create event"
            title="Create event"
            className="inline-flex items-center justify-center text-gray-700 transition-colors hover:text-gray-900"
          >
            <PlusIcon className="h-4 w-4" />
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
