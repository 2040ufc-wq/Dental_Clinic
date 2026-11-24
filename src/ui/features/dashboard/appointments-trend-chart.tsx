"use client";

import { useLocale, useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useFormatters } from "@/shared/i18n/format";
import { ChartCard, DataTable } from "@/ui/components/chart-card";
import type { DashboardPeriod, TrendPoint } from "@/ui/services/dashboard-types";
import { CHART_CHROME, STATUS_SERIES } from "./chart-theme";
import { ChartTooltipBox } from "./chart-tooltip";

const KEYS = ["completed", "booked", "cancelled", "noShow"] as const;

/** Stacked columns: appointments per hour (today) or per day, split by status (docs/05 S2). */
export function AppointmentsTrendChart({ data, period }: { data: TrendPoint[]; period: DashboardPeriod }) {
  const t = useTranslations("dashboard.charts");
  const f = useFormatters();
  const rtl = useLocale() === "ar";
  const label = (bucket: string) =>
    period === "today" ? f.hour(bucket) : period === "week" ? f.dayShort(bucket) : f.dayMonth(bucket);

  const rows = data.map((p) => ({ ...p, label: label(p.bucket) }));
  const series = KEYS.map((key) => ({ key, label: t(`series.${key}`), color: STATUS_SERIES[key] }));

  return (
    <ChartCard
      title={t("trendTitle")}
      subtitle={period === "today" ? t("trendSubtitleToday") : t("trendSubtitle")}
      legend={series.map((s) => ({ label: s.label, color: s.color }))}
      chart={
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 8, right: 4, left: 4, bottom: 0 }} barCategoryGap="28%">
              <CartesianGrid vertical={false} stroke={CHART_CHROME.grid} />
              <XAxis
                dataKey="label"
                reversed={rtl}
                tickLine={false}
                axisLine={{ stroke: CHART_CHROME.grid }}
                tick={{ fill: CHART_CHROME.tick, fontSize: 12 }}
                interval="preserveStartEnd"
                minTickGap={12}
              />
              <YAxis
                allowDecimals={false}
                orientation={rtl ? "right" : "left"}
                tickLine={false}
                axisLine={false}
                width={32}
                tick={{ fill: CHART_CHROME.tick, fontSize: 12 }}
                tickFormatter={(v: number) => f.number(v)}
              />
              <Tooltip
                cursor={{ fill: CHART_CHROME.cursor }}
                content={({ active, payload, label: title }) =>
                  active && payload?.length ? (
                    <ChartTooltipBox
                      title={String(title)}
                      rows={series.map((s) => ({
                        label: s.label,
                        color: s.color,
                        value: f.number(Number(payload[0].payload[s.key])),
                      }))}
                    />
                  ) : null
                }
              />
              {series.map((s, i) => (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  name={s.label}
                  stackId="status"
                  fill={s.color}
                  maxBarSize={24}
                  // 2px surface gap between stacked segments; rounded data-end on the top segment only
                  stroke={CHART_CHROME.surface}
                  strokeWidth={2}
                  radius={i === series.length - 1 ? [4, 4, 0, 0] : 0}
                  isAnimationActive={false}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      }
      table={
        <DataTable
          caption={t("trendTitle")}
          columns={[period === "today" ? t("time") : t("day"), ...series.map((s) => s.label), t("total")]}
          rows={rows.map((r) => [
            r.label,
            ...KEYS.map((k) => f.number(r[k])),
            f.number(KEYS.reduce((acc, k) => acc + r[k], 0)),
          ])}
        />
      }
    />
  );
}
