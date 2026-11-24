"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/shared/i18n/navigation";
import { authService } from "@/ui/services/auth-service";
import { STAFF_HOME, saveSession } from "@/ui/services/session";
import type { StaffLoginResult, StaffUser } from "@/ui/services/types";
import { MfaEnrollPanel } from "./mfa-enroll-panel";
import { MfaCodeForm } from "./mfa-code-form";
import { StaffLoginForm } from "./staff-login-form";

type Step = "credentials" | "mfa" | "enroll";

/**
 * Staff sign-in as a small state machine (docs/05 S1):
 *   credentials → (admin, 2FA set up)      → mfa    → home
 *   credentials → (admin, 2FA not set up)  → enroll → home
 *   credentials → (other roles)                     → home
 */
export function StaffLoginFlow() {
  const t = useTranslations("auth.mfa");
  const router = useRouter();
  const [step, setStep] = useState<Step>("credentials");

  const finish = (user: StaffUser) => {
    saveSession(user);
    router.replace(STAFF_HOME);
  };

  const handleCredentials = (result: StaffLoginResult) => {
    if (!result.mfaRequired) return finish(result.user);
    setStep(result.mfaEnrolled ? "mfa" : "enroll");
  };

  const backToCredentials = () => setStep("credentials");

  switch (step) {
    case "mfa":
      return (
        <MfaCodeForm
          title={t("title")}
          subtitle={t("subtitle")}
          submitLabel={t("submit")}
          verify={(code) => authService.verifyMfa(code)}
          onSuccess={finish}
          onCancel={backToCredentials}
        />
      );
    case "enroll":
      return <MfaEnrollPanel onSuccess={finish} onCancel={backToCredentials} />;
    default:
      return <StaffLoginForm onSuccess={handleCredentials} />;
  }
}
