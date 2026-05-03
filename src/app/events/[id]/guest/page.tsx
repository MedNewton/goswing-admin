import { PublicEventDetail } from "@/components/events/PublicEventDetail";
import { EyeIcon } from "@/components/icons";
import { getLocale, t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function EventGuestPage({
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
        <span>{t(locale, "eventGuest.previewBanner")}</span>
      </div>
      <PublicEventDetail eventId={id} showBookNow={false} />
    </>
  );
}
