import { useTranslations } from "next-intl";
import { TriangleAlert } from "lucide-react";

/**
 * Thin warning strip shown while the app runs on mock services (docs/05 A7).
 * Makes it impossible to mistake simulated OTP/messages for real ones.
 */
export function SimulatedModeBanner({ code }: { code: string }) {
  const t = useTranslations("common");
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 bg-warning-tint px-4 py-1.5 text-center text-xs font-medium text-warning"
    >
      <TriangleAlert aria-hidden="true" className="size-3.5 shrink-0" />
      <span>{t("simulatedMode", { code })}</span>
    </div>
  );
}
