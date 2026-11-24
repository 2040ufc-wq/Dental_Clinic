"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Bell } from "lucide-react";
import { useFormatters } from "@/shared/i18n/format";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ui/components/ui/dropdown-menu";
import { dashboardService } from "@/ui/services/dashboard-service";
import type { StaffAlert } from "@/ui/services/dashboard-types";

/** Header bell with unread count and a list of staff alerts (NOT-05, docs/05 A6). */
export function AlertsMenu() {
  const t = useTranslations("header");
  const locale = useLocale() as "ar" | "en";
  const f = useFormatters();
  const [alerts, setAlerts] = useState<StaffAlert[]>([]);

  useEffect(() => {
    let active = true;
    dashboardService.getStaffAlerts(locale).then((list) => active && setAlerts(list));
    return () => {
      active = false;
    };
  }, [locale]);

  const unread = alerts.filter((a) => !a.isRead).length;
  const label = `${t("alerts")}: ${t("unread", { count: unread })}`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" aria-label={label} className="relative text-text-secondary" />}
      >
        <Bell aria-hidden="true" className="size-5" />
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute top-1.5 end-1.5 flex min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] leading-4 font-semibold text-white"
          >
            {unread}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <span className="text-sm font-semibold">{t("alerts")}</span>
          {unread > 0 && (
            <button
              type="button"
              onClick={() => setAlerts((list) => list.map((a) => ({ ...a, isRead: true })))}
              className="text-xs font-medium text-primary-600 hover:underline"
            >
              {t("markAllRead")}
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        {alerts.length === 0 && <p className="px-2 py-4 text-center text-sm text-text-secondary">{t("noAlerts")}</p>}
        {alerts.map((a) => (
          <DropdownMenuItem
            key={a.id}
            onClick={() => setAlerts((list) => list.map((x) => (x.id === a.id ? { ...x, isRead: true } : x)))}
            className="flex items-start gap-2 py-2"
          >
            <span
              aria-hidden="true"
              className={cn("mt-1.5 size-2 shrink-0 rounded-full", a.isRead ? "bg-transparent" : "bg-primary-600")}
            />
            <span className="flex flex-col gap-0.5">
              <span className={cn("text-sm", !a.isRead && "font-medium")}>{a.message}</span>
              <span className="text-xs text-text-secondary">{f.time(a.createdAt)}</span>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
