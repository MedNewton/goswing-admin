import { MainLayout } from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/Card";
import { ReviewCard } from "@/components/reviews/ReviewCard";
import { StarIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";

const overallRating = {
  average: 4.8,
  total: 324,
  distribution: [
    { stars: 5, count: 250, percentage: 77 },
    { stars: 4, count: 52, percentage: 16 },
    { stars: 3, count: 15, percentage: 5 },
    { stars: 2, count: 5, percentage: 2 },
    { stars: 1, count: 2, percentage: 0 },
  ],
};

const reviews = [
  {
    id: "1",
    userName: "Marie Dubois",
    rating: 5,
    comment: "Amazing event! The organization was perfect and the atmosphere was incredible. Would recommend to anyone!",
    date: "2 days ago",
    eventName: "Summer Jazz Night",
    helpful: 12,
  },
  {
    id: "2",
    userName: "Jean Martin",
    rating: 4,
    comment: "Great selection of wines and very knowledgeable staff. Only minor issue was the crowd size.",
    date: "1 week ago",
    eventName: "Wine Tasting Evening",
    helpful: 8,
  },
  {
    id: "3",
    userName: "Sophie Laurent",
    rating: 5,
    comment: "Excellent networking opportunities, but some exciting people! The venue was perfect for conversations.",
    date: "2 weeks ago",
    eventName: "Tech Networking Mixer",
    helpful: 15,
  },
  {
    id: "4",
    userName: "Pierre Dubois",
    rating: 3,
    comment: "Great venue and good organization overall. The sound could have been better though.",
    date: "3 weeks ago",
    eventName: "Summer Music Festival",
    helpful: 4,
  },
];

export default function ReviewsPage() {
  return (
    <MainLayout
      title="Reviews & Ratings"
      actions={
        <Button variant="outline" size="sm">
          📤 Export Reviews
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
                {overallRating.average}
              </div>
              <div className="mt-2 flex items-center justify-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <StarIcon
                    key={i}
                    className="h-5 w-5 fill-yellow-400 text-yellow-400"
                  />
                ))}
              </div>
              <p className="mt-2 text-sm text-gray-600">
                Based on {overallRating.total} reviews
              </p>
            </div>
          </Card>

          {/* Rating Distribution */}
          <Card>
            <h3 className="mb-4 font-semibold text-gray-900">
              Rating Distribution
            </h3>
            <div className="space-y-2">
              {overallRating.distribution.map((item) => (
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
              <select className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm">
                <option>All Ratings</option>
                <option>5 Stars</option>
                <option>4 Stars</option>
                <option>3 Stars</option>
                <option>2 Stars</option>
                <option>1 Star</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            {reviews.map((review) => (
              <ReviewCard key={review.id} {...review} />
            ))}
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
