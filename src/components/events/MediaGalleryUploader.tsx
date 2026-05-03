"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { PlusIcon, ImageIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { uploadEventMediaAction } from "@/lib/actions/events";
import { translate } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n";

export type GalleryItem = {
  url: string;
  mediaType: "image" | "video";
  caption?: string;
};

interface MediaGalleryUploaderProps {
  items: GalleryItem[];
  onChange: (items: GalleryItem[]) => void;
  locale: Locale;
}

const ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime";

export function MediaGalleryUploader({ items, onChange, locale }: MediaGalleryUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (inputRef.current) inputRef.current.value = "";
    if (files.length === 0) return;

    setUploading(true);
    setError(null);
    const added: GalleryItem[] = [];
    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      const result = await uploadEventMediaAction(fd);
      if (result.success) {
        added.push({ url: result.url, mediaType: result.mediaType });
      } else {
        setError(result.error);
      }
    }
    if (added.length > 0) onChange([...items, ...added]);
    setUploading(false);
  };

  const handleRemove = (url: string) => {
    onChange(items.filter((item) => item.url !== url));
  };

  return (
    <div>
      {items.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <div
              key={item.url}
              className="group relative overflow-hidden rounded-xl border border-gray-200 bg-gray-50"
            >
              {item.mediaType === "video" ? (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video
                  src={item.url}
                  controls
                  preload="metadata"
                  className="h-32 w-full object-cover"
                />
              ) : (
                <div className="relative h-32 w-full">
                  <Image src={item.url} alt="Gallery media" fill className="object-cover" />
                </div>
              )}
              <button
                type="button"
                onClick={() => handleRemove(item.url)}
                className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white opacity-0 transition-opacity group-hover:opacity-100"
                title={translate(locale, "createEvent.galleryRemove")}
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          ))}
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="flex h-32 flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 text-gray-400 transition-colors hover:border-gray-400 hover:text-gray-500 disabled:cursor-not-allowed"
          >
            <PlusIcon className="h-5 w-5" />
            <span className="mt-1 text-xs">
              {uploading
                ? translate(locale, "createEvent.galleryUploading")
                : translate(locale, "createEvent.galleryAddMedia")}
            </span>
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 py-10">
          <ImageIcon className="h-8 w-8 text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">
            {translate(locale, "createEvent.galleryEmpty")}
          </p>
          <Button
            variant="outline"
            size="sm"
            type="button"
            className="mt-3"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading
              ? translate(locale, "createEvent.galleryUploading")
              : translate(locale, "createEvent.galleryAddMedia")}
          </Button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT}
        onChange={handleSelect}
        className="hidden"
      />

      <p className="mt-2 text-xs text-gray-400">
        {translate(locale, "createEvent.galleryHint")}
      </p>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
