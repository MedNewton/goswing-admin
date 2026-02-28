"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SearchBar } from "@/components/ui/SearchBar";
import { Button } from "@/components/ui/Button";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/Table";
import { UsersIcon, CalendarIcon } from "@/components/icons";
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

  const statCards = [
    {
      label: "Checked In",
      value: String(totalCheckedIn),
      icon: <UsersIcon className="h-6 w-6 text-green-600" />,
      iconBgColor: "bg-green-50",
    },
    {
      label: "Total Reservations",
      value: String(totalReservations),
      icon: <UsersIcon className="h-6 w-6 text-blue-600" />,
      iconBgColor: "bg-blue-50",
    },
    {
      label: "Events with Check-ins",
      value: String(eventsWithCheckins),
      icon: <CalendarIcon className="h-6 w-6 text-purple-600" />,
      iconBgColor: "bg-purple-50",
    },
    {
      label: "Total Events",
      value: String(checkinSummary.length),
      icon: <CalendarIcon className="h-6 w-6 text-gray-600" />,
      iconBgColor: "bg-gray-50",
    },
  ];

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
      {/* Search + Export */}
      <div className="flex flex-wrap items-center gap-4">
        <SearchBar
          placeholder="Search attendees, emails, events..."
          className="flex-1 max-w-lg"
          value={search}
          onChange={setSearch}
        />
        <Button variant="outline" size="sm" onClick={handleExport}>
          Export
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      {/* Check-in Summary by Event */}
      <Card>
        <h2 className="mb-6 text-lg font-semibold text-gray-900">Check-ins by Event</h2>
        {filteredSummary.length === 0 ? (
          <p className="py-8 text-center text-gray-500">No events found.</p>
        ) : (
          <div className="space-y-4">
            {filteredSummary.map((item) => (
              <div
                key={item.eventId}
                className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
              >
                <div>
                  <h3 className="font-medium text-gray-900">{item.eventName}</h3>
                  <p className="text-sm text-gray-500">
                    {item.checkedIn} / {item.totalReservations} checked in
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {item.checkedIn > 0 && (
                    <Badge variant="checkedIn">{item.checkedIn} checked in</Badge>
                  )}
                  <Link href={`/events/${item.eventId}`}>
                    <Button variant="outline" size="sm">View Event</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Checked-in Attendees Table */}
      <Card>
        <h2 className="mb-6 text-lg font-semibold text-gray-900">Checked-in Attendees</h2>
        {filteredAttendees.length === 0 ? (
          <p className="py-8 text-center text-gray-500">No checked-in attendees yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Ticket Type</TableHead>
              <TableHead>Check-in Time</TableHead>
              <TableHead>Status</TableHead>
            </TableHeader>
            <TableBody>
              {filteredAttendees.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-700">
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
