import { PublicVenueDetail } from "@/components/venues/PublicVenueDetail";
import Link from "next/link";
import { getLocale, t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function PublicVenueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locale = await getLocale();

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* Back link */}
      <div className="mb-4">
        <Link
          href="/discover/venues"
          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:bg-white hover:text-gray-700"
        >
          &larr; {t(locale, "venueDetail.allVenues")}
        </Link>
      </div>

      <PublicVenueDetail venueId={id} />
    </div>
  );
}
