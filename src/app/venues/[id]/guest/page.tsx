import { PublicVenueDetail } from "@/components/venues/PublicVenueDetail";
import { EyeIcon } from "@/components/icons";
import { getLocale, t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function VenueGuestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locale = await getLocale();

  return (
    <>
      <div className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-black px-4 py-2.5 text-center text-sm font-medium text-white shadow-md">
        <EyeIcon className="h-4 w-4" />
        <span>{t(locale, "venueGuest.previewBanner")}</span>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <PublicVenueDetail venueId={id} />
      </div>
    </>
  );
}
