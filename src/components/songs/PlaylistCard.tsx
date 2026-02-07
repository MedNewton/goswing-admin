import { MusicIcon } from "@/components/icons";

interface PlaylistCardProps {
  name: string;
  songCount: number;
  eventName?: string;
  color: string;
}

export function PlaylistCard({
  name,
  songCount,
  eventName,
  color,
}: PlaylistCardProps) {
  return (
    <div
      className="group relative overflow-hidden rounded-lg p-6 text-white transition-transform hover:scale-105"
      style={{ backgroundColor: color }}
    >
      <div className="relative z-10">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
          <MusicIcon className="h-6 w-6" />
        </div>
        <h3 className="mb-1 font-semibold">{name}</h3>
        {eventName && <p className="mb-2 text-sm opacity-90">{eventName}</p>}
        <p className="text-sm opacity-75">{songCount} songs</p>
      </div>

      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  );
}
