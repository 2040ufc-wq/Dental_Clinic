import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ClinicLogo } from "@/ui/components/clinic-logo";
import { LanguageSwitcher } from "@/ui/components/language-switcher";
import { SimulatedModeBanner } from "@/ui/components/simulated-mode-banner";
import { MOCK_CODE } from "@/ui/services/mock/mock-data";

/**
 * Split-screen frame for all sign-in screens (docs/05 S1 layout).
 * Desktop: form panel (start side) + brand panel (end side).
 * Tablet: brand panel becomes a band on top. Mobile: brand panel hidden.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  const t = useTranslations("common");

  return (
    <div className="flex min-h-dvh flex-col">
      <SimulatedModeBanner code={MOCK_CODE} />

      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Brand panel — top band on tablet, end side on desktop, hidden on mobile */}
        <aside
          className="relative hidden h-40 overflow-hidden bg-linear-to-br from-primary-600 to-navy-900 sm:flex sm:items-center sm:px-10 lg:order-last lg:h-auto lg:w-1/2 lg:flex-col lg:items-start lg:justify-end lg:p-14"
        >
          <BrandIllustration />
          <div className="relative">
            <ClinicLogo variant="light" />
            <p className="mt-4 hidden max-w-sm text-2xl leading-snug font-semibold text-white lg:block">
              {t("tagline")}
            </p>
          </div>
        </aside>

        {/* Form panel */}
        <main className="flex flex-1 flex-col bg-card lg:w-1/2">
          <header className="flex items-center justify-between px-4 py-3 sm:px-8">
            <ClinicLogo className="sm:invisible" />
            <LanguageSwitcher />
          </header>
          <div className="flex flex-1 items-start justify-center px-4 pt-6 pb-12 sm:items-center sm:px-8">
            <div className="w-full max-w-100">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}

/** Soft decorative circles + smile line (purely visual). */
function BrandIllustration() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 size-full opacity-20"
      viewBox="0 0 400 600"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
    >
      <circle cx="320" cy="90" r="140" stroke="white" strokeWidth="1.5" />
      <circle cx="320" cy="90" r="90" stroke="white" strokeWidth="1.5" />
      <circle cx="60" cy="420" r="120" stroke="white" strokeWidth="1.5" />
      <path d="M90 260 Q200 360 310 260" stroke="white" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
