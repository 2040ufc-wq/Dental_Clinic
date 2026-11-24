"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Link } from "@/shared/i18n/navigation";
import { AlertBanner } from "@/ui/components/alert-banner";
import { FormField } from "@/ui/components/form-field";
import { LoadingButton } from "@/ui/components/loading-button";
import { PasswordInput } from "@/ui/components/password-input";
import { Input } from "@/ui/components/ui/input";
import { authService } from "@/ui/services/auth-service";
import type { StaffLoginResult } from "@/ui/services/types";
import { staffLoginSchema, type StaffLoginInput } from "./schemas";
import { StepHeading } from "./step-heading";
import { useErrorMessage } from "./use-error-message";

interface StaffLoginFormProps {
  onSuccess: (result: StaffLoginResult) => void;
  focusOnMount?: boolean;
}

/** Step 1 of staff sign-in: email + password (docs/05 S1). */
export function StaffLoginForm({ onSuccess, focusOnMount }: StaffLoginFormProps) {
  const t = useTranslations("auth.staff");
  const tv = useTranslations("validation");
  const toMessage = useErrorMessage();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StaffLoginInput>({
    resolver: zodResolver(staffLoginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: StaffLoginInput) => {
    setServerError(null);
    try {
      onSuccess(await authService.staffLogin(values.email, values.password));
    } catch (error) {
      setServerError(toMessage(error));
    }
  };

  return (
    <>
      <StepHeading title={t("title")} subtitle={t("subtitle")} focusOnMount={focusOnMount} />

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        {serverError && <AlertBanner tone="danger">{serverError}</AlertBanner>}

        <FormField
          id="email"
          label={t("email")}
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

        <FormField
          id="password"
          label={t("password")}
          required
          error={errors.password?.message && tv(errors.password.message)}
          labelAction={
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-primary-600 hover:underline"
            >
              {t("forgotPassword")}
            </Link>
          }
        >
          {(a11y) => (
            <PasswordInput
              {...a11y}
              {...register("password")}
              autoComplete="current-password"
              showLabel={t("showPassword")}
              hideLabel={t("hidePassword")}
            />
          )}
        </FormField>

        <LoadingButton
          type="submit"
          loading={isSubmitting}
          loadingText={t("submitting")}
          className="mt-2 w-full"
        >
          {t("submit")}
        </LoadingButton>
      </form>

      <p className="mt-8 text-center text-sm">
        <Link href="/patient-login" className="font-medium text-primary-600 hover:underline">
          {t("patientLink")}
        </Link>
      </p>
    </>
  );
}
