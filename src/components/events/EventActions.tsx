"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { deleteEventAction } from "@/lib/actions/events";

export function EventActions({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteEventAction(eventId);
      if (result.success) {
        router.push("/events");
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      {showDeleteConfirm ? (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5">
          <span className="text-xs text-red-700">Delete this event?</span>
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => setShowDeleteConfirm(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            {isPending ? "Deleting..." : "Confirm"}
          </Button>
        </div>
      ) : (
        <>
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            Delete
          </Button>
          <Link href={`/events/${eventId}/edit`}>
            <Button variant="outline" size="sm">
              Edit Event
            </Button>
          </Link>
        </>
      )}
    </div>
  );
}
