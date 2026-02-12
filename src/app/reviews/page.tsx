import { MainLayout } from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/Card";
import { ReviewCard } from "@/components/reviews/ReviewCard";
import { StarIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { getReviewsWithStats } from "@/lib/data/reviews";

export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  let reviews: Awaited<ReturnType<typeof getReviewsWithStats>>["reviews"] = [];
  let reviewStats = { count: 0, average: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<number, number> };

  try {
    const data = await getReviewsWithStats();
    reviews = data.reviews;
    reviewStats = data.stats;
  } catch {
    // Will show empty state
  }

  const distribution = [5, 4, 3, 2, 1].map((stars) => {
    const count = reviewStats.distribution[stars] ?? 0;
    const percentage = reviewStats.count > 0
      ? Math.round((count / reviewStats.count) * 100)
      : 0;
    return { stars, count, percentage };
  });

  return (
    <MainLayout
      title="Reviews & Ratings"
      actions={
        <Button variant="outline" size="sm">
          Export Reviews
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Overall Rating Summary */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Average Rating */}
          <Card>
            <div className="text-center">
              <div className="text-5xl font-bold text-gray-900">
                {reviewStats.average > 0 ? reviewStats.average.toFixed(1) : "—"}
              </div>
              <div className="mt-2 flex items-center justify-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <StarIcon
                    key={i}
                    className={`h-5 w-5 ${
                      i < Math.round(reviewStats.average)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                ))}
              </div>
              <p className="mt-2 text-sm text-gray-600">
                Based on {reviewStats.count} reviews
              </p>
            </div>
          </Card>

          {/* Rating Distribution */}
          <Card>
            <h3 className="mb-4 font-semibold text-gray-900">
              Rating Distribution
            </h3>
            <div className="space-y-2">
              {distribution.map((item) => (
                <div key={item.stars} className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <span className="w-3 text-sm font-medium text-gray-700">
                      {item.stars}
                    </span>
                    <StarIcon className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  </div>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full bg-yellow-400"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                  <span className="w-12 text-right text-sm text-gray-600">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Recent Reviews */}
        <Card>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Reviews
            </h2>
            <div className="flex items-center gap-2">
              <select className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm">
                <option>Most Recent</option>
                <option>Highest Rated</option>
                <option>Lowest Rated</option>
              </select>
            </div>
          </div>

          {reviews.length === 0 ? (
            <p className="py-8 text-center text-gray-500">No reviews yet.</p>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <ReviewCard key={review.id} {...review} />
              ))}
            </div>
          )}
        </Card>
      </div>
    </MainLayout>
  );
}
