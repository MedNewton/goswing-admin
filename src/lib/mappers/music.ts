import type { EventSongSuggestionRow, EventRow } from "@/types/database";
import type { Song } from "@/types";

/** Shape returned by a song suggestions query with event join. */
export interface SongQueryRow extends EventSongSuggestionRow {
  events?: Pick<EventRow, "title"> | null;
}

/** Map a single event_song_suggestion row to the UI Song view model. */
export function mapSong(row: SongQueryRow): Song {
  return {
    id: row.id,
    title: row.track_title,
    artist: row.artist_name,
    album: row.album_title ?? undefined,
    artworkUrl: row.artwork_url ?? undefined,
    deezerLink: row.deezer_link ?? undefined,
    likes: 0, // no likes column in current schema
    eventId: row.event_id,
    eventName: row.events?.title ?? undefined,
  };
}

export function mapSongs(rows: SongQueryRow[]): Song[] {
  return rows.map(mapSong);
}
