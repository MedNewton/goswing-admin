import Link from "next/link";
import type { Event } from "@/types";
import { CalendarIcon } from "@/components/icons";
import { DiscoverEventCard } from "./DiscoverEventCard";
import { getLocale, t } from "@/lib/i18n";
import type { ComponentType, SVGProps } from "react";

function SectionHeader({
  icon: Icon,
  eyebrow,
  title,
  description,
  viewAllHref,
  viewAllLabel,
}: {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  eyebrow: string;
  title: string;
  description?: string;
  viewAllHref?: string;
  viewAllLabel?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gray-950 text-white shadow-sm">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">
            {eyebrow}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-gray-950">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          )}
        </div>
      </div>
      {viewAllHref && (
        <Link
          href={viewAllHref}
          className="shrink-0 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-gray-900 hover:bg-gray-900 hover:text-white"
        >
          {viewAllLabel} &rarr;
        </Link>
      )}
    </div>
  );
}

export async function FeaturedEvents({ events }: { events: Event[] }) {
  if (events.length === 0) return null;
  const locale = await getLocale();

  return (
    <section className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100 sm:p-8">
      <SectionHeader
        icon={CalendarIcon}
        eyebrow={t(locale, "featured.whatsOn")}
        title={t(locale, "featured.upcomingEvents")}
        description={t(locale, "featured.upcomingEventsDesc")}
        viewAllHref="/discover/events"
        viewAllLabel={t(locale, "common.viewAll")}
      />
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <DiscoverEventCard key={event.id} event={event} locale={locale} />
        ))}
      </div>
    </section>
  );
}
