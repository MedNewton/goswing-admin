"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { translate, getClientLocale } from "@/lib/i18n/client";

interface FilterOption {
  value: string;
  label: string;
}

interface DiscoverFiltersProps {
  filterKey: string;
  filterLabel: string;
  filterOptions: FilterOption[];
  cities?: string[];
  showFreeToggle?: boolean;
  basePath: string;
}

export function DiscoverFilters({
  filterKey,
  filterLabel,
  filterOptions,
  cities,
  showFreeToggle,
  basePath,
}: DiscoverFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = getClientLocale();
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);

  const currentFilter = searchParams.get(filterKey) ?? "";
  const currentCity = searchParams.get("city") ?? "";
  const currentFree = searchParams.get("free") === "true";

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`${basePath}?${params.toString()}`);
    },
    [router, searchParams, basePath],
  );

  const hasActiveFilters = currentFilter || currentCity || currentFree;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={currentFilter}
          onChange={(e) => updateParams(filterKey, e.target.value)}
          className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors focus:border-gray-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
        >
          <option value="">{t("filters.all")} {filterLabel}</option>
          {filterOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {cities && cities.length > 0 && (
          <select
            value={currentCity}
            onChange={(e) => updateParams("city", e.target.value)}
            className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors focus:border-gray-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
          >
            <option value="">{t("filters.allCities")}</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}

        {showFreeToggle && (
          <button
            type="button"
            onClick={() => updateParams("free", currentFree ? "" : "true")}
            className={`cursor-pointer rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
              currentFree
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300 hover:bg-gray-100"
            }`}
          >
            {t("filters.freeEvents")}
          </button>
        )}

        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => router.push(basePath)}
            className="cursor-pointer rounded-xl px-3 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
          >
            {t("filters.clearFilters")}
          </button>
        )}
      </div>
    </div>
  );
}
