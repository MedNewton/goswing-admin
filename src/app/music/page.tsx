import { MainLayout } from "@/components/layout/MainLayout";
import { MusicPageClient } from "@/components/music/MusicPageClient";
import { getSongSuggestions } from "@/lib/data/music";

export const dynamic = "force-dynamic";

export default async function MusicPage() {
  let songs: Awaited<ReturnType<typeof getSongSuggestions>> = [];

  try {
    songs = await getSongSuggestions();
  } catch {
    // Will show empty state
  }

  return (
    <MainLayout>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Music Suggestions</h1>
      <MusicPageClient songs={songs} />
    </MainLayout>
  );
}
