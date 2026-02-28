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
    <MainLayout
      title="Music Suggestions"
    >
      <MusicPageClient songs={songs} />
    </MainLayout>
  );
}
