"use client";

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
} from "@/components/icons";

const navigation = [
  { name: "Overview", href: "/", icon: HomeIcon },
  { name: "Events", href: "/events", icon: CalendarIcon },
  { name: "Venues", href: "/venues", icon: MapPinIcon },
  { name: "Orders", href: "/orders", icon: ShoppingBagIcon },
  { name: "Attendees", href: "/attendees", icon: UsersIcon },
  { name: "Reviews", href: "/reviews", icon: StarIcon },
  { name: "Music", href: "/music", icon: MusicIcon },
  { name: "Finance", href: "/finance", icon: DollarIcon },
  { name: "Analytics", href: "/analytics", icon: ChartIcon },
  { name: "Marketing", href: "/marketing", icon: EyeIcon },
];

export function Sidebar() {
  const pathname = usePathname();

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
            const isActive = pathname === item.href;
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
                title={item.name}
              >
                <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? "invert" : ""}`} />
                <span className={`whitespace-nowrap opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${isActive ? 'text-white' : "text-black"}`}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Bottom section */}
        <div className="border-t border-gray-100 pt-2 pb-2">
          {(() => {
            const isActive = pathname === "/settings";
            return (
              <Link
                href="/settings"
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-gray-900 text-white"
                    : "text-gray-900 hover:bg-gray-50"
                }`}
                title="Organizer Profile"
              >
                <BuildingIcon className={`h-5 w-5 flex-shrink-0 ${isActive ? "invert" : ""}`} />
                <span className={`whitespace-nowrap opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${isActive ? 'text-white' : "text-black"}`}>
                  Organizer Profile
                </span>
              </Link>
            );
          })()}
        </div>
      </nav>
    </aside>
  );
}
