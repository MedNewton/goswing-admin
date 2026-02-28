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
    <div className="rounded-[1.75rem] border border-gray-200 bg-gradient-to-br from-white to-slate-50 p-6 shadow-sm shadow-gray-100">
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
              <p className="mt-1 text-sm text-gray-500">{eventName}</p>
            )}
          </div>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-sm text-gray-500 shadow-sm">
          {date}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <StarIcon
            key={i}
            className={`h-4 w-4 ${
              i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            }`}
          />
        ))}
      </div>

      <p className="mt-4 text-sm leading-7 text-gray-700">{comment}</p>

      {helpful > 0 && (
        <div className="mt-5 inline-flex items-center rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-500">
          Helpful: {helpful}
        </div>
      )}
    </div>
  );
}
