import { PublicEventDetail } from "@/components/events/PublicEventDetail";

export const dynamic = "force-dynamic";

export default async function PublicEventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PublicEventDetail eventId={id} showBookNow={true} />;
}
