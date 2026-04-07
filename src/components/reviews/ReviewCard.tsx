"use client";

import { useState, useTransition, useEffect } from "react";
import { HeartIcon, StarIcon } from "@/components/icons";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { toggleReviewLike, replyToReview, removeReviewReply } from "@/lib/actions/reviews";
import { getClientLocale, translate } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n";

interface ReviewCardProps {
  id: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  date: string;
  eventName?: string;
  helpful?: number;
  adminLiked: boolean;
  adminReply?: string;
  adminReplyAt?: string;
}

export function ReviewCard({
  id,
  userName,
  userAvatar,
  rating,
  comment,
  date,
  eventName,
  helpful = 0,
  adminLiked,
  adminReply,
  adminReplyAt,
}: ReviewCardProps) {
  const [locale, setLocale] = useState<Locale>("fr");
  useEffect(() => { setLocale(getClientLocale()); }, []);

  const [liked, setLiked] = useState(adminLiked);
  const [reply, setReply] = useState(adminReply ?? "");
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleLike = () => {
    startTransition(async () => {
      const result = await toggleReviewLike(id);
      if (result.success) {
        setLiked(!liked);
      }
    });
  };

  const handleSubmitReply = () => {
    if (!replyText.trim()) return;
    startTransition(async () => {
      const result = await replyToReview(id, replyText);
      if (result.success) {
        setReply(replyText);
        setShowReplyForm(false);
        setReplyText("");
      }
    });
  };

  const handleRemoveReply = () => {
    startTransition(async () => {
      const result = await removeReviewReply(id);
      if (result.success) {
        setReply("");
      }
    });
  };

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

      {/* Admin Reply Display */}
      {reply && (
        <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
              {translate(locale, "reviewsPage.adminReply")}
            </p>
            <button
              type="button"
              onClick={handleRemoveReply}
              disabled={isPending}
              className="text-xs text-blue-500 hover:text-blue-700 disabled:opacity-50"
            >
              {translate(locale, "reviewsPage.removeReply")}
            </button>
          </div>
          <p className="mt-2 text-sm leading-6 text-blue-900">{reply}</p>
          {adminReplyAt && (
            <p className="mt-1 text-xs text-blue-500">
              {new Date(adminReplyAt).toLocaleDateString()}
            </p>
          )}
        </div>
      )}

      {/* Reply Form */}
      {showReplyForm && (
        <div className="mt-4 space-y-3">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder={translate(locale, "reviewsPage.replyPlaceholder")}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            rows={3}
          />
          <div className="flex gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmitReply}
              disabled={isPending || !replyText.trim()}
            >
              {translate(locale, "reviewsPage.submitReply")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setShowReplyForm(false); setReplyText(""); }}
            >
              {translate(locale, "reviewsPage.cancelReply")}
            </Button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={handleLike}
          disabled={isPending}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors disabled:opacity-50 ${
            liked
              ? "bg-red-50 text-red-600"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
        >
          <HeartIcon className="h-4 w-4" />
          {liked
            ? translate(locale, "reviewsPage.liked")
            : translate(locale, "reviewsPage.like")}
        </button>
        {!reply && !showReplyForm && (
          <button
            type="button"
            onClick={() => setShowReplyForm(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-500 transition-colors hover:bg-gray-200"
          >
            {translate(locale, "reviewsPage.reply")}
          </button>
        )}
        {helpful > 0 && (
          <span className="rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-500">
            Helpful: {helpful}
          </span>
        )}
      </div>
    </div>
  );
}
