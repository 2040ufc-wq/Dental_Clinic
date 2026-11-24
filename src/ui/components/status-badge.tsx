import { useTranslations } from "next-intl";
import { Activity, CalendarCheck, CircleCheck, CircleX, UserCheck, UserX } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { AppointmentStatus } from "@/ui/services/dashboard-types";

const STYLES: Record<AppointmentStatus, { className: string; Icon: typeof Activity }> = {
  booked:       { className: "bg-status-booked-tint text-status-booked",             Icon: CalendarCheck },
  checked_in:   { className: "bg-status-checked-in-tint text-status-checked-in",     Icon: UserCheck },
  in_treatment: { className: "bg-status-in-treatment-tint text-status-in-treatment", Icon: Activity },
  completed:    { className: "bg-status-completed-tint text-status-completed",       Icon: CircleCheck },
  cancelled:    { className: "bg-status-cancelled-tint text-status-cancelled",       Icon: CircleX },
  no_show:      { className: "bg-status-no-show-tint text-status-no-show",           Icon: UserX },
};

/** Appointment status pill: colour + icon + text, never colour alone (docs/05 A2, A7). */
export function StatusBadge({ status, className }: { status: AppointmentStatus; className?: string }) {
  const t = useTranslations("status");
  const { className: tone, Icon } = STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        tone,
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {t(status)}
    </span>
  );
}
