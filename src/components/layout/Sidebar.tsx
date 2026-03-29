"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomeIcon,
  CalendarIcon,
  ShoppingBagIcon,
  UsersIcon,
  StarIcon,
  MusicIcon,
  ChartIcon,
  EyeIcon,
  DollarIcon,
  MapPinIcon,
  BuildingIcon,
  SettingsIcon,
  HelpIcon,
} from "@/components/icons";
import { getClientLocale, translate } from "@/lib/i18n/client";
import type { Locale, TranslationKey } from "@/lib/i18n";

const navigation: { name: TranslationKey; href: string; icon: typeof HomeIcon }[] = [
  { name: "sidebar.overview", href: "/overview", icon: HomeIcon },
  { name: "sidebar.events", href: "/events", icon: CalendarIcon },
  { name: "sidebar.venue", href: "/venues", icon: MapPinIcon },
  { name: "sidebar.orders", href: "/orders", icon: ShoppingBagIcon },
  { name: "sidebar.attendees", href: "/attendees", icon: UsersIcon },
  { name: "sidebar.reviews", href: "/reviews", icon: StarIcon },
  { name: "sidebar.music", href: "/music", icon: MusicIcon },
  { name: "sidebar.finance", href: "/finance", icon: DollarIcon },
  { name: "sidebar.analytics", href: "/analytics", icon: ChartIcon },
  { name: "sidebar.marketing", href: "/marketing", icon: EyeIcon },
];

const bottomNavigation: { name: TranslationKey; href: string; icon: typeof HomeIcon }[] = [
  { name: "sidebar.helpCenter", href: "/help", icon: HelpIcon },
  { name: "sidebar.profile", href: "/settings", icon: BuildingIcon },
  { name: "sidebar.settings", href: "/settings/general", icon: SettingsIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const [locale, setLocale] = useState<Locale>("fr");
  useEffect(() => { setLocale(getClientLocale()); }, []);

  const isLinkActive = (href: string) => {
    if (href === "/overview") return pathname === "/overview";
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <aside
      className="group fixed left-0 top-0 z-40 h-screen w-16 bg-white shadow-sm transition-all duration-300 hover:w-60"
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-gray-100 px-4">
        <span className="whitespace-nowrap text-xl font-bold text-gray-900 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          GoSwing
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex h-[calc(100vh-4rem)] flex-col p-2">
        <div className="flex-1 space-y-1">
          {navigation.map((item) => {
            const isActive = isLinkActive(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-gray-900 text-white"
                    : "text-gray-900 hover:bg-gray-50"
                }`}
                title={translate(locale, item.name)}
              >
                <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? "text-white" : "text-gray-600"}`} />
                <span className="whitespace-nowrap opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  {translate(locale, item.name)}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Bottom section */}
        <div className="space-y-1 border-t border-gray-100 pt-2 pb-2">
          {bottomNavigation.map((item) => {
            const isActive = isLinkActive(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-gray-900 text-white"
                    : "text-gray-900 hover:bg-gray-50"
                }`}
                title={translate(locale, item.name)}
              >
                <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? "text-white" : "text-gray-600"}`} />
                <span className="whitespace-nowrap opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  {translate(locale, item.name)}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
