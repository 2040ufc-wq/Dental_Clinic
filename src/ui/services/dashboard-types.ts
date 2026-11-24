/**
 * Dashboard DTOs — mirror GET /api/v1/dashboard/admin?period=… (docs/04 §14)
 * and the metric definitions in docs/01 RPT-05.
 * Money values are strings with 2 decimals ("150.00"), as in the API spec.
 */

export type AppointmentStatus =
  | "booked"
  | "checked_in"
  | "in_treatment"
  | "completed"
  | "cancelled"
  | "no_show";

export type DashboardPeriod = "today" | "week" | "month";

export interface KpiValue {
  value: number;
  /** Same metric for the previous period of equal length (for the ▲/▼ comparison) */
  previous: number;
}

export interface MoneyKpi {
  value: string;
  previous: string;
}

export interface ScheduleItem {
  id: string;
  referenceNo: string;
  startsAt: string;
  endsAt: string;
  patientName: string;
  serviceName: string;
  serviceColor: string;
  dentistName: string;
  status: AppointmentStatus;
}

export interface TrendPoint {
  /** ISO timestamp: start of the hour (today) or of the day (week / month) */
  bucket: string;
  completed: number;
  booked: number;
  cancelled: number;
  noShow: number;
}

export interface UtilizationRow {
  dentistId: string;
  dentistName: string;
  bookedMinutes: number;
  scheduledMinutes: number;
}

export interface RevenuePoint {
  /** ISO timestamp of the day */
  day: string;
  billed: string;
  collected: string;
}

export interface UpcomingDay {
  day: string;
  booked: number;
  cancelled: number;
}

export interface AdminDashboard {
  period: DashboardPeriod;
  range: { from: string; to: string };
  kpis: {
    appointments: KpiValue;
    completed: KpiValue;
    cancelled: KpiValue;
    noShow: KpiValue;
    patientsTotal: KpiValue;
    newPatients: KpiValue;
    revenue: MoneyKpi;
    outstanding: MoneyKpi;
  };
  todaySchedule: ScheduleItem[];
  attention: {
    pendingDiscounts: number;
    refundRequests: number;
    possibleDuplicates: number;
    failedNotifications: number;
    overridesToday: number;
  };
  trend: TrendPoint[];
  utilization: UtilizationRow[];
  revenue: RevenuePoint[];
  upcoming: UpcomingDay[];
}

export interface StaffAlert {
  id: string;
  type: "new_online_booking" | "cancellation" | "reschedule" | "emergency_booking" | "discount_pending" | "refund_requested";
  message: string;
  createdAt: string;
  isRead: boolean;
}
