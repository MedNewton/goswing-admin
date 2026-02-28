"use client";

import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg } from "@fullcalendar/core";
import type { Event } from "@/types";

interface EventCalendarProps {
  events: Event[];
}

// Map event status to colors
const statusColors: Record<string, { bg: string; border: string; text: string }> = {
  published: { bg: "#DCFCE7", border: "#16A34A", text: "#15803D" },
  draft: { bg: "#FEF9C3", border: "#CA8A04", text: "#A16207" },
  completed: { bg: "#DBEAFE", border: "#2563EB", text: "#1D4ED8" },
  cancelled: { bg: "#FEE2E2", border: "#DC2626", text: "#B91C1C" },
};

export function EventCalendar({ events }: EventCalendarProps) {
  const router = useRouter();

  // Convert app events to FullCalendar event objects
  const calendarEvents = events.map((event) => {
    const colors = statusColors[event.status] ?? statusColors.draft;

    return {
      id: event.id,
      title: event.title,
      start: event.startsAt ?? event.date,
      end: event.endsAt ?? undefined,
      backgroundColor: colors.bg,
      borderColor: colors.border,
      textColor: colors.text,
      extendedProps: {
        location: event.location,
        status: event.status,
        attendeeCount: event.attendeeCount,
        image: event.image,
      },
    };
  });

  const handleEventClick = (info: EventClickArg) => {
    router.push(`/events/${info.event.id}`);
  };

  return (
    <div className="event-calendar rounded-lg bg-white p-4 shadow-sm">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        events={calendarEvents}
        eventClick={handleEventClick}
        editable={false}
        selectable={false}
        dayMaxEvents={3}
        moreLinkClick="popover"
        height="auto"
        eventDisplay="block"
        eventContent={(arg) => {
          const { status, location } = arg.event.extendedProps as {
            status: string;
            location: string;
          };
          return (
            <div className="cursor-pointer overflow-hidden px-1.5 py-0.5">
              <div className="truncate text-xs font-semibold">
                {arg.event.title}
              </div>
              {arg.view.type !== "dayGridMonth" && (
                <div className="truncate text-[10px] opacity-80">
                  📍 {location}
                </div>
              )}
              {arg.view.type !== "dayGridMonth" && (
                <div className="truncate text-[10px] opacity-70 capitalize">
                  {status}
                </div>
              )}
            </div>
          );
        }}
        buttonText={{
          today: "Today",
          month: "Month",
          week: "Week",
          day: "Day",
        }}
      />

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-gray-100 pt-3">
        <span className="text-xs font-medium text-gray-500">Status:</span>
        {Object.entries(statusColors).map(([status, colors]) => (
          <div key={status} className="flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-sm border"
              style={{ backgroundColor: colors.bg, borderColor: colors.border }}
            />
            <span className="text-xs capitalize text-gray-600">{status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
