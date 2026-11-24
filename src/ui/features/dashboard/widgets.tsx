"use client";

import { useTranslations } from "next-intl";
import {
  BadgePercent,
  CircleCheck,
  Copy,
  MessageSquareWarning,
  ReceiptText,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { useFormatters } from "@/shared/i18n/format";
import { cn } from "@/shared/lib/utils";
import { StatusBadge } from "@/ui/components/status-badge";
import type { AdminDashboard, ScheduleItem, UpcomingDay, UtilizationRow } from "@/ui/services/dashboard-types";

const card = "rounded-xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(15,30,46,0.06)]";
const MAX_SCHEDULE_ROWS = 8;

/** Today's appointments, in time order (docs/05 S2 "Today's schedule"). */
export function TodaySchedule({ items }: { items: ScheduleItem[] }) {
  const t = useTranslations("dashboard.schedule");
  const f = useFormatters();
  const isFriday = new Date().toLocaleDateString("en-US", { weekday: "short", timeZone: "Asia/Riyadh" }) === "Fri";
  const visible = items.slice(0, MAX_SCHEDULE_ROWS);

  return (
    <section className={cn(card, "flex flex-col gap-3")}>
      <h2 className="text-base font-semibold text-navy-900">{t("title")}</h2>
      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-secondary">{isFriday ? t("closed") : t("empty")}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {visible.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
              <span className="w-24 shrink-0 text-sm font-medium tabular">
                {f.time(item.startsAt)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{item.patientName}</span>
                <span className="flex items-center gap-1.5 text-xs text-text-secondary">
                  <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ backgroundColor: item.serviceColor }} />
                  <span className="truncate">
                    {item.serviceName} · {item.dentistName}
                  </span>
                </span>
              </span>
              <StatusBadge status={item.status} />
            </li>
          ))}
        </ul>
      )}
      {items.length > MAX_SCHEDULE_ROWS && (
        <p className="text-xs text-text-secondary">{t("more", { count: items.length - MAX_SCHEDULE_ROWS })}</p>
      )}
    </section>
  );
}

const ATTENTION: Array<{ key: keyof AdminDashboard["attention"]; icon: LucideIcon }> = [
  { key: "pendingDiscounts", icon: BadgePercent },
  { key: "refundRequests", icon: ReceiptText },
  { key: "possibleDuplicates", icon: Copy },
  { key: "failedNotifications", icon: MessageSquareWarning },
  { key: "overridesToday", icon: TriangleAlert },
];

/** Items waiting for the admin; rows with a zero count are hidden (docs/05 S2). */
export function NeedsAttention({ attention }: { attention: AdminDashboard["attention"] }) {
  const t = useTranslations("dashboard.attention");
  const f = useFormatters();
  const rows = ATTENTION.filter(({ key }) => attention[key] > 0);

  return (
    <section className={cn(card, "flex flex-col gap-3")}>
      <h2 className="text-base font-semibold text-navy-900">{t("title")}</h2>
      {rows.length === 0 ? (
        <p className="flex items-center justify-center gap-2 py-8 text-sm text-success">
          <CircleCheck aria-hidden="true" className="size-4" />
          {t("allClear")}
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {rows.map(({ key, icon: Icon }) => (
            <li key={key} className="flex min-h-11 items-center gap-3 rounded-lg px-2">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-warning-tint text-warning">
                <Icon aria-hidden="true" className="size-4" />
              </span>
              <span className="flex-1 text-sm">{t(key)}</span>
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold tabular">{f.number(attention[key])}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Booked ÷ scheduled minutes per dentist, as meters (dataviz meter: the track is a lighter
 * step of the fill's ramp; ≥ 85% switches to the warning colour + is stated in text).
 */
export function UtilizationCard({ rows }: { rows: UtilizationRow[] }) {
  const t = useTranslations("dashboard.charts");
  const f = useFormatters();

  return (
    <section className={cn(card, "flex flex-col gap-4")}>
      <div>
        <h2 className="text-base font-semibold text-navy-900">{t("utilizationTitle")}</h2>
        <p className="text-xs text-text-secondary">{t("utilizationSubtitle")}</p>
      </div>
      <ul className="flex flex-col gap-4">
        {rows.map((row) => {
          const ratio = row.scheduledMinutes > 0 ? row.bookedMinutes / row.scheduledMinutes : 0;
          const high = ratio >= 0.85;
          return (
            <li key={row.dentistId} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="font-medium">{row.dentistName}</span>
                <span className={cn("font-semibold", high && "text-warning")}>{f.percent(ratio)}</span>
              </div>
              <div
                role="meter"
                aria-label={row.dentistName}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(ratio * 100)}
                aria-valuetext={`${f.percent(ratio)} — ${t("utilizationRow", {
                  booked: f.number(row.bookedMinutes),
                  scheduled: f.number(row.scheduledMinutes),
                })}`}
                className={cn("h-2 w-full overflow-hidden rounded-full", high ? "bg-warning-tint" : "bg-primary-50")}
              >
                <div
                  className={cn("h-full rounded-full", high ? "bg-warning" : "bg-[#0a8a9e]")}
                  style={{ width: `${Math.min(100, ratio * 100)}%` }}
                />
              </div>
              <span className="text-xs text-text-secondary">
                {t("utilizationRow", { booked: f.number(row.bookedMinutes), scheduled: f.number(row.scheduledMinutes) })}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Next 7 days: booked / cancelled counts per day (docs/05 S2). */
export function UpcomingWeek({ days }: { days: UpcomingDay[] }) {
  const t = useTranslations("dashboard.charts");
  const f = useFormatters();

  return (
    <section className={cn(card, "flex flex-col gap-3")}>
      <h2 className="text-base font-semibold text-navy-900">{t("upcomingTitle")}</h2>
      <ul className="flex flex-col divide-y divide-border">
        {days.map((d) => (
          <li key={d.day} className="flex items-center justify-between gap-2 py-2 text-sm">
            <span className="font-medium">{f.dayShort(d.day)}</span>
            {d.booked === 0 && d.cancelled === 0 ? (
              <span className="text-xs text-text-secondary">{t("closed")}</span>
            ) : (
              <span className="flex flex-wrap justify-end gap-1.5 text-xs">
                <span className="rounded-full bg-status-booked-tint px-2 py-0.5 text-status-booked">
                  {t("upcomingBooked", { count: f.number(d.booked) })}
                </span>
                {d.cancelled > 0 && (
                  <span className="rounded-full bg-status-cancelled-tint px-2 py-0.5 text-status-cancelled">
                    {t("upcomingCancelled", { count: f.number(d.cancelled) })}
                  </span>
                )}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
