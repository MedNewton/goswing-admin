import { MainLayout } from "@/components/layout/MainLayout";
import { getReviewsWithStats } from "@/lib/data/reviews";
import { ReviewsPageClient } from "@/components/reviews/ReviewsPageClient";
import { getLocale, t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const locale = await getLocale();
  let reviews: Awaited<ReturnType<typeof getReviewsWithStats>>["reviews"] = [];
  let reviewStats = { count: 0, average: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<number, number> };

  try {
    const data = await getReviewsWithStats();
    reviews = data.reviews;
    reviewStats = data.stats;
  } catch {
    // Will show empty state
  }

  return (
    <MainLayout>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">{t(locale, "reviewsPage.title")}</h1>
      <ReviewsPageClient reviews={reviews} stats={reviewStats} />
    </MainLayout>
  );
}
