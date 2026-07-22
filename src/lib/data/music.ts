import { adminApiCall } from "@/lib/api/client";
import type { ApiItems, ApiSongSuggestion } from "@/lib/api/types";
import type { Song } from "@/types";

function mapApiSong(s: ApiSongSuggestion): Song {
  return {
    id: s.id,
    title: s.trackTitle,
    artist: s.artistName,
    album: s.albumTitle ?? undefined,
    artworkUrl: s.artworkUrl ?? undefined,
    deezerLink: s.deezerLink ?? undefined,
    likes: 0, // no likes data in current API
    eventId: s.eventId,
    eventName: s.eventTitle,
  };
}

/** Fetch all song suggestions for events owned by current user. */
export async function getSongSuggestions(filters?: {
  eventId?: string;
}) {
  const { items } = await adminApiCall<ApiItems<ApiSongSuggestion>>(
    "/v1/admin/song-suggestions",
    { query: { eventId: filters?.eventId } },
  );
  return items.map(mapApiSong);
}
