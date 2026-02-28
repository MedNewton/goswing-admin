import { MusicIcon } from "@/components/icons";

interface SongListItemProps {
  title: string;
  artist: string;
  artworkUrl?: string;
  deezerLink?: string;
  eventName?: string;
}

export function SongListItem({ title, artist, artworkUrl, deezerLink, eventName }: SongListItemProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50">
      <div className="flex items-center gap-4">
        {artworkUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={artworkUrl}
            alt={`${title} artwork`}
            className="h-10 w-10 rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
            <MusicIcon className="h-5 w-5" />
          </div>
        )}
        <div>
          <h4 className="font-medium text-gray-900">{title}</h4>
          <p className="text-sm text-gray-600">{artist}</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {eventName && (
          <span className="text-xs text-gray-500">{eventName}</span>
        )}
        {deezerLink && (
          <a
            href={deezerLink}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-purple-500 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-purple-600"
          >
            Listen
          </a>
        )}
      </div>
    </div>
  );
}
