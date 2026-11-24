import type { ReactNode } from "react";
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/shared/lib/utils";

type Tone = "danger" | "warning" | "info" | "success";

const toneStyles: Record<Tone, string> = {
  danger: "bg-danger-tint text-danger border-danger/20",
  warning: "bg-warning-tint text-warning border-warning/20",
  info: "bg-info-tint text-info border-info/20",
  success: "bg-success-tint text-success border-success/20",
};

const toneIcons: Record<Tone, typeof Info> = {
  danger: CircleAlert,
  warning: TriangleAlert,
  info: Info,
  success: CircleCheck,
};

interface AlertBannerProps {
  tone: Tone;
  children: ReactNode;
  className?: string;
}

/**
 * Inline message banner (docs/05 A2 semantic colours).
 * Errors use role="alert" so screen readers announce them immediately.
 */
export function AlertBanner({ tone, children, className }: AlertBannerProps) {
  const Icon = toneIcons[tone];
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm",
        toneStyles[tone],
        className,
      )}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
