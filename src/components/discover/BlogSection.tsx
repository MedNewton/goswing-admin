import { StarIcon } from "@/components/icons";
import { getLocale, t } from "@/lib/i18n";
import type { ComponentType, SVGProps } from "react";

function SectionHeader({
  icon: Icon,
  eyebrow,
  title,
  description,
}: {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  eyebrow: string;
  title: string;
  description?: string;
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
        {description && (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        )}
      </div>
    </div>
  );
}

export async function BlogSection() {
  const locale = await getLocale();

  const BLOG_POSTS = [
    {
      titleKey: "blog.post1.title" as const,
      excerptKey: "blog.post1.excerpt" as const,
      categoryKey: "blog.post1.category" as const,
      gradient: "from-violet-500/20 to-fuchsia-500/20",
      iconBg: "bg-violet-100 text-violet-600",
    },
    {
      titleKey: "blog.post2.title" as const,
      excerptKey: "blog.post2.excerpt" as const,
      categoryKey: "blog.post2.category" as const,
      gradient: "from-sky-500/20 to-cyan-500/20",
      iconBg: "bg-sky-100 text-sky-600",
    },
    {
      titleKey: "blog.post3.title" as const,
      excerptKey: "blog.post3.excerpt" as const,
      categoryKey: "blog.post3.category" as const,
      gradient: "from-amber-500/20 to-orange-500/20",
      iconBg: "bg-amber-100 text-amber-600",
    },
  ];

  return (
    <section className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100 sm:p-8">
      <SectionHeader
        icon={StarIcon}
        eyebrow={t(locale, "blog.eyebrow")}
        title={t(locale, "blog.title")}
        description={t(locale, "blog.description")}
      />
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {BLOG_POSTS.map((post) => (
          <div
            key={post.titleKey}
            className="group overflow-hidden rounded-2xl border border-gray-100 transition-all hover:-translate-y-1 hover:shadow-lg"
          >
            <div
              className={`flex h-44 items-center justify-center bg-gradient-to-br ${post.gradient}`}
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl ${post.iconBg}`}
              >
                <StarIcon className="h-5 w-5" />
              </div>
            </div>

            <div className="p-5">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${post.iconBg}`}
              >
                {t(locale, post.categoryKey)}
              </span>
              <h3 className="mt-3 text-base font-bold text-gray-900 group-hover:text-gray-700">
                {t(locale, post.titleKey)}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                {t(locale, post.excerptKey)}
              </p>
              <p className="mt-4 text-xs font-medium uppercase tracking-[0.18em] text-gray-400">
                {t(locale, "common.comingSoon")}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
