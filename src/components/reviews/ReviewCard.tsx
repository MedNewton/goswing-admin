import { StarIcon } from "@/components/icons";
import { Avatar } from "@/components/ui/Avatar";

interface ReviewCardProps {
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  date: string;
  eventName?: string;
  helpful?: number;
}

export function ReviewCard({
  userName,
  userAvatar,
  rating,
  comment,
  date,
  eventName,
  helpful = 0,
}: ReviewCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="flex items-start justify-between">
        <div className="flex gap-4">
          <Avatar
            src={userAvatar}
            initials={userName
              .split(" ")
              .map((n) => n[0])
              .join("")}
          />
          <div>
            <h4 className="font-semibold text-gray-900">{userName}</h4>
            {eventName && (
              <p className="text-sm text-gray-500">{eventName}</p>
            )}
          </div>
        </div>
        <span className="text-sm text-gray-500">{date}</span>
      </div>

      {/* Star Rating */}
      <div className="mt-3 flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <StarIcon
            key={i}
            className={`h-4 w-4 ${
              i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            }`}
          />
        ))}
      </div>

      {/* Comment */}
      <p className="mt-3 text-gray-700">{comment}</p>

      {/* Helpful count (display only) */}
      {helpful > 0 && (
        <div className="mt-4 text-sm text-gray-500">
          👍 {helpful} found this helpful
        </div>
      )}
    </div>
  );
}
