"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { translate, getClientLocale } from "@/lib/i18n/client";

interface Pill {
  label: string;
  href: string;
}

export function SlideablePills({ pills }: { pills: Pill[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const locale = getClientLocale();
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, []);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.6;
    el.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  return (
    <div className="relative">
      {canScrollLeft && (
        <div className="absolute left-0 top-0 z-10 flex h-full items-center">
          <div className="pointer-events-none h-full w-16 bg-gradient-to-r from-white via-white/80 to-transparent" />
          <button
            type="button"
            onClick={() => scroll("left")}
            className="absolute left-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-gray-200 bg-white shadow-md transition-colors hover:bg-gray-50"
            aria-label={t("pills.scrollLeft")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        </div>
      )}

      <div
        ref={scrollRef}
        className="no-scrollbar flex gap-2.5 overflow-x-auto scroll-smooth px-1 py-1"
      >
        {pills.map((pill) => (
          <Link
            key={pill.href}
            href={pill.href}
            className="shrink-0 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-gray-900 hover:bg-gray-900 hover:text-white"
          >
            {pill.label}
          </Link>
        ))}
      </div>

      {canScrollRight && (
        <div className="absolute right-0 top-0 z-10 flex h-full items-center">
          <div className="pointer-events-none h-full w-16 bg-gradient-to-l from-white via-white/80 to-transparent" />
          <button
            type="button"
            onClick={() => scroll("right")}
            className="absolute right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-gray-200 bg-white shadow-md transition-colors hover:bg-gray-50"
            aria-label={t("pills.scrollRight")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
