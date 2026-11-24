import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthLayout } from "@/ui/features/auth/auth-layout";
import { ForgotPasswordForm } from "@/ui/features/auth/forgot-password-form";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/forgot-password">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth.forgot" });
  return { title: t("metaTitle") };
}

/** S1 — Forgot password (neutral confirmation, never reveals if the email exists). */
export default async function ForgotPasswordPage({
  params,
}: PageProps<"/[locale]/forgot-password">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <AuthLayout>
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
