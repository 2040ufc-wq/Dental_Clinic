"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/shared/i18n/navigation";
import { AlertBanner } from "@/ui/components/alert-banner";
import { FormField } from "@/ui/components/form-field";
import { LoadingButton } from "@/ui/components/loading-button";
import { OtpInput } from "@/ui/components/otp-input";
import { PhoneInput, toE164 } from "@/ui/components/phone-input";
import { Button } from "@/ui/components/ui/button";
import { formatSeconds, useCountdown } from "@/ui/hooks/use-countdown";
import { authService } from "@/ui/services/auth-service";
import { PATIENT_HOME, saveSession } from "@/ui/services/session";
import { patientMobileSchema, sixDigitCode, type PatientMobileInput } from "./schemas";
import { StepHeading } from "./step-heading";
import { useErrorMessage } from "./use-error-message";

/** "501234567" → "+966 50 123 4567" for display */
function formatMobile(local: string): string {
  return `+966 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5)}`;
}

/**
 * Patient sign-in with mobile + one-time code (PLT-04, docs/05 S1).
 * Step 1: mobile → Step 2: 6-digit code (resend after 60 s).
 * Existing account → My appointments. New number → registration.
 */
export function PatientOtpFlow() {
  const t = useTranslations("auth.patient");
  const tm = useTranslations("auth.mfa");
  const tv = useTranslations("validation");
  const toMessage = useErrorMessage();
  const router = useRouter();
  const countdown = useCountdown();

  const [mobile, setMobile] = useState<string | null>(null); // set once the code is sent
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const form = useForm<PatientMobileInput>({
    resolver: zodResolver(patientMobileSchema),
    defaultValues: { mobile: "" },
  });
  const mobileValue = useWatch({ control: form.control, name: "mobile" });

  const sendCode = async (local: string) => {
    setError(null);
    setBusy(true);
    try {
      const result = await authService.requestPatientOtp(toE164(local));
      setMobile(local);
      setCode("");
      countdown.start(result.resendAfterSeconds);
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const verify = async (value: string) => {
    if (!mobile || busy) return;
    if (!sixDigitCode.safeParse(value).success) {
      setError(tv("codeInvalid"));
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const result = await authService.verifyPatientOtp(toE164(mobile), value);
      if (result.patient) {
        saveSession(result.patient);
        router.replace(PATIENT_HOME);
      } else {
        router.replace("/register");
      }
    } catch (err) {
      setError(toMessage(err));
      setCode("");
      setBusy(false);
    }
  };

  // ---------- Step 2: code ----------
  if (mobile) {
    return (
      <>
        <StepHeading
          title={t("codeTitle")}
          subtitle={t("codeSentTo", { mobile: formatMobile(mobile) })}
          focusOnMount
        />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void verify(code);
          }}
          noValidate
          className="flex flex-col gap-5"
        >
          {error && <AlertBanner tone="danger">{error}</AlertBanner>}
          <div className="flex flex-col gap-2">
            <span id="otp-label" className="text-[13px] font-medium">
              {tm("codeLabel")}
            </span>
            <OtpInput
              value={code}
              onChange={setCode}
              onComplete={(c) => void verify(c)}
              labelledBy="otp-label"
              digitLabel={(i) => tm("digitLabel", { index: i })}
              invalid={Boolean(error)}
              disabled={busy}
              autoFocus
            />
          </div>

          <LoadingButton type="submit" loading={busy} loadingText={t("verifying")} className="w-full">
            {t("verify")}
          </LoadingButton>

          <div className="flex items-center justify-between text-sm">
            <Button
              type="button"
              variant="link"
              className="h-auto px-0"
              onClick={() => {
                setMobile(null);
                setError(null);
              }}
            >
              {t("changeNumber")}
            </Button>
            {countdown.isRunning ? (
              <span className="text-text-secondary tabular" aria-live="polite">
                {t("resendIn", { time: formatSeconds(countdown.secondsLeft) })}
              </span>
            ) : (
              <Button
                type="button"
                variant="link"
                className="h-auto px-0"
                disabled={busy}
                onClick={() => void sendCode(mobile)}
              >
                {t("resend")}
              </Button>
            )}
          </div>
        </form>
      </>
    );
  }

  // ---------- Step 1: mobile ----------
  const mobileError = form.formState.errors.mobile?.message;
  return (
    <>
      <StepHeading title={t("title")} subtitle={t("subtitle")} />
      <form
        onSubmit={form.handleSubmit(({ mobile: local }) => sendCode(local))}
        noValidate
        className="flex flex-col gap-4"
      >
        {error && <AlertBanner tone="danger">{error}</AlertBanner>}
        <FormField
          id="mobile"
          label={t("mobile")}
          required
          hint={t("mobileHint")}
          error={mobileError && tv(mobileError)}
        >
          {(a11y) => (
            <PhoneInput
              {...a11y}
              value={mobileValue}
              onChange={(v) =>
                form.setValue("mobile", v, { shouldValidate: form.formState.isSubmitted })
              }
              placeholder="5XXXXXXXX"
            />
          )}
        </FormField>
        <LoadingButton type="submit" loading={busy} loadingText={t("sending")} className="w-full">
          {t("sendCode")}
        </LoadingButton>
      </form>

      <p className="mt-8 text-center text-sm">
        <Link href="/login" className="font-medium text-primary-600 hover:underline">
          {t("staffLink")}
        </Link>
      </p>
    </>
  );
}
