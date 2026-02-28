"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { ReviewCard } from "@/components/reviews/ReviewCard";
import { StarIcon } from "@/components/icons";
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

export function ReviewsPageClient({ reviews, stats }: ReviewsPageClientProps) {
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
      {/* Export */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleExport}>
          Export Reviews
        </Button>
      </div>

      {/* Overall Rating Summary */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Average Rating */}
        <Card>
          <div className="text-center">
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
              Based on {stats.count} reviews
            </p>
          </div>
        </Card>

        {/* Rating Distribution */}
        <Card>
          <h3 className="mb-4 font-semibold text-gray-900">Rating Distribution</h3>
          <div className="space-y-2">
            {distribution.map((item) => (
              <div key={item.stars} className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <span className="w-3 text-sm font-medium text-gray-700">{item.stars}</span>
                  <StarIcon className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                </div>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                  <div className="h-full bg-yellow-400" style={{ width: `${item.percentage}%` }} />
                </div>
                <span className="w-12 text-right text-sm text-gray-600">{item.count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent Reviews */}
      <Card>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recent Reviews</h2>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          >
            <option value="recent">Most Recent</option>
            <option value="highest">Highest Rated</option>
            <option value="lowest">Lowest Rated</option>
          </select>
        </div>

        {sorted.length === 0 ? (
          <p className="py-8 text-center text-gray-500">No reviews yet.</p>
        ) : (
          <div className="space-y-4">
            {sorted.map((review) => (
              <ReviewCard key={review.id} {...review} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
