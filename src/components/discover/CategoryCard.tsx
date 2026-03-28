import Link from "next/link";
import { ChevronRightIcon } from "@/components/icons";
import { t, type Locale } from "@/lib/i18n";

interface CategoryCardProps {
  label: string;
  slug: string;
  href: string;
  locale: Locale;
}

export function CategoryCard({ label, href, locale }: CategoryCardProps) {
  return (
    <Link
      href={href}
      className="group relative block overflow-hidden rounded-2xl border border-gray-100 bg-white transition-all hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="h-1.5 bg-gray-900" />

      <div className="flex items-center justify-between p-5">
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-gray-900 group-hover:text-gray-700">
            {label}
          </h3>
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-gray-900" />
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              {t(locale, "common.category")}
            </span>
          </div>
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-400 transition-colors group-hover:bg-gray-900 group-hover:text-white">
          <ChevronRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}
