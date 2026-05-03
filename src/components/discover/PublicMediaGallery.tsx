import Image from "next/image";
import { StarIcon } from "@/components/icons";
import type { ComponentType, SVGProps } from "react";
import type { GalleryItem } from "@/types";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

function SectionHeader({
  icon: Icon,
  eyebrow,
  title,
}: {
  icon: IconComponent;
  eyebrow: string;
  title: string;
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
        <h2 className="mt-1 text-xl font-semibold text-gray-950">{title}</h2>
      </div>
    </div>
  );
}

interface PublicMediaGalleryProps {
  items: GalleryItem[];
  eyebrow: string;
  title: string;
}

export function PublicMediaGallery({ items, eyebrow, title }: PublicMediaGalleryProps) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100">
      <SectionHeader icon={StarIcon} eyebrow={eyebrow} title={title} />
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="relative h-44 overflow-hidden rounded-2xl border border-gray-100 bg-gray-50"
          >
            {item.mediaType === "video" ? (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video
                src={item.mediaUrl}
                controls
                preload="metadata"
                className="h-full w-full object-cover"
              />
            ) : (
              <Image
                src={item.mediaUrl}
                alt={item.caption ?? "Gallery"}
                fill
                className="object-cover"
              />
            )}
            {item.caption && item.mediaType !== "video" && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                <p className="text-xs text-white">{item.caption}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
