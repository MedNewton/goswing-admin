"use client";

import { useState, useMemo, useEffect, useTransition } from "react";
import { getClientLocale, translate } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  ChevronLeftIcon,
  DollarIcon,
  PlusIcon,
  ShieldIcon,
} from "@/components/icons";
import {
  createPaymentMethodAction,
  deletePaymentMethodAction,
  setDefaultPaymentMethodAction,
} from "@/lib/actions/paymentMethods";
import type { OrganizerPaymentMethod } from "@/types";

interface PaymentMethodsPageClientProps {
  methods: OrganizerPaymentMethod[];
  organizerId: string;
}

function MethodCard({
  method,
  locale,
  onDelete,
  onSetDefault,
  isDeleting,
}: {
  method: OrganizerPaymentMethod;
  locale: Locale;
  onDelete: (id: string) => void;
  onSetDefault: (id: string, methodType: "payment" | "withdrawal") => void;
  isDeleting: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[1.5rem] border border-gray-200 bg-gradient-to-r from-white to-slate-50 p-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-100 text-gray-700">
          <DollarIcon className="h-5 w-5" />
        </div>
        <div>
          <p className="font-medium text-gray-900">
            {method.label ?? method.provider}
          </p>
          <p className="mt-0.5 text-sm text-gray-500">
            {method.provider}
            {method.providerAccountId && <> &bull; {method.providerAccountId}</>}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {method.isDefault && (
          <Badge variant="confirmed">{translate(locale, "paymentMethodsPage.default")}</Badge>
        )}
        {!method.isDefault && (
          <Button
            variant="outline"
            size="sm"
            className="rounded-full border-gray-200 px-4"
            onClick={() => onSetDefault(method.id, method.methodType)}
            disabled={isDeleting}
          >
            {translate(locale, "paymentMethodsPage.setDefault")}
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="rounded-full text-red-600 hover:text-red-700"
          onClick={() => onDelete(method.id)}
          disabled={isDeleting}
        >
          {translate(locale, "paymentMethodsPage.delete")}
        </Button>
      </div>
    </div>
  );
}

export function PaymentMethodsPageClient({
  methods,
  organizerId,
}: PaymentMethodsPageClientProps) {
  const [locale, setLocale] = useState<Locale>("fr");
  useEffect(() => { setLocale(getClientLocale()); }, []);

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addType, setAddType] = useState<"payment" | "withdrawal">("payment");
  const [provider, setProvider] = useState("stripe");
  const [accountId, setAccountId] = useState("");
  const [label, setLabel] = useState("");

  const paymentMethods = useMemo(
    () => methods.filter((m) => m.methodType === "payment"),
    [methods],
  );
  const withdrawalMethods = useMemo(
    () => methods.filter((m) => m.methodType === "withdrawal"),
    [methods],
  );

  const handleDelete = (id: string) => {
    setError(null);
    startTransition(async () => {
      const result = await deletePaymentMethodAction(id);
      if (!result.success) setError(result.error);
    });
  };

  const handleSetDefault = (id: string, methodType: "payment" | "withdrawal") => {
    setError(null);
    startTransition(async () => {
      const result = await setDefaultPaymentMethodAction(id, organizerId, methodType);
      if (!result.success) setError(result.error);
    });
  };

  const handleAdd = () => {
    setError(null);
    startTransition(async () => {
      const result = await createPaymentMethodAction({
        organizer_id: organizerId,
        method_type: addType,
        provider,
        provider_account_id: accountId || undefined,
        label: label || undefined,
        is_default: false,
        details: {},
      });
      if (result.success) {
        setShowAddForm(false);
        setProvider("stripe");
        setAccountId("");
        setLabel("");
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-800 p-8 text-white shadow-xl shadow-slate-200">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.22),_transparent_34%)]" />
        <div className="relative">
          <Link
            href="/finance"
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-100/75 hover:text-white"
          >
            <ChevronLeftIcon className="h-4 w-4" />
            {translate(locale, "paymentMethodsPage.backToFinance")}
          </Link>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/12 text-white backdrop-blur">
            <ShieldIcon className="h-6 w-6" />
          </div>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-100/80">
            {translate(locale, "paymentMethodsPage.eyebrow")}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            {translate(locale, "paymentMethodsPage.subtitle")}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200">
            {translate(locale, "paymentMethodsPage.description")}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/90 backdrop-blur">
              {paymentMethods.length} {translate(locale, "paymentMethodsPage.paymentMethods").toLowerCase()}
            </div>
            <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/90 backdrop-blur">
              {withdrawalMethods.length} {translate(locale, "paymentMethodsPage.withdrawalMethods").toLowerCase()}
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Payment Methods */}
      <Card className="rounded-[2rem] border border-gray-200 bg-white shadow-lg shadow-gray-100">
        <div className="border-b border-gray-100 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-950 text-white">
                <DollarIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">
                  {translate(locale, "paymentMethodsPage.paymentMethods")}
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-gray-950">
                  {translate(locale, "paymentMethodsPage.paymentMethods")}
                </h2>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full border-gray-200 px-4"
              onClick={() => { setShowAddForm(true); setAddType("payment"); }}
            >
              <PlusIcon className="h-4 w-4" />
              {translate(locale, "paymentMethodsPage.addMethod")}
            </Button>
          </div>
        </div>
        {paymentMethods.length === 0 ? (
          <p className="px-6 py-12 text-center text-gray-500">
            {translate(locale, "paymentMethodsPage.noMethods")}
          </p>
        ) : (
          <div className="space-y-3 p-6">
            {paymentMethods.map((m) => (
              <MethodCard
                key={m.id}
                method={m}
                locale={locale}
                onDelete={handleDelete}
                onSetDefault={handleSetDefault}
                isDeleting={isPending}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Withdrawal Methods */}
      <Card className="rounded-[2rem] border border-gray-200 bg-white shadow-lg shadow-gray-100">
        <div className="border-b border-gray-100 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-950 text-white">
                <ShieldIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">
                  {translate(locale, "paymentMethodsPage.withdrawalMethods")}
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-gray-950">
                  {translate(locale, "paymentMethodsPage.withdrawalMethods")}
                </h2>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full border-gray-200 px-4"
              onClick={() => { setShowAddForm(true); setAddType("withdrawal"); }}
            >
              <PlusIcon className="h-4 w-4" />
              {translate(locale, "paymentMethodsPage.addMethod")}
            </Button>
          </div>
        </div>
        {withdrawalMethods.length === 0 ? (
          <p className="px-6 py-12 text-center text-gray-500">
            {translate(locale, "paymentMethodsPage.noMethods")}
          </p>
        ) : (
          <div className="space-y-3 p-6">
            {withdrawalMethods.map((m) => (
              <MethodCard
                key={m.id}
                method={m}
                locale={locale}
                onDelete={handleDelete}
                onSetDefault={handleSetDefault}
                isDeleting={isPending}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Add Form Modal */}
      {showAddForm && (
        <Card className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">
            {translate(locale, "paymentMethodsPage.addTitle")}
          </h3>
          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">
                {translate(locale, "paymentMethodsPage.methodType")}
              </span>
              <select
                value={addType}
                onChange={(e) => setAddType(e.target.value as "payment" | "withdrawal")}
                className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-700 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              >
                <option value="payment">{translate(locale, "paymentMethodsPage.payment")}</option>
                <option value="withdrawal">{translate(locale, "paymentMethodsPage.withdrawal")}</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">
                {translate(locale, "paymentMethodsPage.providerLabel")}
              </span>
              <input
                type="text"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder={translate(locale, "paymentMethodsPage.providerPlaceholder")}
                className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-700 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">
                {translate(locale, "paymentMethodsPage.accountIdLabel")}
              </span>
              <input
                type="text"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                placeholder={translate(locale, "paymentMethodsPage.accountIdPlaceholder")}
                className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-700 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">
                {translate(locale, "paymentMethodsPage.labelLabel")}
              </span>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={translate(locale, "paymentMethodsPage.labelPlaceholder")}
                className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-700 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              />
            </label>
            <div className="flex gap-3">
              <Button variant="primary" onClick={handleAdd} disabled={isPending}>
                {isPending ? translate(locale, "paymentMethodsPage.adding") : translate(locale, "paymentMethodsPage.addMethod")}
              </Button>
              <Button variant="ghost" onClick={() => setShowAddForm(false)}>
                {translate(locale, "common.cancel")}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
