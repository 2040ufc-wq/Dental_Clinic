import type {
  AdminDashboard,
  AppointmentStatus,
  DashboardPeriod,
  ScheduleItem,
  StaffAlert,
  TrendPoint,
} from "../dashboard-types";

/**
 * SYNTHETIC dashboard data, generated deterministically from today's date so the numbers
 * are stable while you click around but change day to day. Shapes match docs/04 §14.
 * Replaced by GET /api/v1/dashboard/admin when the backend is connected.
 */

type Locale = "ar" | "en";

const RIYADH_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const FRIDAY = 5;

const delay = (ms = 450) => new Promise((resolve) => setTimeout(resolve, ms));

/** Small seeded random generator (same seed → same numbers). */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Midnight in Riyadh for "today + offsetDays", as a UTC timestamp. */
function riyadhMidnight(offsetDays = 0): number {
  const shifted = new Date(Date.now() + RIYADH_OFFSET_MS);
  const utcMidnight = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate());
  return utcMidnight - RIYADH_OFFSET_MS + offsetDays * DAY_MS;
}

function riyadhWeekday(ts: number): number {
  return new Date(ts + RIYADH_OFFSET_MS).getUTCDay();
}

const iso = (ts: number) => new Date(ts).toISOString();
const money = (n: number) => n.toFixed(2);

const DENTISTS = [
  { id: "d1", ar: "د. سارة الحربي", en: "Dr. Sara Alharbi" },
  { id: "d2", ar: "د. عمر الزهراني", en: "Dr. Omar Alzahrani" },
  { id: "d3", ar: "د. هدى السبيعي", en: "Dr. Huda Alsubaie" },
];

const SERVICES = [
  { ar: "استشارة عامة", en: "General Consultation", minutes: 30, color: "#0d7c8c" },
  { ar: "تنظيف الأسنان", en: "Dental Cleaning", minutes: 45, color: "#1d4ed8" },
  { ar: "حشوة", en: "Filling", minutes: 45, color: "#6d28d9" },
  { ar: "علاج العصب", en: "Root Canal", minutes: 60, color: "#be185d" },
  { ar: "خلع سن", en: "Tooth Extraction", minutes: 45, color: "#b45309" },
  { ar: "مراجعة", en: "Follow-up", minutes: 20, color: "#15803d" },
];

const PATIENTS = [
  "عبدالله المطيري", "Layla Hassan", "نورة العتيبي", "فهد القحطاني", "ريم الشهري", "Ahmed Mansour",
  "سلطان الغامدي", "هيا الزهراني", "Sarah Williams", "تركي الحربي", "لمى الدوسري", "ماجد العنزي",
  "منيرة الشمري", "Omar Farouk", "يوسف السبيعي", "دانة البقمي",
];

function buildTodaySchedule(locale: Locale, rand: () => number): ScheduleItem[] {
  const today = riyadhMidnight();
  if (riyadhWeekday(today) === FRIDAY) return []; // clinic closed
  const now = Date.now();
  const items: ScheduleItem[] = [];
  let ref = 1200 + Math.floor(rand() * 300);

  DENTISTS.forEach((dentist, d) => {
    for (const [startHour, endHour] of [[9, 13], [16, 21]]) {
      let t = today + startHour * 3600_000 + d * 15 * 60_000;
      const end = today + endHour * 3600_000;
      while (true) {
        const service = SERVICES[Math.floor(rand() * SERVICES.length)];
        const finish = t + service.minutes * 60_000;
        if (finish > end) break;
        if (rand() < 0.72) {
          let status: AppointmentStatus;
          const r = rand();
          if (finish <= now) status = r < 0.84 ? "completed" : r < 0.93 ? "no_show" : "cancelled";
          else if (t <= now) status = "in_treatment";
          else if (t - now < 30 * 60_000) status = "checked_in";
          else status = r < 0.94 ? "booked" : "cancelled";
          items.push({
            id: `apt-${ref}`,
            referenceNo: `A-${String(ref).padStart(6, "0")}`,
            startsAt: iso(t),
            endsAt: iso(finish),
            patientName: PATIENTS[Math.floor(rand() * PATIENTS.length)],
            serviceName: service[locale],
            serviceColor: service.color,
            dentistName: dentist[locale],
            status,
          });
          ref += 1;
        }
        t = finish + Math.floor(rand() * 3) * 15 * 60_000;
      }
    }
  });
  return items.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

function dailyTrend(days: number, rand: () => number, startOffset: number): TrendPoint[] {
  const points: TrendPoint[] = [];
  for (let i = 0; i < days; i++) {
    const day = riyadhMidnight(startOffset + i);
    const closed = riyadhWeekday(day) === FRIDAY;
    const total = closed ? 0 : 18 + Math.floor(rand() * 12);
    const cancelled = closed ? 0 : Math.floor(total * (0.05 + rand() * 0.07));
    const noShow = closed ? 0 : Math.floor(total * (0.03 + rand() * 0.06));
    const past = day < riyadhMidnight();
    points.push({
      bucket: iso(day),
      completed: past ? total - cancelled - noShow : 0,
      booked: past ? 0 : total - cancelled - noShow,
      cancelled,
      noShow: past ? noShow : 0,
    });
  }
  return points;
}

function hourlyTrend(schedule: ScheduleItem[]): TrendPoint[] {
  const today = riyadhMidnight();
  const points: TrendPoint[] = [];
  for (let h = 9; h <= 21; h++) {
    if (h > 12 && h < 16) continue; // midday break (clinic hours, seed A-01)
    const from = today + h * 3600_000;
    const inHour = schedule.filter((s) => {
      const t = Date.parse(s.startsAt);
      return t >= from && t < from + 3600_000;
    });
    const count = (pred: (s: ScheduleItem) => boolean) => inHour.filter(pred).length;
    points.push({
      bucket: iso(from),
      completed: count((s) => s.status === "completed"),
      booked: count((s) => ["booked", "checked_in", "in_treatment"].includes(s.status)),
      cancelled: count((s) => s.status === "cancelled"),
      noShow: count((s) => s.status === "no_show"),
    });
  }
  return points;
}

const sum = (points: TrendPoint[], key: keyof Omit<TrendPoint, "bucket">) =>
  points.reduce((acc, p) => acc + p[key], 0);

export async function getMockAdminDashboard(period: DashboardPeriod, locale: Locale): Promise<AdminDashboard> {
  await delay();
  const rand = seeded(Math.floor(riyadhMidnight() / DAY_MS) * 31 + period.length);
  const todaySchedule = buildTodaySchedule(locale, seeded(Math.floor(riyadhMidnight() / DAY_MS)));

  const days = period === "today" ? 1 : period === "week" ? 7 : 30;
  const trend = period === "today" ? hourlyTrend(todaySchedule) : dailyTrend(days, rand, -(days - 1));
  const previous = period === "today" ? dailyTrend(1, rand, -7) : dailyTrend(days, rand, -(2 * days - 1));

  const completed = sum(trend, "completed");
  const cancelled = sum(trend, "cancelled");
  const noShow = sum(trend, "noShow");
  const total = completed + cancelled + noShow + sum(trend, "booked");
  const prevTotal = previous.reduce((a, p) => a + p.completed + p.booked + p.cancelled + p.noShow, 0);

  const revenueDays = period === "month" ? 30 : 7;
  const revenue = Array.from({ length: revenueDays }, (_, i) => {
    const day = riyadhMidnight(i - (revenueDays - 1));
    const closed = riyadhWeekday(day) === FRIDAY;
    const billed = closed ? 0 : 2400 + Math.round(rand() * 3200);
    const collected = closed ? 0 : Math.round(billed * (0.78 + rand() * 0.2));
    return { day: iso(day), billed: money(billed), collected: money(collected) };
  });
  const periodRevenue = revenue.slice(-days).reduce((a, r) => a + Number(r.collected), 0);

  return {
    period,
    range: { from: iso(riyadhMidnight(-(days - 1))), to: iso(riyadhMidnight(1)) },
    kpis: {
      appointments: { value: total, previous: prevTotal },
      // "today" is compared with a comparable part of a previous day, not a whole day
      completed: {
        value: completed,
        previous:
          period !== "today"
            ? Math.round(prevTotal * 0.8)
            : completed === 0
              ? 0 // nothing finished yet today → no comparison shown
              : Math.max(1, completed + Math.round((rand() - 0.5) * 4)),
      },
      cancelled: { value: cancelled, previous: Math.max(0, cancelled + Math.round((rand() - 0.5) * 4)) },
      noShow: { value: noShow, previous: Math.max(0, noShow + Math.round((rand() - 0.6) * 3)) },
      patientsTotal: { value: 1248, previous: 1248 - days * 2 },
      newPatients: { value: Math.max(1, Math.round(days * (1.5 + rand()))), previous: Math.round(days * 1.8) },
      revenue: { value: money(periodRevenue), previous: money(periodRevenue * (0.85 + rand() * 0.25)) },
      outstanding: { value: money(4300 + rand() * 900), previous: money(4600) },
    },
    todaySchedule,
    attention: {
      pendingDiscounts: 1,
      refundRequests: 1,
      possibleDuplicates: 1,
      failedNotifications: 1,
      overridesToday: 0,
    },
    trend,
    utilization: DENTISTS.map((d, i) => {
      const scheduled = days === 1 ? 540 : days * 6 * 60 * (i === 2 ? 0.7 : 1);
      return {
        dentistId: d.id,
        dentistName: d[locale],
        scheduledMinutes: Math.round(scheduled),
        bookedMinutes: Math.round(scheduled * (0.48 + rand() * 0.45)),
      };
    }),
    revenue,
    upcoming: Array.from({ length: 7 }, (_, i) => {
      const day = riyadhMidnight(i + 1);
      const closed = riyadhWeekday(day) === FRIDAY;
      return {
        day: iso(day),
        booked: closed ? 0 : 12 + Math.floor(rand() * 14),
        cancelled: closed ? 0 : Math.floor(rand() * 3),
      };
    }),
  };
}

const ALERTS: Record<Locale, Omit<StaffAlert, "isRead">[]> = {
  ar: [
    { id: "al-1", type: "new_online_booking", message: "حجز إلكتروني جديد A-001284", createdAt: iso(Date.now() - 12 * 60_000) },
    { id: "al-2", type: "discount_pending", message: "طلب خصم 25% بانتظار موافقتك", createdAt: iso(Date.now() - 55 * 60_000) },
    { id: "al-3", type: "refund_requested", message: "طلب استرداد 100.00 ر.س بانتظار موافقتك", createdAt: iso(Date.now() - 3 * 3600_000) },
  ],
  en: [
    { id: "al-1", type: "new_online_booking", message: "New online booking A-001284", createdAt: iso(Date.now() - 12 * 60_000) },
    { id: "al-2", type: "discount_pending", message: "25% discount awaiting your approval", createdAt: iso(Date.now() - 55 * 60_000) },
    { id: "al-3", type: "refund_requested", message: "Refund of SAR 100.00 awaiting your approval", createdAt: iso(Date.now() - 3 * 3600_000) },
  ],
};

export async function getMockStaffAlerts(locale: Locale): Promise<StaffAlert[]> {
  await delay(200);
  return ALERTS[locale].map((a) => ({ ...a, isRead: false }));
}
