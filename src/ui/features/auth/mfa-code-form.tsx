"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { AlertBanner } from "@/ui/components/alert-banner";
import { LoadingButton } from "@/ui/components/loading-button";
import { OtpInput } from "@/ui/components/otp-input";
import { Button } from "@/ui/components/ui/button";
import type { StaffUser } from "@/ui/services/types";
import { sixDigitCode } from "./schemas";
import { StepHeading } from "./step-heading";
import { useErrorMessage } from "./use-error-message";

interface MfaCodeFormProps {
  /** Performs the verification call; resolves with the signed-in user */
  verify: (code: string) => Promise<StaffUser>;
  onSuccess: (user: StaffUser) => void;
  onCancel?: () => void;
  title: string;
  subtitle?: string;
  submitLabel: string;
  /** Extra content above the code boxes (used by the enrollment step for the QR code) */
  children?: ReactNode;
}

/** 6-digit authenticator code entry — shared by "verify" and "enroll" steps (docs/05 S1). */
export function MfaCodeForm({
  verify,
  onSuccess,
  onCancel,
  title,
  subtitle,
  submitLabel,
  children,
}: MfaCodeFormProps) {
  const t = useTranslations("auth.mfa");
  const tv = useTranslations("validation");
  const toMessage = useErrorMessage();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (value: string) => {
    if (submitting) return;
    if (!sixDigitCode.safeParse(value).success) {
      setError(tv("codeInvalid"));
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      onSuccess(await verify(value));
    } catch (err) {
      setError(toMessage(err));
      setCode("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <StepHeading title={title} subtitle={subtitle} focusOnMount />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit(code);
        }}
        noValidate
        className="flex flex-col gap-5"
      >
        {children}
        {error && <AlertBanner tone="danger">{error}</AlertBanner>}

        <div className="flex flex-col gap-2">
          <span id="mfa-code-label" className="text-[13px] font-medium">
            {t("codeLabel")}
          </span>
          <OtpInput
            value={code}
            onChange={setCode}
            onComplete={(c) => void submit(c)} // auto-submit on the 6th digit
            labelledBy="mfa-code-label"
            digitLabel={(i) => t("digitLabel", { index: i })}
            invalid={Boolean(error)}
            disabled={submitting}
          />
        </div>

        <LoadingButton
          type="submit"
          loading={submitting}
          loadingText={t("submitting")}
          className="w-full"
        >
          {submitLabel}
        </LoadingButton>

        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} className="w-full">
            {t("useDifferentAccount")}
          </Button>
        )}
      </form>
    </>
  );
}
