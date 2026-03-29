"use client";

import { useMemo, useState, useEffect } from "react";
import { getClientLocale, translate } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n";
import { Card } from "@/components/ui/Card";
import {
  CalendarIcon,
  ChartIcon,
  MusicIcon,
  UsersIcon,
} from "@/components/icons";
import { SongListItem } from "@/components/songs/SongListItem";
import type { Song } from "@/types";

interface MusicPageClientProps {
  songs: Song[];
}

export function MusicPageClient({ songs }: MusicPageClientProps) {
  const [locale, setLocale] = useState<Locale>("fr");
  useEffect(() => { setLocale(getClientLocale()); }, []);

  const [eventFilter, setEventFilter] = useState("all");

  const eventOptions = useMemo(() => {
    const seen = new Set<string>();

    return songs
      .filter((song) => song.eventId && song.eventName)
      .filter((song) => {
        if (!song.eventId || seen.has(song.eventId)) return false;
        seen.add(song.eventId);
        return true;
      })
      .map((song) => ({
        value: song.eventId!,
        label: song.eventName!,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [songs]);

  const filteredSongs = useMemo(() => {
    if (eventFilter === "all") return songs;
    return songs.filter((song) => song.eventId === eventFilter);
  }, [eventFilter, songs]);

  const uniqueArtists = new Set(filteredSongs.map((song) => song.artist)).size;
  const uniqueEvents = new Set(
    filteredSongs.filter((song) => song.eventId).map((song) => song.eventId),
  ).size;
  const selectedEventLabel = eventOptions.find(
    (option) => option.value === eventFilter,
  )?.label;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-800 p-8 text-white shadow-xl shadow-slate-200">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.22),_transparent_34%)]" />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/12 text-white backdrop-blur">
              <MusicIcon className="h-6 w-6" />
            </div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-100/80">
              {translate(locale, "musicPage.eyebrow")}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              {translate(locale, "musicPage.subtitle")}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200">
              {translate(locale, "musicPage.description")}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/90 backdrop-blur">
                {filteredSongs.length} {translate(locale, "musicPage.songsShown")}
              </div>
              <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/90 backdrop-blur">
                {selectedEventLabel ?? translate(locale, "musicPage.allEvents")}
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl border border-white/12 bg-white/10 p-5 backdrop-blur">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                <MusicIcon className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-[0.18em]">{translate(locale, "musicPage.songs")}</span>
              </div>
              <p className="mt-4 text-2xl font-semibold text-white">{filteredSongs.length}</p>
            </div>
            <div className="rounded-3xl border border-white/12 bg-white/10 p-5 backdrop-blur">
              <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-sky-700">
                <UsersIcon className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-[0.18em]">{translate(locale, "musicPage.artists")}</span>
              </div>
              <p className="mt-4 text-2xl font-semibold text-white">{uniqueArtists}</p>
            </div>
            <div className="rounded-3xl border border-white/12 bg-white/10 p-5 backdrop-blur">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-amber-700">
                <CalendarIcon className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-[0.18em]">{translate(locale, "musicPage.events")}</span>
              </div>
              <p className="mt-4 text-2xl font-semibold text-white">{uniqueEvents}</p>
            </div>
            <div className="rounded-3xl border border-white/12 bg-white/10 p-5 backdrop-blur">
              <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-rose-700">
                <ChartIcon className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-[0.18em]">{translate(locale, "musicPage.recent")}</span>
              </div>
              <p className="mt-4 text-2xl font-semibold text-white">{Math.min(filteredSongs.length, 10)}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">
              {translate(locale, "ordersPage.filtersEyebrow")}
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-gray-950">
              {translate(locale, "musicPage.filterEyebrow")}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {translate(locale, "musicPage.filterDesc")}
            </p>
          </div>
          <div className="w-full max-w-sm">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
              {translate(locale, "musicPage.eventLabel")}
            </label>
            <select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-700 shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            >
              <option value="all">{translate(locale, "musicPage.allEvents")}</option>
              {eventOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <Card className="rounded-[2rem] border border-gray-200 bg-white shadow-lg shadow-gray-100">
        <div className="border-b border-gray-100 px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">
            Song Feed
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-gray-950">
            {translate(locale, "musicPage.songSuggestions")}
          </h2>
        </div>
        {filteredSongs.length === 0 ? (
          <p className="px-6 py-12 text-center text-gray-500">
            {translate(locale, "musicPage.noSuggestions")}
          </p>
        ) : (
          <div className="space-y-3 p-6">
            {filteredSongs.map((song) => (
              <SongListItem
                key={song.id}
                title={song.title}
                artist={song.artist}
                artworkUrl={song.artworkUrl}
                deezerLink={song.deezerLink}
                eventName={song.eventName}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
