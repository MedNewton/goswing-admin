import { MainLayout } from "@/components/layout/MainLayout";
import { MusicPageClient } from "@/components/music/MusicPageClient";
import { getSongSuggestions } from "@/lib/data/music";
import { getLocale, t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function MusicPage() {
  const locale = await getLocale();
  let songs: Awaited<ReturnType<typeof getSongSuggestions>> = [];

  try {
    songs = await getSongSuggestions();
  } catch {
    // Will show empty state
  }

  return (
    <MainLayout>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">{t(locale, "musicPage.title")}</h1>
      <MusicPageClient songs={songs} />
    </MainLayout>
  );
}
