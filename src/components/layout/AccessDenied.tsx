import { MainLayout } from "./MainLayout";
import { ShieldIcon, MusicIcon, ShoppingBagIcon, DollarIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { getLocale, t } from "@/lib/i18n";
import type { OrganizerRole } from "@/types/database";
import { roleDefaultPage } from "@/lib/auth/requireAdmin";

const roleConfig: Record<
  Exclude<OrganizerRole, "admin">,
  { icon: typeof MusicIcon; labelKey: string }
> = {
  dj: { icon: MusicIcon, labelKey: "accessDenied.goToMusic" },
  entrance_manager: { icon: ShoppingBagIcon, labelKey: "accessDenied.goToOrders" },
  finance_manager: { icon: DollarIcon, labelKey: "accessDenied.goToFinance" },
};

export async function AccessDenied({ role = "dj" }: { role?: OrganizerRole }) {
  const locale = await getLocale();
  const config = roleConfig[role as Exclude<OrganizerRole, "admin">] ?? roleConfig.dj;
  const Icon = config.icon;
  const href = roleDefaultPage[role] ?? "/music";

  return (
    <MainLayout>
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
            <ShieldIcon className="h-8 w-8" />
          </div>
          <h1 className="mt-6 text-2xl font-semibold text-gray-900">
            {t(locale, "accessDenied.title")}
          </h1>
          <p className="mt-3 text-sm leading-6 text-gray-500">
            {t(locale, "accessDenied.description")}
          </p>
          <div className="mt-8">
            <Link href={href}>
              <Button variant="primary">
                <Icon className="h-4 w-4" />
                {t(locale, config.labelKey as Parameters<typeof t>[1])}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
