import type { AdminDashboard, DashboardPeriod, StaffAlert } from "./dashboard-types";
import { getMockAdminDashboard, getMockStaffAlerts } from "./mock/mock-dashboard-service";

/**
 * Contract for dashboard data (docs/04 §13–14).
 * Screens depend on this interface only; the mock is swapped for /api/v1 calls later.
 */
export interface DashboardService {
  getAdminDashboard(period: DashboardPeriod, locale: "ar" | "en"): Promise<AdminDashboard>;
  getStaffAlerts(locale: "ar" | "en"): Promise<StaffAlert[]>;
}

export const dashboardService: DashboardService = {
  getAdminDashboard: getMockAdminDashboard,
  getStaffAlerts: getMockStaffAlerts,
};
