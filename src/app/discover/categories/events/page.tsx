import { getPublicTags } from "@/lib/data/discover";
import { CategoryCard } from "@/components/discover/CategoryCard";
import { MusicIcon, SearchIcon } from "@/components/icons";
import { getLocale, t } from "@/lib/i18n";
import type { ComponentType, SVGProps } from "react";

export const dynamic = "force-dynamic";

function PageHeader({
  icon: Icon,
  eyebrow,
  title,
  description,
}: {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gray-950 text-white shadow-sm">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">
          {eyebrow}
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-gray-950">{title}</h1>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>
    </div>
  );
}

export default async function EventCategoriesPage() {
  const locale = await getLocale();
  const partyTypes = await getPublicTags("party_type");

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100 sm:p-8">
        <PageHeader
          icon={MusicIcon}
          eyebrow={t(locale, "categories.eyebrow")}
          title={t(locale, "categories.eventCategories")}
          description={t(locale, "categories.eventCategoriesDesc")}
        />

        {partyTypes.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-gray-200 bg-gray-50 py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
              <SearchIcon className="h-5 w-5 text-gray-400" />
            </div>
            <p className="mt-4 font-medium text-gray-500">
              {t(locale, "categories.noCategories")}
            </p>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {partyTypes.map((tag) => (
              <CategoryCard
                key={tag.id}
                label={tag.label}
                slug={tag.slug}
                href={`/discover/events?party_type=${tag.slug}`}
                locale={locale}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
