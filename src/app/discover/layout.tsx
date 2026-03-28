import type { Metadata } from "next";
import { DiscoverHeader } from "@/components/discover/DiscoverHeader";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Discover Events & Nightlife | GoSwing",
  description:
    "Browse upcoming events, venues, and nightlife in your city.",
};

export default function DiscoverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50/50">
      <DiscoverHeader />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
