"use client";

import { useLocale, useTranslations } from "next-intl";
import { Construction } from "lucide-react";
import { useStaffUser } from "@/ui/components/app-shell/staff-user-context";
import { AdminDashboard } from "./admin-dashboard";

/**
 * /dashboard picks the dashboard for the signed-in role.
 * Admin: built (S2). Reception / dentist / assistant dashboards: later step (RPT-02, RPT-03).
 */
export function DashboardHome() {
  const user = useStaffUser();
  const t = useTranslations("dashboard.roleHome");
  const tr = useTranslations("roles");
  const locale = useLocale();

  if (user.role === "admin") return <AdminDashboard />;

  const name = locale === "ar" ? user.fullNameAr : user.fullNameEn;
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-3 rounded-xl border border-border bg-card p-8 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-primary-100 text-primary-700">
        <Construction aria-hidden="true" className="size-6" />
      </span>
      <h1 className="text-xl font-semibold text-navy-900">{t("title", { name })}</h1>
      <p className="text-sm text-text-secondary">{t("body", { role: tr(user.role) })}</p>
    </div>
  );
}
