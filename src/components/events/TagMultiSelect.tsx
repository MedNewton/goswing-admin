"use client";

import { useState } from "react";
import { createCustomTagAction } from "@/lib/actions/events";
import { translate } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n";

export type TagOption = { id: string; label: string; type?: string };

const PILL_COLORS: Record<string, string> = {
  teal: "bg-teal-900 text-teal-100",
  violet: "bg-violet-900 text-violet-100",
  gray: "bg-gray-900 text-white",
};

interface TagMultiSelectProps {
  label: string;
  type: "party_type" | "music_style" | "extra_service";
  tags: TagOption[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onTagCreated: (tag: TagOption) => void;
  placeholder: string;
  emptyMessage: string;
  loading: boolean;
  loadingMessage: string;
  pillColor: "teal" | "violet" | "gray";
  locale: Locale;
}

export function TagMultiSelect({
  label,
  type,
  tags,
  selectedIds,
  onToggle,
  onTagCreated,
  placeholder,
  emptyMessage,
  loading,
  loadingMessage,
  pillColor,
  locale,
}: TagMultiSelectProps) {
  const cls = PILL_COLORS[pillColor] ?? PILL_COLORS.gray;
  const [customLabel, setCustomLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitCustom = async () => {
    const trimmed = customLabel.trim();
    if (!trimmed || adding) return;
    setAdding(true);
    setError(null);
    try {
      const result = await createCustomTagAction({ type, label: trimmed });
      if (result.success) {
        onTagCreated({ id: result.tag.id, label: result.tag.label, type: result.tag.type });
        setCustomLabel("");
      } else {
        setError(result.error);
      }
    } catch {
      setError("Failed to add tag.");
    } finally {
      setAdding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void submitCustom();
    }
  };

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>

      {selectedIds.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {selectedIds.map((tagId) => {
            const tag = tags.find((t) => t.id === tagId);
            if (!tag) return null;
            return (
              <span
                key={tagId}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${cls}`}
              >
                {tag.label}
                <button
                  type="button"
                  onClick={() => onToggle(tagId)}
                  className="ml-0.5 hover:opacity-70"
                  aria-label="Remove"
                >
                  &times;
                </button>
              </span>
            );
          })}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">{loadingMessage}</p>
      ) : (
        <select
          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
          value=""
          onChange={(e) => {
            const val = e.target.value;
            if (val) onToggle(val);
          }}
        >
          <option value="">{tags.length === 0 ? emptyMessage : placeholder}</option>
          {tags
            .filter((t) => !selectedIds.includes(t.id))
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
        </select>
      )}

      <div className="mt-2 flex items-stretch gap-2">
        <input
          type="text"
          value={customLabel}
          onChange={(e) => setCustomLabel(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={adding}
          placeholder={translate(locale, "createEvent.customTagPlaceholder")}
          maxLength={80}
          className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 disabled:bg-gray-50"
        />
        <button
          type="button"
          onClick={() => void submitCustom()}
          disabled={adding || customLabel.trim().length === 0}
          className="rounded-xl bg-gray-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {adding
            ? translate(locale, "createEvent.customTagAdding")
            : translate(locale, "createEvent.customTagButton")}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
