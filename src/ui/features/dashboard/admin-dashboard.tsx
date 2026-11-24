"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { CalendarCheck, CircleCheck, CircleX, Coins, HandCoins, UserPlus, Users, UserX } from "lucide-react";
import { usePathname, useRouter } from "@/shared/i18n/navigation";
import { useFormatters } from "@/shared/i18n/format";
import { cn } from "@/shared/lib/utils";
import { ErrorState } from "@/ui/components/error-state";
import { KpiCard } from "@/ui/components/kpi-card";
import { SegmentedControl } from "@/ui/components/segmented-control";
import { Skeleton } from "@/ui/components/ui/skeleton";
import { dashboardService } from "@/ui/services/dashboard-service";
import type { AdminDashboard as Data, DashboardPeriod } from "@/ui/services/dashboard-types";
import { AppointmentsTrendChart } from "./appointments-trend-chart";
import { RevenueChart } from "./revenue-chart";
import { NeedsAttention, TodaySchedule, UpcomingWeek, UtilizationCard } from "./widgets";

const PERIODS: DashboardPeriod[] = ["today", "week", "month"];

function readPeriod(value: string | null): DashboardPeriod {
  return PERIODS.includes(value as DashboardPeriod) ? (value as DashboardPeriod) : "today";
}

/**
 * S2 — Admin dashboard (docs/05 S2, RPT-01).
 * The period is kept in the URL (?period=week) so a refresh or shared link keeps it.
 */
export function AdminDashboard() {
  const t = useTranslations("dashboard");
  const locale = useLocale() as "ar" | "en";
  const f = useFormatters();
  const router = useRouter();
  const pathname = usePathname();
  const period = readPeriod(useSearchParams().get("period"));

  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setFailed(false);
    dashboardService
      .getAdminDashboard(period, locale)
      .then(setData)
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [period, locale]);

  useEffect(() => {
    // fetching data is the effect's job; state updates here are intended
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const describeChange = (direction: "up" | "down" | "same", value: string) =>
    t(`change.${direction}`, { value });

  return (
    <div className="mx-auto flex max-w-360 flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-navy-900">{t("title")}</h1>
          <p className="text-sm text-text-secondary">{f.dateLong(new Date().toISOString())}</p>
        </div>
        <SegmentedControl
          label={t("periodLabel")}
          value={period}
          onChange={(p) => router.replace(`${pathname}?period=${p}`)}
          options={PERIODS.map((p) => ({ value: p, label: t(`period.${p}`) }))}
          className="w-full sm:w-auto"
        />
      </header>

      {failed && <ErrorState onRetry={load} />}

      {!data && loading && <DashboardSkeleton />}

      {data && (
        // On refetch keep the previous numbers visible but dimmed (no skeleton flash)
        <div
          aria-busy={loading}
          className={cn("flex flex-col gap-6 transition-opacity", loading && "pointer-events-none opacity-60")}
        >
          {/* Mobile: "Needs attention" comes first (docs/05 S2 responsive) */}
          <div className="lg:hidden">
            <NeedsAttention attention={data.attention} />
          </div>

          <section aria-label={t("periodLabel")} className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard
              label={t("kpi.appointments")}
              value={f.number(data.kpis.appointments.value)}
              current={data.kpis.appointments.value}
              previous={data.kpis.appointments.previous}
              describeChange={describeChange}
              formatPercent={f.percent}
              icon={<CalendarCheck className="size-5" />}
            />
            <KpiCard
              label={t("kpi.completed")}
              value={f.number(data.kpis.completed.value)}
              current={data.kpis.completed.value}
              previous={data.kpis.completed.previous}
              upIsGood
              describeChange={describeChange}
              formatPercent={f.percent}
              icon={<CircleCheck className="size-5" />}
            />
            <KpiCard
              label={t("kpi.cancelled")}
              value={f.number(data.kpis.cancelled.value)}
              current={data.kpis.cancelled.value}
              previous={data.kpis.cancelled.previous}
              upIsGood={false}
              describeChange={describeChange}
              formatPercent={f.percent}
              icon={<CircleX className="size-5" />}
            />
            <KpiCard
              label={t("kpi.noShow")}
              value={f.number(data.kpis.noShow.value)}
              current={data.kpis.noShow.value}
              previous={data.kpis.noShow.previous}
              upIsGood={false}
              describeChange={describeChange}
              formatPercent={f.percent}
              icon={<UserX className="size-5" />}
            />
            <KpiCard
              label={t("kpi.patientsTotal")}
              value={f.number(data.kpis.patientsTotal.value)}
              icon={<Users className="size-5" />}
            />
            <KpiCard
              label={t("kpi.newPatients")}
              value={f.number(data.kpis.newPatients.value)}
              current={data.kpis.newPatients.value}
              previous={data.kpis.newPatients.previous}
              upIsGood
              describeChange={describeChange}
              formatPercent={f.percent}
              icon={<UserPlus className="size-5" />}
            />
            <KpiCard
              label={t("kpi.revenue")}
              value={f.money(data.kpis.revenue.value)}
              current={Number(data.kpis.revenue.value)}
              previous={Number(data.kpis.revenue.previous)}
              upIsGood
              describeChange={describeChange}
              formatPercent={f.percent}
              icon={<Coins className="size-5" />}
            />
            <KpiCard
              label={t("kpi.outstanding")}
              value={f.money(data.kpis.outstanding.value)}
              current={Number(data.kpis.outstanding.value)}
              previous={Number(data.kpis.outstanding.previous)}
              upIsGood={false}
              describeChange={describeChange}
              formatPercent={f.percent}
              icon={<HandCoins className="size-5" />}
            />
          </section>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <TodaySchedule items={data.todaySchedule} />
            </div>
            <div className="hidden lg:block">
              <NeedsAttention attention={data.attention} />
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <AppointmentsTrendChart data={data.trend} period={data.period} />
            <UtilizationCard rows={data.utilization} />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <RevenueChart data={data.revenue} />
            </div>
            <UpcomingWeek days={data.upcoming} />
          </div>
        </div>
      )}
    </div>
  );
}

/** Loading placeholders shaped like the final layout (docs/05 A7 "Loading state"). */
function DashboardSkeleton() {
  const t = useTranslations("states");
  return (
    <div role="status" aria-label={t("loading")} className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-80 rounded-xl lg:col-span-2" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  );
}
