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
    <MainLayout
      title="Venues"
      actions={
        <Link href="/venues/create">
          <Button variant="primary" size="sm">+ New Venue</Button>
        </Link>
      }
    >
      <VenuesPageClient venues={venues} />
    </MainLayout>
  );
}
