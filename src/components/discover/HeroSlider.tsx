"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Event } from "@/types";
import { CalendarIcon, MapPinIcon } from "@/components/icons";
import { translate, getClientLocale } from "@/lib/i18n/client";

export function HeroSlider({ events }: { events: Event[] }) {
  const [current, setCurrent] = useState(0);
  const total = events.length;
  const locale = getClientLocale();
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % total);
  }, [total]);

  const prev = useCallback(() => {
    setCurrent((c) => (c - 1 + total) % total);
  }, [total]);

  useEffect(() => {
    if (total <= 1) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next, total]);

  if (total === 0) {
    return (
      <div className="relative overflow-hidden">
        <div className="flex h-[28rem] items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-teal-800 sm:h-[32rem]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.08),_transparent_40%),radial-gradient(circle_at_bottom_left,_rgba(45,212,191,0.12),_transparent_40%)]" />
          <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
            <span className="inline-flex items-center rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-teal-300 backdrop-blur">
              {t("hero.discover")}
            </span>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              {t("hero.findEvents")}
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-slate-300">
              {t("hero.findEventsDesc")}
            </p>
            <Link
              href="/discover/events"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-gray-900 transition-all hover:bg-gray-100 hover:shadow-lg"
            >
              {t("hero.browseEvents")}
              <span>&rarr;</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const event = events[current]!;

  return (
    <div className="relative h-[28rem] overflow-hidden sm:h-[32rem] lg:h-[36rem]">
      {events.map((e, i) => (
        <div
          key={e.id}
          className={`absolute inset-0 transition-opacity duration-700 ${
            i === current ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <Image
            src={e.image}
            alt={e.title}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.1),_transparent_32%),radial-gradient(circle_at_bottom_left,_rgba(45,212,191,0.15),_transparent_34%)]" />
        </div>
      ))}

      <div className="absolute inset-x-0 bottom-0 z-10 mx-auto max-w-7xl px-4 pb-10 sm:px-6 sm:pb-14">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            {event.isFree && (
              <span className="inline-flex items-center rounded-full bg-emerald-500/90 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                {t("common.freeEvent")}
              </span>
            )}
            {!event.isFree && event.minPrice && (
              <span className="inline-flex items-center rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-gray-800 backdrop-blur">
                {t("common.from")} {event.minPrice}
              </span>
            )}
            {event.tags && event.tags.length > 0 && (
              <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                {event.tags[0]}
              </span>
            )}
          </div>

          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
            {event.title}
          </h2>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-300">
            {event.date && (
              <div className="flex items-center gap-1.5">
                <CalendarIcon className="h-4 w-4 text-slate-400" />
                <span>{event.date}</span>
              </div>
            )}
            {event.location && (
              <div className="flex items-center gap-1.5">
                <MapPinIcon className="h-4 w-4 text-slate-400" />
                <span>{event.location}</span>
              </div>
            )}
          </div>

          <Link
            href={`/discover/events/${event.id}`}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-gray-900 transition-all hover:bg-gray-100 hover:shadow-lg"
          >
            {t("hero.viewEvent")}
            <span>&rarr;</span>
          </Link>
        </div>
      </div>

      {total > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            className="absolute left-4 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-black/30 text-white backdrop-blur transition-all hover:bg-black/50"
            aria-label={t("hero.previousSlide")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute right-4 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-black/30 text-white backdrop-blur transition-all hover:bg-black/50"
            aria-label={t("hero.nextSlide")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </>
      )}

      {total > 1 && (
        <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2">
          {events.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrent(i)}
              className={`h-2 cursor-pointer rounded-full transition-all ${
                i === current ? "w-8 bg-white" : "w-2 bg-white/40"
              }`}
              aria-label={`${t("hero.goToSlide")} ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
