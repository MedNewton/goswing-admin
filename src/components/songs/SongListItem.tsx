import { MusicIcon } from "@/components/icons";

interface SongListItemProps {
  title: string;
  artist: string;
  likes: number;
  plays?: number;
}

export function SongListItem({ title, artist, likes, plays }: SongListItemProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50">
      <div className="flex items-center gap-4">
        <button className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500 text-white transition-colors hover:bg-purple-600">
          <MusicIcon className="h-5 w-5" />
        </button>
        <div>
          <h4 className="font-medium text-gray-900">{title}</h4>
          <p className="text-sm text-gray-600">{artist}</p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {plays !== undefined && (
          <div className="text-sm text-gray-600">
            <span className="font-medium">{plays.toLocaleString()}</span> plays
          </div>
        )}
        <div className="flex items-center gap-2">
          <button className="text-gray-400 hover:text-red-500">❤️</button>
          <span className="text-sm font-medium text-gray-700">{likes}</span>
        </div>
      </div>
    </div>
  );
}
