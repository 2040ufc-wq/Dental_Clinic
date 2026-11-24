import {
  Bell,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  ChartColumn,
  LayoutDashboard,
  ScrollText,
  Settings,
  Stethoscope,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { StaffRole } from "@/ui/services/types";

export interface NavItem {
  /** Translation key under "nav" */
  key: string;
  href: string;
  icon: LucideIcon;
  /** false = screen not built yet → shown as "Soon", not clickable */
  ready: boolean;
}

const item = (key: string, href: string, icon: LucideIcon, ready = false): NavItem => ({ key, href, icon, ready });

/** Sidebar items per role (docs/05 A6). Only screens that exist are clickable. */
export const NAV_BY_ROLE: Record<StaffRole, NavItem[]> = {
  admin: [
    item("dashboard", "/dashboard", LayoutDashboard, true),
    item("calendar", "/calendar", CalendarDays),
    item("appointments", "/appointments", CalendarCheck),
    item("patients", "/patients", Users),
    item("dentists", "/dentists", Stethoscope),
    item("schedules", "/schedules", CalendarClock),
    item("payments", "/payments", Wallet),
    item("reports", "/reports", ChartColumn),
    item("notifications", "/notifications", Bell),
    item("auditLogs", "/audit-logs", ScrollText),
    item("settings", "/settings", Settings),
  ],
  receptionist: [
    item("today", "/dashboard", LayoutDashboard, true),
    item("calendar", "/calendar", CalendarDays),
    item("appointments", "/appointments", CalendarCheck),
    item("patients", "/patients", Users),
    item("payments", "/payments", Wallet),
    item("schedules", "/schedules", CalendarClock),
  ],
  dentist: [
    item("myDay", "/dashboard", LayoutDashboard, true),
    item("mySchedule", "/calendar", CalendarDays),
    item("myPatients", "/patients", Users),
  ],
  assistant: [
    item("today", "/dashboard", LayoutDashboard, true),
    item("schedule", "/calendar", CalendarDays),
  ],
};
