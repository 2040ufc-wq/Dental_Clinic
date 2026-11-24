"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/shared/i18n/navigation";
import { AlertBanner } from "@/ui/components/alert-banner";
import { FormField } from "@/ui/components/form-field";
import { LoadingButton } from "@/ui/components/loading-button";
import { Input } from "@/ui/components/ui/input";
import { authService } from "@/ui/services/auth-service";
import { forgotPasswordSchema, type ForgotPasswordInput } from "./schemas";
import { StepHeading } from "./step-heading";
import { useErrorMessage } from "./use-error-message";

/**
 * Password reset request (docs/05 S1).
 * Always shows the same neutral confirmation — never reveals whether an email exists.
 */
export function ForgotPasswordForm() {
  const t = useTranslations("auth.forgot");
  const tc = useTranslations("common");
  const ts = useTranslations("auth.staff");
  const tv = useTranslations("validation");
  const toMessage = useErrorMessage();
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async ({ email }: ForgotPasswordInput) => {
    setServerError(null);
    try {
      await authService.requestPasswordReset(email);
      setSent(true);
    } catch (error) {
      setServerError(toMessage(error));
    }
  };

  return (
    <>
      <StepHeading title={t("title")} subtitle={t("subtitle")} />

      {sent ? (
        <AlertBanner tone="success">{t("sent")}</AlertBanner>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          {serverError && <AlertBanner tone="danger">{serverError}</AlertBanner>}
          <FormField
            id="email"
            label={ts("email")}
            required
            error={errors.email?.message && tv(errors.email.message)}
          >
            {(a11y) => (
              <Input
                {...a11y}
                {...register("email")}
                type="email"
                autoComplete="username"
                dir="ltr"
                className="text-start"
              />
            )}
          </FormField>
          <LoadingButton
            type="submit"
            loading={isSubmitting}
            loadingText={t("submitting")}
            className="w-full"
          >
            {t("submit")}
          </LoadingButton>
        </form>
      )}

      <p className="mt-8 text-center text-sm">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 font-medium text-primary-600 hover:underline"
        >
          {/* rtl:rotate-180 mirrors the arrow in Arabic (docs/05 A4) */}
          <ArrowLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
          {tc("backToLogin")}
        </Link>
      </p>
    </>
  );
}
