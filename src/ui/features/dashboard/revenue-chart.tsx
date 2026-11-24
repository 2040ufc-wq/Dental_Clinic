"use client";

import { useLocale, useTranslations } from "next-intl";
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useFormatters } from "@/shared/i18n/format";
import { ChartCard, DataTable } from "@/ui/components/chart-card";
import type { RevenuePoint } from "@/ui/services/dashboard-types";
import { CHART_CHROME, REVENUE_SERIES } from "./chart-theme";
import { ChartTooltipBox } from "./chart-tooltip";

/**
 * Billed (columns) vs collected (line) per day — both in SAR on ONE axis
 * (dataviz: never a dual-axis chart).
 */
export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  const t = useTranslations("dashboard.charts");
  const f = useFormatters();
  const rtl = useLocale() === "ar";
  const label = data.length > 7 ? f.dayMonth : f.dayShort;
  const rows = data.map((p) => ({ label: label(p.day), billed: Number(p.billed), collected: Number(p.collected) }));
  const billedLabel = t("series.billed");
  const collectedLabel = t("series.collected");

  return (
    <ChartCard
      title={t("revenueTitle")}
      subtitle={t("revenueSubtitle", { days: data.length })}
      legend={[
        { label: billedLabel, color: REVENUE_SERIES.billed },
        { label: collectedLabel, color: REVENUE_SERIES.collected, kind: "line" },
      ]}
      chart={
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rows} margin={{ top: 8, right: 8, left: 8, bottom: 0 }} barCategoryGap="30%">
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
                orientation={rtl ? "right" : "left"}
                tickLine={false}
                axisLine={false}
                width={44}
                tick={{ fill: CHART_CHROME.tick, fontSize: 12 }}
                tickFormatter={(v: number) => f.compact(v)}
              />
              <Tooltip
                cursor={{ fill: CHART_CHROME.cursor }}
                content={({ active, payload, label: title }) =>
                  active && payload?.length ? (
                    <ChartTooltipBox
                      title={String(title)}
                      rows={[
                        { label: billedLabel, color: REVENUE_SERIES.billed, value: f.money(payload[0].payload.billed) },
                        {
                          label: collectedLabel,
                          color: REVENUE_SERIES.collected,
                          kind: "line",
                          value: f.money(payload[0].payload.collected),
                        },
                      ]}
                    />
                  ) : null
                }
              />
              <Bar
                dataKey="billed"
                name={billedLabel}
                fill={REVENUE_SERIES.billed}
                maxBarSize={24}
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
              <Line
                dataKey="collected"
                name={collectedLabel}
                type="monotone"
                stroke={REVENUE_SERIES.collected}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                dot={{ r: 4, fill: REVENUE_SERIES.collected, stroke: CHART_CHROME.surface, strokeWidth: 2 }}
                activeDot={{ r: 5, stroke: CHART_CHROME.surface, strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      }
      table={
        <DataTable
          caption={t("revenueTitle")}
          columns={[t("day"), billedLabel, collectedLabel]}
          rows={data.map((p) => [label(p.day), f.money(p.billed), f.money(p.collected)])}
        />
      }
    />
  );
}
