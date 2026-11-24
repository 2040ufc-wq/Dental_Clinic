"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Construction, LogOut } from "lucide-react";
import { useRouter } from "@/shared/i18n/navigation";
import { Button } from "@/ui/components/ui/button";
import { clearSession, readSession } from "@/ui/services/session";
import type { SessionUser } from "@/ui/services/types";

/**
 * TEMPORARY placeholder for screens not built yet (empty-state pattern, docs/05 A7).
 * Shows who is signed in (mock session) so the login flow can be verified end to end.
 */
export function ComingSoon() {
  const t = useTranslations("common");
  const tr = useTranslations("roles");
  const locale = useLocale();
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    // sessionStorage only exists in the browser, so read it after the first render
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(readSession());
  }, []);

  const name =
    user?.type === "staff"
      ? locale === "ar"
        ? user.fullNameAr
        : user.fullNameEn
      : user?.fullName;
  const role = user?.type === "staff" ? tr(user.role) : null;

  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="flex max-w-md flex-col items-center gap-4 rounded-xl border bg-card p-8 text-center shadow-sm">
        <span className="flex size-12 items-center justify-center rounded-full bg-primary-100 text-primary-700">
          <Construction aria-hidden="true" className="size-6" />
        </span>
        <h1 className="text-xl font-semibold text-navy-900">{t("comingSoonTitle")}</h1>
        <p className="text-sm text-text-secondary">{t("comingSoonBody")}</p>
        {user && name && (
          <p className="text-sm font-medium">
            {role ? t("signedInAs", { name, role }) : name}
          </p>
        )}
        <Button
          variant="outline"
          onClick={() => {
            clearSession();
            router.replace(user?.type === "patient" ? "/patient-login" : "/login");
          }}
        >
          <LogOut aria-hidden="true" className="rtl:rotate-180" />
          {t("signOut")}
        </Button>
      </div>
    </main>
  );
}
