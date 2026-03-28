"use client";

import { Sidebar } from "./Sidebar";
import { TopHeader } from "./TopHeader";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />

      {/* Main Content Area - fixed padding, sidebar overlays */}
      <div className="pl-16">
        <TopHeader />

        {/* Page Content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
