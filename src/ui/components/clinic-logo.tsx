import { useTranslations } from "next-intl";
import { cn } from "@/shared/lib/utils";

interface ClinicLogoProps {
  /** "dark" for light backgrounds, "light" for the teal/navy brand panel */
  variant?: "dark" | "light";
  className?: string;
}

/** Fictional clinic logo (UX-1 default): tooth mark + clinic name. */
export function ClinicLogo({ variant = "dark", className }: ClinicLogoProps) {
  const t = useTranslations("common");
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span
        aria-hidden="true"
        className={cn(
          "flex size-10 items-center justify-center rounded-xl",
          variant === "dark" ? "bg-primary-600 text-white" : "bg-white/15 text-white",
        )}
      >
        <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7.5 3C5 3 3.5 5 3.5 7.5c0 2.5 1 4 1.5 6 .6 2.6 1 7.5 2.8 7.5 1.6 0 1.7-4.5 4.2-4.5s2.6 4.5 4.2 4.5c1.8 0 2.2-4.9 2.8-7.5.5-2 1.5-3.5 1.5-6C20.5 5 19 3 16.5 3c-2 0-2.8 1-4.5 1S9.5 3 7.5 3Z" />
        </svg>
      </span>
      <span
        className={cn(
          "text-base font-semibold leading-tight",
          variant === "dark" ? "text-navy-900" : "text-white",
        )}
      >
        {t("clinicName")}
      </span>
    </div>
  );
}
