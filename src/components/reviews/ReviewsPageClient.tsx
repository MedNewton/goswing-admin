"use client";

import { useState, useMemo, useEffect } from "react";
import { getClientLocale, translate } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n";
import { Card } from "@/components/ui/Card";
import { ReviewCard } from "@/components/reviews/ReviewCard";
import { ChevronRightIcon, StarIcon, UsersIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { generateCsv, downloadCsv } from "@/lib/utils/csv";
import type { Review } from "@/types";

interface ReviewStats {
  count: number;
  average: number;
  distribution: Record<number, number>;
}

interface ReviewsPageClientProps {
  reviews: Review[];
  stats: ReviewStats;
}

type SortOption = "recent" | "highest" | "lowest";

function SummaryCard({
  icon: Icon,
  label,
  value,
  accentClass,
}: {
  icon: typeof StarIcon;
  label: string;
  value: string;
  accentClass: string;
}) {
  return (
    <div className="rounded-3xl border border-white/12 bg-white/10 p-5 backdrop-blur">
      <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 ${accentClass}`}>
        <Icon className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-[0.18em]">
          {label}
        </span>
      </div>
      <p className="mt-4 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

export function ReviewsPageClient({ reviews, stats }: ReviewsPageClientProps) {
  const [locale, setLocale] = useState<Locale>("fr");
  useEffect(() => { setLocale(getClientLocale()); }, []);

  const [sortBy, setSortBy] = useState<SortOption>("recent");

  const sorted = useMemo(() => {
    const arr = [...reviews];
    switch (sortBy) {
      case "highest":
        return arr.sort((a, b) => b.rating - a.rating);
      case "lowest":
        return arr.sort((a, b) => a.rating - b.rating);
      default:
        return arr; // already sorted by most recent from DB
    }
  }, [reviews, sortBy]);

  const distribution = [5, 4, 3, 2, 1].map((stars) => {
    const count = stats.distribution[stars] ?? 0;
    const percentage = stats.count > 0
      ? Math.round((count / stats.count) * 100)
      : 0;
    return { stars, count, percentage };
  });

  const handleExport = () => {
    const csv = generateCsv(reviews, [
      { key: "userName", header: "Reviewer" },
      { key: "eventName", header: "Event" },
      { key: "rating", header: "Rating" },
      { key: "comment", header: "Comment" },
      { key: "date", header: "Date" },
    ]);
    downloadCsv(csv, `reviews-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-700 p-8 text-white shadow-xl shadow-slate-200">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(251,191,36,0.18),_transparent_34%)]" />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/12 text-white backdrop-blur">
              <StarIcon className="h-6 w-6" />
            </div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.3em] text-amber-100/80">
              {translate(locale, "reviewsPage.eyebrow")}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              {translate(locale, "reviewsPage.subtitle")}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200">
              {translate(locale, "reviewsPage.description")}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/90 backdrop-blur">
                {stats.count.toLocaleString()} {translate(locale, "reviewsPage.reviewsCount")}
              </div>
              <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/90 backdrop-blur">
                {translate(locale, "reviewsPage.sortedBy")} {sortBy === "recent" ? "most recent" : sortBy}
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <SummaryCard
              icon={StarIcon}
              label="Average"
              value={stats.average > 0 ? stats.average.toFixed(1) : "\u2014"}
              accentClass="bg-amber-50 text-amber-700"
            />
            <SummaryCard
              icon={UsersIcon}
              label="Reviews"
              value={String(stats.count)}
              accentClass="bg-sky-50 text-sky-700"
            />
            <SummaryCard
              icon={StarIcon}
              label={translate(locale, "reviewsPage.fiveStars")}
              value={String(stats.distribution[5] ?? 0)}
              accentClass="bg-emerald-50 text-emerald-700"
            />
            <SummaryCard
              icon={StarIcon}
              label={translate(locale, "reviewsPage.lowStars")}
              value={String((stats.distribution[1] ?? 0) + (stats.distribution[2] ?? 0))}
              accentClass="bg-rose-50 text-rose-700"
            />
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">
              {translate(locale, "reviewsPage.controlsEyebrow")}
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-gray-950">
              {translate(locale, "reviewsPage.controlsTitle")}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {translate(locale, "reviewsPage.controlsDesc")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="h-11 rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-700 shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            >
              <option value="recent">{translate(locale, "reviewsPage.mostRecent")}</option>
              <option value="highest">{translate(locale, "reviewsPage.highestRated")}</option>
              <option value="lowest">{translate(locale, "reviewsPage.lowestRated")}</option>
            </select>
            <Button variant="outline" size="sm" onClick={handleExport} className="rounded-full border-gray-200 px-4">
              <ChevronRightIcon className="h-4 w-4" />
              {translate(locale, "reviewsPage.exportReviews")}
            </Button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="rounded-[2rem] border border-gray-200 bg-white shadow-lg shadow-gray-100">
          <div className="px-6 py-6 text-center">
            <div className="text-5xl font-bold text-gray-900">
              {stats.average > 0 ? stats.average.toFixed(1) : "\u2014"}
            </div>
            <div className="mt-2 flex items-center justify-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <StarIcon
                  key={i}
                  className={`h-5 w-5 ${
                    i < Math.round(stats.average)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-300"
                  }`}
                />
              ))}
            </div>
            <p className="mt-2 text-sm text-gray-600">
              {translate(locale, "reviewsPage.basedOn")} {stats.count} {translate(locale, "reviewsPage.reviewsCount")}
            </p>
          </div>
        </Card>

        <Card className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">{translate(locale, "reviewsPage.ratingDistribution")}</h3>
          <div className="space-y-3">
            {distribution.map((item) => (
              <div key={item.stars} className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <span className="w-3 text-sm font-medium text-gray-700">{item.stars}</span>
                  <StarIcon className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                </div>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                  <div className="h-full rounded-full bg-yellow-400" style={{ width: `${item.percentage}%` }} />
                </div>
                <span className="w-12 text-right text-sm text-gray-600">{item.count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="rounded-[2rem] border border-gray-200 bg-white shadow-lg shadow-gray-100">
        <div className="border-b border-gray-100 px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">
            Review Feed
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-gray-950">{translate(locale, "reviewsPage.recentReviews")}</h2>
        </div>
        {sorted.length === 0 ? (
          <p className="px-6 py-12 text-center text-gray-500">{translate(locale, "reviewsPage.noReviews")}</p>
        ) : (
          <div className="space-y-4 p-6">
            {sorted.map((review) => (
              <ReviewCard key={review.id} {...review} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
