"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SearchBar } from "@/components/ui/SearchBar";
import { Button } from "@/components/ui/Button";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/Table";
import {
  CalendarIcon,
  ChevronRightIcon,
  SearchIcon,
  UsersIcon,
} from "@/components/icons";
import { generateCsv, downloadCsv } from "@/lib/utils/csv";
import { formatDateTime } from "@/lib/utils/format";
import type { Attendee } from "@/types";

interface CheckinSummaryItem {
  eventId: string;
  eventName: string;
  totalReservations: number;
  checkedIn: number;
}

interface AttendeesPageClientProps {
  attendees: Attendee[];
  checkinSummary: CheckinSummaryItem[];
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  accentClass,
}: {
  icon: typeof UsersIcon;
  label: string;
  value: string;
  accentClass: string;
}) {
  return (
    <div className="rounded-3xl border border-white/12 bg-white/10 p-5 backdrop-blur">
      <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 ${accentClass}`}>
        <Icon className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-[0.18em]">
          {label}
        </span>
      </div>
      <p className="mt-4 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

export function AttendeesPageClient({ attendees, checkinSummary }: AttendeesPageClientProps) {
  const [search, setSearch] = useState("");

  const filteredAttendees = useMemo(() => {
    if (!search.trim()) return attendees;
    const q = search.toLowerCase();
    return attendees.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        a.eventName.toLowerCase().includes(q) ||
        (a.ticketType?.toLowerCase().includes(q) ?? false),
    );
  }, [attendees, search]);

  const filteredSummary = useMemo(() => {
    if (!search.trim()) return checkinSummary;
    const q = search.toLowerCase();
    return checkinSummary.filter((s) => s.eventName.toLowerCase().includes(q));
  }, [checkinSummary, search]);

  const totalCheckedIn = attendees.length;
  const totalReservations = checkinSummary.reduce((sum, s) => sum + s.totalReservations, 0);
  const eventsWithCheckins = checkinSummary.filter((s) => s.checkedIn > 0).length;

  const handleExport = () => {
    const csv = generateCsv(filteredAttendees, [
      { key: "name", header: "Name" },
      { key: "email", header: "Email" },
      { key: "eventName", header: "Event" },
      { key: "ticketType", header: "Ticket Type" },
      { key: "checkInTime", header: "Check-in Time" },
    ]);
    downloadCsv(csv, `attendees-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-teal-800 p-8 text-white shadow-xl shadow-slate-200">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(45,212,191,0.22),_transparent_34%)]" />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/12 text-white backdrop-blur">
              <UsersIcon className="h-6 w-6" />
            </div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.3em] text-teal-100/75">
              Attendee Overview
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Check-ins, attendee records, and event-level progress in one place.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200">
              Monitor who has arrived, export attendee lists, and review check-in coverage across your events.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/90 backdrop-blur">
                {filteredAttendees.length.toLocaleString()} attendees shown
              </div>
              <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/90 backdrop-blur">
                {filteredSummary.length.toLocaleString()} events shown
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <SummaryCard
              icon={UsersIcon}
              label="Checked In"
              value={String(totalCheckedIn)}
              accentClass="bg-emerald-50 text-emerald-700"
            />
            <SummaryCard
              icon={UsersIcon}
              label="Reservations"
              value={String(totalReservations)}
              accentClass="bg-sky-50 text-sky-700"
            />
            <SummaryCard
              icon={CalendarIcon}
              label="Active Events"
              value={String(eventsWithCheckins)}
              accentClass="bg-amber-50 text-amber-700"
            />
            <SummaryCard
              icon={CalendarIcon}
              label="Tracked Events"
              value={String(checkinSummary.length)}
              accentClass="bg-rose-50 text-rose-700"
            />
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">
              Filters
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-gray-950">
              Search attendee activity
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Search by attendee, event, email, or ticket type before exporting the current view.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport} className="rounded-full border-gray-200 px-4">
            <ChevronRightIcon className="h-4 w-4" />
            Export CSV
          </Button>
        </div>

        <div className="mt-6 max-w-2xl">
          <SearchBar
            placeholder="Search attendees, emails, events..."
            className="max-w-none [&_input]:h-12 [&_input]:rounded-2xl [&_input]:border-gray-200 [&_input]:pr-4 [&_input]:shadow-sm"
            value={search}
            onChange={setSearch}
          />
        </div>
      </section>

      <Card className="rounded-[2rem] border border-gray-200 bg-white shadow-lg shadow-gray-100">
        <div className="border-b border-gray-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-950 text-white">
              <CalendarIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">
                Event Summary
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-gray-950">Check-ins by Event</h2>
            </div>
          </div>
        </div>
        {filteredSummary.length === 0 ? (
          <p className="px-6 py-12 text-center text-gray-500">No events found.</p>
        ) : (
          <div className="space-y-4 p-6">
            {filteredSummary.map((item) => (
              <div
                key={item.eventId}
                className="flex flex-col gap-4 rounded-[1.5rem] border border-gray-200 bg-gradient-to-r from-white to-slate-50 p-5 lg:flex-row lg:items-center lg:justify-between"
              >
                <div>
                  <h3 className="font-medium text-gray-900">{item.eventName}</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {item.checkedIn} / {item.totalReservations} checked in
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {item.checkedIn > 0 && (
                    <Badge variant="checkedIn">{item.checkedIn} checked in</Badge>
                  )}
                  <Link href={`/events/${item.eventId}`}>
                    <Button variant="outline" size="sm" className="rounded-full border-gray-200 px-4">
                      View Event
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="rounded-[2rem] border border-gray-200 bg-white shadow-lg shadow-gray-100">
        <div className="border-b border-gray-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-950 text-white">
              <SearchIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">
                Attendee List
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-gray-950">Checked-in Attendees</h2>
            </div>
          </div>
        </div>
        {filteredAttendees.length === 0 ? (
          <p className="px-6 py-12 text-center text-gray-500">No checked-in attendees yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableHead className="px-6 py-4">Name</TableHead>
              <TableHead className="px-6 py-4">Email</TableHead>
              <TableHead className="px-6 py-4">Event</TableHead>
              <TableHead className="px-6 py-4">Ticket Type</TableHead>
              <TableHead className="px-6 py-4">Check-in Time</TableHead>
              <TableHead className="px-6 py-4">Status</TableHead>
            </TableHeader>
            <TableBody>
              {filteredAttendees.map((item) => (
                <TableRow key={item.id} className="transition-colors hover:bg-slate-50/80">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-200 text-xs font-semibold text-gray-700">
                        {item.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900">{item.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-600">{item.email}</TableCell>
                  <TableCell className="text-gray-900">{item.eventName}</TableCell>
                  <TableCell className="text-gray-600">{item.ticketType ?? "—"}</TableCell>
                  <TableCell className="text-gray-600">
                    {item.checkInTime ? formatDateTime(item.checkInTime) : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="checkedIn">Checked In</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
