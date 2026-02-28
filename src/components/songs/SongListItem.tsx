import { ChevronRightIcon, MusicIcon } from "@/components/icons";

interface SongListItemProps {
  title: string;
  artist: string;
  artworkUrl?: string;
  deezerLink?: string;
  eventName?: string;
}

export function SongListItem({ title, artist, artworkUrl, deezerLink, eventName }: SongListItemProps) {
  return (
    <div className="flex flex-col gap-4 rounded-[1.5rem] border border-gray-200 bg-gradient-to-r from-white to-slate-50 p-5 transition-all hover:-translate-y-0.5 hover:shadow-md sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        {artworkUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={artworkUrl}
            alt={`${title} artwork`}
            className="h-12 w-12 rounded-2xl object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
            <MusicIcon className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0">
          <h4 className="truncate font-semibold text-gray-900">{title}</h4>
          <p className="text-sm text-gray-600">{artist}</p>
          {eventName && (
            <p className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-gray-500">
              {eventName}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 self-end sm:self-auto">
        {deezerLink && (
          <a
            href={deezerLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-emerald-700 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-md"
          >
            <ChevronRightIcon className="h-4 w-4" />
            Listen
          </a>
        )}
      </div>
    </div>
  );
}
