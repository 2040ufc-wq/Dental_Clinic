"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { LoaderCircle, Menu } from "lucide-react";
import { usePathname, useRouter } from "@/shared/i18n/navigation";
import { ClinicLogo } from "@/ui/components/clinic-logo";
import { LanguageSwitcher } from "@/ui/components/language-switcher";
import { SimulatedModeBanner } from "@/ui/components/simulated-mode-banner";
import { Button } from "@/ui/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/ui/components/ui/sheet";
import { MOCK_CODE } from "@/ui/services/mock/mock-data";
import { readSession } from "@/ui/services/session";
import type { StaffUser } from "@/ui/services/types";
import { AlertsMenu } from "./alerts-menu";
import { SidebarNav } from "./sidebar-nav";
import { StaffUserContext } from "./staff-user-context";
import { UserMenu } from "./user-menu";

/**
 * Staff application frame (docs/05 A6): sidebar on the start side, header, content.
 * Desktop: sidebar 256px · Tablet: 72px icons · Mobile: drawer from the start side.
 *
 * Route guard (PLT-07, MOCK): staff pages require a staff session; otherwise the user is
 * sent to /login?returnTo=… . The real backend will enforce this on the server as well.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const t = useTranslations("nav");
  const th = useTranslations("header");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<StaffUser | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const session = readSession();
    if (session?.type === "staff") {
      // sessionStorage only exists in the browser, so the session is read after mount
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUser(session);
    } else {
      router.replace(`/login?returnTo=${encodeURIComponent(pathname)}`);
    }
  }, [router, pathname]);

  if (!user) {
    return (
      <div role="status" className="flex min-h-dvh items-center justify-center gap-2 text-sm text-text-secondary">
        <LoaderCircle aria-hidden="true" className="size-5 animate-spin text-primary-600" />
        {th("checkingSession")}
      </div>
    );
  }

  const startSide = locale === "ar" ? "right" : "left";

  return (
    <div className="flex min-h-dvh flex-col">
      <SimulatedModeBanner code={MOCK_CODE} />
      <div className="flex flex-1">
        {/* Sidebar: hidden on mobile, icons on tablet, full on desktop */}
        <aside className="sticky top-0 hidden h-dvh shrink-0 flex-col gap-6 bg-navy-900 px-3 py-5 md:flex md:w-18 lg:w-64">
          <div className="hidden px-2 lg:block">
            <ClinicLogo variant="light" />
          </div>
          <div className="lg:hidden">
            <SidebarNav role={user.role} compact />
          </div>
          <div className="hidden lg:block">
            <SidebarNav role={user.role} />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-card px-4 md:px-6">
            {/* Mobile drawer */}
            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
              <SheetTrigger
                render={<Button variant="ghost" size="icon" aria-label={t("openMenu")} className="md:hidden" />}
              >
                <Menu aria-hidden="true" className="size-5" />
              </SheetTrigger>
              <SheetContent side={startSide} closeLabel={t("closeMenu")} className="w-72 bg-navy-900 p-4 text-white">
                <SheetTitle className="sr-only">{t("mainNav")}</SheetTitle>
                <ClinicLogo variant="light" className="mb-4" />
                <SidebarNav role={user.role} onNavigate={() => setDrawerOpen(false)} />
              </SheetContent>
            </Sheet>

            <div className="md:hidden">
              <ClinicLogo iconOnly />
            </div>

            <div className="ms-auto flex items-center gap-1">
              <LanguageSwitcher />
              <AlertsMenu />
              <UserMenu user={user} />
            </div>
          </header>

          <main id="main" className="flex-1 px-4 py-6 md:px-6">
            <StaffUserContext.Provider value={user}>{children}</StaffUserContext.Provider>
          </main>
        </div>
      </div>
    </div>
  );
}
