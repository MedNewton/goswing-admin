import { MainLayout } from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { SongListItem } from "@/components/songs/SongListItem";
import { MusicIcon, ChartIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { getSongSuggestions } from "@/lib/data/music";

export const dynamic = "force-dynamic";

export default async function MusicPage() {
  let songs: Awaited<ReturnType<typeof getSongSuggestions>> = [];

  try {
    songs = await getSongSuggestions();
  } catch {
    // Will show empty state
  }

  // Derive stats from the songs data
  const uniqueArtists = new Set(songs.map((s) => s.artist)).size;
  const uniqueEvents = new Set(songs.filter((s) => s.eventId).map((s) => s.eventId)).size;

  const statCards = [
    {
      label: "Total Songs",
      value: String(songs.length),
      icon: <MusicIcon className="h-6 w-6 text-purple-600" />,
      iconBgColor: "bg-purple-50",
    },
    {
      label: "Artists",
      value: String(uniqueArtists),
      icon: <MusicIcon className="h-6 w-6 text-blue-600" />,
      iconBgColor: "bg-blue-50",
    },
    {
      label: "Events",
      value: String(uniqueEvents),
      icon: <MusicIcon className="h-6 w-6 text-green-600" />,
      iconBgColor: "bg-green-50",
    },
    {
      label: "Recent",
      value: String(Math.min(songs.length, 10)),
      icon: <ChartIcon className="h-6 w-6 text-orange-600" />,
      iconBgColor: "bg-orange-50",
    },
  ];

  return (
    <MainLayout
      title="Music Suggestions"
      actions={
        <Button variant="primary" size="sm">
          Add Playlist
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>

        {/* All Song Suggestions */}
        <Card>
          <h2 className="mb-6 text-lg font-semibold text-gray-900">
            Song Suggestions
          </h2>
          {songs.length === 0 ? (
            <p className="py-8 text-center text-gray-500">
              No song suggestions yet.
            </p>
          ) : (
            <div className="space-y-3">
              {songs.map((song) => (
                <SongListItem
                  key={song.id}
                  title={song.title}
                  artist={song.artist}
                  likes={song.likes}
                  plays={song.plays}
                />
              ))}
            </div>
          )}
        </Card>
      </div>
    </MainLayout>
  );
}
