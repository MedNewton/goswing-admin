import { MainLayout } from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { SongListItem } from "@/components/songs/SongListItem";
import { PlaylistCard } from "@/components/songs/PlaylistCard";
import { MusicIcon, ChartIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";

const stats = [
  {
    label: "Total Songs",
    value: "142",
    icon: <MusicIcon className="h-6 w-6 text-purple-600" />,
    iconBgColor: "bg-purple-50",
  },
  {
    label: "Jazz",
    value: "23",
    icon: <MusicIcon className="h-6 w-6 text-blue-600" />,
    iconBgColor: "bg-blue-50",
  },
  {
    label: "Playlists",
    value: "23",
    icon: <MusicIcon className="h-6 w-6 text-green-600" />,
    iconBgColor: "bg-green-50",
  },
  {
    label: "Trending",
    value: "8",
    icon: <ChartIcon className="h-6 w-6 text-orange-600" />,
    iconBgColor: "bg-orange-50",
  },
];

const topSongs = [
  { title: "Blue Note", artist: "Miles Davis", likes: 234, plays: 1250 },
  { title: "So What", artist: "Miles Davis", likes: 198, plays: 980 },
  { title: "Take Five", artist: "Dave Brubeck", likes: 176, plays: 850 },
  { title: "Autumn Leaves", artist: "Bill Evans", likes: 145, plays: 720 },
];

const recentSuggestions = [
  { title: "Fly Me to the Moon", artist: "Frank Sinatra", likes: 89 },
  { title: "What a Wonderful World", artist: "Louis Armstrong", likes: 76 },
  { title: "My Funny Valentine", artist: "Chet Baker", likes: 65 },
  { title: "Round Midnight", artist: "Thelonious Monk", likes: 54 },
];

const playlists = [
  { name: "Summer Jazz Essentials", songCount: 45, eventName: "Summer Jazz Night", color: "#6366f1" },
  { name: "French Night", songCount: 32, eventName: "Wine Tasting Evening", color: "#f59e0b" },
  { name: "Networking Vibes", songCount: 28, eventName: "Tech Mixer", color: "#10b981" },
  { name: "Food Festival Beats", songCount: 38, eventName: "Food Truck Rally", color: "#ec4899" },
];

export default function MusicPage() {
  return (
    <MainLayout
      title="Music Suggestions"
      actions={
        <Button variant="primary" size="sm">
          🎵 Add Playlist
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>

        {/* Top Song Requests */}
        <Card>
          <h2 className="mb-6 text-lg font-semibold text-gray-900">
            Top Song Requests
          </h2>
          <div className="space-y-3">
            {topSongs.map((song) => (
              <SongListItem key={song.title} {...song} />
            ))}
          </div>
        </Card>

        {/* Your Playlists */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Your Playlists
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {playlists.map((playlist) => (
              <PlaylistCard key={playlist.name} {...playlist} />
            ))}
          </div>
        </div>

        {/* Recent Suggestions */}
        <Card>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Suggestions
            </h2>
            <Button variant="ghost" size="sm">
              View All →
            </Button>
          </div>
          <div className="space-y-3">
            {recentSuggestions.map((song) => (
              <SongListItem key={song.title} {...song} />
            ))}
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
