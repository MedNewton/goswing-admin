import Image from "next/image";
import screenImg from "@/assets/screen.png";
import { getLocale, t } from "@/lib/i18n";

export async function AppDownloadSection() {
  const locale = await getLocale();

  return (
    <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-teal-800 shadow-xl shadow-gray-200">
      <div className="relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.08),_transparent_40%),radial-gradient(circle_at_bottom_left,_rgba(45,212,191,0.12),_transparent_40%)]" />
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-sky-500/10 blur-3xl" />

        <div className="relative grid grid-cols-1 items-center gap-8 p-8 lg:grid-cols-5 lg:p-12">
          <div className="lg:col-span-3">
            <span className="inline-flex items-center rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-teal-300 backdrop-blur">
              {t(locale, "app.eyebrow")}
            </span>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {t(locale, "app.title")}
            </h2>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-slate-300">
              {t(locale, "app.description")}
            </p>

            <div className="mt-8 grid grid-cols-3 gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/20">
                  <svg className="h-5 w-5 text-teal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <p className="mt-3 text-sm font-semibold text-white">{t(locale, "app.discover")}</p>
                <p className="mt-1 text-xs text-slate-400">{t(locale, "app.discoverDesc")}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/20">
                  <svg className="h-5 w-5 text-sky-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                </div>
                <p className="mt-3 text-sm font-semibold text-white">{t(locale, "app.book")}</p>
                <p className="mt-1 text-xs text-slate-400">{t(locale, "app.bookDesc")}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/20">
                  <svg className="h-5 w-5 text-violet-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <p className="mt-3 text-sm font-semibold text-white">{t(locale, "app.explore")}</p>
                <p className="mt-1 text-xs text-slate-400">{t(locale, "app.exploreDesc")}</p>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <div className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-5 py-3 backdrop-blur transition-colors hover:bg-white/15">
                <svg className="h-7 w-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                <div>
                  <p className="text-xs text-slate-400">{t(locale, "app.downloadOn")}</p>
                  <p className="text-sm font-semibold text-white">{t(locale, "app.appStore")}</p>
                </div>
              </div>
              <div className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-5 py-3 backdrop-blur transition-colors hover:bg-white/15">
                <svg className="h-7 w-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 20.5v-17c0-.59.34-1.11.84-1.35L13.69 12l-9.85 9.85c-.5-.24-.84-.76-.84-1.35zm13.81-5.38L6.05 21.34l8.49-8.49 2.27 2.27zm.91-.91L19.59 12l-1.87-2.21-2.27 2.27 2.27 2.15zM6.05 2.66l10.76 6.22-2.27 2.27-8.49-8.49z" />
                </svg>
                <div>
                  <p className="text-xs text-slate-400">{t(locale, "app.getItOn")}</p>
                  <p className="text-sm font-semibold text-white">{t(locale, "app.googlePlay")}</p>
                </div>
              </div>
            </div>
            <p className="mt-4 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              {t(locale, "common.comingSoon")}
            </p>
          </div>

          <div className="flex items-end justify-center lg:col-span-2">
            <div className="relative">
              <div className="absolute -inset-12 rounded-full bg-teal-400/15 blur-[80px]" />
              <div className="absolute -inset-6 rounded-full bg-sky-400/10 blur-[50px]" />
              <div className="absolute -left-8 top-12 h-3 w-3 rounded-full bg-teal-400/40" />
              <div className="absolute -right-6 top-24 h-2 w-2 rounded-full bg-sky-400/50" />
              <div className="absolute -left-4 bottom-20 h-2 w-2 rounded-full bg-violet-400/40" />
              <div className="absolute -right-10 bottom-32 h-3.5 w-3.5 rounded-full bg-teal-300/30" />
              <div className="relative w-[260px] rounded-[2.5rem] border-[6px] border-white/15 bg-black p-1.5 shadow-[0_0_60px_rgba(45,212,191,0.15),0_25px_50px_-12px_rgba(0,0,0,0.5)]">
                <div className="absolute left-1/2 top-0 z-20 h-7 w-28 -translate-x-1/2 rounded-b-2xl bg-black" />
                <div className="overflow-hidden rounded-[2rem]">
                  <Image
                    src={screenImg}
                    alt="GoSwing mobile app"
                    className="h-auto w-full"
                    priority
                  />
                </div>
                <div className="pointer-events-none absolute inset-0 rounded-[2rem] bg-gradient-to-br from-white/10 via-transparent to-transparent" />
              </div>
              <div className="absolute -bottom-4 left-1/2 h-4 w-3/4 -translate-x-1/2 rounded-full bg-black/30 blur-xl" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
