"use client";

import Link from "next/link";
import { BellIcon, PlusIcon, ChevronDownIcon } from "@/components/icons";

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
        <Link
          href="/events/create"
          className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
        >
          <PlusIcon className="h-4 w-4" />
          Create
        </Link>

        {/* Notifications */}
        <button className="rounded-lg p-2 text-gray-700 transition-colors hover:bg-gray-100">
          <BellIcon className="h-5 w-5" />
        </button>

        {/* User Profile */}
        <button className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-700">
            GU
          </div>
          <span className="hidden sm:inline">Guest User</span>
          <ChevronDownIcon className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
