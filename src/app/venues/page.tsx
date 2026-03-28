import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/Button";
import { getVenues } from "@/lib/data/venues";
import { VenuesPageClient } from "@/components/venues/VenuesPageClient";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function VenuesPage() {
  let venues: Awaited<ReturnType<typeof getVenues>> = [];

  try {
    venues = await getVenues();
  } catch {
    // Will show empty state
  }

  return (
    <MainLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Venue</h1>
        <Link href="/venues/create">
          <Button variant="primary" size="sm">+ New Venue</Button>
        </Link>
      </div>
      <VenuesPageClient venues={venues} />
    </MainLayout>
  );
}
