"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, LoaderCircle } from "lucide-react";
import { AlertBanner } from "@/ui/components/alert-banner";
import { Button } from "@/ui/components/ui/button";
import { authService } from "@/ui/services/auth-service";
import type { MfaEnrollment, StaffUser } from "@/ui/services/types";
import { MfaCodeForm } from "./mfa-code-form";
import { useErrorMessage } from "./use-error-message";

interface MfaEnrollPanelProps {
  onSuccess: (user: StaffUser) => void;
  onCancel: () => void;
}

/** Forced 2FA setup for Admins without it (PLT-03, docs/05 S1). */
export function MfaEnrollPanel({ onSuccess, onCancel }: MfaEnrollPanelProps) {
  const t = useTranslations("auth.enroll");
  const toMessage = useErrorMessage();
  const [enrollment, setEnrollment] = useState<MfaEnrollment | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    authService.enrollMfa().then(setEnrollment, (err) => setLoadError(toMessage(err)));
    // run once when the step opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copySecret = async () => {
    if (!enrollment) return;
    try {
      await navigator.clipboard.writeText(enrollment.secret.replace(/\s/g, ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — user can still select the text */
    }
  };

  if (loadError) return <AlertBanner tone="danger">{loadError}</AlertBanner>;
  if (!enrollment) {
    return (
      <div className="flex justify-center py-16" role="status">
        <LoaderCircle aria-hidden="true" className="size-6 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <MfaCodeForm
      title={t("title")}
      subtitle={t("intro")}
      submitLabel={t("submit")}
      verify={(code) => authService.confirmMfaEnrollment(enrollment.factorId, code)}
      onSuccess={onSuccess}
      onCancel={onCancel}
    >
      <ol className="flex flex-col gap-4 text-sm">
        <li className="flex flex-col gap-3">
          <span>{t("step1")}</span>
          {/* Rendered as <img> so an SVG can never run scripts */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(enrollment.qrCodeSvg)}`}
            alt={t("qrAlt")}
            width={160}
            height={160}
            className="mx-auto rounded-lg border border-border"
          />
          <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
            <span>{t("secretLabel")}</span>
            <code dir="ltr" className="rounded bg-muted px-2 py-1 font-mono text-foreground">
              {enrollment.secret}
            </code>
            <Button type="button" variant="outline" size="sm" onClick={copySecret}>
              {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
              {copied ? t("copied") : t("copy")}
            </Button>
          </div>
        </li>
        <li>{t("step2")}</li>
      </ol>
    </MfaCodeForm>
  );
}
